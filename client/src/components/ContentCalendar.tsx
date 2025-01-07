import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

export default function ContentCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Fetch all posts for scheduling
  const { data: libraryPosts } = useQuery({
    queryKey: ["library-posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts");
      return response.json();
    },
  });

  // Fetch scheduled posts
  const { data: scheduledPosts, refetch: refetchScheduledPosts } = useQuery({
    queryKey: ["scheduled-posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts/scheduled");
      return response.json();
    },
  });

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setSelectedDate(selectedDate);
      setIsSheetOpen(true);
    }
  };

  const getPostsForDate = (date: Date) => {
    return scheduledPosts?.filter((post: any) => {
      const postDate = new Date(post.scheduledFor);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    }) || [];
  };

  const schedulePost = async (postId: string) => {
    if (!selectedDate) return;

    try {
      await fetch("/api/posts/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          scheduledFor: selectedDate.toISOString(),
        }),
      });
      await refetchScheduledPosts();
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Failed to schedule post:", error);
    }
  };

  const renderPostDots = (day: Date) => {
    const posts = getPostsForDate(day);
    const maxDots = 4;
    const dotsToShow = Math.min(posts.length, maxDots);

    if (dotsToShow === 0) return null;

    return (
      <div className="flex flex-wrap gap-0.5 mt-1 justify-center">
        {Array.from({ length: dotsToShow }).map((_, i) => (
          <div
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary"
          />
        ))}
      </div>
    );
  };

  return (
    <div className="h-full p-8">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-3xl font-bold">Content Calendar</h2>
      </div>

      <div className="w-full max-w-4xl mx-auto">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          className="rounded-md border w-full p-8"
          components={{
            Day: ({ date: dayDate, ...props }) => (
              <div className="relative">
                <button {...props} className="w-full h-full p-2">
                  {dayDate.getDate()}
                  {renderPostDots(dayDate)}
                </button>
              </div>
            ),
          }}
        />
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px]">
          <SheetHeader>
            <SheetTitle>
              Schedule Post - {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
            <div className="space-y-4 pr-4">
              {libraryPosts?.map((post: any) => (
                <Card key={post.id} className="cursor-pointer hover:border-primary transition-colors">
                  <CardContent 
                    className="p-4"
                    onClick={() => schedulePost(post.id)}
                  >
                    <div className="space-y-2">
                      <div className="text-sm font-medium">
                        Platforms: {Array.isArray(post.platforms) ? post.platforms.join(", ") : post.platforms}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {typeof post.content === 'string' ? post.content : JSON.stringify(post.content)}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}