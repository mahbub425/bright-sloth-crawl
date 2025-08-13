import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Booking, Room } from "@/types/database";

interface BookingsByRoomChartProps {
  bookings: Booking[];
  rooms: Room[];
}

const BookingsByRoomChart: React.FC<BookingsByRoomChartProps> = ({ bookings, rooms }) => {
  const roomMap = new Map(rooms.map(room => [room.id, room.name]));

  const data = bookings.reduce((acc: { name: string; bookings: number }[], booking) => {
    const roomName = roomMap.get(booking.room_id) || "Unknown Room";
    const existingRoom = acc.find(item => item.name === roomName);
    if (existingRoom) {
      existingRoom.bookings += 1;
    } else {
      acc.push({ name: roomName, bookings: 1 });
    }
    return acc;
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bookings Per Room</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="bookings" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default BookingsByRoomChart;