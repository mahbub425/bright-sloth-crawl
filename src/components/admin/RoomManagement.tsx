import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/auth";
import { useToast } from "@/components/ui/use-toast";
import { Room } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Plus, Edit, Trash2, ToggleLeft, ToggleRight } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import RoomFormDialog from "./RoomFormDialog";
import { deleteImage, getPathFromPublicUrl } from "@/integrations/supabase/storage";

const roomsPerPageOptions = [10, 20, 50, 100];

const RoomManagement = () => {
  const { toast } = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [roomsPerPage, setRoomsPerPage] = useState(roomsPerPageOptions[0]);
  const [totalRoomsCount, setTotalRoomsCount] = useState(0);
  const [isAddRoomDialogOpen, setIsAddRoomDialogOpen] = useState(false);
  const [isEditRoomDialogOpen, setIsEditRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const fetchRooms = useCallback(async () => {
    const offset = (currentPage - 1) * roomsPerPage;
    let query = supabase
      .from('rooms')
      .select('*', { count: 'exact' });

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,facilities.ilike.%${searchQuery}%`);
    }

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + roomsPerPage - 1);

    if (error) {
      toast({
        title: "Error fetching rooms",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setRooms(data || []);
      setTotalRoomsCount(count || 0);
    }
  }, [searchQuery, currentPage, roomsPerPage, toast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page on new search
    fetchRooms();
  };

  const handleAddRoomSuccess = () => {
    setIsAddRoomDialogOpen(false);
    fetchRooms();
    toast({ title: "Room Added", description: "New room has been successfully added." });
  };

  const handleEditRoomSuccess = () => {
    setIsEditRoomDialogOpen(false);
    setEditingRoom(null);
    fetchRooms();
    toast({ title: "Room Updated", description: "Room details have been successfully updated." });
  };

  const handleDeleteRoom = async (room: Room) => {
    try {
      // Delete associated image from storage if exists
      if (room.image) {
        const imagePath = getPathFromPublicUrl(room.image);
        if (imagePath) {
          await deleteImage(imagePath);
        }
      }

      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', room.id);

      if (error) throw error;

      toast({ title: "Room Deleted", description: "Room has been successfully deleted." });
      fetchRooms();
    } catch (error: any) {
      toast({
        title: "Deletion Error",
        description: error.message || "An unexpected error occurred during room deletion.",
        variant: "destructive",
      });
    }
  };

  const handleToggleRoomStatus = async (room: Room) => {
    const newStatus = room.status === 'enabled' ? 'disabled' : 'enabled';
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', room.id);

      if (error) throw error;

      toast({
        title: "Room Status Updated",
        description: `Room ${room.name} has been ${newStatus}.`,
      });
      fetchRooms();
    } catch (error: any) {
      toast({
        title: "Status Update Error",
        description: error.message || "An unexpected error occurred while updating room status.",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(totalRoomsCount / roomsPerPage);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Room Management</h1>

      {/* Search and Action Buttons */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex-1 flex items-center space-x-2 min-w-[250px]">
          <Input
            placeholder="Search by room name or facilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" /> Search
          </Button>
        </div>
        <Button onClick={() => setIsAddRoomDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Add New Room
        </Button>
      </div>

      {/* Room List Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Room List</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Room Name</TableHead>
                <TableHead>Capacity</TableHead>
                <TableHead>Facilities</TableHead>
                <TableHead>Available Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-gray-500">
                    No rooms found.
                  </TableCell>
                </TableRow>
              ) : (
                rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell>
                      {room.image ? (
                        <img src={room.image} alt={room.name} className="w-12 h-12 object-cover rounded-md" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center text-gray-500 dark:text-gray-400 text-xs">
                          No Img
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell>{room.capacity}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{room.facilities || "N/A"}</TableCell>
                    <TableCell>{room.available_time ? `${room.available_time.start} - ${room.available_time.end}` : "24 hours"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        room.status === 'enabled' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {room.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingRoom(room); setIsEditRoomDialogOpen(true); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This action cannot be undone. This will permanently delete the room and its associated image.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteRoom(room)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleRoomStatus(room)}
                      >
                        {room.status === 'enabled' ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-700 dark:text-gray-300">Rows per page:</span>
            <Select value={String(roomsPerPage)} onValueChange={(value) => { setRoomsPerPage(Number(value)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder={roomsPerPage} />
              </SelectTrigger>
              <SelectContent>
                {roomsPerPageOptions.map(option => (
                  <SelectItem key={option} value={String(option)}>{option}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} />
              </PaginationItem>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <PaginationItem key={page}>
                  <PaginationLink
                    isActive={currentPage === page}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ))}
              <PaginationItem>
                <PaginationNext onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>

      {/* Add/Edit Room Dialog */}
      {isAddRoomDialogOpen && (
        <RoomFormDialog
          open={isAddRoomDialogOpen}
          onOpenChange={setIsAddRoomDialogOpen}
          onSaveSuccess={handleAddRoomSuccess}
        />
      )}
      {isEditRoomDialogOpen && editingRoom && (
        <RoomFormDialog
          open={isEditRoomDialogOpen}
          onOpenChange={setIsEditRoomDialogOpen}
          room={editingRoom}
          onSaveSuccess={handleEditRoomSuccess}
        />
      )}
    </div>
  );
};

export default RoomManagement;