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
  const query = useQuery<User | null>({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/user", {
          credentials: "include",
        });

        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error("Failed to fetch user data");
        }

        const data = await response.json();
        return data.user;
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    staleTime: 1000 * 60 * 30, // 30 minutes
    retry: false,
    refetchOnWindowFocus: false
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
        throw new Error("Logout failed");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(["user"], null);
      queryClient.removeQueries({ queryKey: ["user"] });
      setLocation("/login");
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account."
      });
    },
    onError: (error) => {
      toast({
        title: "Logout failed",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive"
      });
    }
  });
}

export function useRequireAuth() {
  const { data: user, isLoading } = useUser();
  const [location, setLocation] = useLocation();
  const logout = useLogout();

  useEffect(() => {
    if (!isLoading && !user && location !== '/login') {
      setLocation("/login");
    }
  }, [isLoading, user, location, setLocation]);

  return { 
    user, 
    isLoading,
    logout: logout.mutate 
  };
}