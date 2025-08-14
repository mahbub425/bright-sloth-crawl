import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { User, Phone, Mail, Building, Briefcase } from "lucide-react";

const departmentOptions = [
  "Human Resource Management", "Software Development", "Business Development",
  "Software Quality Assurance", "Operations & Management", "UI & Graphics Design",
  "TechCare", "Requirement Analysis & UX Design", "Top Management",
  "DevOps & Network", "Finance & Accounts", "Internal Audit",
  "Graphics & Creative", "Organization Development", "IT & Hardware",
  "Legal & Compliance", "Operations (Asset Management)"
];

const formSchema = z.object({
  name: z.string().min(1, "Name is required").regex(/^[a-zA-Z\s]+$/, "Name cannot contain numbers or special characters"),
  phone: z.string().min(10, "Phone number must be 10 digits").max(10, "Phone number must be 10 digits").regex(/^[0-9]{10}$/, "Phone number must be numeric and 10 digits long"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  department: z.string().optional(),
  designation: z.string().optional(),
});

interface ProfileEditProps {
  profile: any; // Replace with a more specific type if available
  onProfileUpdated: () => void;
}

const ProfileEdit: React.FC<ProfileEditProps> = ({ profile, onProfileUpdated }) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: profile?.name || "",
      phone: profile?.phone ? profile.phone.replace("+880", "") : "",
      email: profile?.email || "",
      department: profile?.department || "",
      designation: profile?.designation || "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name || "",
        phone: profile.phone ? profile.phone.replace("+880", "") : "",
        email: profile.email || "",
        department: profile.department || "",
        designation: profile.designation || "",
      });
    }
  }, [profile, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Check for unique email if it's changed
      if (values.email !== profile.email) {
        const { data: existingEmail } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', values.email)
          .single();

        if (existingEmail && existingEmail.id !== profile.id) {
          form.setError("email", { type: "manual", message: "Email already exists" });
          setIsSubmitting(false);
          return;
        }
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: values.name,
          phone: "+880" + values.phone,
          email: values.email,
          department: values.department,
          designation: values.designation,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id);

      // Also update auth.users email if it changed
      if (values.email !== profile.email) {
        const { error: authUpdateError } = await supabase.auth.updateUser({
          email: values.email,
        });
        if (authUpdateError) {
          throw authUpdateError;
        }
      }

      if (error) {
        throw error;
      }

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated.",
      });
      onProfileUpdated();
    } catch (error: any) {
      toast({
        title: "Profile Update Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!profile) {
    return <div className="text-center py-4 text-gray-500">Loading profile for editing...</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right flex items-center col-span-1">
          <User className="inline-block mr-1 h-4 w-4" /> Name
        </Label>
        <Input id="name" {...form.register("name")} className="col-span-3" />
        {form.formState.errors.name && (
          <p className="text-red-500 text-sm col-span-4 text-right">{form.formState.errors.name.message}</p>
        )}
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right flex items-center col-span-1">
          <Mail className="inline-block mr-1 h-4 w-4" /> Email
        </Label>
        <Input id="email" {...form.register("email")} className="col-span-3" />
        {form.formState.errors.email && (
          <p className="text-red-500 text-sm col-span-4 text-right">{form.formState.errors.email.message}</p>
        )}
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="phone" className="text-right flex items-center col-span-1">
          <Phone className="inline-block mr-1 h-4 w-4" /> Phone
        </Label>
        <div className="flex col-span-3">
          <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
            +880
          </span>
          <Input
            id="phone"
            type="text"
            {...form.register("phone")}
            className="rounded-l-none"
          />
        </div>
        {form.formState.errors.phone && (
          <p className="text-red-500 text-sm col-span-4 text-right">{form.formState.errors.phone.message}</p>
        )}
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="department" className="text-right flex items-center col-span-1">
          <Building className="inline-block mr-1 h-4 w-4" /> Dept.
        </Label>
        <Select onValueChange={(value) => form.setValue("department", value)} value={form.watch("department")} >
          <SelectTrigger id="department" className="col-span-3">
            <SelectValue placeholder="Select a department" />
          </SelectTrigger>
          <SelectContent>
            {departmentOptions.map((dept) => (
              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {form.formState.errors.department && (
          <p className="text-red-500 text-sm col-span-4 text-right">{form.formState.errors.department.message}</p>
        )}
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="designation" className="text-right flex items-center col-span-1">
          <Briefcase className="inline-block mr-1 h-4 w-4" /> Desig.
        </Label>
        <Input id="designation" {...form.register("designation")} className="col-span-3" />
        {form.formState.errors.designation && (
          <p className="text-red-500 text-sm col-span-4 text-right">{form.formState.errors.designation.message}</p>
        )}
      </div>
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
};

export default ProfileEdit;