import { loadStripe } from "@stripe/stripe-js";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY!);

export function usePremiumStatus() {
  return useQuery({
    queryKey: ["premiumStatus"],
    queryFn: async () => {
      const response = await fetch("/api/user", {
        credentials: "include"
      });

      if (!response.ok) {
        if (response.status === 401) return false;
        throw new Error("Failed to fetch user status");
      }

      const user = await response.json();
      return user.isPremium || false;
    },
  });
}

export function usePurchasePremium() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create checkout session");
      }

      const { url } = await response.json();
      if (!url) throw new Error("No checkout URL received");

      window.location.href = url;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to start checkout",
        variant: "destructive",
      });
    },
  });
}

export function useVerifyPayment() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/verify-payment?session_id=${sessionId}`, {
        credentials: "include"
      });

      if (!response.ok) {
        throw new Error("Failed to verify payment");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.status === "success") {
        toast({
          title: "Payment Successful",
          description: "Thank you for purchasing premium access!",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to verify payment",
        variant: "destructive",
      });
    },
  });
}