import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/auth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Mail, Lock } from "lucide-react";

const formSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (signInError) {
        toast({
          title: "Login Error",
          description: signInError.message,
          variant: "destructive",
        });
        return;
      }

      if (data.user) {
        // Fetch the user's profile to check their role
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError || !profileData || profileData.role !== 'admin') {
          // If not an admin, sign them out and show error
          await supabase.auth.signOut();
          toast({
            title: "Login Error",
            description: "Access denied. Only administrators can log in here.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Login Successful",
          description: "Welcome, Admin!",
        });
        navigate("/admin-dashboard");
      }
    } catch (error: any) {
      toast({
        title: "Login Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">Admin Login</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Enter your admin credentials.</p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="email" className="flex items-center mb-1">
              <Mail className="inline-block mr-2 h-4 w-4" />
              Email
            </Label>
            <Input id="email" placeholder="admin@example.com" type="email" {...form.register("email")} />
            {form.formState.errors.email && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password" className="flex items-center mb-1">
              <Lock className="inline-block mr-2 h-4 w-4" />
              Password
            </Label>
            <Input id="password" placeholder="Enter password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 text-white" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log in as Admin"}
          </Button>
        </form>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default AdminLogin;