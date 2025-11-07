"use client";
import { useState, useEffect } from "react";
import {
  getCurrentUser,
  isAuthenticated,
  logout,
} from "@/app/_services/authService";
import { User } from "@/app/types/user";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (isAuthenticated()) {
          const userData = await getCurrentUser();
          setUser(userData);
          setIsLoggedIn(true);
        } else {
          setUser(null);
          setIsLoggedIn(false);
        }
      } catch (error) {
        console.error("Error loading user:", error);
        setUser(null);
        setIsLoggedIn(false);
        // Opcional: limpiar tokens corruptos
        logout();
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const handleLogout = () => {
    logout();
    setUser(null);
    setIsLoggedIn(false);
  };

  return {
    user,
    loading,
    isLoggedIn,
    userId: user?.id || null,
    logout: handleLogout,
  };
}
