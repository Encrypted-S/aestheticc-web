import { useEffect, useState } from "react";
import { ScrollText, ArrowLeft, Pencil, X, Check } from "lucide-react";
import { ScheduledPost } from "../../../db/schema";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";

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
  const [editingPost, setEditingPost] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState<PostContent | null>(null);

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = () => {
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
  };

  const handleEdit = (post: ScheduledPost) => {
    setEditingPost(post.id);
    const content = post.content as PostContent;
    setEditedContent({
      mainText: content.mainText || content.text || '',
      imagePrompt: content.imagePrompt || '',
      hashtags: content.hashtags || '',
    });
  };

  const handleSave = async (postId: string) => {
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: editedContent }),
      });

      if (!response.ok) {
        throw new Error('Failed to update post');
      }

      // Update local state
      setPosts(posts.map(post => 
        post.id === postId 
          ? { ...post, content: editedContent }
          : post
      ));

      setEditingPost(null);
      setEditedContent(null);
    } catch (error) {
      console.error('Error updating post:', error);
    }
  };

  const handleCancel = () => {
    setEditingPost(null);
    setEditedContent(null);
  };

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
            className="group relative rounded-lg border p-4 hover:border-primary transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2 w-full">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ScrollText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">
                      {Array.isArray(post.platforms) ? post.platforms.join(", ") : post.platforms}
                    </span>
                  </div>
                  {editingPost === post.id ? (
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSave(post.id)}
                        className="h-8 w-8"
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancel}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(post)}
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div onClick={() => !editingPost && setSelectedPost(post)} className={editingPost === post.id ? "" : "cursor-pointer"}>
                  {editingPost === post.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editedContent?.mainText}
                        onChange={(e) => setEditedContent(prev => ({ ...prev!, mainText: e.target.value }))}
                        placeholder="Main content"
                        className="min-h-[100px] text-sm"
                      />
                      <Input
                        value={editedContent?.imagePrompt}
                        onChange={(e) => setEditedContent(prev => ({ ...prev!, imagePrompt: e.target.value }))}
                        placeholder="Image prompt"
                        className="text-sm"
                      />
                      <Input
                        value={typeof editedContent?.hashtags === 'string' ? editedContent.hashtags : editedContent?.hashtags?.join(' ')}
                        onChange={(e) => setEditedContent(prev => ({ ...prev!, hashtags: e.target.value }))}
                        placeholder="Hashtags (space separated)"
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <p className="line-clamp-3 text-sm whitespace-pre-wrap break-words">
                      {typeof post.content === 'string'
                        ? post.content
                        : typeof post.content === 'object' && post.content
                          ? (post.content as PostContent).mainText || (post.content as PostContent).text
                          : ''}
                    </p>
                  )}
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