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

// Generates 30-minute time slots for the entire day (e.g., "00:00", "00:30", ..., "23:30")
const generateDetailedTimeSlots = (intervalMinutes: number = 30) => {
  const slots = [];
  let currentTime = parseISO(`2000-01-01T00:00:00`);
  const endTime = parseISO(`2000-01-01T23:59:00`); // Up to 23:30

  while (isBefore(currentTime, endTime) || (currentTime.getHours() === endTime.getHours() && currentTime.getMinutes() === endTime.getMinutes())) {
    slots.push(format(currentTime, "HH:mm"));
    currentTime = addMinutes(currentTime, intervalMinutes);
  }
  return slots;
};

// Generates hourly labels for the header (e.g., "12 AM", "1 AM", ..., "11 PM")
const generateHourlyLabels = () => {
  const labels = [];
  for (let i = 0; i < 24; i++) {
    labels.push(format(parseISO(`2000-01-01T${i.toString().padStart(2, '0')}:00:00`), "h a"));
  }
  return labels;
};

const DailyScheduleGrid: React.FC<DailyScheduleGridProps> = ({
  rooms,
  bookings,
  selectedDate,
  onBookSlot,
  onViewBooking,
}) => {
  const detailedTimeSlots = generateDetailedTimeSlots(); // 30-minute intervals
  const hourlyLabels = generateHourlyLabels(); // Hourly labels for the header

  const getBookingsForRoomAndDate = (roomId: string, date: Date) => {
    return bookings.filter(booking =>
      booking.room_id === roomId && format(parseISO(booking.date), "yyyy-MM-dd") === format(date, "yyyy-MM-dd")
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col auto-cols-max min-w-full border border-gray-200 dark:border-gray-700 rounded-lg shadow-md bg-white dark:bg-gray-800">
        {/* Room Header Column */}
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

        {/* Main Grid Content */}
        <div className="grid grid-rows-1 auto-rows-min overflow-x-auto">
          {/* Hourly Time Headers */}
          <div className="grid grid-flow-col auto-cols-[60px] border-b border-gray-200 dark:border-gray-700">
            {hourlyLabels.map((label, index) => (
              <div
                key={label}
                className="h-16 flex items-center justify-center p-2 font-semibold text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                style={{ gridColumn: 'span 2' }} // Each hourly label spans two 30-min columns
              >
                {label}
              </div>
            ))}
          </div>

          {/* Room Schedule Rows */}
          {rooms.map((room) => {
            const dailyBookings = getBookingsForRoomAndDate(room.id, selectedDate);
            let slotsToSkip = 0; // Counter for 30-min slots covered by a rendered booking

            return (
              <div key={room.id} className="grid grid-flow-col auto-cols-[60px] h-24"> {/* Each column is 60px for 30 min */}
                {detailedTimeSlots.map((slotTime, index) => {
                  if (slotsToSkip > 0) {
                    slotsToSkip--;
                    return null; // This slot is covered by a previously rendered booking
                  }

                  const slotStartDateTime = parseISO(`2000-01-01T${slotTime}:00`);
                  let renderedBooking: Booking | null = null;

                  // Find a booking that starts exactly at this 30-min slot
                  for (const booking of dailyBookings) {
                    const bookingStart = parseISO(`2000-01-01T${booking.start_time}`);
                    if (bookingStart.getTime() === slotStartDateTime.getTime()) {
                      renderedBooking = booking;
                      break;
                    }
                  }

                  if (renderedBooking) {
                    const bookingStart = parseISO(`2000-01-01T${renderedBooking.start_time}`);
                    const bookingEnd = parseISO(`2000-01-01T${renderedBooking.end_time}`);
                    const durationMinutes = differenceInMinutes(bookingEnd, bookingStart);
                    const colSpan = Math.ceil(durationMinutes / 30); // Number of 30-min slots it spans

                    slotsToSkip = colSpan - 1; // Update counter to skip subsequent covered slots

                    return (
                      <div
                        key={`${room.id}-${slotTime}`}
                        className="h-full flex flex-col items-center justify-center p-2 rounded-lg text-white cursor-pointer transition-colors duration-200 overflow-hidden"
                        onClick={() => onViewBooking(renderedBooking)}
                        style={{
                          backgroundColor: room.color || "#888",
                          gridColumn: `span ${colSpan}`,
                          marginLeft: '4px', // Add some margin to separate cards
                          marginRight: '4px',
                        }}
                      >
                        <span className="font-medium text-center leading-tight text-sm truncate w-full px-1">
                          {renderedBooking.title}
                        </span>
                        <span className="text-xs text-center opacity-90 mt-1">
                          {format(bookingStart, "h:mma")} - {format(bookingEnd, "h:mma")}
                        </span>
                      </div>
                    );
                  } else {
                    // Check if this slot is covered by an ongoing booking that started earlier
                    const isCoveredByEarlierBooking = dailyBookings.some(booking => {
                      const bookingStart = parseISO(`2000-01-01T${booking.start_time}`);
                      const bookingEnd = parseISO(`2000-01-01T${booking.end_time}`);
                      return isBefore(bookingStart, slotStartDateTime) && isAfter(bookingEnd, slotStartDateTime);
                    });

                    if (isCoveredByEarlierBooking) {
                      return null; // This slot is part of an ongoing booking, don't render a separate cell
                    }

                    // Empty slot
                    return (
                      <div
                        key={`${room.id}-${slotTime}`}
                        className="h-full flex items-center justify-center p-1 border-r border-b border-gray-200 dark:border-gray-700 last:border-r-0 bg-gray-50 dark:bg-gray-700/20 group hover:bg-gray-100 dark:hover:bg-gray-700/40 cursor-pointer"
                        onClick={() => onBookSlot(room.id, selectedDate, slotTime, format(addMinutes(parseISO(`2000-01-01T${slotTime}`), 60), "HH:mm"))}
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