import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO, addMinutes, isBefore, isAfter, isSameDay, startOfWeek, addDays } from "date-fns";
import { Clock, Users, Info, Image as ImageIcon, Plus } from "lucide-react";
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

const generateTimeOptions = (start: string, end: string, intervalMinutes: number = 30) => {
  const options = [];
  let currentTime = parseISO(`2000-01-01T${start}:00`);
  const endTime = parseISO(`2000-01-01T${end}:00`);

  while (isBefore(currentTime, endTime) || isSameDay(currentTime, endTime)) {
    options.push(format(currentTime, "HH:mm"));
    currentTime = addMinutes(currentTime, intervalMinutes);
  }
  return options;
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
  const [timeSlots, setTimeSlots] = useState<string[]>([]);

  useEffect(() => {
    if (room && selectedDate) {
      fetchRoomBookings(room.id, selectedDate);
      if (room.available_time) {
        setTimeSlots(generateTimeOptions(room.available_time.start, room.available_time.end));
      } else {
        setTimeSlots(generateTimeOptions("00:00", "23:59")); // Default to full day if not specified
      }
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

  const isSlotBooked = (slotTime: string) => {
    const slotStart = parseISO(`2000-01-01T${slotTime}:00`);
    const slotEnd = addMinutes(slotStart, 30); // Assuming 30 min slots

    return roomBookings.some(booking => {
      const bookingStart = parseISO(`2000-01-01T${booking.start_time}`);
      const bookingEnd = parseISO(`2000-01-01T${booking.end_time}`);
      return isBefore(bookingStart, slotEnd) && isAfter(bookingEnd, slotStart);
    });
  };

  const getBookingInSlot = (slotTime: string) => {
    const slotStart = parseISO(`2000-01-01T${slotTime}:00`);
    const slotEnd = addMinutes(slotStart, 30);

    return roomBookings.find(booking => {
      const bookingStart = parseISO(`2000-01-01T${booking.start_time}`);
      const bookingEnd = parseISO(`2000-01-01T${booking.end_time}`);
      return isBefore(bookingStart, slotEnd) && isAfter(bookingEnd, slotStart);
    });
  };

  const handleSlotClick = (slotTime: string) => {
    if (!room || !selectedDate) return;

    const booked = isSlotBooked(slotTime);
    if (!booked) {
      // Default to 1-hour slot for new booking
      const startTime = slotTime;
      const endTime = format(addMinutes(parseISO(`2000-01-01T${slotTime}`), 60), "HH:mm");
      onBookSlot(room.id, selectedDate, startTime, endTime);
      onOpenChange(false); // Close this dialog after initiating booking
    } else {
      toast({
        title: "Slot Booked",
        description: "This time slot is already booked.",
        variant: "default",
      });
    }
  };

  if (!room) {
    return null;
  }

  // Generate dates for current and next week
  const startOfCurrentWeek = startOfWeek(selectedDate || new Date(), { weekStartsOn: 0 }); // Sunday as start of week
  const currentWeekDates = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, i));
  const nextWeekDates = Array.from({ length: 7 }).map((_, i) => addDays(startOfCurrentWeek, 7 + i));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0"> {/* Removed padding and added p-0 */}
        <DialogHeader className="p-6 pb-4"> {/* Added padding back to header */}
          <DialogTitle className="text-center">{room.name}</DialogTitle>
        </DialogHeader>

        {/* Room Image */}
        {room.image && (
          <div className="mb-4 px-6"> {/* Added horizontal padding */}
            <img src={room.image} alt={room.name} className="w-full h-48 object-cover rounded-md" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white rounded-b-md">
              <p className="text-sm font-semibold">Capacity {room.capacity}, {room.facilities}</p>
            </div>
          </div>
        )}

        {/* Date Range Display (as per screenshot) */}
        <div className="px-6 mb-4 flex items-center justify-center text-gray-700 dark:text-gray-300">
          <span className="font-semibold">{format(currentWeekDates[0], "MMM dd, yyyy")}</span>
          <span className="mx-2">-</span>
          <span className="font-semibold">{format(currentWeekDates[6], "MMM dd, yyyy")}</span>
        </div>

        {/* Custom Date Selector */}
        <div className="px-6 mb-6"> {/* Added horizontal padding */}
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

        {/* Time Slots */}
        <div className="flex-1 overflow-y-auto px-6 pb-4"> {/* Only this section scrolls */}
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Time Slots for {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}</h3>
          <div className="grid grid-cols-1 gap-2"> {/* Changed to single column for time slots */}
            {timeSlots.length > 0 ? (
              timeSlots.map((slot) => {
                const booked = isSlotBooked(slot);
                const bookingInSlot = getBookingInSlot(slot);
                
                return (
                  <div
                    key={slot}
                    className={cn(
                      "p-2 rounded-md text-center text-sm cursor-pointer transition-colors flex justify-between items-center min-h-[60px] border border-gray-200 dark:border-gray-700",
                      booked
                        ? "text-white" // Text color for booked slots
                        : "bg-gray-50 dark:bg-gray-700/20 hover:bg-gray-100 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300"
                    )}
                    style={booked ? { backgroundColor: room.color || "#888" } : {}} // Apply room color for booked slots
                    onClick={() => handleSlotClick(slot)}
                  >
                    <span className="font-medium w-1/4 text-left">{format(parseISO(`2000-01-01T${slot}`), "h:mma")}</span>
                    {booked ? (
                      <div className="flex-1 text-center">
                        <span className="font-medium">{bookingInSlot?.title}</span>
                        <br />
                        <span className="text-[10px] opacity-80">
                          {format(parseISO(`2000-01-01T${bookingInSlot?.start_time}`), "h:mma")} - {format(parseISO(`2000-01-01T${bookingInSlot?.end_time}`), "h:mma")}
                        </span>
                      </div>
                    ) : (
                      <div className="flex-1 flex justify-center items-center">
                        <Plus className="h-5 w-5 text-gray-400" />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="col-span-full text-center text-gray-500">No available time slots for this room.</p>
            )}
          </div>
        </div>
        <DialogFooter className="p-6 pt-4"> {/* Added padding back to footer */}
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyRoomDetailsDialog;