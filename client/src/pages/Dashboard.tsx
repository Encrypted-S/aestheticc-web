import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useRequireAuth } from "../lib/auth";
import ContentGenerator from "../components/ContentGenerator";
import TemplateLibrary from "../components/TemplateLibrary";
import ContentCalendar from "../components/ContentCalendar";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import LibraryView from "../components/LibraryView";
import { Button } from "@/components/ui/button";
import { 
  PenLine, 
  LayoutTemplate, 
  Calendar, 
  BarChart,
  LogOut,
  ScrollText,
  Sparkles
} from "lucide-react";
import cn from 'classnames';

export default function Dashboard() {
  const { user, isLoading, logout } = useRequireAuth();
  const [location, setLocation] = useLocation();
  const [currentTab, setCurrentTab] = useState("generate");

  useEffect(() => {
    // Parse the tab from the current location
    const searchParams = new URLSearchParams(location.split("?")[1]);
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== currentTab) {
      setCurrentTab(tabFromUrl);
    }
  }, [location]);

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2">Loading your dashboard...</span>
        </div>
      </div>
    );
  }

  // If no user is found after loading completes, render nothing
  if (!user) {
    console.log("No user found in Dashboard, redirecting...");
    return null;
  }

  const handleLogout = async () => {
    try {
      await logout();
      setLocation("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const menuItems = [
    { id: "generate", label: "Generate Post", icon: <PenLine className="h-5 w-5" /> },
    { id: "library", label: "Library", icon: <ScrollText className="h-5 w-5" /> },
    { id: "templates", label: "Templates", icon: <LayoutTemplate className="h-5 w-5" /> },
    { id: "calendar", label: "Calendar", icon: <Calendar className="h-5 w-5" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart className="h-5 w-5" /> },
    { 
      id: "pro", 
      label: "Become a Pro", 
      icon: <Sparkles className="h-5 w-5" />
    },
  ];

  const handleTabChange = (tabId: string) => {
    setCurrentTab(tabId);
    setLocation(`/dashboard?tab=${tabId}`);
  };

  const renderContent = () => {
    console.log("Rendering tab:", currentTab);
    switch (currentTab) {
      case "generate":
        return <ContentGenerator />;
      case "library":
        return <LibraryView />;
      case "templates":
        return <TemplateLibrary />;
      case "calendar":
        return <ContentCalendar />;
      case "analytics":
        return <AnalyticsDashboard />;
      case "pro":
        return (
          <div className="max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-center">Upgrade to Pro</h1>
            <div className="grid gap-8 p-6 border rounded-lg bg-card">
              <div className="space-y-4">
                <h2 className="text-2xl font-semibold">Premium Features</h2>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-orange-500" />
                    <span>Advanced AI content generation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <span>Unlimited social media posts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-pink-500" />
                    <span>Priority support</span>
                  </li>
                </ul>
              </div>
              <Button 
                className="w-full bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:from-orange-600 hover:to-purple-700"
                size="lg"
              >
                Upgrade Now
              </Button>
            </div>
          </div>
        );
      default:
        return <ContentGenerator />;
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <div className="w-64 border-r bg-card">
        <div className="h-full flex flex-col">
          {/* User section */}
          <div className="p-4 border-b">
            <h2 className="font-semibold truncate">Welcome, {user.name}</h2>
          </div>

          {/* Main navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentTab === item.id ? "secondary" : "ghost"}
                  className="w-full justify-start gap-3"
                  onClick={() => handleTabChange(item.id)}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </div>
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              Log Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}