import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/auth";
import { useToast } from "@/components/ui/use-toast";
import { Room } from "@/types/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Users, Info, Clock, Image as ImageIcon } from "lucide-react";
import { MadeWithDyad } from "@/components/made-with-dyad";

const RoomDetails = () => {
  const { roomId } = useParams<{ roomId: string }>();
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRoom = async () => {
      if (!roomId) {
        toast({
          title: "Error",
          description: "Room ID is missing.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .single();

      if (error) {
        toast({
          title: "Error fetching room details",
          description: error.message,
          variant: "destructive",
        });
        setRoom(null);
      } else {
        setRoom(data);
      }
      setIsLoading(false);
    };

    fetchRoom();
  }, [roomId, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl">Loading room details...</p>
        <MadeWithDyad />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <h1 className="text-4xl font-bold mb-4">Room Not Found</h1>
        <p className="text-xl text-gray-600">The room you are looking for does not exist or is disabled.</p>
        <Button onClick={() => window.history.back()} className="mt-4">Go Back</Button>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-2xl bg-white dark:bg-gray-800 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
            {room.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          {room.image && (
            <div className="flex justify-center">
              <img src={room.image} alt={room.name} className="w-full max-h-80 object-cover rounded-md shadow-md" />
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700 dark:text-gray-300">
            <div className="flex items-center">
              <Users className="h-5 w-5 mr-3 text-blue-500" />
              <span className="font-semibold">Capacity:</span> {room.capacity || "N/A"}
            </div>
            <div className="flex items-center">
              <Info className="h-5 w-5 mr-3 text-green-500" />
              <span className="font-semibold">Facilities:</span> {room.facilities || "N/A"}
            </div>
            <div className="flex items-center col-span-full">
              <Clock className="h-5 w-5 mr-3 text-purple-500" />
              <span className="font-semibold">Available Time:</span> {room.available_time ? `${room.available_time.start} - ${room.available_time.end}` : "24 hours"}
            </div>
            <div className="flex items-center col-span-full">
              <span className="font-semibold mr-3">Status:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                room.status === 'enabled' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {room.status.charAt(0).toUpperCase() + room.status.slice(1)}
              </span>
            </div>
          </div>
          <div className="text-center mt-6">
            <Button onClick={() => window.history.back()}>Back to Dashboard</Button>
          </div>
        </CardContent>
      </Card>
      <MadeWithDyad />
    </div>
  );
};

export default RoomDetails;