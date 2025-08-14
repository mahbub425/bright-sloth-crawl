import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/auth";
import { useToast } from "@/components/ui/use-toast";
import { Booking, Room } from "@/types/database";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Eye, Edit, Trash2, CalendarIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parseISO } from "date-fns"; // Removed subMonths
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import BookingDetailsDialog from "@/components/BookingDetailsDialog";
import BookingFormDialog from "@/components/BookingFormDialog";
import { useSession } from "@/components/SessionProvider";

const bookingsPerPageOptions = [10, 20, 50, 100];

const BookingList = () => {
  const { toast } = useToast();
  const { session } = useSession();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRoomId, setFilterRoomId] = useState<string | null>(null);
  const [filterDateRange, setFilterDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [bookingsPerPage, setBookingsPerPage] = useState(bookingsPerPageOptions[0]);
  const [totalBookingsCount, setTotalBookingsCount] = useState(0);

  const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false);
  const [viewingBooking, setViewingBooking] = useState<Booking | null>(null);
  const [isEditFormOpen, setIsEditFormOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [selectedRoomForBooking, setSelectedRoomForBooking] = useState<Room | null>(null);


  const fetchRooms = useCallback(async () => {
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
  }, [toast]);

  const fetchBookings = useCallback(async () => {
    const offset = (currentPage - 1) * bookingsPerPage;
    let query = supabase
      .from('bookings')
      .select(`
        *,
        profiles (
          name,
          pin,
          department
        ),
        rooms (
          name
        )
      `, { count: 'exact' });

    if (filterRoomId) {
      query = query.eq('room_id', filterRoomId);
    }
    if (filterDateRange.from) {
      query = query.gte('date', format(filterDateRange.from, 'yyyy-MM-dd'));
    }
    if (filterDateRange.to) {
      query = query.lte('date', format(filterDateRange.to, 'yyyy-MM-dd'));
    }
    if (searchQuery) {
      query = query.or(`title.ilike.%${searchQuery}%,profiles.name.ilike.%${searchQuery}%,profiles.pin.ilike.%${searchQuery}%,profiles.department.ilike.%${searchQuery}%`);
    }

    const { data, error, count } = await query
      .order('date', { ascending: false })
      .order('start_time', { ascending: true })
      .range(offset, offset + bookingsPerPage - 1);

    if (error) {
      toast({
        title: "Error fetching bookings",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const bookingsWithDetails = data?.map(booking => ({
        ...booking,
        user_name: booking.profiles?.name,
        user_pin: booking.profiles?.pin,
        user_department: booking.profiles?.department,
        room_name: booking.rooms?.name, // Add room name
      })) as Booking[] || [];
      setBookings(bookingsWithDetails);
      setTotalBookingsCount(count || 0);
    }
  }, [searchQuery, filterRoomId, filterDateRange, currentPage, bookingsPerPage, toast]);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const handleSearch = () => {
    setCurrentPage(1); // Reset to first page on new search
    fetchBookings();
  };

  const handleBookingOperationSuccess = () => {
    setIsViewDetailsOpen(false);
    setIsEditFormOpen(false);
    setViewingBooking(null);
    setEditingBooking(null);
    fetchBookings(); // Re-fetch bookings to update the list
  };

  const handleViewBooking = (booking: Booking) => {
    setViewingBooking(booking);
    setIsViewDetailsOpen(true);
  };

  const handleEditBooking = (booking: Booking) => {
    setEditingBooking(booking);
    setSelectedRoomForBooking(rooms.find(r => r.id === booking.room_id) || null);
    setIsEditFormOpen(true);
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Booking Deleted",
        description: "The meeting booking has been successfully deleted.",
      });
      handleBookingOperationSuccess();
    } catch (error: any) {
      toast({
        title: "Deletion Error",
        description: error.message || "An unexpected error occurred during deletion.",
        variant: "destructive",
      });
    }
  };

  const totalPages = Math.ceil(totalBookingsCount / bookingsPerPage);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold mb-6">Booking List</h1>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-end gap-4 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex-1 flex items-center space-x-2 min-w-[250px]">
          <Input
            placeholder="Search by title, name, PIN, department..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
          />
          <Button onClick={handleSearch}>
            <Search className="h-4 w-4 mr-2" /> Search
          </Button>
        </div>

        <div className="flex flex-col space-y-1">
          <label htmlFor="room-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Room
          </label>
          <Select
            value={filterRoomId || ""}
            onValueChange={(value) => setFilterRoomId(value === "all" ? null : value)}
          >
            <SelectTrigger id="room-filter" className="w-[180px]">
              <SelectValue placeholder="Select Room" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Rooms</SelectItem>
              {rooms.map((room) => (
                <SelectItem key={room.id} value={room.id}>
                  {room.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <label htmlFor="date-range-filter" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Date Range
          </label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date-range-filter"
                variant={"outline"}
                className={cn(
                  "w-[280px] justify-start text-left font-normal",
                  !filterDateRange?.from && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {filterDateRange?.from ? (
                  filterDateRange.to ? (
                    <>
                      {format(filterDateRange.from, "LLL dd, y")} -{" "}
                      {format(filterDateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(filterDateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={filterDateRange.from || new Date()}
                selected={filterDateRange}
                onSelect={(range: DateRange | undefined) => setFilterDateRange(range || { from: undefined, to: undefined })}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
        <Button onClick={() => { setCurrentPage(1); fetchBookings(); }} className="mt-auto">Apply Filters</Button>
      </div>

      {/* Booking List Table */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">All Bookings</h2>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Meeting Title</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>PIN</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Meeting Time</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center text-gray-500">
                    No bookings found.
                  </TableCell>
                </TableRow>
              ) : (
                bookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.title}</TableCell>
                    <TableCell>{booking.room_name || "N/A"}</TableCell>
                    <TableCell>{booking.user_name || "N/A"}</TableCell>
                    <TableCell>{booking.user_pin || "N/A"}</TableCell>
                    <TableCell>{booking.user_department || "N/A"}</TableCell>
                    <TableCell>{format(parseISO(booking.date), "MMM dd, yyyy")}</TableCell>
                    <TableCell>{format(parseISO(`2000-01-01T${booking.start_time}`), "h:mma")} - {format(parseISO(`2000-01-01T${booking.end_time}`), "h:mma")}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="outline" size="sm" onClick={() => handleViewBooking(booking)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleEditBooking(booking)}>
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
                              This action cannot be undone. This will permanently delete the booking.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteBooking(booking.id)}>Delete</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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
            <Select value={String(bookingsPerPage)} onValueChange={(value) => { setBookingsPerPage(Number(value)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[80px]">
                <SelectValue placeholder={bookingsPerPage} />
              </SelectTrigger>
              <SelectContent>
                {bookingsPerPageOptions.map(option => (
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

      {/* Booking Details Dialog */}
      {isViewDetailsOpen && (
        <BookingDetailsDialog
          open={isViewDetailsOpen}
          onOpenChange={setIsViewDetailsOpen}
          booking={viewingBooking}
          onEdit={handleEditBooking}
          onDeleteSuccess={handleBookingOperationSuccess}
        />
      )}

      {/* Booking Form Dialog (for editing) */}
      {isEditFormOpen && session?.user?.id && (
        <BookingFormDialog
          open={isEditFormOpen}
          onOpenChange={setIsEditFormOpen}
          room={selectedRoomForBooking}
          selectedDate={parseISO(editingBooking?.date || format(new Date(), 'yyyy-MM-dd'))}
          initialStartTime={editingBooking?.start_time.substring(0,5) || undefined}
          initialEndTime={editingBooking?.end_time.substring(0,5) || undefined}
          existingBooking={editingBooking}
          onBookingSuccess={handleBookingOperationSuccess}
          userId={session.user.id}
        />
      )}
    </div>
  );
};

export default BookingList;