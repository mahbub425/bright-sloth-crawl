import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO, addMinutes, isBefore, isAfter, startOfDay, endOfDay, isSameDay } from "date-fns";
import { CalendarIcon, Clock, Users, Info, Image as ImageIcon, Plus } from "lucide-react"; // Added Plus import
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

  while (isBefore(currentTime, endTime)) {
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
      // Optionally, show details of the booked slot if needed, or do nothing
      toast({
        title: "Slot Booked",
        description: "This time slot is already booked.",
        variant: "default", // Changed from "info" to "default"
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            {room.image && (
              <div className="col-span-full md:col-span-1">
                <img src={room.image} alt={room.name} className="w-full h-48 object-cover rounded-md" />
              </div>
            )}
            <div className="col-span-full md:col-span-1 flex flex-col justify-center">
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                <Users className="h-4 w-4 mr-2" /> Capacity: {room.capacity || "N/A"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-2">
                <Info className="h-4 w-4 mr-2" /> Facilities: {room.facilities || "N/A"}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center mt-2">
                <Clock className="h-4 w-4 mr-2" /> Available: {room.available_time ? `${room.available_time.start} - ${room.available_time.end}` : "24 hours"}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Select Date</h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border shadow mx-auto"
              numberOfMonths={1}
            />
          </div>

          <h3 className="text-lg font-semibold mb-2">Time Slots for {selectedDate ? format(selectedDate, "PPP") : "Selected Date"}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-60 overflow-y-auto pr-2">
            {timeSlots.length > 0 ? (
              timeSlots.map((slot) => {
                const booked = isSlotBooked(slot);
                const bookingInSlot = getBookingInSlot(slot);
                const cellClasses = cn(
                  "p-2 rounded-md text-center text-sm cursor-pointer transition-colors",
                  booked
                    ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                    : "bg-gray-50 dark:bg-gray-700/20 hover:bg-gray-100 dark:hover:bg-gray-700/40"
                );
                return (
                  <div
                    key={slot}
                    className={cellClasses}
                    onClick={() => handleSlotClick(slot)}
                  >
                    {booked ? (
                      <>
                        <span className="font-medium">{bookingInSlot?.title.substring(0, 15)}{bookingInSlot?.title && bookingInSlot.title.length > 15 ? "..." : ""}</span>
                        <br />
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