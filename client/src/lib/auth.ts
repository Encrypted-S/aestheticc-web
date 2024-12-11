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
  const { data: user, isLoading, error, refetch } = useUser();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (!isLoading) {
          // Try to refetch user data if we don't have it
          if (!user) {
            await refetch();
          }
          
          const response = await fetch("/api/auth/user", {
            credentials: 'include' // Ensure cookies are sent
          });
          
          if (!response.ok) {
            throw new Error("Not authenticated");
          }
          
          const userData = await response.json();
          if (!userData) {
            console.error("No user data found");
            setLocation("/login");
          }
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setLocation("/login");
      }
    };

    checkAuth();
    
    // Set up an interval to periodically refresh the session
    const refreshInterval = setInterval(checkAuth, 5 * 60 * 1000); // Every 5 minutes
    
    return () => clearInterval(refreshInterval);
  }, [isLoading, user, refetch, setLocation]);

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
      
      const baseUrl = window.location.origin;
      console.log("OAuth start - Base URL:", baseUrl);
      const popup = window.open(
        `${baseUrl}/api/auth/google`,
        "GoogleLogin",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error("Popup blocked");
      }

      // Handle the OAuth callback
      const messageHandler = (event: MessageEvent) => {
        const origin = window.location.origin;
        console.log("Checking message origin:", {
          expected: origin,
          received: event.origin,
          eventData: event.data
        });
        
        // Verify origin
        if (event.origin !== origin) {
          console.error("Received message from unexpected origin:", event.origin);
          return;
        }

        // Clean up event listener
        const cleanup = () => {
          window.removeEventListener("message", messageHandler);
          if (popup && !popup.closed) {
            popup.close();
          }
        };

        if (event.data.type === "oauth-success") {
          cleanup();
          
          // Verify authentication state
          fetch("/api/auth/user")
            .then(response => {
              if (!response.ok) {
                throw new Error("Authentication verification failed");
              }
              return response.json();
            })
            .then(() => {
              toast({
                title: "Welcome!",
                description: "You have been successfully logged in.",
              });
              // Use navigation instead of direct location change
              window.location.href = "/dashboard";
            })
            .catch(error => {
              console.error("Auth verification failed:", error);
              toast({
                title: "Login verification failed",
                description: "Please try logging in again",
                variant: "destructive",
              });
            });
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
