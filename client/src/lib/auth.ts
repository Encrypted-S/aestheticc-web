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
  const [isLoading, setIsLoading] = useState(false);

  const startGoogleLogin = () => {
    setIsLoading(true);
    
    try {
      // Google OAuth popup window settings
      const width = 500;
      const height = 600;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2.5;
      const popup = window.open(
        "/api/auth/google",
        "GoogleLogin",
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!popup) {
        throw new Error("Popup blocked");
      }

      // Check if popup was closed
      const popupChecker = setInterval(() => {
        if (popup.closed) {
          clearInterval(popupChecker);
          setIsLoading(false);
        }
      }, 1000);

      // Handle the OAuth callback
      const messageHandler = (event: MessageEvent) => {
        if (event.data.type === "oauth-success") {
          window.removeEventListener("message", messageHandler);
          clearInterval(popupChecker);
          popup?.close();
          setIsLoading(false);
          toast({
            title: "Welcome!",
            description: "You have been successfully logged in.",
          });
          window.location.href = "/dashboard";
        }
      };

      window.addEventListener("message", messageHandler);
    } catch (error) {
      setIsLoading(false);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Failed to start login process",
        variant: "destructive",
      });
    }
  };

  return { startGoogleLogin, isLoading };
}
