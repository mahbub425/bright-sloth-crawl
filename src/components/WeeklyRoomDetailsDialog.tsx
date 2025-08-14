import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO, addMinutes, isBefore, isAfter, isSameDay, startOfWeek, addDays, differenceInMinutes } from "date-fns";
import { Users, Info, Plus } from "lucide-react";
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

// Helper to generate 30-minute time slots based on room's available time
const generateDynamic30MinSlots = (room: Room) => {
  const slots = [];
  const start = room.available_time?.start || "00:00";
  const end = room.available_time?.end || "23:59";

  let currentTime = parseISO(`2000-01-01T${start}:00`);
  const endTime = parseISO(`2000-01-01T${end}:00`);

  // Ensure the loop includes the end time if it's on a 30-minute boundary
  while (isBefore(currentTime, endTime) || isSameDay(currentTime, endTime)) {
    slots.push(format(currentTime, "HH:mm"));
    currentTime = addMinutes(currentTime, 30);
  }
  return slots;
};

// Helper to generate hourly labels based on room's available time
const generateDynamicHourlyLabels = (room: Room) => {
  const labels = [];
  const start = room.available_time?.start || "00:00";
  const end = room.available_time?.end || "23:59";

  const startHour = parseInt(start.substring(0, 2));
  const endHour = parseInt(end.substring(0, 2));

  for (let i = startHour; i <= endHour; i++) {
    labels.push(format(parseISO(`2000-01-01T${i.toString().padStart(2, '0')}:00:00`), "h a"));
  }
  return labels;
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

  // Generate dynamic time slots and hourly labels based on room's available time
  const dynamic30MinSlots = room ? generateDynamic30MinSlots(room) : [];
  const dynamicHourlyLabels = room ? generateDynamicHourlyLabels(room) : [];

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

  const handleEmptySlotClick = (slotTime: string) => {
    if (!room || !selectedDate) return;

    // Check if the clicked 30-min slot is within the room's available time
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

    // Check for overlapping bookings for the proposed 1-hour slot
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
        description: "This time slot is already booked for this room.",
        variant: "destructive",
      });
      return;
    }

    // If no conflict and within available time, proceed to book
    onBookSlot(room.id, selectedDate, slotTime, format(potentialBookingEnd, "HH:mm"));
    onOpenChange(false); // Close this dialog after initiating booking
  };

  const handleBookingCardClick = (booking: Booking) => {
    // Show details of the existing booking
    toast({
      title: booking.title,
      description: `Booked by ${booking.user_name} (${booking.user_pin}) from ${format(parseISO(`2000-01-01T${booking.start_time}`), "h:mma")} to ${format(parseISO(`2000-01-01T${booking.end_time}`), "h:mma")}. Remarks: ${booking.remarks || 'N/A'}`,
      duration: 5000,
    });
  };

  if (!room) {
    return null;
  }

  // Generate dates for current and next week
  const startOfCurrentWeek = startOfWeek(selectedDate || new Date(), { weekStartsOn: 0 }); // Sunday as start of week
  const currentWeekDates = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));
  const nextWeekDates = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, 7 + i));

  // Keep track of rendered booking IDs to avoid re-rendering for overlapping 30-min slots
  const renderedBookingIds = new Set<string>();

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
            <div className="absolute bottom-4 left-6 text-white p-2 rounded-md bg-black/50">
              <p className="text-sm font-semibold">
                Capacity {room.capacity || "N/A"}, Facilities {room.facilities || "N/A"}
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
          <div className="grid grid-cols-[60px_1fr] border border-gray-200 dark:border-gray-700 rounded-md relative">
            {/* Left Column: Time Labels (fixed height, aligns with hourly cells) */}
            <div className="flex flex-col">
              {dynamicHourlyLabels.map((label, index) => (
                <div
                  key={`time-label-${label}`}
                  className="h-[60px] flex items-start justify-center pt-2 text-xs font-medium text-gray-600 dark:text-gray-400 border-b border-r border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Right Column: Booking Slots and Empty Cells */}
            <div className="relative flex-1">
              {dynamic30MinSlots.map((slotTime, index) => {
                const slotStart = parseISO(`2000-01-01T${slotTime}:00`);

                // Find a booking that starts exactly at this 30-min slot and hasn't been rendered yet
                const bookingStartingHere = roomBookings.find(booking => {
                  const bookingStart = parseISO(`2000-01-01T${booking.start_time}`);
                  return bookingStart.getTime() === slotStart.getTime() && !renderedBookingIds.has(booking.id);
                });

                if (bookingStartingHere) {
                  const bookingStart = parseISO(`2000-01-01T${bookingStartingHere.start_time}`);
                  const bookingEnd = parseISO(`2000-01-01T${bookingStartingHere.end_time}`);
                  const durationMinutes = differenceInMinutes(bookingEnd, bookingStart);
                  const heightPx = (durationMinutes / 30) * 60; // Each 30-min slot is 60px high

                  // Mark this booking as rendered
                  renderedBookingIds.add(bookingStartingHere.id);

                  return (
                    <div
                      key={`booking-${bookingStartingHere.id}-${slotTime}`}
                      className="absolute left-0 right-0 p-2 rounded-md text-white cursor-pointer transition-colors duration-200 overflow-hidden flex flex-col justify-center items-center"
                      style={{
                        backgroundColor: room.color || "#888",
                        top: `${index * 60}px`, // Position based on 30-min slot index
                        height: `${heightPx}px`,
                        zIndex: 10, // Ensure booking is above empty slots
                      }}
                      onClick={() => handleBookingCardClick(bookingStartingHere)}
                    >
                      <span className="font-medium text-center leading-tight text-sm truncate w-full px-1">
                        {bookingStartingHere.title}
                      </span>
                      <span className="text-xs text-center opacity-90 mt-1">
                        {format(bookingStart, "h:mma")} - {format(bookingEnd, "h:mma")}
                      </span>
                    </div>
                  );
                } else {
                  // Check if this 30-min slot is covered by an ongoing booking that started earlier
                  const isCoveredByOngoingBooking = roomBookings.some(booking => {
                    const bookingStart = parseISO(`2000-01-01T${booking.start_time}`);
                    const bookingEnd = parseISO(`2000-01-01T${booking.end_time}`);
                    return isBefore(bookingStart, slotStart) && isAfter(bookingEnd, slotStart);
                  });

                  if (isCoveredByOngoingBooking) {
                    // This slot is part of an ongoing booking, so we don't render a separate cell for it.
                    // Render a transparent div to maintain grid structure and prevent clicks.
                    return (
                      <div
                        key={`covered-slot-${slotTime}`}
                        className="h-[60px] absolute left-0 right-0 z-5"
                        style={{ top: `${index * 60}px` }}
                      ></div>
                    );
                  } else {
                    // Empty slot
                    return (
                      <div
                        key={`empty-slot-${slotTime}`}
                        className="h-[60px] flex items-center justify-center p-1 border-b border-gray-200 dark:border-gray-700 last:border-b-0 bg-gray-50 dark:bg-gray-700/20 group hover:bg-gray-100 dark:hover:bg-gray-700/40 cursor-pointer"
                        onClick={() => handleEmptySlotClick(slotTime)}
                      >
                        <Plus className="h-5 w-5 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    );
                  }
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