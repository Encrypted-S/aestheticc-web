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
  return useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            "Accept": "application/json"
          }
        });

        if (!response.ok) {
          if (response.status === 401) {
            window.location.href = "/login";
            return null;
          }
          throw new Error("Failed to fetch user data");
        }

        const data = await response.json();
        if (!data.success || !data.user) {
          window.location.href = "/login";
          return null;
        }
        return data.user;
      } catch (error) {
        console.error("Error fetching user:", error);
        window.location.href = "/login";
        return null;
      }
    },
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    retry: 1
  });
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
      if (!response.ok) throw new Error("Logout failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["user"], null);
      setLocation("/login");
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    },
  });
}

export function useRequireAuth() {
  const { data: user, isLoading } = useUser();
  const [, setLocation] = useLocation();
  const logout = useLogout();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [isLoading, user, setLocation]);

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