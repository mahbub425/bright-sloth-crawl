import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { supabase } from "@/integrations/supabase/auth";
import { useToast } from "@/components/ui/use-toast";
import { CalendarIcon, Users, ListChecks, Home, BarChart3 } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, subMonths } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Room, AdminPreference } from "@/types/database";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import UserManagement from "@/components/admin/UserManagement";
import BookingList from "@/components/admin/BookingList";
import RoomManagement from "@/components/admin/RoomManagement"; // New import
import { DateRange } from "react-day-picker";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [adminSession, setAdminSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("analytics"); // Default tab

  // Filter states for Analytics
  const [filterRoomId, setFilterRoomId] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<DateRange>({
    from: subMonths(new Date(), 6),
    to: new Date(),
  });
  const [rooms, setRooms] = useState<Room[]>([]);

  useEffect(() => {
    const storedSession = localStorage.getItem('admin_session');
    if (storedSession) {
      const sessionData = JSON.parse(storedSession);
      if (sessionData.expires_at > Date.now()) {
        setAdminSession(sessionData);
        fetchAdminPreferences(sessionData.username); // Fetch preferences after session is set
      } else {
        localStorage.removeItem('admin_session');
        navigate("/admin");
      }
    } else {
      navigate("/admin");
    }
    setIsLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (adminSession) {
      fetchRooms();
    }
  }, [adminSession]);

  const fetchAdminPreferences = async (adminUsername: string) => {
    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .single();

    if (adminProfile && !profileError) {
      const { data: preferences, error } = await supabase
        .from('admin_preferences')
        .select('*')
        .eq('admin_id', adminProfile.id)
        .single();

      if (preferences && !error) {
        setFilterRoomId(preferences.filter_room_id);
        setFilterDateRange({
          from: preferences.filter_date_start ? new Date(preferences.filter_date_start) : subMonths(new Date(), 6),
          to: preferences.filter_date_end ? new Date(preferences.filter_date_end) : new Date(),
        });
      }
    }
  };

  const saveAdminPreference = async () => {
    if (!adminSession) return;

    const { data: adminProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'admin')
      .single();

    if (adminProfile && !profileError) {
      const { error } = await supabase
        .from('admin_preferences')
        .upsert({
          admin_id: adminProfile.id,
          filter_room_id: filterRoomId,
          filter_date_start: filterDateRange.from ? format(filterDateRange.from, "yyyy-MM-dd") : null,
          filter_date_end: filterDateRange.to ? format(filterDateRange.to, "yyyy-MM-dd") : null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'admin_id' });

      if (error) {
        toast({
          title: "Error saving admin preferences",
          description: error.message,
          variant: "destructive",
        });
      }
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

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_session');
    toast({
      title: "Logged Out",
      description: "You have been logged out from the admin panel.",
    });
    navigate("/admin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl">Loading admin panel...</p>
        <MadeWithDyad />
      </div>
    );
  }

  if (!adminSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <h1 className="text-4xl font-bold mb-4">Admin Access Denied</h1>
        <p className="text-xl text-gray-600">Please log in as an admin to access this page.</p>
        <Button onClick={() => navigate("/admin")} className="mt-4">Go to Admin Login</Button>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="flex flex-1">
        {/* Left Sidebar Menu */}
        <div className="w-64 bg-white dark:bg-gray-800 shadow-md p-4 flex flex-col">
          <h2 className="text-2xl font-bold mb-6 text-center">Admin Panel</h2>
          <nav className="flex-1 space-y-2">
            <Button
              variant={activeTab === "analytics" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("analytics")}
            >
              <BarChart3 className="mr-2 h-4 w-4" /> Analytics
            </Button>
            <Button
              variant={activeTab === "users" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("users")}
            >
              <Users className="mr-2 h-4 w-4" /> User Management
            </Button>
            <Button
              variant={activeTab === "bookings" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("bookings")}
            >
              <ListChecks className="mr-2 h-4 w-4" /> Booking List
            </Button>
            <Button
              variant={activeTab === "rooms" ? "secondary" : "ghost"}
              className="w-full justify-start"
              onClick={() => setActiveTab("rooms")}
            >
              <Home className="mr-2 h-4 w-4" /> Manage Room
            </Button>
          </nav>
          <div className="mt-auto pt-4 border-t dark:border-gray-700">
            <Button onClick={handleAdminLogout} className="w-full bg-red-600 hover:bg-red-700">
              Logout Admin
            </Button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 p-6 overflow-auto">
          {activeTab === "analytics" && (
            <AnalyticsDashboard
              filterRoomId={filterRoomId}
              setFilterRoomId={setFilterRoomId}
              filterDateRange={filterDateRange}
              setFilterDateRange={setFilterDateRange}
              rooms={rooms}
              saveAdminPreference={saveAdminPreference}
            />
          )}
          {activeTab === "users" && (
            <UserManagement />
          )}
          {activeTab === "bookings" && (
            <BookingList />
          )}
          {activeTab === "rooms" && (
            <RoomManagement /> {/* Render the new RoomManagement component */}
          )}
        </div>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default AdminDashboard;