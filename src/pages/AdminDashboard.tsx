import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { MadeWithDyad } from "@/components/made-with-dyad";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    navigate("/admin");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to the Admin Dashboard!</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400">
          You have successfully logged in as an administrator.
        </p>
        <Button onClick={handleLogout} className="mt-6">
          Logout
        </Button>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default AdminDashboard;