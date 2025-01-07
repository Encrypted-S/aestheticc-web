import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    const maxDots = 3; // Reduced from 4 to match design
    const dotsToShow = Math.min(posts.length, maxDots);

    if (dotsToShow === 0) return null;

    return (
      <div className="flex gap-0.5 mt-0.5 justify-center">
        {Array.from({ length: dotsToShow }).map((_, i) => (
          <div
            key={i}
            className="h-1 w-1 rounded-full bg-rose-500" // Using rose-500 to match the pink dots in the design
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 h-full p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Calendar</h2>
      </div>

      <div className="w-full max-w-[900px] mx-auto">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          className="rounded-lg border shadow-sm w-full bg-white"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-4 w-full",
            caption: "flex justify-center pt-1 relative items-center mb-4",
            caption_label: "text-base font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 bg-transparent p-0 hover:opacity-100",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse space-y-1",
            head_row: "flex w-full",
            head_cell: "text-muted-foreground rounded-md w-full font-normal text-[0.8rem] h-10 flex items-center justify-center",
            row: "flex w-full mt-0",
            cell: "relative h-10 w-full p-0 text-center text-sm focus-within:relative focus-within:z-20 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
            day: "h-10 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-md",
            day_range_end: "day-range-end",
            day_selected: "bg-rose-500 text-rose-50 hover:bg-rose-500 hover:text-rose-50 focus:bg-rose-500 focus:text-rose-50 rounded-md",
            day_today: "bg-accent text-accent-foreground",
            day_outside: "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
          components={{
            Day: ({ date: dayDate, ...props }) => (
              <div className="relative w-full">
                <button {...props} className="w-full h-full p-2 flex flex-col items-center justify-center">
                  <span>{dayDate.getDate()}</span>
                  {renderPostDots(dayDate)}
                </button>
              </div>
            ),
          }}
        />
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>
              Schedule Post - {selectedDate ? format(selectedDate, 'MMMM d, yyyy') : ''}
            </SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
            <div className="space-y-4 pr-4">
              {libraryPosts?.map((post: any) => (
                <Card key={post.id} className="cursor-pointer hover:border-rose-500 transition-colors">
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