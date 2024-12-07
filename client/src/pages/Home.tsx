import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center">
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url(https://images.unsplash.com/photo-1532926381893-7542290edf1d)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.7)",
          }}
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-2xl text-white">
            <h1 className="text-5xl font-bold mb-6">
              Elevate Your Aesthetic Clinic's Social Presence
            </h1>
            <p className="text-xl mb-8">
              Create stunning, coordinated social media content for your aesthetic clinic with our AI-powered platform.
            </p>
            <Button size="lg" asChild>
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">
            Transform Your Social Media Strategy
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <img
                src="https://images.unsplash.com/photo-1552693673-1bf958298935"
                alt="Content Generation"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">Smart Content Generation</h3>
              <p className="text-muted-foreground">
                Create platform-optimized content with our AI assistant.
              </p>
            </div>
            <div className="text-center p-6">
              <img
                src="https://images.unsplash.com/photo-1519824145371-296894a0daa9"
                alt="Templates"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">Professional Templates</h3>
              <p className="text-muted-foreground">
                Access our library of aesthetic industry-specific templates.
              </p>
            </div>
            <div className="text-center p-6">
              <img
                src="https://images.unsplash.com/photo-1624454002302-36b824d7bd0a"
                alt="Scheduling"
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
              <h3 className="text-xl font-semibold mb-2">Smart Scheduling</h3>
              <p className="text-muted-foreground">
                Plan and schedule your content across multiple platforms.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
