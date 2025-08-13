export interface Room {
  id: string;
  name: string;
  color: string | null;
  capacity: number | null;
  facilities: string | null;
  available_time: { start: string; end: string } | null;
  image: string | null;
  status: 'enabled' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  user_id: string;
  room_id: string;
  title: string;
  date: string; // YYYY-MM-DD format
  start_time: string; // HH:MM:SS format
  end_time: string; // HH:MM:SS format
  remarks: string | null;
  created_at: string;
  updated_at: string;
  // Optionally, add user and room details if joined
  user_name?: string;
  user_pin?: string;
  user_department?: string;
  room_name?: string; // Added for BookingList display
}

export interface UserProfile {
  id: string;
  name: string | null;
  pin: string | null;
  phone: string | null;
  email: string | null;
  department: string | null;
  designation: string | null;
  role: 'user' | 'admin';
  status: 'active' | 'blocked';
  created_at: string;
  updated_at: string;
}

export interface UserPreference {
  id: string;
  user_id: string;
  layout: 'daily' | 'weekly';
  updated_at: string;
}

export interface AdminPreference {
  id: string;
  admin_id: string;
  filter_room_id: string | null;
  filter_date_start: string | null;
  filter_date_end: string | null;
  updated_at: string;
}