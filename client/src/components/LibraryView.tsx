import { useEffect, useState } from "react";
import { ScrollText, ArrowLeft } from "lucide-react";
import { ScheduledPost } from "../../../db/schema";
import { Button } from "./ui/button";

interface PostContent {
  mainText?: string;
  text?: string;
  imagePrompt?: string;
  hashtags?: string | string[];
}

export default function LibraryView() {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState<ScheduledPost | null>(null);

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

  if (selectedPost) {
    const content = selectedPost.content as PostContent | string | undefined;

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedPost(null)}
            className="hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold">Post Details</h2>
        </div>

        <div className="rounded-lg border p-6 space-y-4">
          <div className="flex items-center gap-2">
            <ScrollText className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {Array.isArray(selectedPost.platforms) ? selectedPost.platforms.join(", ") : selectedPost.platforms}
            </span>
          </div>
          <div className="prose max-w-none space-y-6">
            {typeof content === 'object' && content ? (
              <>
                <div>
                  <h3 className="text-lg font-semibold mb-2">Main Content</h3>
                  <div className="text-sm whitespace-pre-wrap">
                    {String(content.mainText || content.text || '')}
                  </div>
                </div>

                {content.imagePrompt && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Image Suggestion</h3>
                    <div className="text-sm italic">
                      {content.imagePrompt}
                    </div>
                  </div>
                )}

                {content.hashtags && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Hashtags</h3>
                    <div className="text-sm text-primary">
                      {Array.isArray(content.hashtags)
                        ? content.hashtags.join(' ')
                        : content.hashtags}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-sm whitespace-pre-wrap">
                {String(content || '')}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <p>
              Created: {selectedPost.createdAt ? new Date(selectedPost.createdAt).toLocaleDateString() : 'N/A'}
            </p>
            <p>
              Scheduled: {new Date(selectedPost.scheduledFor).toLocaleDateString()}
            </p>
          </div>
        </div>
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
            className="group relative rounded-lg border p-4 hover:border-primary transition-colors cursor-pointer"
            onClick={() => setSelectedPost(post)}
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <ScrollText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {Array.isArray(post.platforms) ? post.platforms.join(", ") : post.platforms}
                  </span>
                </div>
                <div>
                  <p className="line-clamp-3 text-sm whitespace-pre-wrap break-words">
                    {typeof post.content === 'string'
                      ? post.content
                      : typeof post.content === 'object' && post.content
                        ? JSON.stringify(post.content, null, 2)
                        : ''}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
              <p>
                Created: {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'N/A'}
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