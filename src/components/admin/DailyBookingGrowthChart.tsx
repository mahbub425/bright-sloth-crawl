import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Booking, Room } from "@/types/database";
import { format, parseISO } from "date-fns";

interface DailyBookingGrowthChartProps {
  bookings: Booking[];
  rooms: Room[];
}

const DailyBookingGrowthChart: React.FC<DailyBookingGrowthChartProps> = ({ bookings, rooms }) => {
  const roomNameMap = new Map(rooms.map(room => [room.id, room.name]));

  // Aggregate bookings by date and room
  const aggregatedData = bookings.reduce((acc: { [key: string]: { [key: string]: number } }, booking) => {
    const date = format(parseISO(booking.date), 'yyyy-MM-dd');
    const roomName = roomNameMap.get(booking.room_id) || "Unknown Room";

    if (!acc[date]) {
      acc[date] = {};
    }
    acc[date][roomName] = (acc[date][roomName] || 0) + 1;
    return acc;
  }, {});

  // Transform into array for Recharts
  const chartData = Object.keys(aggregatedData).sort().map(date => {
    const entry: { date: string; [key: string]: string | number } = { date };
    for (const roomName of Array.from(roomNameMap.values())) {
      entry[roomName] = aggregatedData[date][roomName] || 0;
    }
    return entry;
  });

  // Get unique room names for lines
  const uniqueRoomNames = Array.from(new Set(rooms.map(room => room.name)));

  const colors = ["#8884d8", "#82ca9d", "#ffc658", "#a4de6c", "#d0ed57", "#ffc0cb"]; // Example colors

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Booking Growth</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            {uniqueRoomNames.map((roomName, index) => (
              <Line
                key={roomName}
                type="monotone"
                dataKey={roomName}
                stroke={colors[index % colors.length]}
                activeDot={{ r: 8 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default DailyBookingGrowthChart;