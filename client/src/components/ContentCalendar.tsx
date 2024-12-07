import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";

export default function ContentCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());

  const { data: scheduledPosts } = useQuery({
    queryKey: ["scheduled-posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts/scheduled");
      return response.json();
    },
  });

  return (
    <div className="grid md:grid-cols-[300px,1fr] gap-8">
      <div>
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-md border"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold mb-4">Scheduled Posts</h3>
        {scheduledPosts?.map((post: any) => (
          <Card key={post.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{new Date(post.scheduledFor).toLocaleDateString()}</p>
                  <p className="text-sm text-muted-foreground">
                    Platforms: {post.platforms.join(", ")}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {post.published ? (
                    <span className="text-green-500 text-sm">Published</span>
                  ) : (
                    <span className="text-orange-500 text-sm">Scheduled</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
