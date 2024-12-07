import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type ContentRequest = {
  topic: string;
  platform: string;
  tone: string;
};

export async function generateContent({ topic, platform, tone }: ContentRequest) {
  const prompt = `Create engaging social media content for an aesthetic clinic about ${topic}.
The content should be in a ${tone} tone and optimized for ${platform}.
Include key points about treatments, benefits, and safety information where relevant.
Keep the content professional and medically accurate while being engaging.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an expert social media manager for aesthetic clinics, skilled in creating engaging, compliant, and informative content.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No content generated");
    }

    // Generate relevant hashtags
    const hashtagPrompt = `Generate 5 relevant, trending hashtags for a ${platform} post about ${topic} in the aesthetic/beauty industry.`;
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
      .slice(0, 5) || [];

    // Generate image prompt
    const imagePrompt = `Professional, high-quality photo depicting ${topic} in an aesthetic clinic setting. The image should be clean, modern, and medical-grade while remaining approachable and aesthetic.`;

    return {
      mainText: content,
      hashtags,
      imagePrompt,
    };
  } catch (error) {
    console.error("OpenAI content generation error:", error);
    throw new Error("Failed to generate content");
  }
}
