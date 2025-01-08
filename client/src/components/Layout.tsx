import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { HomeIcon } from "lucide-react";

export default function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <Link href="/" className="h-12">
                <img src="/aestheticc-logo-MAIN.png" alt="AestheticPost" className="h-full" />
              </Link>
              <ThemeToggle />
            </div>

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

        <div className="flex">
          <Sidebar>
            <SidebarHeader>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location === "/"} tooltip="Home">
                    <Link href="/" className="flex items-center gap-2">
                      <HomeIcon className="h-4 w-4" />
                      <span>Home</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarHeader>
          </Sidebar>
          <main className="flex-1 p-6">{children}</main>
        </div>

        <footer className="border-t mt-20">
          <div className="container mx-auto px-4 py-8">
            <p className="text-center text-sm text-muted-foreground">
              © 2024 AestheticPost. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </SidebarProvider>
  );
}