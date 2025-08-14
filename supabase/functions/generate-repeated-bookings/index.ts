import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { addDays, addWeeks, addMonths, format, getDay, getDate, getWeekOfMonth, isBefore, parseISO } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initialBooking, repeatType, endDate: rawEndDate, userId } = await req.json();

    if (!initialBooking || !repeatType || !userId) {
      return new Response(JSON.stringify({ error: 'Missing required parameters.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use service role key for admin operations
      {
        auth: {
          persistSession: false,
        },
      }
    );

    const bookingsToInsert = [];
    let currentDate = parseISO(initialBooking.date);
    const endDate = rawEndDate ? parseISO(rawEndDate) : null;

    while (endDate === null || !isBefore(endDate, currentDate)) {
      let shouldBook = true;

      if (repeatType === 'daily') {
        const dayOfWeek = getDay(currentDate); // Sunday - 0, Monday - 1, ..., Saturday - 6
        if (dayOfWeek === 5) { // Friday
          shouldBook = false;
        } else if (dayOfWeek === 6) { // Saturday
          const weekOfMonth = getWeekOfMonth(currentDate);
          if (weekOfMonth === 1 || weekOfMonth === 3 || weekOfMonth === 4) {
            shouldBook = false;
          }
        }
      }

      if (shouldBook) {
        const proposedBookingDate = format(currentDate, 'yyyy-MM-dd');
        const proposedBookingStartTime = initialBooking.start_time;
        const proposedBookingEndTime = initialBooking.end_time;

        console.log(`Checking for conflicts for proposed booking: Room ${initialBooking.room_id}, Date ${proposedBookingDate}, Time ${proposedBookingStartTime}-${proposedBookingEndTime}`);

        // Check for conflicts for the proposed repeated booking
        const { data: conflicts, error: conflictError } = await supabaseClient
            .from('bookings')
            .select('id')
            .eq('room_id', initialBooking.room_id)
            .eq('date', proposedBookingDate)
            .filter('start_time', 'lt', proposedBookingEndTime)
            .filter('end_time', 'gt', proposedBookingStartTime)
            .neq('id', initialBooking.id); // Exclude the initial booking itself from conflict check

        if (conflictError) {
            console.error(`Error checking conflict for ${proposedBookingDate}:`, conflictError.message);
            shouldBook = false; // Skip this booking due to error
        } else if (conflicts && conflicts.length > 0) {
            console.warn(`Skipping repeated booking for ${proposedBookingDate} due to conflict. Existing booking IDs: ${conflicts.map(c => c.id).join(', ')}`);
            shouldBook = false; // Skip this booking due to conflict
        }
      }

      if (shouldBook) {
        bookingsToInsert.push({
          user_id: userId,
          room_id: initialBooking.room_id,
          title: initialBooking.title,
          date: format(currentDate, 'yyyy-MM-dd'),
          start_time: initialBooking.start_time,
          end_time: initialBooking.end_time,
          remarks: initialBooking.remarks,
        });
        console.log(`Added booking for ${format(currentDate, 'yyyy-MM-dd')}`);
      } else {
        console.log(`Skipped booking for ${format(currentDate, 'yyyy-MM-dd')}`);
      }

      // Move to the next date based on repeat type
      if (repeatType === 'daily') {
        currentDate = addDays(currentDate, 1);
      } else if (repeatType === 'weekly') {
        currentDate = addWeeks(currentDate, 1);
      } else if (repeatType === 'monthly') {
        currentDate = addMonths(currentDate, 1);
      } else if (repeatType === 'custom') {
        // For custom, we only insert the initial booking and rely on end_date for the loop termination
        // The loop condition handles this, so we just break after the first iteration if it's custom
        break;
      } else { // no_repeat or unknown type
        break;
      }

      // Prevent infinite loops for very long date ranges or if endDate is not set for repeating types
      if (bookingsToInsert.length > 365 * 2) { // Limit to 2 years of bookings to prevent abuse
        console.warn("Too many bookings generated, stopping to prevent abuse.");
        break;
      }
    }

    // Remove the initial booking from the list if it's already handled by the client
    // The client will insert the first booking, so we only insert subsequent repeats here.
    const firstBookingDate = format(parseISO(initialBooking.date), 'yyyy-MM-dd');
    const filteredBookingsToInsert = bookingsToInsert.filter(b => b.date !== firstBookingDate || b.start_time !== initialBooking.start_time || b.end_time !== initialBooking.end_time);


    if (filteredBookingsToInsert.length > 0) {
      console.log(`Attempting to insert ${filteredBookingsToInsert.length} repeated bookings.`);
      const { error: insertError } = await supabaseClient
        .from('bookings')
        .insert(filteredBookingsToInsert);

      if (insertError) {
        console.error("Error inserting repeated bookings:", insertError);
        return new Response(JSON.stringify({ error: insertError.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
      console.log(`Successfully inserted ${filteredBookingsToInsert.length} repeated bookings.`);
    } else {
      console.log("No additional repeated bookings to insert after filtering.");
    }

    return new Response(JSON.stringify({ message: 'Repeated bookings generated successfully.', count: filteredBookingsToInsert.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});