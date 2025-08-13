import React from "react";
import { Room, Booking } from "@/types/database";
import { format, parseISO, addMinutes, isBefore, isAfter, startOfDay, endOfDay } from "date-fns";
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

  const getBookingsForRoomAndSlot = (roomId: string, slotTime: string) => {
    const slotStart = parseISO(`2000-01-01T${slotTime}:00`);
    const slotEnd = addMinutes(slotStart, 30); // Assuming 30 min slots

    return bookings.filter(booking => {
      const bookingDate = parseISO(booking.date);
      const bookingStart = parseISO(`2000-01-01T${booking.start_time}`);
      const bookingEnd = parseISO(`2000-01-01T${booking.end_time}`);

      return (
        booking.room_id === roomId &&
        format(bookingDate, "yyyy-MM-dd") === format(selectedDate, "yyyy-MM-dd") &&
        isBefore(bookingStart, slotEnd) &&
        isAfter(bookingEnd, slotStart)
      );
    });
  };

  const isSlotBooked = (roomId: string, slotTime: string) => {
    return getBookingsForRoomAndSlot(roomId, slotTime).length > 0;
  };

  const handleCellClick = (roomId: string, slotTime: string) => {
    const booked = getBookingsForRoomAndSlot(roomId, slotTime);
    if (booked.length > 0) {
      onViewBooking(booked[0]); // Show details of the first booking in that slot
    } else {
      // For booking, assume 1-hour default slot for now, can be adjusted in form
      const startTime = slotTime;
      const endTime = format(addMinutes(parseISO(`2000-01-01T${slotTime}`), 60), "HH:mm");
      onBookSlot(roomId, selectedDate, startTime, endTime);
    }
  };

  return (
    <div className="overflow-x-auto">
      <div className="grid grid-flow-col auto-cols-max min-w-full border border-gray-200 dark:border-gray-700 rounded-lg shadow-md bg-white dark:bg-gray-800">
        {/* Time Header Row */}
        <div className="grid grid-rows-1 auto-rows-min sticky left-0 z-10 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <div className="h-12 flex items-center justify-center p-2 font-semibold text-sm text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
            Rooms / Time
          </div>
          {rooms.map((room) => (
            <div
              key={room.id}
              className="h-12 flex items-center p-2 border-b border-gray-200 dark:border-gray-700 text-sm font-medium text-gray-800 dark:text-gray-200"
            >
              <span
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: room.color || "#ccc" }}
              ></span>
              {room.name}
            </div>
          ))}
          <div className="h-12"></div> {/* Spacer for bottom */}
        </div>

        {/* Main Grid */}
        <div className="grid grid-rows-1 auto-rows-min overflow-x-auto">
          <div className="grid grid-flow-col auto-cols-[80px] border-b border-gray-200 dark:border-gray-700">
            {allTimeSlots.map((slot) => (
              <div
                key={slot}
                className="h-12 flex items-center justify-center p-2 font-semibold text-sm text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
              >
                {format(parseISO(`2000-01-01T${slot}`), "ha").toLowerCase()}
              </div>
            ))}
          </div>

          {rooms.map((room) => (
            <div key={room.id} className="grid grid-flow-col auto-cols-[80px]">
              {allTimeSlots.map((slot) => {
                const booked = isSlotBooked(room.id, slot);
                const cellClasses = cn(
                  "h-12 flex items-center justify-center p-1 border-r border-b border-gray-200 dark:border-gray-700 last:border-r-0",
                  booked
                    ? "bg-blue-100 dark:bg-blue-900/30 cursor-pointer hover:bg-blue-200 dark:hover:bg-blue-900/50"
                    : "bg-gray-50 dark:bg-gray-700/20 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700/40"
                );
                const bookingInSlot = getBookingsForRoomAndSlot(room.id, slot)[0];

                return (
                  <div
                    key={`${room.id}-${slot}`}
                    className={cellClasses}
                    onClick={() => handleCellClick(room.id, slot)}
                  >
                    {booked ? (
                      <span className="text-xs text-blue-800 dark:text-blue-200 text-center leading-tight">
                        {bookingInSlot.title}
                        <br />
                        <span className="text-[10px] opacity-80">
                          {format(parseISO(`2000-01-01T${bookingInSlot.start_time}`), "h:mma")} - {format(parseISO(`2000-01-01T${bookingInSlot.end_time}`), "h:mma")}
                        </span>
                      </span>
                    ) : (
                      <Plus className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
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

export default DailyScheduleGrid;