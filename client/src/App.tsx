import { Switch, Route } from "wouter";
import { PremiumPurchase } from "@/components/PremiumPurchase";
import { usePremiumStatus } from "@/lib/stripe";

function App() {
  const { data: isPremium, isLoading } = usePremiumStatus();

  return (
    <div className="container mx-auto py-8">
      <Switch>
        <Route path="/premium" component={PremiumPurchase} />
        <Route path="/">
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
            <h1 className="text-3xl font-bold">Welcome to Aesthetic Clinic CMS</h1>
            {isLoading ? (
              <p>Loading premium status...</p>
            ) : isPremium ? (
              <p className="text-green-600">You have premium access!</p>
            ) : (
              <a 
                href="/premium" 
                className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md"
              >
                Upgrade to Premium
              </a>
            )}
          </div>
        </Route>
      </Switch>
    </div>
  );
}

export default App;
