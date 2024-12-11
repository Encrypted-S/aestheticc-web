import { useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export type User = {
  id: number;
  email: string;
  name: string;
  avatarUrl?: string;
  subscriptionStatus: string;
};

export function useUser() {
  return useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await fetch("/api/auth/user");
      if (!response.ok) throw new Error("Not authenticated");
      return response.json();
    },
    retry: false,
  });
}

export function useRequireAuth() {
  const { data: user, isLoading, isError } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  return { user, isLoading };
}

export function useLogout() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Logout failed");
    },
    onSuccess: () => {
      queryClient.setQueryData(["user"], null);
      setLocation("/");
      toast({
        title: "Logged out successfully",
        description: "You have been logged out of your account.",
      });
    },
  });
}

export function useGoogleLogin() {
  const { toast } = useToast();

  const startGoogleLogin = async () => {
    try {
      console.log("Initiating Google OAuth login flow");
      // Google OAuth popup window settings
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2.5;
      
      const popup = window.open(
        `/api/auth/google`,
        "GoogleLogin",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error("Popup blocked");
      }

      // Handle the OAuth callback
      const messageHandler = (event: MessageEvent) => {
        const origin = window.location.origin;
        if (event.origin !== origin) {
          console.error("Received message from unexpected origin:", event.origin);
          return;
        }

        if (event.data.type === "oauth-success") {
          window.removeEventListener("message", messageHandler);
          popup?.close();
          toast({
            title: "Welcome!",
            description: "You have been successfully logged in.",
          });
          window.location.href = "/dashboard";
        } else if (event.data.type === "oauth-error") {
          window.removeEventListener("message", messageHandler);
          popup?.close();
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
