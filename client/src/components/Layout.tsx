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
          <Link href="/" className="text-2xl font-semibold text-primary">
            AestheticPost
          </Link>
          
          <NavigationMenu>
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Features</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-3 p-6 w-[400px]">
                    <div className="grid gap-3 p-4">
                      <div className="grid gap-3 p-4">
                        <Link href="/dashboard?tab=templates" className="block">
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm font-medium">Templates</div>
                            <div className="text-xs text-muted-foreground">Browse ready-to-use templates</div>
                          </div>
                        </Link>
                        <Link href="/dashboard?tab=generate" className="block">
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm font-medium">Content Generator</div>
                            <div className="text-xs text-muted-foreground">Create AI-powered content</div>
                          </div>
                        </Link>
                        <Link href="/dashboard?tab=calendar" className="block">
                          <div className="flex flex-col space-y-1">
                            <div className="text-sm font-medium">Calendar</div>
                            <div className="text-xs text-muted-foreground">Schedule and manage posts</div>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

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
