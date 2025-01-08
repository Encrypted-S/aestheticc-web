import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ContentRequest = {
  topic: string;
  treatmentCategory: string;
  contentType: string;
  platform: string;
  tone: string;
  additionalContext?: string;
};

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

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

  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(", ")}`);
  }
};

async function makeOpenAIRequest(messages: any[], retryCount = 0): Promise<OpenAI.Chat.ChatCompletion> {
  try {
    return await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages,
      temperature: 0.7,
    });
  } catch (error) {
    if (error instanceof OpenAI.APIError) {
      // Handle rate limits with exponential backoff
      if (error.status === 429 && retryCount < MAX_RETRIES) {
        console.log(`Rate limited, retrying in ${RETRY_DELAY * (retryCount + 1)}ms...`);
        await sleep(RETRY_DELAY * (retryCount + 1));
        return makeOpenAIRequest(messages, retryCount + 1);
      }

      // Handle specific API errors
      switch (error.status) {
        case 401:
          throw new Error("Invalid API key. Please check your OpenAI API configuration.");
        case 429:
          throw new Error("Rate limit exceeded. Please try again in a few moments.");
        case 500:
          throw new Error("OpenAI service is currently experiencing issues. Please try again later.");
        default:
          throw new Error(`OpenAI API error (${error.status}): ${error.message}`);
      }
    }

    // Handle network or other errors
    throw new Error(`Content generation failed: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
  }
}

export async function generateContent({ 
  topic,
  treatmentCategory,
  contentType,
  platform,
  tone,
  additionalContext = ""
}: ContentRequest) {
  console.log("Starting content generation for:", { topic, treatmentCategory, contentType, platform, tone });

  try {
    // Validate request parameters
    validateRequest({ topic, treatmentCategory, contentType, platform, tone, additionalContext });

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    const contentTypePrompts = {
      educational: "Create educational content explaining the science and benefits",
      beforeAfter: "Create content highlighting treatment results and transformation journey",
      promotional: "Create promotional content while maintaining medical professionalism",
      procedure: "Create content explaining the procedure process and what to expect",
      tips: "Create practical tips and aftercare advice"
    };

    if (!contentTypePrompts[contentType as keyof typeof contentTypePrompts]) {
      throw new Error(`Unsupported content type: ${contentType}`);
    }

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

    console.log("Sending request to OpenAI...");

    // Generate main content
    const completion = await makeOpenAIRequest([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("OpenAI returned empty content");
    }

    // Generate hashtags
    console.log("Generating hashtags...");
    const hashtagPrompt = `Generate 5-7 relevant, trending hashtags for a ${platform} post about ${topic} in the aesthetic/beauty industry, specific to ${treatmentCategory}.`;
    const hashtagCompletion = await makeOpenAIRequest([
      { role: "system", content: "Generate relevant hashtags for aesthetic clinic social media content." },
      { role: "user", content: hashtagPrompt }
    ]);

    const hashtags = hashtagCompletion.choices[0]?.message?.content
      ?.split(/[\s,]+/)
      .filter(tag => tag.startsWith("#"))
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
      mainText: content,
      hashtags,
      imagePrompt: `[OPENAI] ${imagePrompt}`,
      disclaimer,
    };
  } catch (error) {
    console.error("Content generation error:", error);

    // Handle and rethrow with a more informative message
    if (error instanceof Error) {
      throw new Error(`Content generation failed: ${error.message}`);
    }

    throw new Error("An unexpected error occurred during content generation");
  }
}