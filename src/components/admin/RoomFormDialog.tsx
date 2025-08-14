import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/auth";
import { deleteImage, getPathFromPublicUrl, getPublicImageUrl, BUCKET_NAME } from "@/integrations/supabase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Room } from "@/types/database";
import { Image as ImageIcon, Maximize, Clock, Info, Palette, Text } from "lucide-react";

const timeOptions = Array.from({ length: 24 * 2 }).map((_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

const generateRandomColor = () => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

const formSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  capacity: z.coerce.number().min(1, "Capacity must be at least 1"),
  facilities: z.string().optional(),
  availableTimeStart: z.string().min(1, "Start time is required"),
  availableTimeEnd: z.string().min(1, "End time is required"),
  imageFile: z.any()
    .refine((file) => !file || file.length === 0 || file[0].size <= 5 * 1024 * 1024, `Max image size is 5MB.`)
    .refine((file) => !file || file.length === 0 || ['image/jpeg', 'image/png'].includes(file[0].type), `Only .jpg, .jpeg, .png formats are supported.`)
    .optional(),
  color: z.string().optional(), // For manual color selection
});

interface RoomFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  room?: Room | null; // Optional for add, present for edit
  onSaveSuccess: () => void;
}

const RoomFormDialog: React.FC<RoomFormDialogProps> = ({ open, onOpenChange, room, onSaveSuccess }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: room?.name || "",
      capacity: room?.capacity || 1,
      facilities: room?.facilities || "",
      availableTimeStart: room?.available_time?.start || "09:00",
      availableTimeEnd: room?.available_time?.end || "17:00",
      color: room?.color || generateRandomColor(),
    },
  });

  useEffect(() => {
    if (open && room) {
      form.reset({
        name: room.name || "",
        capacity: room.capacity || 1,
        facilities: room.facilities || "",
        availableTimeStart: room.available_time?.start || "09:00",
        availableTimeEnd: room.available_time?.end || "17:00",
        color: room.color || generateRandomColor(),
        imageFile: undefined, // Clear file input on edit, but don't set to null
      });
      setCurrentImageUrl(room.image);
    } else if (open && !room) {
      // Reset for new room form
      form.reset({
        name: "",
        capacity: 1,
        facilities: "",
        availableTimeStart: "09:00",
        availableTimeEnd: "17:00",
        color: generateRandomColor(),
        imageFile: undefined,
      });
      setCurrentImageUrl(null);
    }
  }, [open, room, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    let finalImageUrlForDb: string | null = currentImageUrl; // Initialize with current displayed URL

    try {
      const imageFileInput = form.getValues("imageFile"); // Get the actual FileList from the form

      // Case 1: A new image file is selected (imageFileInput is a FileList with at least one file)
      if (imageFileInput && imageFileInput.length > 0) {
        const file = imageFileInput[0];
        const fileExtension = file.name.split('.').pop();
        const fileId = room?.id || crypto.randomUUID();
        const filePathInBucket = `public/${fileId}.${fileExtension}`;

        // Delete old image if it exists and its path is different from the new one
        if (currentImageUrl) {
          const oldPathInBucket = getPathFromPublicUrl(currentImageUrl);
          if (oldPathInBucket && oldPathInBucket !== filePathInBucket) {
            await deleteImage(oldPathInBucket);
          }
        }

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(filePathInBucket, file, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }
        finalImageUrlForDb = getPublicImageUrl(uploadData.path);
      }
      // Case 2: User explicitly cleared the image input (imageFileInput is an empty FileList)
      else if (imageFileInput && imageFileInput.length === 0 && currentImageUrl) {
        const oldPathInBucket = getPathFromPublicUrl(currentImageUrl);
        if (oldPathInBucket) {
          await deleteImage(oldPathInBucket);
        }
        finalImageUrlForDb = null; // Set image to null in DB
      }
      // Case 3: No change to image input (imageFileInput is undefined), keep existing image
      // In this case, finalImageUrlForDb retains its initial value of currentImageUrl.

      const roomData = {
        name: values.name,
        capacity: values.capacity,
        facilities: values.facilities,
        available_time: { start: values.availableTimeStart, end: values.availableTimeEnd },
        image: finalImageUrlForDb,
        color: values.color,
      };

      if (room) {
        const { error } = await supabase
          .from('rooms')
          .update({ ...roomData, updated_at: new Date().toISOString() })
          .eq('id', room.id);

        if (error) throw error;
        toast({ title: "Room Updated", description: "Room details updated successfully." });
      } else {
        const { error } = await supabase
          .from('rooms')
          .insert({ ...roomData, status: 'enabled' });

        if (error) throw error;
        toast({ title: "Room Added", description: "New room added successfully." });
      }

      // Crucial: Update the local state for immediate UI preview
      setCurrentImageUrl(finalImageUrlForDb);
      onSaveSuccess(); // This will trigger a re-fetch of rooms in parent component
    } catch (error: any) {
      console.error("Room form submission error:", error);
      form.setError("root.serverError", {
        message: error.message || "An unexpected error occurred.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{room ? "Edit Room" : "Add New Room"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="col-span-full">
            <Label htmlFor="name" className="flex items-center mb-1">
              <Text className="inline-block mr-2 h-4 w-4" />
              Room Name
            </Label>
            <Input id="name" placeholder="Conference Room A" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="col-span-1">
            <Label htmlFor="capacity" className="flex items-center mb-1">
              <Maximize className="inline-block mr-2 h-4 w-4" />
              Capacity
            </Label>
            <Input id="capacity" type="number" placeholder="10" {...form.register("capacity")} />
            {form.formState.errors.capacity && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.capacity.message}</p>
            )}
          </div>

          <div className="col-span-1">
            <Label htmlFor="color" className="flex items-center mb-1">
              <Palette className="inline-block mr-2 h-4 w-4" />
              Display Color
            </Label>
            <Input id="color" type="color" {...form.register("color")} className="h-10 w-full" />
            {form.formState.errors.color && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.color.message}</p>
            )}
          </div>

          <div className="col-span-full">
            <Label htmlFor="facilities" className="flex items-center mb-1">
              <Info className="inline-block mr-2 h-4 w-4" />
              Facilities (comma-separated)
            </Label>
            <Textarea id="facilities" placeholder="Projector, Whiteboard, Video Conferencing" {...form.register("facilities")} />
            {form.formState.errors.facilities && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.facilities.message}</p>
            )}
          </div>

          <div className="col-span-1">
            <Label htmlFor="availableTimeStart" className="flex items-center mb-1">
              <Clock className="inline-block mr-2 h-4 w-4" />
              Available From
            </Label>
            <Select onValueChange={(value) => form.setValue("availableTimeStart", value)} value={form.watch("availableTimeStart")}>
              <SelectTrigger id="availableTimeStart">
                <SelectValue placeholder="Select start time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.availableTimeStart && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.availableTimeStart.message}</p>
            )}
          </div>

          <div className="col-span-1">
            <Label htmlFor="availableTimeEnd" className="flex items-center mb-1">
              <Clock className="inline-block mr-2 h-4 w-4" />
              Available Until
            </Label>
            <Select onValueChange={(value) => form.setValue("availableTimeEnd", value)} value={form.watch("availableTimeEnd")}>
              <SelectTrigger id="availableTimeEnd">
                <SelectValue placeholder="Select end time" />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.availableTimeEnd && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.availableTimeEnd.message}</p>
            )}
          </div>

          <div className="col-span-full">
            <Label htmlFor="imageFile" className="flex items-center mb-1">
              <ImageIcon className="inline-block mr-2 h-4 w-4" />
              Room Image (Max 5MB, JPG/PNG)
            </Label>
            <Input id="imageFile" type="file" accept=".jpg,.jpeg,.png" {...form.register("imageFile")} />
            {form.formState.errors.imageFile && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.imageFile.message as string}</p>
            )}
            {currentImageUrl && (
              <div className="mt-2 flex items-center space-x-2">
                <img src={currentImageUrl} alt="Current Room" className="w-20 h-20 object-cover rounded-md" />
                <Button variant="outline" size="sm" onClick={() => setCurrentImageUrl(null)}>Remove Current Image</Button>
              </div>
            )}
          </div>

          {form.formState.errors.root?.serverError && (
            <p className="text-red-500 text-sm col-span-full text-center mt-2">
              {form.formState.errors.root.serverError.message}
            </p>
          )}
          <DialogFooter className="col-span-full">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (room ? "Saving..." : "Adding...") : (room ? "Save Changes" : "Add Room")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default RoomFormDialog;