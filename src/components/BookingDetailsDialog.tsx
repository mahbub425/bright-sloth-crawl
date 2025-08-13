import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Booking } from "@/types/database";
import { format, parseISO } from "date-fns";
import { useSession } from "@/components/SessionProvider";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/auth";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface BookingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: Booking | null;
  onEdit: (booking: Booking) => void;
  onDeleteSuccess: () => void;
}

const BookingDetailsDialog: React.FC<BookingDetailsDialogProps> = ({
  open,
  onOpenChange,
  booking,
  onEdit,
  onDeleteSuccess,
}) => {
  const { session, isAdmin } = useSession();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!booking) return;

    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', booking.id);

      if (error) throw error;

      toast({
        title: "Booking Deleted",
        description: "The meeting booking has been successfully deleted.",
      });
      onDeleteSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Deletion Error",
        description: error.message || "An unexpected error occurred during deletion.",
        variant: "destructive",
      });
    }
  };

  if (!booking) {
    return null;
  }

  const isOwner = session?.user?.id === booking.user_id;
  const canModify = isOwner || isAdmin;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Booking Details</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4 text-gray-700 dark:text-gray-300">
          <div>
            <p className="font-semibold">Meeting Title:</p>
            <p>{booking.title}</p>
          </div>
          <div>
            <p className="font-semibold">Room ID:</p>
            <p>{booking.room_id}</p>
          </div>
          <div>
            <p className="font-semibold">Date:</p>
            <p>{format(parseISO(booking.date), "PPP")}</p>
          </div>
          <div>
            <p className="font-semibold">Time:</p>
            <p>{format(parseISO(`2000-01-01T${booking.start_time}`), "h:mma")} - {format(parseISO(`2000-01-01T${booking.end_time}`), "h:mma")}</p>
          </div>
          <div>
            <p className="font-semibold">Booked by:</p>
            <p>{booking.user_name} ({booking.user_pin})</p>
          </div>
          <div>
            <p className="font-semibold">Department:</p>
            <p>{booking.user_department || "N/A"}</p>
          </div>
          <div>
            <p className="font-semibold">Remarks:</p>
            <p>{booking.remarks || "N/A"}</p>
          </div>
        </div>
        {canModify && (
          <DialogFooter className="flex flex-col sm:flex-row sm:justify-end sm:space-x-2 pt-4">
            {isOwner && (
              <Button variant="outline" onClick={() => onEdit(booking)} className="w-full sm:w-auto mb-2 sm:mb-0">
                Edit Booking
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">Delete Booking</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your booking.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetailsDialog;