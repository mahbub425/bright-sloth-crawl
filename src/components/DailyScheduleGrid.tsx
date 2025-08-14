import React, { useState } from "react";
import { Room, Booking } from "@/types/database";
import { format, parseISO, addMinutes, isBefore, isAfter, differenceInMinutes, isSameDay } from "date-fns";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// Generates 30-minute time slots for the entire day (e.g., "00:00", "00:30", ..., "23:30")
const generateDetailedTimeSlots = () => {
  const slots = [];
  let currentTime = parseISO(`2000-01-01T00:00:00`);
  const endTime = parseISO(`2000-01-01T23:59:00`); // Up to 23:30

  while (isBefore(currentTime, endTime) || (currentTime.getHours() === endTime.getHours() && currentTime.getMinutes() === endTime.getMinutes())) {
    slots.push(format(currentTime, "HH:mm"));
    currentTime = addMinutes(currentTime, 30);
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
  const allDetailedTimeSlots = generateDetailedTimeSlots(); // 30-minute intervals for grid cells (48 slots)
  const allHourlyLabels = generateHourlyLabels(); // Hourly labels for the header (24 labels)

  // State to control the visible 6-hour window (index refers to the start of 30-min slots)
  // 0 = 00:00, 12 = 06:00, 24 = 12:00, 36 = 18:00
  const [visibleTimeStartIndex, setVisibleTimeStartIndex] = useState(18); // Start at 9 AM (index 18 for 09:00)

  // Calculate the visible 30-minute slots (12 slots for 6 hours)
  const visibleDetailedTimeSlots = allDetailedTimeSlots.slice(visibleTimeStartIndex, visibleTimeStartIndex + 12);
  // Calculate the visible hourly labels (6 labels for 6 hours)
  const visibleHourlyLabels = allHourlyLabels.slice(visibleTimeStartIndex / 2, (visibleTimeStartIndex / 2) + 6);

  const handlePrevTimeRange = () => {
    setVisibleTimeStartIndex(prev => Math.max(0, prev - 12)); // Move back 6 hours (12 x 30-min slots)
  };

  const handleNextTimeRange = () => {
    const maxStartIndex = allDetailedTimeSlots.length - 12; // Max index to show last 6 hours
    setVisibleTimeStartIndex(prev => Math.min(maxStartIndex, prev + 12)); // Move forward 6 hours
  };

  const getBookingsForRoomAndDate = (roomId: string, date: Date) => {
    const formattedSelectedDate = format(date, "yyyy-MM-dd");
    return bookings.filter(booking =>
      booking.room_id === roomId && booking.date === formattedSelectedDate
    ).sort((a, b) => a.start_time.localeCompare(b.start_time));
  };

  return (
    <div className="overflow-x-auto">
      <div className="mb-4 flex justify-end items-end"> {/* Adjusted to justify-end */}
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handlePrevTimeRange}
            disabled={visibleTimeStartIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleNextTimeRange}
            disabled={visibleTimeStartIndex >= (allDetailedTimeSlots.length - 12)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] min-w-full border border-gray-200 dark:border-gray-700 rounded-lg shadow-md bg-white dark:bg-gray-800 relative">
        {/* Room Header Column - Sticky */}
        <div className="grid grid-rows-1 auto-rows-min sticky left-0 z-20 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 shadow-md">
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

        {/* Main Grid Content - Scrollable */}
        <div className="flex-1 overflow-x-hidden">
          {/* Hourly Time Headers */}
          <div className="grid grid-cols-12 border-b border-gray-200 dark:border-gray-700">
            {visibleHourlyLabels.map((label, _index) => (
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
              <div key={room.id} className="grid grid-cols-12 h-24"> {/* Now 12 columns, stretching */}
                {visibleDetailedTimeSlots.map((slotTime, _index) => {
                  if (slotsToSkip > 0) {
                    slotsToSkip--;
                    return null; // This slot is covered by a previously rendered booking
                  }

                  const slotStartDateTime = parseISO(`2000-01-01T${slotTime}:00`);
                  let renderedBooking: Booking | null = null;

                  // Find a booking that starts exactly at this 30-min slot
                  for (const booking of dailyBookings) {
                    const bookingStart = parseISO(`2000-01-01T${booking.start_time}`);
                    if (isSameDay(bookingStart, slotStartDateTime) && bookingStart.getHours() === slotStartDateTime.getHours() && bookingStart.getMinutes() === slotStartDateTime.getMinutes()) {
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
                        className="h-full flex flex-col items-center justify-center p-2 rounded-md text-white cursor-pointer transition-colors duration-200 overflow-hidden"
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