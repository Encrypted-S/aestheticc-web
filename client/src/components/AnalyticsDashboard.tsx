import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart, LineChart, ResponsiveContainer } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<string>("7d");

  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ["analytics", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      if (!response.ok) throw new Error("Failed to fetch analytics");
      return response.json();
    },
  });

  if (isLoading) {
    return <div>Loading analytics...</div>;
  }

  const generateSampleData = async () => {
    try {
      console.log("Sending request to generate sample data");
      const response = await fetch("/api/analytics/generate-sample", {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate sample data");
      }
      
      console.log("Sample data generated successfully");
      await refetch();
    } catch (error) {
      console.error("Failed to generate sample data:", error);
    }
  };

  // Transform data for charts
  const platformChartData = analytics?.platformStats?.map((stat: any) => ({
    name: stat.platform,
    Posts: stat.posts,
    Impressions: stat.impressions,
  })) || [];

  const contentTypeChartData = analytics?.contentTypeStats?.map((stat: any) => ({
    name: stat.type,
    Posts: stat.posts,
    Engagements: stat.engagements,
  })) || [];

  const chartConfig = {
    Posts: {
      color: "hsl(var(--primary))",
    },
    Impressions: {
      color: "hsl(var(--secondary))",
    },
    Engagements: {
      color: "hsl(var(--accent))",
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Analytics Overview</h2>
        <div className="flex items-center gap-4">
          {import.meta.env.DEV && (
            <Button
              variant="outline"
              onClick={generateSampleData}
              className="mr-4"
            >
              Generate Sample Data
            </Button>
          )}
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalPosts || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Impressions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics?.totalImpressions || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {((analytics?.engagementRate || 0) * 100).toFixed(1)}%
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={platformChartData}>
                    <ChartTooltip>
                      <ChartTooltipContent />
                    </ChartTooltip>
                    <BarChart.XAxis dataKey="name" />
                    <BarChart.YAxis />
                    <BarChart.Bar
                      dataKey="Posts"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                    <BarChart.Bar
                      dataKey="Impressions"
                      fill="hsl(var(--secondary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Content Type Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={chartConfig}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={contentTypeChartData}>
                    <ChartTooltip>
                      <ChartTooltipContent />
                    </ChartTooltip>
                    <BarChart.XAxis dataKey="name" />
                    <BarChart.YAxis />
                    <BarChart.Bar
                      dataKey="Posts"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                    <BarChart.Bar
                      dataKey="Engagements"
                      fill="hsl(var(--accent))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
