import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/auth";
import { useToast } from "@/components/ui/use-toast";
import { Room, Booking, UserProfile } from "@/types/database";
import AnalyticsFilters from "./AnalyticsFilters";
import AnalyticsCards from "./AnalyticsCards";
import BookingsByRoomChart from "./BookingsByRoomChart";
import DailyBookingGrowthChart from "./DailyBookingGrowthChart";
import { format } from "date-fns";

interface AnalyticsDashboardProps {
  filterRoomId: string | null;
  setFilterRoomId: (id: string | null) => void;
  filterDateRange: { from?: Date; to?: Date };
  setFilterDateRange: (range: { from?: Date; to?: Date }) => void;
  rooms: Room[];
  saveAdminPreference: () => void;
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  filterRoomId,
  setFilterRoomId,
  filterDateRange,
  setFilterDateRange,
  rooms,
  saveAdminPreference,
}) => {
  const { toast } = useToast();
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [totalBookings, setTotalBookings] = useState<number>(0);
  const [todaysBookings, setTodaysBookings] = useState<number>(0);
  const [bookingsData, setBookingsData] = useState<Booking[]>([]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [filterRoomId, filterDateRange]);

  const fetchAnalyticsData = async () => {
    // Fetch Total Users
    const { count: usersCount, error: usersError } = await supabase
      .from('profiles')
      .select('id', { count: 'exact' })
      .eq('status', 'active');

    if (usersError) {
      toast({ title: "Error", description: "Failed to fetch total users.", variant: "destructive" });
    } else {
      setTotalUsers(usersCount || 0);
    }

    // Fetch Bookings data for cards and charts
    let query = supabase.from('bookings').select(`
      *,
      profiles (
        name,
        pin,
        department
      ),
      rooms (
        name
      )
    `);

    if (filterRoomId) {
      query = query.eq('room_id', filterRoomId);
    }
    if (filterDateRange.from) {
      query = query.gte('date', format(filterDateRange.from, 'yyyy-MM-dd'));
    }
    if (filterDateRange.to) {
      query = query.lte('date', format(filterDateRange.to, 'yyyy-MM-dd'));
    }

    const { data: bookings, error: bookingsError, count: filteredBookingsCount } = await query.order('date', { ascending: true });

    if (bookingsError) {
      toast({ title: "Error", description: "Failed to fetch bookings data.", variant: "destructive" });
    } else {
      setBookingsData(bookings || []);
      setTotalBookings(filteredBookingsCount || 0);

      // Calculate Today's Bookings from the fetched data (if date range includes today)
      const today = format(new Date(), 'yyyy-MM-dd');
      const countToday = bookings?.filter(b => b.date === today).length || 0;
      setTodaysBookings(countToday);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Analytics Dashboard</h1>

      <AnalyticsFilters
        filterRoomId={filterRoomId}
        setFilterRoomId={setFilterRoomId}
        filterDateRange={filterDateRange}
        setFilterDateRange={setFilterDateRange}
        rooms={rooms}
        onApplyFilters={fetchAnalyticsData}
        onSavePreferences={saveAdminPreference}
      />

      <AnalyticsCards
        totalUsers={totalUsers}
        totalBookings={totalBookings}
        todaysBookings={todaysBookings}
        rating={4.6} // Static rating as per requirements
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BookingsByRoomChart bookings={bookingsData} rooms={rooms} />
        <DailyBookingGrowthChart bookings={bookingsData} rooms={rooms} />
      </div>
    </div>
  );
};

export default AnalyticsDashboard;