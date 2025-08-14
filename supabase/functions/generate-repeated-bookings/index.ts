// Removed: /// <reference lib="deno.ns" />

// Explicit type declarations for Deno global object
declare namespace Deno {
  export namespace env {
    function get(key: string): string | undefined;
  }
}

// Explicit type declarations for remote modules
declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(handler: (request: Request) => Response | Promise<Response>): Promise<void>;
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  import { SupabaseClient as SupabaseClientType } from '@supabase/supabase-js'; // Use an alias to avoid conflict if @supabase/supabase-js is also in node_modules
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): SupabaseClientType;
  // Add other necessary types from @supabase/supabase-js if they cause errors
}

declare module "https://esm.sh/date-fns@3.6.0" {
  export function addDays(date: Date | number, amount: number): Date;
  export function addWeeks(date: Date | number, amount: number): Date;
  export function addMonths(date: Date | number, amount: number): Date;
  export function format(date: Date | number, formatStr: string): string;
  export function getDay(date: Date | number): number;
  export function getDate(date: Date | number): number;
  export function getWeekOfMonth(date: Date | number): number;
  export function isBefore(date: Date | number, dateToCompare: Date | number): boolean;
  export function parseISO(dateString: string): Date;
  // Add other necessary date-fns types if they cause errors
}

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
    let nextRepeatDate = parseISO(initialBooking.date);
    const endDate = rawEndDate ? parseISO(rawEndDate) : null;

    // Advance to the next potential repeat date based on the repeat type
    if (repeatType === 'daily' || repeatType === 'custom') {
        nextRepeatDate = addDays(nextRepeatDate, 1);
    } else if (repeatType === 'weekly') {
        nextRepeatDate = addWeeks(nextRepeatDate, 1); // Start checking from next week
    } else if (repeatType === 'monthly') {
        nextRepeatDate = addMonths(nextRepeatDate, 1);
    } else { // no_repeat or unknown type, no further bookings to generate
        return new Response(JSON.stringify({ message: 'No repeated bookings to generate.', count: 0 }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    }

    while (endDate === null || !isBefore(endDate, nextRepeatDate)) {
      let shouldBook = true;

      if (repeatType === 'daily' || repeatType === 'custom') { // Apply daily rules to custom as well
        const dayOfWeek = getDay(nextRepeatDate); // Sunday - 0, Monday - 1, ..., Saturday - 6
        if (dayOfWeek === 5) { // Friday
          shouldBook = false;
        } else if (dayOfWeek === 6) { // Saturday
          const weekOfMonth = getWeekOfMonth(nextRepeatDate);
          // Exclude 1st, 3rd, and 4th Saturdays
          if (weekOfMonth === 1 || weekOfMonth === 3 || weekOfMonth === 4) {
            shouldBook = false;
          }
        }
      }

      if (shouldBook) {
        bookingsToInsert.push({
          user_id: userId,
          room_id: initialBooking.room_id,
          title: initialBooking.title,
          date: format(nextRepeatDate, 'yyyy-MM-dd'),
          start_time: initialBooking.start_time,
          end_time: initialBooking.end_time,
          remarks: initialBooking.remarks,
        });
      }

      // Advance to the next potential repeat date
      if (repeatType === 'daily' || repeatType === 'custom') {
        nextRepeatDate = addDays(nextRepeatDate, 1);
      } else if (repeatType === 'weekly') {
        nextRepeatDate = addWeeks(nextRepeatDate, 2); // Every other week
      } else if (repeatType === 'monthly') {
        nextRepeatDate = addMonths(nextRepeatDate, 1);
      } else {
        // Should not happen if initial check for no_repeat is done.
        break;
      }

      // Prevent infinite loops for very long date ranges or if endDate is not set for repeating types
      if (bookingsToInsert.length > 365 * 2) { // Limit to 2 years of bookings to prevent abuse
        console.warn("Too many bookings generated, stopping to prevent abuse.");
        break;
      }
    }

    if (bookingsToInsert.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('bookings')
        .insert(bookingsToInsert);

      if (insertError) {
        console.error("Error inserting repeated bookings:", insertError);
        return new Response(JSON.stringify({ error: error.message }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        });
      }
    }

    return new Response(JSON.stringify({ message: 'Repeated bookings generated successfully.', count: bookingsToInsert.length }), {
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