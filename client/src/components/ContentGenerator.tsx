import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const formSchema = z.object({
  topic: z.string().min(1, "Topic is required"),
  treatmentCategory: z.string().min(1, "Treatment category is required"),
  contentType: z.string().min(1, "Content type is required"),
  platform: z.string().min(1, "Platform is required"),
  tone: z.string().min(1, "Tone is required"),
  provider: z.enum(["openai", "anthropic"]).default("anthropic"),
  additionalContext: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const treatmentCategories = [
  { value: "skincare", label: "Skincare Treatments" },
  { value: "injectables", label: "Injectables & Fillers" },
  { value: "laser", label: "Laser Treatments" },
  { value: "antiaging", label: "Anti-Aging Procedures" },
  { value: "body", label: "Body Treatments" },
  { value: "wellness", label: "Wellness & Recovery" },
];

const contentTypes = [
  { value: "educational", label: "Educational Content" },
  { value: "beforeAfter", label: "Before & After" },
  { value: "promotional", label: "Special Offers" },
  { value: "procedure", label: "Procedure Highlights" },
  { value: "tips", label: "Tips & Aftercare" },
];

export default function ContentGenerator() {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      treatmentCategory: "",
      contentType: "",
      platform: "",
      tone: "",
      provider: "anthropic",
      additionalContext: "",
    },
  });

  const [preview, setPreview] = useState<React.ReactNode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [isSaved, setIsSaved] = useState(false);

  const formatContent = (content: any) => {
    // Extract the content sections and ensure proper spacing
    const mainText = content.mainText.trim();
    const hashtags = content.hashtags.join(" ");
    const imagePrompt = content.imagePrompt.replace(/^\[(ANTHROPIC|OPENAI)\]\s*/i, "");

    return (
      <div className="space-y-6">
        <div>
          <h4 className="font-semibold mb-3">Content:</h4>
          <p className="whitespace-pre-wrap">{mainText}</p>
        </div>

        {content.disclaimer && (
          <div>
            <h4 className="font-semibold mb-3">Medical Disclaimer:</h4>
            <p className="text-sm text-muted-foreground">{content.disclaimer}</p>
          </div>
        )}

        <div>
          <h4 className="font-semibold mb-3">Hashtags:</h4>
          <p className="text-primary">{hashtags}</p>
        </div>

        <div>
          <h4 className="font-semibold mb-3">Image Suggestion:</h4>
          <p className="italic">{imagePrompt}</p>
        </div>
      </div>
    );
  };

  const onSubmit = async (data: FormData) => {
    setIsGenerating(true);
    setIsSaved(false);
    setPreview(null);

    try {
      await fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventType: "generate",
          platform: data.platform,
          contentType: data.contentType,
        }),
      });

      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to generate content");
      }

      if (!result.success) {
        throw new Error(result.error || "Content generation failed");
      }

      setGeneratedContent(result.content);
      setPreview(formatContent(result.content));
    } catch (error) {
      console.error("Content generation error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";

      setPreview(
        <div className="p-4 border border-destructive rounded bg-destructive/10">
          <div className="text-destructive font-semibold mb-2">Content Generation Failed</div>
          <p className="text-destructive">{errorMessage}</p>
          <p className="text-sm text-muted-foreground mt-2">
            Please check your inputs and try again. If the problem persists, the service may be temporarily unavailable.
          </p>
        </div>
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!generatedContent) return;

    setIsSaving(true);
    try {
      const saveResponse = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: {
            text: generatedContent.mainText,
            hashtags: generatedContent.hashtags,
            imagePrompt: generatedContent.imagePrompt,
            disclaimer: generatedContent.disclaimer
          },
          platforms: [form.getValues().platform],
          scheduledFor: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
        credentials: "include",
      });

      if (!saveResponse.ok) {
        throw new Error("Failed to save content to library");
      }

      setIsSaved(true);
    } catch (error) {
      console.error(error);
      setIsSaved(false);
      setPreview(prev => (
        <div>
          {prev}
          <div className="mt-4 p-4 border border-destructive rounded bg-destructive/10 text-destructive">
            Failed to save content. Please try again.
          </div>
        </div>
      ));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Form fields remain the same */}
            <FormField
              control={form.control}
              name="topic"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Topic</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Benefits of Hyaluronic Acid" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="provider"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>AI Provider</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI provider" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="openai">ChatGPT</SelectItem>
                      <SelectItem value="anthropic">Claude</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose the AI model to generate your content
                  </FormDescription>
                </FormItem>
              )}
            />

            {/* Rest of your form fields remain exactly the same */}
            {/* Just copying the remaining form fields structure */}
            <FormField
              control={form.control}
              name="treatmentCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Treatment Category</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {treatmentCategories.map((category) => (
                        <SelectItem key={category.value} value={category.value}>
                          {category.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="contentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Content Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select content type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {contentTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="twitter">Twitter</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Content will be optimized for the selected platform
                  </FormDescription>
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
                      <SelectItem value="medical">Medical Professional</SelectItem>
                      <SelectItem value="luxurious">Luxurious & Premium</SelectItem>
                      <SelectItem value="friendly">Friendly & Approachable</SelectItem>
                      <SelectItem value="educational">Educational & Informative</SelectItem>
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalContext"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Context (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Add any specific details or requirements..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? "Generating..." : "Generate Content"}
              </Button>
              {generatedContent && !isSaved && (
                <Button
                  type="button"
                  onClick={handleSaveToLibrary}
                  disabled={isSaving}
                  variant="outline"
                >
                  {isSaving ? "Saving..." : "Save to Library"}
                </Button>
              )}
              {isSaved && (
                <Button
                  type="button"
                  variant="outline"
                  className="bg-green-100 text-green-700 border-green-200 hover:bg-green-200"
                  disabled
                >
                  Saved!
                </Button>
              )}
            </div>
          </form>
        </Form>
      </div>

      <div className="bg-muted p-6 rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Preview</h3>
        <div className="prose max-w-none">
          {preview || "Generated content will appear here..."}
        </div>
      </div>
    </div>
  );
}