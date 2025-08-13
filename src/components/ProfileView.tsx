import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User, Mail, Phone, Building, Briefcase, Lock } from "lucide-react";

interface ProfileViewProps {
  profile: any; // Replace with a more specific type if available
}

const ProfileView: React.FC<ProfileViewProps> = ({ profile }) => {
  if (!profile) {
    return <div className="text-center py-4 text-gray-500">Loading profile...</div>;
  }

  return (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="name" className="text-right flex items-center col-span-1">
          <User className="inline-block mr-1 h-4 w-4" /> Name
        </Label>
        <Input id="name" value={profile.name || "N/A"} readOnly className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="pin" className="text-right flex items-center col-span-1">
          <Lock className="inline-block mr-1 h-4 w-4" /> PIN
        </Label>
        <Input id="pin" value={profile.pin || "N/A"} readOnly className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="email" className="text-right flex items-center col-span-1">
          <Mail className="inline-block mr-1 h-4 w-4" /> Email
        </Label>
        <Input id="email" value={profile.email || "N/A"} readOnly className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="phone" className="text-right flex items-center col-span-1">
          <Phone className="inline-block mr-1 h-4 w-4" /> Phone
        </Label>
        <Input id="phone" value={profile.phone || "N/A"} readOnly className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="department" className="text-right flex items-center col-span-1">
          <Building className="inline-block mr-1 h-4 w-4" /> Dept.
        </Label>
        <Input id="department" value={profile.department || "N/A"} readOnly className="col-span-3" />
      </div>
      <div className="grid grid-cols-4 items-center gap-4">
        <Label htmlFor="designation" className="text-right flex items-center col-span-1">
          <Briefcase className="inline-block mr-1 h-4 w-4" /> Desig.
        </Label>
        <Input id="designation" value={profile.designation || "N/A"} readOnly className="col-span-3" />
      </div>
    </div>
  );
};

export default ProfileView;