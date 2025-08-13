import React from "react";
import { Room, Booking } from "@/types/database";
import { format, startOfWeek, addDays, isSameDay, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Plus } from "lucide-react";

interface WeeklyScheduleGridProps {
  rooms: Room[];
  bookings: Booking[];
  selectedDate: Date;
  onViewRoomDetails: (room: Room, date: Date) => void;
}

const WeeklyScheduleGrid: React.FC<WeeklyScheduleGridProps> = ({
  rooms,
  bookings,
  selectedDate,
  onViewRoomDetails,
}) => {
  const startOfCurrentWeek = startOfWeek(selectedDate, { weekStartsOn: 0 }); // Sunday as start of week
  const weekDates = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));

  const getBookingsForRoomAndDate = (roomId: string, date: Date) => {
    return bookings.filter(booking =>
      booking.room_id === roomId && isSameDay(parseISO(booking.date), date)
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col auto-cols-max min-w-full border border-gray-200 dark:border-gray-700 rounded-lg shadow-md bg-white dark:bg-gray-800">
        {/* Header Row: Rooms / Dates */}
        <div className="grid grid-rows-1 auto-rows-min sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="h-16 flex items-center justify-center p-2 font-semibold text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
            Rooms / Date
          </div>
          {rooms.map((room) => (
            <div
              key={room.id}
              className="h-24 flex items-center p-2 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              <span
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: room.color || "#ccc" }}
              ></span>
              {room.name}
            </div>
          ))}
        </div>

        {/* Main Grid: Dates and Bookings */}
        <div className="grid grid-rows-1 auto-rows-min overflow-x-auto">
          <div className="grid grid-flow-col auto-cols-[120px] border-b border-gray-200 dark:border-gray-700">
            {weekDates.map((date) => (
              <div
                key={format(date, "yyyy-MM-dd")}
                className="h-16 flex flex-col items-center justify-center p-2 font-semibold text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
              >
                <span>{format(date, "EEE")}</span>
                <span>{format(date, "MMM dd")}</span>
              </div>
            ))}
          </div>

          {rooms.map((room) => (
            <div key={room.id} className="grid grid-flow-col auto-cols-[120px]">
              {weekDates.map((date) => {
                const dailyBookings = getBookingsForRoomAndDate(room.id, date);
                const cellClasses = cn(
                  "h-24 flex flex-col items-center justify-center p-1 border-r border-b border-gray-200 dark:border-gray-700 last:border-r-0",
                  dailyBookings.length > 0
                    ? "bg-blue-50 dark:bg-blue-900/30 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900/50"
                    : "bg-gray-50 dark:bg-gray-700/20 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/40"
                );

                return (
                  <div
                    key={`${room.id}-${format(date, "yyyy-MM-dd")}`}
                    className={cellClasses}
                    onClick={() => onViewRoomDetails(room, date)}
                  >
                    {dailyBookings.slice(0, 2).map((booking) => (
                      <div key={booking.id} className="text-xs text-blue-800 dark:text-blue-200 text-center leading-tight mb-1">
                        <span className="font-medium">{booking.title.substring(0, 15)}{booking.title.length > 15 ? "..." : ""}</span>
                        <br />
                        <span className="text-[10px] opacity-80">
                          {format(parseISO(`2000-01-01T${booking.start_time}`), "h:mma")} - {format(parseISO(`2000-01-01T${booking.end_time}`), "h:mma")}
                        </span>
                      </div>
                    ))}
                    {dailyBookings.length > 2 && (
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        <Plus className="h-3 w-3 inline-block mr-1" />
                        {dailyBookings.length - 2} more
                      </div>
                    )}
                    {dailyBookings.length === 0 && (
                      <Plus className="h-5 w-5 text-gray-400 group-hover:text-gray-600" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeeklyScheduleGrid;