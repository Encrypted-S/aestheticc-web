import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";

export default function TemplateLibrary() {
  const { data: templates, isLoading } = useQuery({
    queryKey: ["templates"],
    queryFn: async () => {
      const response = await fetch("/api/templates");
      return response.json();
    },
  });

  if (isLoading) {
    return <div>Loading templates...</div>;
  }

  return (
    <div className="grid md:grid-cols-3 gap-6">
      {templates?.map((template: any) => (
        <Card key={template.id}>
          <CardHeader>
            <CardTitle>{template.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={template.imageUrl || "https://images.unsplash.com/photo-1706353399656-210cca727a33"}
              alt={template.title}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
            <p className="text-sm text-muted-foreground">{template.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
