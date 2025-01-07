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

export async function generateContent({ 
  topic,
  treatmentCategory,
  contentType,
  platform,
  tone,
  additionalContext = ""
}: ContentRequest) {
  const systemPrompt = `You are an expert social media manager for aesthetic clinics, specializing in ${treatmentCategory} treatments.
Your content must be:
- Medically accurate and compliant
- Engaging and platform-appropriate
- Professional while maintaining the specified tone
- Focused on education and safety
Always include relevant treatment benefits and safety considerations.`;

  const contentTypePrompts = {
    educational: "Create educational content explaining the science and benefits",
    beforeAfter: "Create content highlighting treatment results and transformation journey",
    promotional: "Create promotional content while maintaining medical professionalism",
    procedure: "Create content explaining the procedure process and what to expect",
    tips: "Create practical tips and aftercare advice"
  };

  const userPrompt = `Create ${platform} content about ${topic} for an aesthetic clinic.
Content Type: ${contentTypePrompts[contentType as keyof typeof contentTypePrompts]}
Treatment Category: ${treatmentCategory}
Tone: ${tone}
Additional Context: ${additionalContext}

Include:
1. Main content text
2. Relevant hashtags

Keep the content professional, compliant with medical advertising standards, and engaging.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content generated");
    }

    // Generate relevant hashtags
    const hashtagPrompt = `Generate 5-7 relevant, trending hashtags for a ${platform} post about ${topic} in the aesthetic/beauty industry, specific to ${treatmentCategory}.`;
    const hashtagCompletion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "Generate relevant hashtags for aesthetic clinic social media content.",
        },
        {
          role: "user",
          content: hashtagPrompt,
        },
      ],
      temperature: 0.7,
    });

    const hashtags = hashtagCompletion.choices[0]?.message?.content
      ?.split(/[\s,]+/)
      .filter(tag => tag.startsWith("#"))
      .slice(0, 7) || [];

    // Generate image prompt based on content type
    const baseImagePrompt = `Professional, high-quality ${contentType === 'beforeAfter' ? 'before and after' : ''} photo for ${topic} in an aesthetic clinic setting.`;
    const imagePrompt = `${baseImagePrompt} The image should be clean, modern, and medical-grade while remaining approachable and aesthetic. Focus on ${treatmentCategory} treatment visualization.`;

    // Generate medical disclaimer
    const disclaimer = generateMedicalDisclaimer(treatmentCategory);

    return {
      mainText: content,
      hashtags,
      imagePrompt: `[OPENAI] ${imagePrompt}`,
      disclaimer,
    };
  } catch (error) {
    console.error("OpenAI content generation error:", error);
    throw new Error("Failed to generate content");
  }
}
