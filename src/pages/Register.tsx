import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { User, Lock, Phone, Mail, Building, Briefcase } from "lucide-react"; // Import icons

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
  pin: z.string().min(1, "PIN is required").regex(/^\d+$/, "PIN must be numeric").max(9, "PIN must be 9 digits or less"),
  phone: z.string().min(10, "Phone number must be 10 digits").max(10, "Phone number must be 10 digits").regex(/^[0-9]{10}$/, "Phone number must be numeric and 10 digits long"),
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  department: z.string().optional(),
  designation: z.string().optional(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm Password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      pin: "",
      phone: "", // Default to empty as +880 is prefixed
      email: "",
      department: "",
      designation: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Check for unique PIN and Email before attempting signup
      const { data: existingProfiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, pin, email')
        .or(`pin.eq.${values.pin},email.eq.${values.email}`);

      if (profileError) throw profileError;

      if (existingProfiles && existingProfiles.length > 0) {
        if (existingProfiles.some(p => p.pin === values.pin)) {
          form.setError("pin", { type: "manual", message: "PIN already exists" });
        }
        if (existingProfiles.some(p => p.email === values.email)) {
          form.setError("email", { type: "manual", message: "Email already exists" });
        }
        setIsSubmitting(false);
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            name: values.name,
            pin: values.pin,
            phone: "+880" + values.phone, // Prepend +880 to the phone number
            department: values.department,
            designation: values.designation,
          },
        },
      });

      if (error) {
        toast({
          title: "Registration Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (data.user) {
        toast({
          title: "Registration Successful",
          description: "Please check your email to confirm your account, then log in.",
        });
        navigate("/login");
      } else {
        // This case might happen if email confirmation is required but no user object is returned immediately
        toast({
          title: "Registration Successful",
          description: "Please check your email to confirm your account, then log in.",
        });
        navigate("/login");
      }
    } catch (error: any) {
      toast({
        title: "Registration Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-3xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">Register</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Create your account to start booking meetings</p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="col-span-1">
            <Label htmlFor="name" className="flex items-center mb-1">
              <User className="inline-block mr-2 h-4 w-4" />
              Full Name
            </Label>
            <Input id="name" placeholder="Enter your full name" {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="col-span-1">
            <Label htmlFor="pin" className="flex items-center mb-1">
              <Lock className="inline-block mr-2 h-4 w-4" />
              PIN
            </Label>
            <Input id="pin" type="text" placeholder="Enter unique PIN" {...form.register("pin")} />
            {form.formState.errors.pin && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.pin.message}</p>
            )}
          </div>
          <div className="col-span-1">
            <Label htmlFor="phone" className="flex items-center mb-1">
              <Phone className="inline-block mr-2 h-4 w-4" />
              Phone Number
            </Label>
            <div className="flex">
              <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-gray-50 text-gray-500 dark:bg-gray-700 dark:text-gray-300">
                +880
              </span>
              <Input
                id="phone"
                type="text"
                placeholder="1712345678"
                {...form.register("phone")}
                className="rounded-l-none"
              />
            </div>
            {form.formState.errors.phone && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.phone.message}</p>
            )}
          </div>
          <div className="col-span-1">
            <Label htmlFor="email" className="flex items-center mb-1">
              <Mail className="inline-block mr-2 h-4 w-4" />
              Email
            </Label>
            <Input id="email" type="email" placeholder="your.email@company.com" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div className="col-span-1">
            <Label htmlFor="department" className="flex items-center mb-1">
              <Building className="inline-block mr-2 h-4 w-4" />
              Department
            </Label>
            <Select onValueChange={(value) => form.setValue("department", value)} value={form.watch("department")}>
              <SelectTrigger id="department">
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((dept) => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.department && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.department.message}</p>
            )}
          </div>
          <div className="col-span-1">
            <Label htmlFor="designation" className="flex items-center mb-1">
              <Briefcase className="inline-block mr-2 h-4 w-4" />
              Designation
            </Label>
            <Input id="designation" type="text" placeholder="Your job title" {...form.register("designation")} />
            {form.formState.errors.designation && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.designation.message}</p>
            )}
          </div>
          <div className="col-span-1">
            <Label htmlFor="password" className="flex items-center mb-1">
              <Lock className="inline-block mr-2 h-4 w-4" />
              Password
            </Label>
            <Input id="password" type="password" placeholder="Strong password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="col-span-1">
            <Label htmlFor="confirmPassword" className="flex items-center mb-1">
              <Lock className="inline-block mr-2 h-4 w-4" />
              Confirm Password
            </Label>
            <Input id="confirmPassword" type="password" placeholder="Confirm password" {...form.register("confirmPassword")} />
            {form.formState.errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full col-span-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white" disabled={isSubmitting}>
            {isSubmitting ? "Creating Account..." : "Create Account"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            Sign in here
          </Link>
        </p>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Register;