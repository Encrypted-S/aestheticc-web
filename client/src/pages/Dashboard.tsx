import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ContentGenerator from "../components/ContentGenerator";
import TemplateLibrary from "../components/TemplateLibrary";
import ContentCalendar from "../components/ContentCalendar";
import AnalyticsDashboard from "../components/AnalyticsDashboard";

import { useLocation } from "wouter";
import { useRequireAuth } from "../lib/auth";

export default function Dashboard() {
  const { user, isLoading } = useRequireAuth();
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1]);
  const defaultTab = params.get("tab") || "generate";

  if (isLoading) {
    return <div className="container mx-auto px-4 py-8">Loading...</div>;
  }

  if (!user) {
    return null; // useRequireAuth will redirect to login
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Welcome, {user.name}</h1>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate">Generate Content</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="generate">
          <ContentGenerator />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateLibrary />
        </TabsContent>

        <TabsContent value="calendar">
          <ContentCalendar />
        </TabsContent>

        <TabsContent value="analytics">
          <AnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
