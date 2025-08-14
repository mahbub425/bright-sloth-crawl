import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, addMinutes, isBefore, isAfter, isSameDay } from "date-fns";
import { CalendarIcon, Clock, Users, Info, Image as ImageIcon, Plus } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{room.name} Details</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-4">
          {/* Room Image */}
          {room.image && (
            <div className="mb-4">
              <img src={room.image} alt={room.name} className="w-full h-48 object-cover rounded-md" />
            </div>
          )}

          {/* Room Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="flex items-center text-gray-700 dark:text-gray-300">
              <Users className="h-5 w-5 mr-2 text-blue-500" />
              <span className="font-semibold">Capacity:</span> {room.capacity || "N/A"}
            </div>
            <div className="flex items-center text-gray-700 dark:text-gray-300">
              <Clock className="h-5 w-5 mr-2 text-green-500" />
              <span className="font-semibold">Available:</span> {room.available_time ? `${room.available_time.start} - ${room.available_time.end}` : "24 hours"}
            </div>
            <div className="col-span-full flex items-start text-gray-700 dark:text-gray-300">
              <Info className="h-5 w-5 mr-2 text-purple-500 flex-shrink-0 mt-1" />
              <span className="font-semibold">Facilities:</span> {room.facilities || "N/A"}
            </div>
          </div>

          {/* Calendar for Date Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Select Date</h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border shadow mx-auto bg-white dark:bg-gray-800"
              numberOfMonths={1}
            />
          </div>

          {/* Time Slots */}
          <h3 className="text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200">Time Slots for {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-2">
            {timeSlots.length > 0 ? (
              timeSlots.map((slot) => {
                const booked = isSlotBooked(slot);
                const bookingInSlot = getBookingInSlot(slot);
                
                return (
                  <div
                    key={slot}
                    className={cn(
                      "p-2 rounded-md text-center text-sm cursor-pointer transition-colors flex flex-col justify-center items-center min-h-[60px]",
                      booked
                        ? "text-white" // Text color for booked slots
                        : "bg-gray-50 dark:bg-gray-700/20 hover:bg-gray-100 dark:hover:bg-gray-700/40 text-gray-700 dark:text-gray-300"
                    )}
                    style={booked ? { backgroundColor: room.color || "#888" } : {}} // Apply room color for booked slots
                    onClick={() => handleSlotClick(slot)}
                  >
                    {booked ? (
                      <>
                        <span className="font-medium">{bookingInSlot?.title.substring(0, 15)}{bookingInSlot?.title && bookingInSlot.title.length > 15 ? "..." : ""}</span>
                        <span className="text-[10px] opacity-80">
                          {format(parseISO(`2000-01-01T${bookingInSlot?.start_time}`), "h:mma")} - {format(parseISO(`2000-01-01T${bookingInSlot?.end_time}`), "h:mma")}
                        </span>
                      </>
                    ) : (
                      <>
                        {format(parseISO(`2000-01-01T${slot}`), "h:mma")}
                        <Plus className="h-4 w-4 mx-auto mt-1 text-gray-400" />
                      </>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="col-span-full text-center text-gray-500">No available time slots for this room.</p>
            )}
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WeeklyRoomDetailsDialog;