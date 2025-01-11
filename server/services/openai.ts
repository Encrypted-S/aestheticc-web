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

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const generateMedicalDisclaimer = (treatmentCategory: string) => {
  const disclaimers = {
    skincare: "Individual results may vary. Consult with our skincare professionals for personalized treatment recommendations.",
    injectables: "Results may vary. Medical procedure requiring consultation. Possible side effects may occur.",
    laser: "Results may vary. Professional medical consultation required. Treatment may not be suitable for all skin types.",
    antiaging: "Individual results may vary. Professional consultation required for personalized treatment plans.",
    body: "Results may vary. Consultation required. Treatment outcomes depend on individual factors.",
    wellness: "Results may vary. Consult with our wellness professionals for personalized recommendations.",
  };

  return disclaimers[treatmentCategory as keyof typeof disclaimers] || 
    "Individual results may vary. Professional consultation recommended.";
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

    const contentTypePrompts = {
      educational: "Create educational content explaining the science and benefits",
      beforeAfter: "Create content highlighting treatment results and transformation journey",
      promotional: "Create promotional content while maintaining medical professionalism",
      procedure: "Create content explaining the procedure process and what to expect",
      tips: "Create practical tips and aftercare advice"
    };

    const systemPrompt = `You are a professional social media content creator for aesthetic clinics. You will create a post that is direct, concise, medically accurate, and engaging.

Your response must follow this exact structure:

[main content]

Hashtags:
[5-7 relevant hashtags]`;

    const userPrompt = `Create a ${platform} post about ${topic}.

Type: ${contentTypePrompts[contentType as keyof typeof contentTypePrompts]}
Category: ${treatmentCategory}
Tone: ${tone}
Additional Context: ${additionalContext}

Be direct and professional. Include emojis where appropriate. Format the post exactly as shown in the system message. Begin with the main content, do not start with an introduction such as [Here is a post about...]`;

    console.log("Sending request to AI provider...");

    const rawContent = await makeAIRequest(aiProvider, [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    if (!rawContent) {
      throw new Error("AI provider returned empty content");
    }

    // Split content into main text and hashtags
    const [mainContent, hashtagSection] = rawContent.split(/\n\nHashtags:/i);

    // Extract hashtags
    const hashtags = hashtagSection
      ?.trim()
      .split(/[\s,]+/)
      .filter(tag => tag.startsWith('#'))
      .slice(0, 7) || [];

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
      mainText: mainContent.trim(),
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