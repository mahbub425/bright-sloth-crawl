import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from "@/integrations/supabase/auth";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { Link } from "react-router-dom";

const Login = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Login to OnnoRokom Meeting Booking System</h2>
        <Auth
          supabaseClient={supabase}
          providers={[]} // No third-party providers as per FRS
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: 'hsl(var(--primary))',
                  brandAccent: 'hsl(var(--primary-foreground))',
                },
              },
            },
          }}
          theme="light" // Default to light theme
          view="sign_in" // Ensure it starts with sign-in view
          localization={{
            variables: {
              sign_in: {
                email_label: 'PIN or Email',
                password_label: 'Password',
                email_input_placeholder: 'Your PIN or Email',
                password_input_placeholder: 'Your Password',
                button_label: 'Sign In',
                social_auth_typography: 'Or continue with',
                link_text: 'Already have an account? Sign In',
              },
              forgotten_password: {
                link_text: 'Forgot your password?',
              },
              sign_up: {
                link_text: 'Don\'t have an account? Sign Up',
              },
            },
          }}
        />
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