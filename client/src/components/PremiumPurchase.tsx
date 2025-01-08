import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { usePurchasePremium } from "@/lib/stripe";

export function PremiumPurchase() {
  const { mutate: purchasePremium, isPending } = usePurchasePremium();

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Upgrade to Premium</CardTitle>
        <CardDescription>
          Get access to all premium features with a one-time purchase
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <h3 className="text-2xl font-bold">$29.99</h3>
          <ul className="space-y-2">
            <li className="flex items-center">✓ Advanced AI Content Generation</li>
            <li className="flex items-center">✓ Unlimited Posts</li>
            <li className="flex items-center">✓ Priority Support</li>
          </ul>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={() => purchasePremium()} 
          disabled={isPending}
          className="w-full"
        >
          {isPending ? "Processing..." : "Purchase Premium"}
        </Button>
      </CardFooter>
    </Card>
  );
}