import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/auth";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Mail } from "lucide-react"; // Removed Lock

const formSchema = z.object({
  emailOrPin: z.string().min(1, "Email or PIN is required"),
});

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Enter email/PIN, 2: OTP sent, 3: Reset password
  const [userEmail, setUserEmail] = useState(""); // To store email for password reset

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emailOrPin: "",
    },
  });

  const onSubmitEmailOrPin = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Determine if input is email or PIN
      const isEmail = values.emailOrPin.includes('@');
      let emailToUse = values.emailOrPin;

      if (!isEmail) {
        // If it's a PIN, find the associated email
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('pin', values.emailOrPin)
          .single();

        if (profileError || !profileData) {
          toast({
            title: "Error",
            description: "Email or PIN not found.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        emailToUse = profileData.email;
      }

      // Send password reset email
      const { error } = await supabase.auth.resetPasswordForEmail(emailToUse, {
        redirectTo: `${window.location.origin}/reset-password`, // Redirect to a new page for password reset
      });

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        setUserEmail(emailToUse);
        setStep(2); // Move to OTP sent confirmation
        toast({
          title: "Password Reset Email Sent",
          description: "Please check your email for the password reset link.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
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
        <h2 className="text-2xl font-bold text-center mb-2 text-gray-900 dark:text-gray-100">Forgot Password</h2>
        {step === 1 && (
          <>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              Enter your email or PIN to receive a password reset link.
            </p>
            <form onSubmit={form.handleSubmit(onSubmitEmailOrPin)} className="space-y-4">
              <div>
                <Label htmlFor="emailOrPin" className="flex items-center mb-1">
                  <Mail className="inline-block mr-2 h-4 w-4" />
                  Email or PIN
                </Label>
                <Input id="emailOrPin" placeholder="your.email@company.com or your PIN" type="text" {...form.register("emailOrPin")} />
                {form.formState.errors.emailOrPin && (
                  <p className="text-red-500 text-sm mt-1">{form.formState.errors.emailOrPin.message}</p>
                )}
              </div>
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isSubmitting}>
                {isSubmitting ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </>
        )}
        {step === 2 && (
          <div className="text-center">
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
              A password reset link has been sent to your email address: <span className="font-semibold">{userEmail}</span>.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Please check your inbox (and spam folder) and follow the instructions to reset your password.
            </p>
            <Button onClick={() => navigate("/login")} className="w-full bg-teal-600 hover:bg-teal-700 text-white">
              Back to Login
            </Button>
          </div>
        )}
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Remembered your password?{" "}
          <Link to="/login" className="text-blue-600 hover:underline dark:text-blue-400">
            Log in
          </Link>
        </p>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default ForgotPassword;