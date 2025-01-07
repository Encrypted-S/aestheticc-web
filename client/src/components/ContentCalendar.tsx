import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { PlusCircle } from "lucide-react";

interface Post {
  id: string;
  content: string;
  platforms: string[];
  scheduledFor?: string;
}

export default function ContentCalendar() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const queryClient = useQueryClient();

  // Fetch all posts for scheduling
  const { data: libraryPosts } = useQuery<Post[]>({
    queryKey: ["library-posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts");
      const data = await response.json();
      return data;
    },
  });

  // Fetch scheduled posts
  const { data: scheduledPosts } = useQuery<Post[]>({
    queryKey: ["scheduled-posts"],
    queryFn: async () => {
      const response = await fetch("/api/posts/scheduled");
      const data = await response.json();
      return data;
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
    return scheduledPosts?.filter((post) => {
      const postDate = new Date(post.scheduledFor!);
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
      // Optimistically update the UI
      const postToSchedule = libraryPosts?.find(post => post.id === postId);
      if (postToSchedule) {
        const updatedPost = { ...postToSchedule, scheduledFor: selectedDate.toISOString() };
        queryClient.setQueryData<Post[]>(["scheduled-posts"], (old = []) => [...old, updatedPost]);
      }

      const response = await fetch("/api/posts/schedule", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          postId,
          scheduledFor: selectedDate.toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to schedule post");
      }

      // Invalidate and refetch to ensure data consistency
      await queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
      setIsSheetOpen(false);
    } catch (error) {
      console.error("Failed to schedule post:", error);
      // Revert optimistic update on error
      await queryClient.invalidateQueries({ queryKey: ["scheduled-posts"] });
    }
  };

  const renderPostDots = (day: Date) => {
    const posts = getPostsForDate(day);
    const maxDots = 3;
    const dotsToShow = Math.min(posts.length, maxDots);

    if (dotsToShow === 0) return null;

    return (
      <div className="flex gap-0.5 mt-1 justify-center">
        {Array.from({ length: dotsToShow }).map((_, i) => (
          <div
            key={i}
            className="h-1 w-1 rounded-full bg-rose-500"
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
          className="rounded-lg border shadow-sm w-full bg-white p-4"
          classNames={{
            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
            month: "space-y-6 w-full",
            caption: "flex justify-center pt-1 relative items-center mb-6",
            caption_label: "text-base font-medium",
            nav: "space-x-1 flex items-center",
            nav_button: "h-7 w-7 bg-transparent p-0 hover:opacity-100",
            nav_button_previous: "absolute left-1",
            nav_button_next: "absolute right-1",
            table: "w-full border-collapse",
            head_row: "flex w-full border-b border-border",
            head_cell: "text-muted-foreground w-full font-normal text-[0.8rem] h-14 flex items-center justify-center border-r border-border last:border-r-0",
            row: "flex w-full border-b border-border last:border-b-0",
            cell: "relative h-24 w-full p-0 text-center text-sm focus-within:relative focus-within:z-20 border-r border-border last:border-r-0 group",
            day: "h-24 w-full p-0 font-normal aria-selected:opacity-100 hover:bg-accent rounded-none flex flex-col items-center justify-start pt-2 relative",
            day_range_end: "day-range-end",
            day_selected: "bg-rose-500 text-rose-50 hover:bg-rose-500 hover:text-rose-50 focus:bg-rose-500 focus:text-rose-50",
            day_today: "bg-muted/30 text-foreground font-medium",
            day_outside: "text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
            day_disabled: "text-muted-foreground opacity-50",
            day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            day_hidden: "invisible",
          }}
          components={{
            Day: ({ date: dayDate, ...props }) => (
              <div className="relative w-full">
                <button {...props} className="w-full h-full p-2 flex flex-col items-center group">
                  <div className="flex flex-col items-center">
                    <span className="mb-1">{dayDate.getDate()}</span>
                    {renderPostDots(dayDate)}
                  </div>
                  <div className="flex-1 flex items-center justify-center w-full">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <PlusCircle 
                        className="w-8 h-8 text-muted-foreground/60 cursor-pointer hover:text-muted-foreground transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDateSelect(dayDate);
                        }}
                      />
                    </div>
                  </div>
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
              {libraryPosts?.map((post) => (
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