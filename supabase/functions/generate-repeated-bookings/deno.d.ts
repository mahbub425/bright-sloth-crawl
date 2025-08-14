declare namespace Deno {
  namespace env {
    function get(key: string): string | undefined;
  }
}

declare module "https://deno.land/std@0.190.0/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response> | Response): Promise<void>;
}

declare module "https://esm.sh/@supabase/supabase-js@2.45.0" {
  import { SupabaseClient } from '@supabase/supabase-js';
  export function createClient(supabaseUrl: string, supabaseKey: string, options?: any): SupabaseClient;
}

declare module "https://esm.sh/date-fns@3.6.0" {
  export function addDays(date: Date, amount: number): Date;
  export function addWeeks(date: Date, amount: number): Date;
  export function addMonths(date: Date, amount: number): Date;
  export function format(date: Date | number, formatStr: string, options?: any): string;
  export function getDay(date: Date | number): number;
  export function getDate(date: Date | number): number;
  export function getWeekOfMonth(date: Date | number, options?: any): number;
  export function isBefore(date: Date | number, dateToCompare: Date | number): boolean;
  export function parseISO(dateString: string, options?: any): Date;
}