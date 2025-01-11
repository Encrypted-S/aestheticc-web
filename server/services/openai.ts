import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";

// Initialize both providers
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

type Provider = "openai" | "anthropic";

type ContentRequest = {
  topic: string;
  treatmentCategory: string;
  contentType: string;
  platform: string;
  tone: string;
  provider: Provider;
  additionalContext?: string;
};

interface AIProvider {
  generateCompletion(messages: any[]): Promise<string>;
}

class OpenAIProvider implements AIProvider {
  async generateCompletion(messages: any[]): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.7,
    });
    return completion.choices[0]?.message?.content || "";
  }
}

class AnthropicProvider implements AIProvider {
  async generateCompletion(messages: any[]): Promise<string> {
    // Convert OpenAI message format to Anthropic format
    const systemMessage = messages.find(m => m.role === "system")?.content || "";
    const userMessage = messages.find(m => m.role === "user")?.content || "";

    const completion = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      temperature: 0.7,
      system: systemMessage,
      messages: [
        { role: "user", content: userMessage }
      ],
    });

    return completion.content[0].text;
  }
}

const getProvider = (provider: Provider): AIProvider => {
  switch (provider) {
    case "openai":
      return new OpenAIProvider();
    case "anthropic":
      return new AnthropicProvider();
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
};

// Rest of your existing helper functions remain the same
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const generateMedicalDisclaimer = (treatmentCategory: string) => {
  // Your existing disclaimer logic
};

const validateRequest = (request: ContentRequest) => {
  const errors: string[] = [];

  if (!request.topic?.trim()) errors.push("Topic is required");
  if (!request.treatmentCategory?.trim()) errors.push("Treatment category is required");
  if (!request.contentType?.trim()) errors.push("Content type is required");
  if (!request.platform?.trim()) errors.push("Platform is required");
  if (!request.tone?.trim()) errors.push("Tone is required");
  if (!request.provider) errors.push("AI provider is required");

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(", ")}`);
  }
};

async function makeAIRequest(provider: AIProvider, messages: any[], retryCount = 0): Promise<string> {
  try {
    return await provider.generateCompletion(messages);
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Request failed, retrying in ${RETRY_DELAY * (retryCount + 1)}ms...`);
      await sleep(RETRY_DELAY * (retryCount + 1));
      return makeAIRequest(provider, messages, retryCount + 1);
    }
    throw error;
  }
}

export async function generateContent({ 
  topic,
  treatmentCategory,
  contentType,
  platform,
  tone,
  provider,
  additionalContext = ""
}: ContentRequest) {
  console.log("Starting content generation for:", { topic, treatmentCategory, contentType, platform, tone, provider });

  try {
    validateRequest({ topic, treatmentCategory, contentType, platform, tone, provider, additionalContext });

    const apiKey = provider === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(`${provider.toUpperCase()} API key is not configured`);
    }

    const aiProvider = getProvider(provider);

    // Your existing content type prompts and system prompt remain the same
    const contentTypePrompts = {
      educational: "Create educational content explaining the science and benefits",
      beforeAfter: "Create content highlighting treatment results and transformation journey",
      promotional: "Create promotional content while maintaining medical professionalism",
      procedure: "Create content explaining the procedure process and what to expect",
      tips: "Create practical tips and aftercare advice"
    };

    const systemPrompt = `You are an expert social media manager for aesthetic clinics, specializing in ${treatmentCategory} treatments.
Your content must be:
- Medically accurate and compliant
- Engaging and platform-appropriate
- Professional while maintaining the specified tone
- Focused on education and safety
Always include relevant treatment benefits and safety considerations.`;

    const userPrompt = `Create ${platform} content about ${topic} for an aesthetic clinic.
Content Type: ${contentTypePrompts[contentType as keyof typeof contentTypePrompts]}
Treatment Category: ${treatmentCategory}
Tone: ${tone}
Additional Context: ${additionalContext}

Include:
1. Main content text
2. Relevant hashtags

Keep the content professional, compliant with medical advertising standards, and engaging.`;

    console.log("Sending request to AI provider...");

    // Generate main content
    const content = await makeAIRequest(aiProvider, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    if (!content) {
      throw new Error("AI provider returned empty content");
    }

    // Generate hashtags
    console.log("Generating hashtags...");
    const hashtagPrompt = `Generate 5-7 relevant, trending hashtags for a ${platform} post about ${topic} in the aesthetic/beauty industry, specific to ${treatmentCategory}.`;
    const hashtagsContent = await makeAIRequest(aiProvider, [
      { role: "system", content: "Generate relevant hashtags for aesthetic clinic social media content." },
      { role: "user", content: hashtagPrompt }
    ]);

    const hashtags = hashtagsContent
      .split(/[\s,]+/)
      .filter(tag => tag.startsWith("#"))
      .slice(0, 7);

    if (hashtags.length === 0) {
      throw new Error("Failed to generate hashtags");
    }

    // Generate image prompt
    const baseImagePrompt = `Professional, high-quality ${contentType === 'beforeAfter' ? 'before and after' : ''} photo for ${topic} in an aesthetic clinic setting.`;
    const imagePrompt = `${baseImagePrompt} The image should be clean, modern, and medical-grade while remaining approachable and aesthetic. Focus on ${treatmentCategory} treatment visualization.`;

    // Generate medical disclaimer
    const disclaimer = generateMedicalDisclaimer(treatmentCategory);

    console.log("Content generation completed successfully");

    return {
      mainText: content,
      hashtags,
      imagePrompt: `[${provider.toUpperCase()}] ${imagePrompt}`,
      disclaimer,
    };
  } catch (error) {
    console.error("Content generation error:", error);

    if (error instanceof Error) {
      throw new Error(`Content generation failed: ${error.message}`);
    }

    throw new Error("An unexpected error occurred during content generation");
  }
}