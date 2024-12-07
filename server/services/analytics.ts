import { db } from "../../db";
import { analyticsEvents, contentPerformance, type AnalyticsEvent } from "@db/schema";
import { eq } from "drizzle-orm";

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
      .where(eq(contentPerformance.id, existing.id));
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

  // First, create some sample posts
  const postIds = [];
  for (let i = 0; i < 5; i++) {
    const [post] = await db.insert(scheduledPosts)
      .values({
        userId,
        content: `Sample post ${i + 1}`,
        platforms: platforms.slice(0, Math.floor(Math.random() * 3) + 1),
        scheduledFor: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
        published: Math.random() > 0.5,
      })
      .returning();
    
    postIds.push(post.id);
  }

  // Generate performance metrics for posts
  for (const postId of postIds) {
    for (const platform of platforms) {
      await db.insert(contentPerformance)
        .values({
          postId,
          platform,
          impressions: Math.floor(Math.random() * 1000) + 100,
          engagements: Math.floor(Math.random() * 200) + 50,
          clicks: Math.floor(Math.random() * 50) + 10,
        });
    }
  }

  // Generate analytics events
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
        postId: postIds[Math.floor(Math.random() * postIds.length)],
      },
    });
  }
}
