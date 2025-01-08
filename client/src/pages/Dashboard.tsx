import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useRequireAuth } from "../lib/auth";
import ContentGenerator from "../components/ContentGenerator";
import TemplateLibrary from "../components/TemplateLibrary";
import ContentCalendar from "../components/ContentCalendar";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import LibraryView from "../components/LibraryView";
import { PremiumPurchase } from "@/components/PremiumPurchase";
import { Button } from "@/components/ui/button";
import { 
  PenLine, 
  LayoutTemplate, 
  Calendar, 
  BarChart,
  LogOut,
  ScrollText,
  Crown
} from "lucide-react";
import { usePremiumStatus } from "@/lib/stripe";

type MenuItem = {
  id: string;
  label: string;
  icon: JSX.Element;
  requiresPremium?: boolean;
};

export default function Dashboard() {
  const { user, isLoading, logout } = useRequireAuth();
  const [location, setLocation] = useLocation();
  const [currentTab, setCurrentTab] = useState("generate");
  const { data: isPremium } = usePremiumStatus();

  console.log("Dashboard rendering with user:", user);
  console.log("Current tab:", currentTab);
  console.log("Premium status:", isPremium);

  useEffect(() => {
    const searchParams = new URLSearchParams(location.split("?")[1]);
    const tabFromUrl = searchParams.get("tab");
    if (tabFromUrl && tabFromUrl !== currentTab) {
      setCurrentTab(tabFromUrl);
    }
  }, [location]);

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

  const menuItems: MenuItem[] = [
    { id: "generate", label: "Generate Post", icon: <PenLine className="h-5 w-5" /> },
    { id: "library", label: "Library", icon: <ScrollText className="h-5 w-5" /> },
    { id: "templates", label: "Templates", icon: <LayoutTemplate className="h-5 w-5" /> },
    { id: "calendar", label: "Calendar", icon: <Calendar className="h-5 w-5" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart className="h-5 w-5" /> },
  ];

  // Add Premium tab for non-premium users
  if (!isPremium) {
    menuItems.push({
      id: "premium",
      label: "Upgrade to Premium",
      icon: <Crown className="h-5 w-5 text-yellow-500" />,
    });
  }

  const handleTabChange = (tabId: string) => {
    console.log("Changing tab to:", tabId);
    setCurrentTab(tabId);
    setLocation(`/dashboard?tab=${tabId}`);
  };

  const renderContent = () => {
    console.log("Rendering content for tab:", currentTab);
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
      case "premium":
        return <PremiumPurchase />;
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
            {isPremium && (
              <span className="text-sm text-yellow-500 flex items-center gap-1">
                <Crown className="h-4 w-4" />
                Premium Member
              </span>
            )}
          </div>

          {/* Main navigation */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {menuItems.map((item) => (
                <Button
                  key={item.id}
                  variant={currentTab === item.id ? "secondary" : "ghost"}
                  className={`w-full justify-start gap-3 ${item.id === "premium" ? "text-yellow-500 hover:text-yellow-600" : ""}`}
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