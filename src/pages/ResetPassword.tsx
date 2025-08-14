import { useState, useEffect } from "react";
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
import { Lock } from "lucide-react";

const formSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Confirm Password is required"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [isLoadingToken, setIsLoadingToken] = useState(true);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    // Supabase automatically handles the session from the reset password URL
    // We just need to check if a session is active, which implies a valid token.
    const checkSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (session && !error) {
        setIsValidToken(true);
      } else {
        toast({
          title: "Invalid or Expired Link",
          description: "The password reset link is invalid or has expired. Please request a new one.",
          variant: "destructive",
        });
        navigate("/forgot-password");
      }
      setIsLoadingToken(false);
    };
    checkSession();
  }, [navigate, toast]);

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: values.password,
      });

      if (error) {
        toast({
          title: "Password Reset Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Password Reset Successful",
          description: "Your password has been updated. You can now log in with your new password.",
        });
        navigate("/login");
      }
    } catch (error: any) {
      toast({
        title: "Password Reset Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingToken) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl">Verifying reset link...</p>
        <MadeWithDyad />
      </div>
    );
  }

  if (!isValidToken) {
    return null; // Or a message indicating redirection
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">Reset Password</h2>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
          Enter your new password.
        </p>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="password" className="flex items-center mb-1">
              <Lock className="inline-block mr-2 h-4 w-4" />
              New Password
            </Label>
            <Input id="password" type="password" placeholder="Enter new password" {...form.register("password")} />
            {form.formState.errors.password && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="confirmPassword" className="flex items-center mb-1">
              <Lock className="inline-block mr-2 h-4 w-4" />
              Confirm New Password
            </Label>
            <Input id="confirmPassword" type="password" placeholder="Confirm new password" {...form.register("confirmPassword")} />
            {form.formState.errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white" disabled={isSubmitting}>
            {isSubmitting ? "Resetting Password..." : "Reset Password"}
          </Button>
        </form>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default ResetPassword;