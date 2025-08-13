import React, { useState, useEffect, createContext, useContext } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/auth";
import { useNavigate, useLocation } from "react-router-dom";
import { MadeWithDyad } from "@/components/made-with-dyad";

interface SessionContextType {
  session: Session | null;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setIsLoading(false);

      const publicRoutes = ["/login", "/register"];
      const isPublicRoute = publicRoutes.includes(location.pathname);

      if (currentSession) {
        // User is logged in
        if (isPublicRoute) {
          navigate("/"); // Redirect to dashboard if trying to access login/register
        }
      } else {
        // User is not logged in
        if (!isPublicRoute) {
          navigate("/login"); // Redirect to login if trying to access protected routes
        }
      }
    });

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setIsLoading(false);

      const publicRoutes = ["/login", "/register"];
      const isPublicRoute = publicRoutes.includes(location.pathname);

      if (initialSession) {
        if (isPublicRoute) {
          navigate("/");
        }
      } else {
        if (!isPublicRoute) {
          navigate("/login");
        }
      }
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
    <SessionContext.Provider value={{ session, isLoading }}>
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