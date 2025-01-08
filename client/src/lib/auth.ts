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

const API_BASE_URL = `${window.location.protocol}//${window.location.hostname}:3002`;

export function useUser() {
  return useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
        credentials: "include"
      });
      if (!response.ok) {
        if (response.status === 401) throw new Error("Not authenticated");
        throw new Error("Failed to fetch user data");
      }
      return response.json();
    },
    retry: false,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: "POST",
        credentials: "include"
      });
      if (!response.ok) throw new Error("Logout failed");
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
  const { data: user, isLoading, error } = useUser();
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
  const queryClient = useQueryClient();

  const startGoogleLogin = async () => {
    try {
      console.log("Initiating Google OAuth login flow");
      // Google OAuth popup window settings
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2.5;

      const popup = window.open(
        `${API_BASE_URL}/api/auth/google`,
        "GoogleLogin",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error("Popup blocked");
      }

      // Handle the OAuth callback
      const messageHandler = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        const cleanup = () => {
          window.removeEventListener("message", messageHandler);
          if (popup && !popup.closed) popup.close();
        };

        if (event.data.type === "oauth-success") {
          cleanup();
          queryClient.invalidateQueries({ queryKey: ["user"] });
          window.location.href = "/dashboard";
        } else if (event.data.type === "oauth-error") {
          cleanup();
          toast({
            title: "Login failed",
            description: event.data.message || "Failed to authenticate with Google",
            variant: "destructive",
          });
        }
      };

      window.addEventListener("message", messageHandler);
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