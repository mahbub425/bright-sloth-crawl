import React from "react";
import { Room, Booking } from "@/types/database";
import { format, parseISO, addMinutes, isBefore, isAfter, differenceInMinutes } from "date-fns";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface DailyScheduleGridProps {
  rooms: Room[];
  bookings: Booking[];
  selectedDate: Date;
  onBookSlot: (roomId: string, date: Date, startTime: string, endTime: string) => void;
  onViewBooking: (booking: Booking) => void;
}

const generateTimeSlots = (start: string, end: string, intervalMinutes: number = 30) => {
  const slots = [];
  let currentTime = parseISO(`2000-01-01T${start}:00`);
  const endTime = parseISO(`2000-01-01T${end}:00`);

  while (isBefore(currentTime, endTime)) {
    slots.push(format(currentTime, "HH:mm"));
    currentTime = addMinutes(currentTime, intervalMinutes);
  }
  return slots;
};

const DailyScheduleGrid: React.FC<DailyScheduleGridProps> = ({
  rooms,
  bookings,
  selectedDate,
  onBookSlot,
  onViewBooking,
}) => {
  const allTimeSlots = generateTimeSlots("00:00", "23:59", 30); // Full day, 30 min intervals

  const getBookingsForRoomAndDate = (roomId: string, date: Date) => {
    return bookings.filter(booking =>
      booking.room_id === roomId && format(parseISO(booking.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  const getBookingAtSlotStart = (roomId: string, slotTime: string) => {
    const slotStart = parseISO(`2000-01-01T${slotTime}:00`);
    return getBookingsForRoomAndDate(roomId, selectedDate).find(booking => {
      const bookingStart = parseISO(`2000-01-01T${booking.start_time}`);
      return bookingStart.getTime() === slotStart.getTime();
    });
  };

  const isSlotCoveredByBooking = (roomId: string, slotTime: string, currentBookings: Booking[]) => {
    const slotStart = parseISO(`2000-01-01T${slotTime}:00`);
    const slotEnd = addMinutes(slotStart, 30);

    return currentBookings.some(booking => {
      const bookingStart = parseISO(`2000-01-01T${booking.start_time}`);
      const bookingEnd = parseISO(`2000-01-01T${booking.end_time}`);
      // Check if the slot is within an existing booking's time range
      return isBefore(bookingStart, slotEnd) && isAfter(bookingEnd, slotStart);
    });
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col auto-cols-max min-w-full border border-gray-200 dark:border-gray-700 rounded-lg shadow-md bg-white dark:bg-gray-800">
        {/* Time Header Row */}
        <div className="grid grid-rows-1 auto-rows-min sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="h-16 flex items-center justify-center p-2 font-semibold text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
            Rooms / Time
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

        {/* Main Grid */}
        <div className="grid grid-flow-col auto-cols-[120px] overflow-x-auto">
          <div className="grid grid-flow-col auto-cols-[120px] border-b border-gray-200 dark:border-gray-700">
            {allTimeSlots.map((slot) => (
              <div
                key={slot}
                className="h-16 flex items-center justify-center p-2 font-semibold text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
              >
                {format(parseISO(`2000-01-01T${slot}`), "h a")}
              </div>
            ))}
          </div>

          {rooms.map((room) => {
            const dailyBookings = getBookingsForRoomAndDate(room.id, selectedDate);
            let slotsToSkip = 0;

            return (
              <div key={room.id} className="grid grid-flow-col auto-cols-[120px]">
                {allTimeSlots.map((slot) => {
                  if (slotsToSkip > 0) {
                    slotsToSkip--;
                    return null; // This slot is covered by a previously rendered booking
                  }

                  const bookingAtStart = getBookingAtSlotStart(room.id, slot);

                  if (bookingAtStart) {
                    const bookingStart = parseISO(`2000-01-01T${bookingAtStart.start_time}`);
                    const bookingEnd = parseISO(`2000-01-01T${bookingAtStart.end_time}`);
                    const durationMinutes = differenceInMinutes(bookingEnd, bookingStart);
                    const colSpan = Math.ceil(durationMinutes / 30); // Number of 30-min slots it spans
                    slotsToSkip = colSpan - 1; // Current slot is rendered, skip subsequent ones

                    return (
                      <div
                        key={`${room.id}-${slot}`}
                        className="h-24 flex flex-col items-center justify-center p-2 rounded-md text-white cursor-pointer transition-colors duration-200"
                        onClick={() => onViewBooking(bookingAtStart)}
                        style={{ 
                          backgroundColor: room.color || "#888",
                          gridColumn: `span ${colSpan}`
                        }}
                      >
                        <span className="font-medium text-center leading-tight">
                          {bookingAtStart.title}
                        </span>
                        <span className="text-xs text-center opacity-90 mt-1">
                          {format(bookingStart, "h:mma")} - {format(bookingEnd, "h:mma")}
                        </span>
                      </div>
                    );
                  } else {
                    // Check if this slot is covered by any other booking (not starting here)
                    const isCovered = isSlotCoveredByBooking(room.id, slot, dailyBookings);
                    if (isCovered) {
                      return null; // This slot is part of an ongoing booking, don't render a separate cell
                    }

                    // Empty slot
                    return (
                      <div
                        key={`${room.id}-${slot}`}
                        className="h-24 flex items-center justify-center p-1 border-r border-b border-gray-200 dark:border-gray-700 last:border-r-0 bg-gray-50 dark:bg-gray-700/20 group hover:bg-gray-100 dark:hover:bg-gray-700/40 cursor-pointer"
                        onClick={() => onBookSlot(room.id, selectedDate, slot, format(addMinutes(parseISO(`2000-01-01T${slot}`), 60), "HH:mm"))}
                      >
                        <Plus className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    );
                  }
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DailyScheduleGrid;