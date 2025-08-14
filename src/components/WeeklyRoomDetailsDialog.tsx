import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO, addMinutes, isBefore, isAfter, isSameDay, startOfWeek, addDays, differenceInMinutes } from "date-fns";
import { Users, Info, Plus } from "lucide-react"; // Removed Clock and ImageIcon as they are not explicitly used for display anymore
import { Room, Booking } from "@/types/database";
import { supabase } from "@/integrations/supabase/auth";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

interface WeeklyRoomDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room: Room | null;
  initialDate: Date;
  onBookSlot: (roomId: string, date: Date, startTime: string, endTime: string) => void;
}

// Helper to generate 30-minute time options for the entire day
const generateAllDayTimeSlots = (intervalMinutes: number = 30) => {
  const slots = [];
  let currentTime = parseISO(`2000-01-01T00:00:00`);
  const endTime = parseISO(`2000-01-01T23:59:00`); // Up to 23:30

  while (isBefore(currentTime, endTime) || isSameDay(currentTime, endTime)) {
    slots.push(format(currentTime, "HH:mm"));
    currentTime = addMinutes(currentTime, intervalMinutes);
  }
  return slots;
};

// Helper to convert HH:MM to minutes from midnight
const timeToMinutes = (timeString: string) => {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
};

const WeeklyRoomDetailsDialog: React.FC<WeeklyRoomDetailsDialogProps> = ({
  open,
  onOpenChange,
  room,
  initialDate,
  onBookSlot,
}) => {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [roomBookings, setRoomBookings] = useState<Booking[]>([]);

  // Generate all 30-minute time slots for the entire day (00:00 to 23:30)
  const allDayTimeSlots = generateAllDayTimeSlots();

  useEffect(() => {
    if (room && selectedDate) {
      fetchRoomBookings(room.id, selectedDate);
    }
  }, [room, selectedDate]);

  const fetchRoomBookings = async (roomId: string, date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles (
          name,
          pin
        )
      `)
      .eq('room_id', roomId)
      .eq('date', formattedDate);

    if (error) {
      toast({
        title: "Error fetching room bookings",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const bookingsWithUserDetails = data.map(booking => ({
        ...booking,
        user_name: booking.profiles?.name,
        user_pin: booking.profiles?.pin,
      })) as Booking[];
      setRoomBookings(bookingsWithUserDetails || []);
    }
  };

  const handleSlotClick = (slotTime: string) => {
    if (!room || !selectedDate) return;

    // Check if the clicked slot is within the room's available time
    const slotStartMinutes = timeToMinutes(slotTime);
    const roomStartMinutes = room.available_time ? timeToMinutes(room.available_time.start) : 0;
    const roomEndMinutes = room.available_time ? timeToMinutes(room.available_time.end) : (24 * 60);

    if (slotStartMinutes < roomStartMinutes || slotStartMinutes >= roomEndMinutes) {
      toast({
        title: "Unavailable Time",
        description: `This time slot is outside the room's available hours (${room.available_time?.start || '00:00'} - ${room.available_time?.end || '23:59'}).`,
        variant: "destructive",
      });
      return;
    }

    // Check for overlapping bookings
    const potentialBookingStart = parseISO(`2000-01-01T${slotTime}:00`);
    const potentialBookingEnd = addMinutes(potentialBookingStart, 60); // Default to 1-hour slot for new booking

    const hasConflict = roomBookings.some(booking => {
      const existingBookingStart = parseISO(`2000-01-01T${booking.start_time}`);
      const existingBookingEnd = parseISO(`2000-01-01T${booking.end_time}`);

      // Check for overlap: (start1 < end2) && (end1 > start2)
      return isBefore(potentialBookingStart, existingBookingEnd) && isAfter(potentialBookingEnd, existingBookingStart);
    });

    if (hasConflict) {
      toast({
        title: "Booking Conflict",
        description: "The selected time slot overlaps with an existing booking in this room.",
        variant: "destructive",
      });
      return;
    }

    // If no conflict and within available time, proceed to book
    onBookSlot(room.id, selectedDate, slotTime, format(potentialBookingEnd, "HH:mm"));
    onOpenChange(false); // Close this dialog after initiating booking
  };

  if (!room) {
    return null;
  }

  // Generate dates for current and next week
  const startOfCurrentWeek = startOfWeek(selectedDate || new Date(), { weekStartsOn: 0 }); // Sunday as start of week
  const currentWeekDates = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));
  const nextWeekDates = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, 7 + i));

  // Track occupied slots to prevent rendering multiple booking cards for the same booking
  const occupiedSlots = new Set<string>();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-center">{room.name}</DialogTitle>
        </DialogHeader>

        {/* Room Image with Overlay for Capacity & Facilities */}
        {room.image && (
          <div className="relative mb-4 px-6 border-b border-gray-200 dark:border-gray-700 pb-4">
            <img src={room.image} alt={room.name} className="w-full h-48 object-cover rounded-md" />
            <div className="absolute bottom-4 left-6 right-6 bg-black/50 text-white p-2 rounded-md">
              <p className="text-sm font-semibold">
                Capacity {room.capacity || "N/A"}, {room.facilities || "N/A"}
              </p>
            </div>
          </div>
        )}

        {/* Date Range Display (as per screenshot) */}
        <div className="px-6 mb-4 flex items-center justify-center text-gray-700 dark:text-gray-300">
          <span className="font-semibold">{format(currentWeekDates[0], "MMM dd, yyyy")}</span>
          <span className="mx-2">-</span>
          <span className="font-semibold">{format(currentWeekDates[6], "MMM dd, yyyy")}</span>
        </div>

        {/* Custom Date Selector (Current and Next Week) */}
        <div className="px-6 mb-6">
          <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {currentWeekDates.map((date) => (
              <span key={`day-name-${format(date, 'yyyy-MM-dd')}`}>{format(date, "EEE")}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2 text-center">
            {currentWeekDates.map((date) => (
              <Button
                key={`date-current-${format(date, 'yyyy-MM-dd')}`}
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full w-9 h-9",
                  isSameDay(date, selectedDate || new Date()) && "bg-blue-500 text-white hover:bg-blue-600"
                )}
                onClick={() => setSelectedDate(date)}
              >
                {format(date, "d")}
              </Button>
            ))}
            {nextWeekDates.map((date) => (
              <Button
                key={`date-next-${format(date, 'yyyy-MM-dd')}`}
                variant="outline"
                size="icon"
                className={cn(
                  "rounded-full w-9 h-9",
                  isSameDay(date, selectedDate || new Date()) && "bg-blue-500 text-white hover:bg-blue-600"
                )}
                onClick={() => setSelectedDate(date)}
              >
                {format(date, "d")}
              </Button>
            ))}
          </div>
        </div>

        {/* Time Slots Grid with Single Scrollbar */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Time Slots for {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}</h3>
          <div className="grid grid-cols-[60px_1fr] border border-gray-200 dark:border-gray-700 rounded-md relative">
            {/* Left Column: Time Labels (fixed height, aligns with 30-min slots) */}
            <div className="flex flex-col">
              {allDayTimeSlots.map((slotTime, index) => (
                <div
                  key={`time-label-${slotTime}`}
                  className="h-[60px] flex items-start justify-center pt-2 text-xs font-medium text-gray-600 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  {/* Only display hourly labels for the first 30-min slot of each hour */}
                  {index % 2 === 0 ? format(parseISO(`2000-01-01T${slotTime}`), "h a") : ''}
                </div>
              ))}
            </div>

            {/* Right Column: Booking Slots (relative for absolute positioning of bookings) */}
            <div className="flex flex-col relative">
              {allDayTimeSlots.map((slotTime, index) => {
                const slotStart = parseISO(`2000-01-01T${slotTime}:00`);
                const slotEnd = addMinutes(slotStart, 30);
                const slotKey = `${room?.id}-${format(selectedDate || new Date(), 'yyyy-MM-dd')}-${slotTime}`;

                // If this slot is already marked as occupied by a longer booking, skip rendering a new cell
                if (occupiedSlots.has(slotKey)) {
                  return null;
                }

                // Find a booking that starts exactly at this slot
                const bookingInSlot = roomBookings.find(booking => {
                  const bookingStart = parseISO(`2000-01-01T${booking.start_time}`);
                  return isSameDay(bookingStart, slotStart);
                });

                if (bookingInSlot) {
                  const bookingStart = parseISO(`2000-01-01T${bookingInSlot.start_time}`);
                  const bookingEnd = parseISO(`2000-01-01T${bookingInSlot.end_time}`);
                  const durationMinutes = differenceInMinutes(bookingEnd, bookingStart);
                  const heightPx = (durationMinutes / 30) * 60; // Each 30-min slot is 60px high

                  // Mark all 30-min slots covered by this booking as occupied
                  for (let i = 0; i < durationMinutes / 30; i++) {
                    const currentCoveredSlotTime = format(addMinutes(slotStart, i * 30), "HH:mm");
                    occupiedSlots.add(`${room?.id}-${format(selectedDate || new Date(), 'yyyy-MM-dd')}-${currentCoveredSlotTime}`);
                  }

                  return (
                    <div
                      key={`booking-${bookingInSlot.id}-${slotTime}`}
                      className="absolute left-0 right-0 p-2 rounded-md text-white cursor-pointer transition-colors duration-200 overflow-hidden flex flex-col justify-center items-center"
                      style={{
                        backgroundColor: room.color || "#888",
                        top: `${index * 60}px`, // Position based on 30-min slot index
                        height: `${heightPx}px`,
                        zIndex: 10, // Ensure booking is above empty slots
                      }}
                      onClick={() => handleSlotClick(slotTime)} // Still allow clicking to book, or view details
                    >
                      <span className="font-medium text-center leading-tight text-sm truncate w-full px-1">
                        {bookingInSlot.title}
                      </span>
                      <span className="text-xs text-center opacity-90 mt-1">
                        {format(bookingStart, "h:mma")} - {format(bookingEnd, "h:mma")}
                      </span>
                    </div>
                  );
                } else {
                  // Empty slot
                  return (
                    <div
                      key={`empty-slot-${slotTime}`}
                      className="h-[60px] flex items-center justify-center p-1 border-b border-gray-200 dark:border-gray-700 last:border-b-0 bg-gray-50 dark:bg-gray-700/20 group hover:bg-gray-100 dark:hover:bg-gray-700/40 cursor-pointer"
                      onClick={() => handleSlotClick(slotTime)}
                    >
                      <Plus className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  );
                }
              })}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyRoomDetailsDialog;