import { useLocation } from "wouter";
import { useRequireAuth } from "../lib/auth";
import ContentGenerator from "../components/ContentGenerator";
import TemplateLibrary from "../components/TemplateLibrary";
import ContentCalendar from "../components/ContentCalendar";
import AnalyticsDashboard from "../components/AnalyticsDashboard";
import { Button } from "@/components/ui/button";
import { 
  PenLine, 
  LayoutTemplate, 
  Calendar, 
  BarChart,
  Settings,
  LogOut,
  ScrollText,
  Users,
  Award
} from "lucide-react";

export default function Dashboard() {
  const { user, isLoading, logout } = useRequireAuth();
  const [location, setLocation] = useLocation();
  const params = new URLSearchParams(location.split("?")[1]);
  const currentTab = params.get("tab") || "generate";

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

  // If no user is found after loading completes, render nothing (useRequireAuth will handle redirect)
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
    { id: "templates", label: "Templates", icon: <LayoutTemplate className="h-5 w-5" /> },
    { id: "calendar", label: "Calendar", icon: <Calendar className="h-5 w-5" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart className="h-5 w-5" /> },
  ];

  const renderContent = () => {
    switch (currentTab) {
      case "generate":
        return <ContentGenerator />;
      case "templates":
        return <TemplateLibrary />;
      case "calendar":
        return <ContentCalendar />;
      case "analytics":
        return <AnalyticsDashboard />;
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
                  onClick={() => setLocation(`/dashboard?tab=${item.id}`)}
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