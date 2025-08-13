import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { MadeWithDyad } from "@/components/made-with-dyad";
import { supabase } from "@/integrations/supabase/auth";
import { useToast } from "@/components/ui/use-toast";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [adminSession, setAdminSession] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedSession = localStorage.getItem('admin_session');
    if (storedSession) {
      const sessionData = JSON.parse(storedSession);
      if (sessionData.expires_at > Date.now()) {
        setAdminSession(sessionData);
      } else {
        localStorage.removeItem('admin_session');
        navigate("/admin");
      }
    } else {
      navigate("/admin");
    }
    setIsLoading(false);
  }, [navigate]);

  const handleAdminLogout = () => {
    localStorage.removeItem('admin_session');
    toast({
      title: "Logged Out",
      description: "You have been logged out from the admin panel.",
    });
    navigate("/admin");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl">Loading admin panel...</p>
        <MadeWithDyad />
      </div>
    );
  }

  if (!adminSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <h1 className="text-4xl font-bold mb-4">Admin Access Denied</h1>
        <p className="text-xl text-gray-600">Please log in as an admin to access this page.</p>
        <Button onClick={() => navigate("/admin")} className="mt-4">Go to Admin Login</Button>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to the Super Admin Panel!</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          You are logged in as: {adminSession.username}
        </p>
        <p className="text-lg text-gray-500 dark:text-gray-300 mt-2">
          From here, you have full control over the system.
        </p>
        <Button onClick={handleAdminLogout} className="mt-6 bg-red-600 hover:bg-red-700">
          Logout Admin
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default AdminDashboard;