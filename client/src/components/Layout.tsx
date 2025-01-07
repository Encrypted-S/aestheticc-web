import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="h-12">
            <img src="/aestheticc-logo-MAIN.png" alt="AestheticPost" className="h-full" />
          </Link>
          
          

          <div className="space-x-4">
            {location === "/" ? (
              <>
                <Button variant="outline" asChild>
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/login">Sign up</Link>
                </Button>
              </>
            ) : (
              <Button variant="outline" onClick={() => {
                fetch("/api/auth/logout", { method: "POST" })
                  .then(() => window.location.href = "/");
              }}>
                Log out
              </Button>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="border-t mt-20">
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-sm text-muted-foreground">
            © 2024 AestheticPost. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
