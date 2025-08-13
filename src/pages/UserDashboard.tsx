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
import { Label } from "@/components/ui/label"; // Added this import

const UserDashboard = () => {
  const { session, isAdmin, isLoading } = useSession();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [layout, setLayout] = useState<"daily" | "weekly">("daily");
  const [isProfileViewOpen, setIsProfileViewOpen] = useState(false);
  const [isProfileEditOpen, setIsProfileEditOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    if (session) {
      fetchUserProfile();
    }
  }, [session]);

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

  const loggedInAs = isAdmin ? "Super Admin" : session?.user?.email;

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
            <Select value={layout} onValueChange={(value: "daily" | "weekly") => setLayout(value)}>
              <SelectTrigger id="layout-filter">
                <SelectValue placeholder="Select layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Right Content Area (Main Schedule View) */}
        <div className="flex-1 p-4 overflow-auto">
          <h2 className="text-2xl font-bold mb-4">
            {layout === "daily" ? "Daily Schedule" : "Weekly Schedule"} for {selectedDate ? format(selectedDate, "EEEE, MMMM dd, yyyy") : "Selected Date"}
          </h2>
          {/* Placeholder for Room List and Schedule Grid */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md min-h-[400px] flex items-center justify-center">
            <p className="text-gray-500 dark:text-gray-400">
              {layout === "daily" ? "Daily schedule view will be here." : "Weekly schedule view will be here."}
            </p>
          </div>
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

      <MadeWithDyad />
    </div>
  );
};

export default UserDashboard;