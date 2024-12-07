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
      additionalContext: "",
    },
  });

  const [preview, setPreview] = useState<React.ReactNode | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const onSubmit = async (data: FormData) => {
    setIsGenerating(true);
    try {
      // Track content generation event
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
          {result.disclaimer && (
            <div>
              <h4 className="font-semibold mb-2">Medical Disclaimer:</h4>
              <p className="text-sm text-muted-foreground">{result.disclaimer}</p>
            </div>
          )}
          <div>
            <h4 className="font-semibold mb-2">Hashtags:</h4>
            <p className="text-primary">{result.hashtags.join(" ")}</p>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Image Suggestion:</h4>
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
                    <Input placeholder="e.g., Benefits of Hyaluronic Acid" {...field} />
                  </FormControl>
                </FormItem>
              )}
            />

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

            <Button type="submit" disabled={isGenerating}>
              {isGenerating ? "Generating..." : "Generate Content"}
            </Button>
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
