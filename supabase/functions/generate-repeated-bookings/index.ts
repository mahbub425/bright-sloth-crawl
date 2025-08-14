// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
// @ts-ignore
import { addDays, addWeeks, addMonths, format, getDay, getDate, isBefore, parseISO } from 'https://esm.sh/date-fns@3.6.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    console.log("OPTIONS request received.");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initialBooking, repeatType, endDate: rawEndDate, userId } = await req.json();

    console.log("Edge Function received request:");
    console.log("  initialBooking:", JSON.stringify(initialBooking, null, 2));
    console.log("  repeatType:", repeatType);
    console.log("  rawEndDate:", rawEndDate);
    console.log("  userId:", userId);

    if (!initialBooking || !repeatType || !userId) {
      console.error("Missing required parameters: initialBooking, repeatType, or userId.");
      return new Response(JSON.stringify({ error: 'Missing required parameters.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // @ts-ignore
    const supabaseClient = createClient(
      // @ts-ignore
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore
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

    console.log(`Starting repeat booking generation from ${format(currentDate, 'yyyy-MM-dd')} with repeat type: ${repeatType}`);
    if (endDate) {
      console.log(`  Ending on: ${format(endDate, 'yyyy-MM-dd')}`);
    }

    let iterationCount = 0;
    const MAX_ITERATIONS = 365 * 2; // Limit to 2 years of bookings to prevent abuse/infinite loops

    while (iterationCount < MAX_ITERATIONS && (endDate === null || !isBefore(endDate, currentDate))) {
      const proposedBookingDate = format(currentDate, 'yyyy-MM-dd');
      let shouldBook = true;
      let skipReason = "";

      if (repeatType === 'daily' || repeatType === 'custom') { // 'custom' behaves like daily until end date
        const dayOfWeek = getDay(currentDate); // Sunday - 0, Monday - 1, ..., Saturday - 6

        // Skip every Friday (dayOfWeek === 5)
        if (dayOfWeek === 5) {
          shouldBook = false;
          skipReason = "It's a Friday.";
        } else if (dayOfWeek === 6) { // Saturday
          // Calculate which Saturday of the month it is
          let saturdayCount = 0;
          for (let d = 1; d <= getDate(currentDate); d++) {
            const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
            if (getDay(tempDate) === 6) { // If it's a Saturday
              saturdayCount++;
            }
          }

          // Check if it's the 1st, 3rd, or 4th Saturday
          if (saturdayCount === 1 || saturdayCount === 3) {
            shouldBook = false;
            skipReason = `It's the ${saturdayCount}st/rd Saturday of the month.`;
          } else if (saturdayCount === 4) {
            // Check if there are at least 4 Saturdays in the month
            const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
            let totalSaturdaysInMonth = 0;
            for (let d = 1; d <= getDate(lastDayOfMonth); d++) {
              const tempDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), d);
              if (getDay(tempDate) === 6) {
                totalSaturdaysInMonth++;
              }
            }
            if (totalSaturdaysInMonth >= 4) {
              shouldBook = false;
              skipReason = "It's the 4th Saturday of the month.";
            }
          }
        }
      }

      if (!shouldBook) {
        console.log(`Skipping proposed booking for ${proposedBookingDate}: ${skipReason}`);
      } else {
        console.log(`Checking for conflicts for proposed booking: Room ${initialBooking.room_id}, Date ${proposedBookingDate}, Time ${initialBooking.start_time}-${initialBooking.end_time}`);

        // Check for conflicts for the proposed repeated booking
        const { data: conflicts, error: conflictError } = await supabaseClient
            .from('bookings')
            .select('id')
            .eq('room_id', initialBooking.room_id)
            .eq('date', proposedBookingDate)
            .filter('start_time', 'lt', initialBooking.end_time)
            .filter('end_time', 'gt', initialBooking.start_time)
            .neq('id', initialBooking.id); // Exclude the initial booking itself from conflict check

        if (conflictError) {
            console.error(`Error checking conflict for ${proposedBookingDate}:`, conflictError.message);
            shouldBook = false; // Skip this booking due to error
            skipReason = `Conflict check error: ${conflictError.message}`;
        } else if (conflicts && conflicts.length > 0) {
            console.warn(`Skipping repeated booking for ${proposedBookingDate} due to conflict. Existing booking IDs: ${conflicts.map((c: { id: string }) => c.id).join(', ')}`);
            shouldBook = false; // Skip this booking due to conflict
            skipReason = `Time slot conflicts with existing booking(s): ${conflicts.map((c: { id: string }) => c.id).join(', ')}`;
        }
      }

      if (shouldBook) {
        bookingsToInsert.push({
          user_id: userId,
          room_id: initialBooking.room_id,
          title: initialBooking.title,
          date: proposedBookingDate,
          start_time: initialBooking.start_time,
          end_time: initialBooking.end_time,
          remarks: initialBooking.remarks,
        });
        console.log(`Added booking for ${proposedBookingDate} to insertion list.`);
      } else {
        console.log(`Skipped booking for ${proposedBookingDate}. Reason: ${skipReason}`);
      }

      // Move to the next date based on repeat type
      if (repeatType === 'daily' || repeatType === 'custom') {
        currentDate = addDays(currentDate, 1);
      } else if (repeatType === 'weekly') {
        currentDate = addWeeks(currentDate, 1);
      } else if (repeatType === 'monthly') {
        // For monthly, we advance by one month, but keep the day of the month
        // If the original day is greater than the number of days in the target month,
        // it should book on the last day of the target month.
        const originalDay = getDate(parseISO(initialBooking.date));
        const nextMonth = addMonths(currentDate, 1);
        const lastDayOfNextMonth = getDate(new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 0));
        const targetDay = Math.min(originalDay, lastDayOfNextMonth);
        currentDate = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), targetDay);
      } else { // no_repeat or unknown type
        console.warn(`Unknown repeat type: ${repeatType}. Breaking loop.`);
        break; // Should not happen if repeatType is validated on client
      }
      iterationCount++;
    }

    // Filter out the initial booking if it's already handled by the client
    // The client will insert the first booking, so we only insert subsequent repeats here.
    const firstBookingDateFormatted = format(parseISO(initialBooking.date), 'yyyy-MM-dd');
    const filteredBookingsToInsert = bookingsToInsert.filter(b =>
      !(b.date === firstBookingDateFormatted &&
        b.start_time === initialBooking.start_time &&
        b.end_time === initialBooking.end_time)
    );

    console.log(`Total bookings to insert after filtering initial: ${filteredBookingsToInsert.length}`);
    console.log("Bookings to insert:", JSON.stringify(filteredBookingsToInsert, null, 2));

    if (filteredBookingsToInsert.length > 0) {
      console.log(`Attempting to insert ${filteredBookingsToInsert.length} repeated bookings into database.`);
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

  } catch (error: any) { // Explicitly type error as any
    console.error("Edge Function caught an unexpected error:", error);
    return new Response(JSON.stringify({ error: error.message || "An unexpected error occurred in the Edge Function." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});