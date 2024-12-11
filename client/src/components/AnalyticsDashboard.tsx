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
import {
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Bar,
  Tooltip,
  TooltipProps,
} from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

// Define types for our analytics data
interface PlatformStat {
  platform: string;
  posts: number;
  impressions: number;
}

interface ContentTypeStat {
  type: string;
  posts: number;
  engagements: number;
}

interface AnalyticsData {
  totalPosts: number;
  totalImpressions: number;
  engagementRate: number;
  platformStats: PlatformStat[];
  contentTypeStats: ContentTypeStat[];
}

type PlatformChartData = {
  name: string;
  Posts: number;
  Impressions: number;
}

type ContentTypeChartData = {
  name: string;
  Posts: number;
  Engagements: number;
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<string>("7d");

  const { data: analytics, isLoading, error, refetch } = useQuery<AnalyticsData>({
    queryKey: ["analytics", timeRange],
    queryFn: async () => {
      const response = await fetch(`/api/analytics?timeRange=${timeRange}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to fetch analytics");
      }
      return response.json();
    },
  });

  const generateSampleData = async () => {
    try {
      const response = await fetch("/api/analytics/generate-sample", {
        method: "POST",
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to generate sample data");
      }
      
      await refetch();
    } catch (error) {
      console.error("Failed to generate sample data:", error);
    }
  };

  // Transform data for charts with proper typing
  const platformChartData: PlatformChartData[] = analytics?.platformStats?.map((stat) => ({
    name: stat.platform,
    Posts: stat.posts,
    Impressions: stat.impressions,
  })) || [];

  const contentTypeChartData: ContentTypeChartData[] = analytics?.contentTypeStats?.map((stat) => ({
    name: stat.type,
    Posts: stat.posts,
    Engagements: stat.engagements,
  })) || [];

  const chartConfig = {
    Posts: {
      label: "Posts",
      color: "hsl(var(--primary))",
    },
    Impressions: {
      label: "Impressions",
      color: "hsl(var(--secondary))",
    },
    Engagements: {
      label: "Engagements",
      color: "hsl(var(--accent))",
    },
  };

  if (error) {
    return (
      <div className="p-4 text-destructive">
        Failed to load analytics: {error instanceof Error ? error.message : "Unknown error"}
      </div>
    );
  }

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
        <MetricCard
          title="Total Posts"
          value={analytics?.totalPosts}
          isLoading={isLoading}
        />
        <MetricCard
          title="Total Impressions"
          value={analytics?.totalImpressions}
          isLoading={isLoading}
        />
        <MetricCard
          title="Engagement Rate"
          value={analytics?.engagementRate}
          isLoading={isLoading}
          formatter={(value) => `${(value * 100).toFixed(1)}%`}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Platform Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-[300px]">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={platformChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <Tooltip 
                        cursor={{ fill: 'var(--background)' }}
                        contentStyle={{ 
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '8px'
                        }}
                      />
                      <XAxis 
                        dataKey="name"
                        stroke="var(--foreground)"
                        fontSize={12}
                        tickLine={false}
                        dy={5}
                      />
                      <YAxis
                        stroke="var(--foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dx={-5}
                      />
                      <Bar
                        dataKey="Posts"
                        fill={chartConfig.Posts.color}
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                      <Bar
                        dataKey="Impressions"
                        fill={chartConfig.Impressions.color}
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Content Type Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="h-[300px]">
                <ChartContainer config={chartConfig}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={contentTypeChartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <Tooltip 
                        cursor={{ fill: 'var(--background)' }}
                        contentStyle={{ 
                          backgroundColor: 'var(--background)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '8px'
                        }}
                      />
                      <XAxis 
                        dataKey="name"
                        stroke="var(--foreground)"
                        fontSize={12}
                        tickLine={false}
                        dy={5}
                      />
                      <YAxis
                        stroke="var(--foreground)"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        dx={-5}
                        domain={[0, 'auto']}
                      />
                      <Bar
                        dataKey="Posts"
                        fill={chartConfig.Posts.color}
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                      <Bar
                        dataKey="Engagements"
                        fill={chartConfig.Engagements.color}
                        radius={[4, 4, 0, 0]}
                        barSize={20}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value?: number;
  isLoading: boolean;
  formatter?: (value: number) => string;
}

function MetricCard({ title, value, isLoading, formatter }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">
            {value === undefined ? '-' : formatter ? formatter(value) : value.toLocaleString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
