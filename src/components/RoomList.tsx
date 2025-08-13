import React from "react";
import { Room } from "@/types/database";
import { cn } from "@/lib/utils";

interface RoomListProps {
  rooms: Room[];
  selectedRoomId?: string | null;
  onSelectRoom?: (roomId: string) => void;
}

const RoomList: React.FC<RoomListProps> = ({ rooms, selectedRoomId, onSelectRoom }) => {
  return (
    <div className="space-y-2">
      <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300">Meeting Rooms</h4>
      {rooms.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No rooms available.</p>
      ) : (
        <ul className="space-y-1">
          {rooms.map((room) => (
            <li
              key={room.id}
              className={cn(
                "flex items-center p-2 rounded-md cursor-pointer transition-colors",
                "hover:bg-gray-50 dark:hover:bg-gray-700",
                selectedRoomId === room.id && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
              )}
              onClick={() => onSelectRoom?.(room.id)}
            >
              <span
                className="w-3 h-3 rounded-full mr-2"
                style={{ backgroundColor: room.color || "#ccc" }}
              ></span>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{room.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default RoomList;