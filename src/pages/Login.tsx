import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { MadeWithDyad } from "@/components/made-with-dyad";

const formSchema = z.object({
  pin: z.string().min(1, "PIN is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().default(false).optional(),
});

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pin: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // First, find the user's email using the provided PIN
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email')
        .eq('pin', values.pin)
        .single();

      if (profileError || !profileData) {
        toast({
          title: "Login Error",
          description: "Invalid PIN or password.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const userEmail = profileData.email;

      // Then, sign in with the retrieved email and password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userEmail,
        password: values.password,
      });

      if (signInError) {
        toast({
          title: "Login Error",
          description: signInError.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Login Successful",
          description: "You have been successfully logged in.",
        });
        navigate("/");
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
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">Log in</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">Welcome! Please enter your details.</p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="pin">PIN</Label>
            <Input id="pin" placeholder="Enter PIN" type="text" {...form.register("pin")} />
            {form.formState.errors.pin && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.pin.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" placeholder="Enter Password" type="password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox id="rememberMe" checked={form.watch("rememberMe")} onCheckedChange={(checked) => form.setValue("rememberMe", !!checked)} />
              <Label htmlFor="rememberMe">Remember Password</Label>
            </div>
            <Link to="/forgot-password" className="text-blue-600 hover:underline dark:text-blue-400 text-sm">
              Forgot Password?
            </Link>
          </div>
          <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700 text-white" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Log in"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue-600 hover:underline dark:text-blue-400">
            Register here
          </Link>
        </p>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Login;