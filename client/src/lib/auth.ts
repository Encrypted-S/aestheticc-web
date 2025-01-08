import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export type User = {
  id: number;
  email: string;
  name: string;
  isPremium: boolean;
};

export function useUser() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const query = useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        console.log("Fetching user data...");
        const response = await fetch("/api/user", {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            "Accept": "application/json"
          }
        });

        console.log("User data response status:", response.status);

        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error("Failed to fetch user data");
        }

        const data = await response.json();
        console.log("User data received:", data);

        if (!data.success || !data.user) {
          return null;
        }
        return data.user;
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retryDelay: 1000 // Wait 1 second between retries
  });

  return query;
}

export function useLogout() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/logout", {
        method: "POST",
        credentials: "include"
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error || "Logout failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["user"], null);
      queryClient.invalidateQueries({ queryKey: ["user"] });
      setLocation("/login");
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account."
      });
    },
    onError: (error) => {
      console.error("Logout error:", error);
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  });
}

export function useRequireAuth() {
  const { data: user, isLoading, error } = useUser();
  const [, setLocation] = useLocation();
  const logout = useLogout();

  useEffect(() => {
    console.log("useRequireAuth effect running:", { 
      isLoading, 
      user: user ? "present" : "absent", 
      error: error ? "present" : "absent" 
    });

    // Only redirect if we're not loading and there's no user
    if (!isLoading && !user && !error) {
      console.log("No authenticated user found, redirecting to login");
      setLocation("/login");
    }
  }, [isLoading, user, error, setLocation]);

  return { 
    user, 
    isLoading,
    logout: logout.mutate 
  };
}

export function useGoogleLogin() {
  const { toast } = useToast();

  const startGoogleLogin = async () => {
    try {
      window.location.href = "/api/auth/google";
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Failed to start login process",
        variant: "destructive",
      });
    }
  };

  return { startGoogleLogin };
}