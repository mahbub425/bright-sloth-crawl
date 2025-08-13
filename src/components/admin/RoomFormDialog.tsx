import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/auth";
import { uploadImage, deleteImage, getPathFromPublicUrl } from "@/integrations/supabase/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Home, Users, Info, Image as ImageIcon, Clock } from "lucide-react";
import { Room } from "@/types/database";
import { generateTimeOptions } from "@/components/BookingFormDialog"; // Re-use time options generator

const formSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  capacity: z.preprocess(
    (val) => Number(val),
    z.number().min(1, "Capacity must be at least 1").int("Capacity must be an integer")
  ),
  facilities: z.string().optional(),
  availableTimeStart: z.string().optional(),
  availableTimeEnd: z.string().optional(),
  imageFile: z.any().optional(), // For file input
  imageUrl: z.string().optional(), // For displaying existing image
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
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [timeOptions, setTimeOptions] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: room?.name || "",
      capacity: room?.capacity || 1,
      facilities: room?.facilities || "",
      availableTimeStart: room?.available_time?.start || "00:00",
      availableTimeEnd: room?.available_time?.end || "23:59",
      imageUrl: room?.image || "",
    },
  });

  useEffect(() => {
    if (open) {
      if (room) {
        form.reset({
          name: room.name || "",
          capacity: room.capacity || 1,
          facilities: room.facilities || "",
          availableTimeStart: room.available_time?.start || "00:00",
          availableTimeEnd: room.available_time?.end || "23:59",
          imageUrl: room.image || "",
          imageFile: undefined,
        });
        setImagePreview(room.image || null);
      } else {
        form.reset({
          name: "",
          capacity: 1,
          facilities: "",
          availableTimeStart: "00:00",
          availableTimeEnd: "23:59",
          imageUrl: "",
          imageFile: undefined,
        });
        setImagePreview(null);
      }
      setTimeOptions(generateTimeOptions(form.watch("availableTimeStart"), form.watch("availableTimeEnd")));
    }
  }, [open, room, form]);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Image too large",
          description: "Image size cannot exceed 5MB.",
          variant: "destructive",
        });
        form.setValue("imageFile", undefined);
        setImagePreview(null);
        return;
      }
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only JPEG and PNG images are allowed.",
          variant: "destructive",
        });
        form.setValue("imageFile", undefined);
        setImagePreview(null);
        return;
      }
      form.setValue("imageFile", file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      form.setValue("imageFile", undefined);
      setImagePreview(form.watch("imageUrl") || null); // Revert to existing if no new file
    }
  };

  const generateRandomColor = () => {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    let uploadedImageUrl: string | null = values.imageUrl || null;
    let imagePathToDelete: string | null = null;

    try {
      // Check for unique room name
      const { data: existingRoom, error: nameCheckError } = await supabase
        .from('rooms')
        .select('id')
        .eq('name', values.name)
        .single();

      if (existingRoom && existingRoom.id !== room?.id) {
        form.setError("name", { type: "manual", message: "Room name already exists." });
        setIsSubmitting(false);
        return;
      }

      // Handle image upload/deletion
      if (values.imageFile) {
        // If there's an existing image and a new one is uploaded, delete the old one
        if (room?.image) {
          imagePathToDelete = getPathFromPublicUrl(room.image);
        }
        const filePath = `public/${Date.now()}-${values.imageFile.name}`;
        uploadedImageUrl = await uploadImage(values.imageFile, filePath);
        if (!uploadedImageUrl) {
          throw new Error("Failed to upload image.");
        }
      } else if (room?.image && !values.imageUrl) {
        // If existing image was removed from form (e.g., cleared input)
        imagePathToDelete = getPathFromPublicUrl(room.image);
        uploadedImageUrl = null;
      }

      if (imagePathToDelete) {
        await deleteImage(imagePathToDelete);
      }

      const roomData = {
        name: values.name,
        capacity: values.capacity,
        facilities: values.facilities,
        available_time: {
          start: values.availableTimeStart || "00:00",
          end: values.availableTimeEnd || "23:59",
        },
        image: uploadedImageUrl,
        updated_at: new Date().toISOString(),
      };

      if (room) {
        // Update existing room
        const { error } = await supabase
          .from('rooms')
          .update(roomData)
          .eq('id', room.id);

        if (error) throw error;

        toast({ title: "Room Updated", description: "Room details updated successfully." });
      } else {
        // Add new room
        const newRoomColor = generateRandomColor();
        const { data, error } = await supabase
          .from('rooms')
          .insert({
            ...roomData,
            color: newRoomColor,
            status: 'enabled', // Default status for new rooms
          })
          .select()
          .single();

        if (error) throw error;
        if (!data) throw new Error("Failed to create room.");

        // Generate QR code URL
        const qrCodeUrl = `${window.location.origin}/room/${data.id}`;
        const { error: qrError } = await supabase
          .from('rooms')
          .update({ qr_code: qrCodeUrl })
          .eq('id', data.id);

        if (qrError) console.error("Error updating QR code:", qrError); // Log but don't block

        toast({ title: "Room Added", description: "New room added successfully!" });
      }

      onSaveSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Operation Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right flex items-center col-span-1">
              <Home className="inline-block mr-2 h-4 w-4" /> Name
            </Label>
            <Input id="name" placeholder="Meeting Room A" {...form.register("name")} className="col-span-3" />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm col-span-4 text-right">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="capacity" className="text-right flex items-center col-span-1">
              <Users className="inline-block mr-2 h-4 w-4" /> Capacity
            </Label>
            <Input id="capacity" type="number" placeholder="10" {...form.register("capacity")} className="col-span-3" />
            {form.formState.errors.capacity && (
              <p className="text-red-500 text-sm col-span-4 text-right">{form.formState.errors.capacity.message}</p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="facilities" className="text-right flex items-center col-span-1">
              <Info className="inline-block mr-2 h-4 w-4" /> Facilities
            </Label>
            <Textarea id="facilities" placeholder="Projector, Whiteboard, AC" {...form.register("facilities")} className="col-span-3" />
            {form.formState.errors.facilities && (
              <p className="text-red-500 text-sm col-span-4 text-right">{form.formState.errors.facilities.message}</p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="availableTimeStart" className="text-right flex items-center col-span-1">
              <Clock className="inline-block mr-2 h-4 w-4" /> Available From
            </Label>
            <Select onValueChange={(value) => { form.setValue("availableTimeStart", value); setTimeOptions(generateTimeOptions(value, form.watch("availableTimeEnd"))); }} value={form.watch("availableTimeStart")}>
              <SelectTrigger id="availableTimeStart" className="col-span-3">
                <SelectValue placeholder="Select start time" />
              </SelectTrigger>
              <SelectContent>
                {generateTimeOptions("00:00", "23:59").map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.availableTimeStart && (
              <p className="text-red-500 text-sm col-span-4 text-right">{form.formState.errors.availableTimeStart.message}</p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="availableTimeEnd" className="text-right flex items-center col-span-1">
              <Clock className="inline-block mr-2 h-4 w-4" /> Available To
            </Label>
            <Select onValueChange={(value) => { form.setValue("availableTimeEnd", value); setTimeOptions(generateTimeOptions(form.watch("availableTimeStart"), value)); }} value={form.watch("availableTimeEnd")}>
              <SelectTrigger id="availableTimeEnd" className="col-span-3">
                <SelectValue placeholder="Select end time" />
              </SelectTrigger>
              <SelectContent>
                {generateTimeOptions("00:00", "23:59").map((time) => (
                  <SelectItem key={time} value={time}>{time}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.availableTimeEnd && (
              <p className="text-red-500 text-sm col-span-4 text-right">{form.formState.errors.availableTimeEnd.message}</p>
            )}
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="imageFile" className="text-right flex items-center col-span-1">
              <ImageIcon className="inline-block mr-2 h-4 w-4" /> Image
            </Label>
            <div className="col-span-3 flex flex-col gap-2">
              <Input id="imageFile" type="file" accept="image/jpeg, image/png" onChange={handleImageChange} />
              {imagePreview && (
                <img src={imagePreview} alt="Room Preview" className="w-24 h-24 object-cover rounded-md" />
              )}
              {form.formState.errors.imageFile && (
                <p className="text-red-500 text-sm">{form.formState.errors.imageFile.message}</p>
              )}
            </div>
          </div>
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