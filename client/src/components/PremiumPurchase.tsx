import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Check, Sparkles, Instagram, Facebook, Twitter, Star, Zap, Clock, Users, Shield } from "lucide-react";

export function PremiumPurchase() {
  const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/aEU5mLa9bfTn2k0146";

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-16">
      {/* Hero Section */}
      <section className="text-center space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
          Transform Your Aesthetic Clinic's Social Media
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Join leading aesthetic clinics using aestheti.cc to create stunning, engaging content that attracts and retains clients
        </p>
      </section>

      {/* Feature Grid */}
      <section className="grid md:grid-cols-3 gap-8">
        <FeatureCard 
          icon={<Zap className="w-10 h-10 text-pink-500" />}
          title="AI-Powered Content"
          description="Generate professional, industry-specific content in seconds with our advanced AI technology"
        />
        <FeatureCard 
          icon={<Clock className="w-10 h-10 text-purple-500" />}
          title="Time-Saving Automation"
          description="Schedule posts across multiple platforms and save hours on content creation"
        />
        <FeatureCard 
          icon={<Users className="w-10 h-10 text-indigo-500" />}
          title="Client Engagement"
          description="Boost engagement with targeted content that resonates with your aesthetic clinic audience"
        />
      </section>

      {/* Comparison Table */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">Choose Your Plan</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Plan */}
          <Card className="relative">
            <CardHeader>
              <CardTitle>Basic</CardTitle>
              <CardDescription>For clinics just getting started</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-6">$0/month</div>
              <ul className="space-y-4">
                <PlanFeature text="5 AI-generated posts per month" />
                <PlanFeature text="Basic templates" />
                <PlanFeature text="Single platform posting" />
              </ul>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-2 border-primary">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium">
              Recommended
            </div>
            <CardHeader>
              <CardTitle>Premium</CardTitle>
              <CardDescription>For growing aesthetic clinics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-6">$29.99/month</div>
              <ul className="space-y-4">
                <PlanFeature text="Unlimited AI-generated posts" />
                <PlanFeature text="Premium aesthetic templates" />
                <PlanFeature text="Multi-platform scheduling" />
                <PlanFeature text="Advanced analytics" />
                <PlanFeature text="Priority support" />
                <PlanFeature text="Custom branding" />
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                onClick={() => window.open(STRIPE_PAYMENT_LINK, '_blank')}
                className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Upgrade to Premium
              </Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Social Proof */}
      <section className="space-y-8">
        <h2 className="text-3xl font-bold text-center">Trusted by Leading Clinics</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <TestimonialCard
            quote="aestheti.cc has transformed how we handle our social media. The AI-generated content is perfect for our clinic."
            author="Dr. Sarah Johnson"
            role="Medical Director, BeautyMed Clinic"
          />
          <TestimonialCard
            quote="The time we save on content creation allows us to focus more on our patients. It's been a game-changer."
            author="Emma Thompson"
            role="Marketing Manager, Aesthetic Plus"
          />
          <TestimonialCard
            quote="Our engagement has increased by 300% since using aestheti.cc. The ROI is incredible."
            author="Dr. Michael Chen"
            role="Owner, Elite Aesthetics"
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="text-center space-y-6 bg-gradient-to-r from-pink-50 via-purple-50 to-indigo-50 p-12 rounded-2xl">
        <h2 className="text-3xl font-bold">Ready to Transform Your Clinic's Social Media?</h2>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Join the leading aesthetic clinics using aestheti.cc to grow their online presence and attract more clients.
        </p>
        <Button
          onClick={() => window.open(STRIPE_PAYMENT_LINK, '_blank')}
          size="lg"
          className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Get Started with Premium
        </Button>
      </section>
    </div>
  );
}

// Helper Components
function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="text-center">
      <CardHeader>
        <div className="mx-auto mb-4">{icon}</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function PlanFeature({ text }: { text: string }) {
  return (
    <li className="flex items-center gap-2">
      <Check className="w-5 h-5 text-green-500 shrink-0" />
      <span>{text}</span>
    </li>
  );
}

function TestimonialCard({ quote, author, role }: { quote: string; author: string; role: string }) {
  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex gap-1">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
          ))}
        </div>
        <p className="text-muted-foreground">{quote}</p>
        <div>
          <p className="font-semibold">{author}</p>
          <p className="text-sm text-muted-foreground">{role}</p>
        </div>
      </CardContent>
    </Card>
  );
}