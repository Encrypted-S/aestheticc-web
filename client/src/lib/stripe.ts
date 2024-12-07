import { loadStripe } from "@stripe/stripe-js";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

// Initialize Stripe
const stripePromise = loadStripe(process.env.STRIPE_PUBLIC_KEY!);

export function useSubscriptionStatus() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await fetch("/api/subscription/status");
      if (!response.ok) throw new Error("Failed to fetch subscription status");
      return response.json();
    },
  });
}

export function useCreateSubscription() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/create-subscription", {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to create subscription");
      }
      
      const { sessionId } = await response.json();
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error("Stripe not initialized");
      }

      const { error } = await stripe.redirectToCheckout({ sessionId });
      if (error) {
        throw error;
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useManageSubscription() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/create-portal-session", {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }
      
      const { url } = await response.json();
      window.location.href = url;
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to open subscription management portal",
        variant: "destructive",
      });
    },
  });
}

export function useCheckSubscriptionStatus() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (sessionId: string) => {
      const response = await fetch(`/api/check-subscription-status?session_id=${sessionId}`);
      if (!response.ok) {
        throw new Error("Failed to verify subscription");
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription active",
        description: "Your premium subscription is now active!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to verify subscription status",
        variant: "destructive",
      });
    },
  });
}
