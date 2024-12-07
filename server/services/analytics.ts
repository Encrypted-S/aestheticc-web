import { db } from "../../db";
import { analyticsEvents, contentPerformance, type AnalyticsEvent } from "@db/schema";

export async function trackAnalyticsEvent(event: {
  userId: number;
  eventType: string;
  platform: string;
  contentType?: string;
  metadata?: Record<string, any>;
}) {
  await db.insert(analyticsEvents).values(event);
}

export async function updateContentPerformance(postId: number, platform: string, metrics: {
  impressions?: number;
  engagements?: number;
  clicks?: number;
}) {
  const existing = await db.query.contentPerformance.findFirst({
    where: (performance, { eq, and }) => 
      and(eq(performance.postId, postId), eq(performance.platform, platform))
  });

  if (existing) {
    await db
      .update(contentPerformance)
      .set({
        impressions: (existing.impressions || 0) + (metrics.impressions || 0),
        engagements: (existing.engagements || 0) + (metrics.engagements || 0),
        clicks: (existing.clicks || 0) + (metrics.clicks || 0),
        updatedAt: new Date(),
      })
      .where(({ eq }) => eq(contentPerformance.id, existing.id));
  } else {
    await db.insert(contentPerformance).values({
      postId,
      platform,
      ...metrics,
    });
  }
}

// Development helper to generate sample analytics data
export async function generateSampleAnalytics(userId: number) {
  const platforms = ["instagram", "facebook", "twitter", "linkedin"];
  const contentTypes = ["educational", "beforeAfter", "promotional", "procedure", "tips"];
  const eventTypes = ["view", "engagement", "click"];

  // Generate random events
  for (let i = 0; i < 50; i++) {
    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

    await trackAnalyticsEvent({
      userId,
      eventType,
      platform,
      contentType,
      metadata: {
        timestamp: new Date().toISOString(),
      },
    });
  }
}
