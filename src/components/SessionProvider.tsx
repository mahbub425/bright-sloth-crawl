import React, { useState, useEffect, createContext, useContext } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { MadeWithDyad } from "@/components/made-with-dyad";

interface SessionContextType {
  session: Session | null;
  isAdmin: boolean;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleAuthStateChange = async (_event: string, currentSession: Session | null) => {
      setSession(currentSession);

      let userRole = 'user'; // Default role
      if (currentSession) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', currentSession.user.id)
          .single();

        if (profile && !error) {
          userRole = profile.role;
        }
      }

      // Check for custom admin session (for the hardcoded admin)
      const storedAdminSession = localStorage.getItem('admin_session');
      let currentIsAdmin = false;
      if (storedAdminSession) {
        const adminSessionData = JSON.parse(storedAdminSession);
        if (adminSessionData.expires_at > Date.now() && adminSessionData.role === 'admin') {
          currentIsAdmin = true;
        } else {
          localStorage.removeItem('admin_session'); // Clear expired admin session
        }
      }
      setIsAdmin(currentIsAdmin || userRole === 'admin'); // Admin if either custom admin or user with 'admin' role

      setIsLoading(false);

      const publicRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
      const adminRoutes = ["/admin", "/admin-dashboard"];
      const isPublicRoute = publicRoutes.includes(location.pathname);
      const isAdminRoute = adminRoutes.includes(location.pathname);

      if (currentSession) {
        // User is logged in (Supabase auth)
        if (userRole === 'admin') {
          // If a regular user tries to access admin routes, redirect them to their dashboard
          if (isAdminRoute && !currentIsAdmin) { // If it's an admin route but not the custom admin
             navigate("/"); // Redirect to user dashboard
          } else if (isPublicRoute && !isAdminRoute) {
            navigate("/"); // Redirect regular users from public routes
          }
        } else { // Regular user
          if (isAdminRoute) {
            navigate("/"); // Regular users cannot access admin routes
          } else if (isPublicRoute) {
            navigate("/"); // Redirect regular users from public routes
          }
        }
      } else {
        // User is not logged in (Supabase auth)
        if (!isPublicRoute && !isAdminRoute) {
          navigate("/login"); // Redirect to login if trying to access protected routes
        }
      }

      // Handle custom admin session redirection
      if (currentIsAdmin) {
        if (!isAdminRoute && !isPublicRoute) { // If admin is logged in but not on an admin route or public route
          navigate("/admin-dashboard");
        }
      } else if (isAdminRoute && location.pathname !== "/admin") { // If on an admin dashboard route but not logged in as custom admin
        navigate("/admin");
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      handleAuthStateChange('INITIAL_SESSION', initialSession);
    });

    return () => subscription.unsubscribe();
  }, [navigate, location.pathname]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <p className="text-xl">Loading application...</p>
        <MadeWithDyad />
      </div>
    );
  }

  return (
    <SessionContext.Provider value={{ session, isAdmin, isLoading }}>
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
};