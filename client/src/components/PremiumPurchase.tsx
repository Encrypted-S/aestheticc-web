import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";

export function PremiumPurchase() {
  const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/aEU5mLa9bfTn2k0146";

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
          onClick={() => window.open(STRIPE_PAYMENT_LINK, '_blank')}
          className="w-full"
        >
          Upgrade Now
        </Button>
      </CardFooter>
    </Card>
  );
}