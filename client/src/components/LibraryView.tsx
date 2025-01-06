import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { ScheduledPost } from "@/db/schema";

export default function LibraryView() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/posts')
      .then(res => res.json())
      .then(data => {
        setPosts(data);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('Error fetching posts:', error);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Content Library</h2>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <div
            key={post.id}
            className="group relative rounded-lg border p-4 hover:border-primary transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {post.platforms.join(", ")}
                  </span>
                </div>
                <div>
                  <p className="line-clamp-2 text-sm">
                    {typeof post.content === 'string' 
                      ? post.content 
                      : JSON.stringify(post.content)}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Created: {new Date(post.createdAt).toLocaleDateString()}
              </p>
              <p>
                Scheduled: {new Date(post.scheduledFor).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))}
      </div>

      {posts.length === 0 && (
        <div className="text-center py-10">
          <ScrollText className="mx-auto h-10 w-10 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-semibold">No posts yet</h3>
          <p className="text-muted-foreground">
            Generated posts will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
