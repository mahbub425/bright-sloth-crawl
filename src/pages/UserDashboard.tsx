import React, { useState, useEffect } from "react";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/components/SessionProvider";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/auth";
import { useNavigate } from "react-router-dom";
import { Calendar as CalendarIcon, Share2, HelpCircle, User as UserIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import ProfileView from "@/components/ProfileView";
import ProfileEdit from "@/components/ProfileEdit";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import RoomList from "@/components/RoomList";
import DailyScheduleGrid from "@/components/DailyScheduleGrid";
import { Room, Booking, UserPreference } from "@/types/database"; // Import types
import BookingFormDialog from "@/components/BookingFormDialog"; // Import BookingFormDialog
import BookingDetailsDialog from "@/components/BookingDetailsDialog"; // Import BookingDetailsDialog

const UserDashboard = () => {
  const { session, isAdmin, isLoading } = useSession();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [layout, setLayout] = useState<"daily" | "weekly">("daily");
  const [isProfileViewOpen, setIsProfileViewOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<Room | null>(null);
  const [bookingFormOpen, setBookingFormOpen] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [bookingDetailsOpen, setBookingDetailsOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null); // State for editing

  useEffect(() => {
    if (session) {
      fetchUserProfile();
      fetchUserPreferences();
    }
    fetchRooms();
  }, [session]);

  useEffect(() => {
    if (selectedDate) {
      fetchBookings(selectedDate);
    }
  }, [selectedDate, session]);

  const fetchUserProfile = async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (error) {
      toast({
        title: "Error fetching profile",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setUserProfile(data);
    }
  };

  const fetchUserPreferences = async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('user_preferences')
      .select('layout')
      .eq('user_id', session.user.id)
      .single();

    if (data && !error) {
      setLayout(data.layout);
    }
  };

  const saveUserPreference = async (newLayout: "daily" | "weekly") => {
    if (!session?.user?.id) return;
    setLayout(newLayout);
    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: session.user.id, layout: newLayout }, { onConflict: 'user_id' });

    if (error) {
      toast({
        title: "Error saving preference",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('status', 'enabled');

    if (error) {
      toast({
        title: "Error fetching rooms",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setRooms(data || []);
    }
  };

  const fetchBookings = async (date: Date) => {
    const formattedDate = format(date, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        profiles (
          name,
          pin,
          department
        )
      `)
      .eq('date', formattedDate);

    if (error) {
      toast({
        title: "Error fetching bookings",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Flatten the data to include user details directly in booking object
      const bookingsWithUserDetails = data.map(booking => ({
        ...booking,
        user_name: booking.profiles?.name,
        user_pin: booking.profiles?.pin,
        user_department: booking.profiles?.department,
      })) as Booking[];
      setBookings(bookingsWithUserDetails || []);
    }
  };

  const handleLogout = async () => {
    if (isAdmin) {
      localStorage.removeItem('admin_session');
      navigate("/admin");
    } else {
      await supabase.auth.signOut();
      navigate("/login");
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: "URL Copied!",
      description: "The system URL has been copied to your clipboard.",
    });
  };

  const handleTodayClick = () => {
    setSelectedDate(new Date());
  };

  const handleBookSlot = (roomId: string, date: Date, startTime: string, endTime: string) => {
    const room = rooms.find(r => r.id === roomId);
    if (room) {
      setSelectedRoomForBooking(room);
      setEditingBooking(null); // Ensure we are in create mode
      setBookingFormOpen(true);
    }
  };

  const handleViewBooking = (booking: Booking) => {
    setViewingBooking(booking);
    setBookingDetailsOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setSelectedRoomForBooking(rooms.find(r => r.id === booking.room_id) || null);
    setBookingDetailsOpen(false); // Close details dialog
    setBookingFormOpen(true); // Open form in edit mode
  };

  const handleBookingOperationSuccess = () => {
    fetchBookings(selectedDate || new Date()); // Refresh bookings for the current date
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl">Loading application...</p>
        <MadeWithDyad />
      </div>
    );
  }

  if (!session && !isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <h1 className="text-4xl font-bold mb-4">Access Denied</h1>
        <p className="text-xl text-gray-600">Please log in to access the dashboard.</p>
        <Button onClick={() => navigate("/login")} className="mt-4">Go to Login</Button>
        <MadeWithDyad />
      </div>
    );
  }

  const loggedInAs = isAdmin ? "Super Admin" : userProfile?.email || session?.user?.email;

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={handleTodayClick}>Today</Button>
          <span className="text-lg font-semibold">
            {selectedDate ? format(selectedDate, "EEEE, MMMM dd, yyyy") : "Select a Date"}
          </span>
        </div>
        <div className="text-xl font-bold text-gray-800 dark:text-gray-200">OnnoRokom Group</div>
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => window.open("https://www.youtube.com/watch?v=dQw4w9WgXcQ", "_blank")}>
            <HelpCircle className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <UserIcon className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{loggedInAs}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsProfileViewOpen(true)}>View Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsProfileEditOpen(true)}>Edit Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-1/4 p-4 border-r dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col space-y-4">
          <h3 className="text-lg font-semibold">Calendar</h3>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border shadow"
          />
          <div className="space-y-2">
            <Label htmlFor="layout-filter">Layout Filter</Label>
            <Select value={layout} onValueChange={(value: "daily" | "weekly") => saveUserPreference(value)}>
              <SelectTrigger id="layout-filter">
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <RoomList rooms={rooms} />
        </div>

        {/* Right Content Area (Main Schedule View) */}
        <div className="flex-1 p-4 overflow-auto">
          <h2 className="text-2xl font-bold mb-4">
            {layout === "daily" ? "Daily Schedule" : "Weekly Schedule"} for {selectedDate ? format(selectedDate, "EEEE, MMMM dd, yyyy") : "Selected Date"}
          </h2>
          {layout === "daily" ? (
            <DailyScheduleGrid
              rooms={rooms}
              bookings={bookings}
              selectedDate={selectedDate || new Date()}
              onBookSlot={handleBookSlot}
              onViewBooking={handleViewBooking}
            />
          ) : (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md min-h-[400px] flex items-center justify-center">
              <p className="text-gray-500 dark:text-gray-400">
                Weekly schedule view will be here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Profile View Dialog */}
      <Dialog open={isProfileViewOpen} onOpenChange={setIsProfileViewOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>User Profile</DialogTitle>
          </DialogHeader>
          <ProfileView profile={userProfile} />
        </DialogContent>
      </Dialog>

      {/* Profile Edit Dialog */}
      <Dialog open={isProfileEditOpen} onOpenChange={setIsProfileEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <ProfileEdit profile={userProfile} onProfileUpdated={() => { fetchUserProfile(); setIsProfileEditOpen(false); }} />
        </DialogContent>
      </Dialog>

      {/* Booking Form Dialog */}
      {bookingFormOpen && session?.user?.id && (
        <BookingFormDialog
          open={bookingFormOpen}
          onOpenChange={setBookingFormOpen}
          room={selectedRoomForBooking}
          selectedDate={selectedDate || new Date()}
          initialStartTime={editingBooking?.start_time.substring(0,5) || undefined}
          initialEndTime={editingBooking?.end_time.substring(0,5) || undefined}
          existingBooking={editingBooking}
          onBookingSuccess={handleBookingOperationSuccess}
          userId={session.user.id}
        />
      )}

      {/* Booking Details Dialog */}
      {bookingDetailsOpen && (
        <BookingDetailsDialog
          open={bookingDetailsOpen}
          onOpenChange={setBookingDetailsOpen}
          booking={viewingBooking}
          onEdit={handleEditBooking}
          onDeleteSuccess={handleBookingOperationSuccess}
        />
      )}

      <MadeWithDyad />
    </div>
  );
};

export default UserDashboard;