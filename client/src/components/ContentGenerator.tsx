import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type FormData = {
  topic: string;
  platform: string;
  tone: string;
  content: string;
};

export default function ContentGenerator() {
  const form = useForm<FormData>();
  const [preview, setPreview] = useState<React.ReactNode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const onSubmit = async (data: FormData) => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const result = await response.json();
      setPreview(
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Content:</h4>
            <p className="whitespace-pre-wrap">{result.mainText}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Hashtags:</h4>
            <p className="text-primary">{result.hashtags.join(" ")}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Image Prompt:</h4>
            <p className="italic">{result.imagePrompt}</p>
          </div>
        </div>
      );
    } catch (error) {
      console.error(error);
      setPreview(
        <div className="text-destructive">
          Failed to generate content. Please try again.
        </div>
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Skin Care Tips" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="platform"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Platform</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tone</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select tone" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="luxurious">Luxurious</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Content"}
            </Button>
          </form>
        </Form>
      </div>

      <div className="bg-muted p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        <div className="prose">
          {preview || "Generated content will appear here..."}
        </div>
      </div>
    </div>
  );
}
