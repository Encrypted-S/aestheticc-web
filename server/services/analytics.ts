import { db } from "../../db";
import { analyticsEvents, contentPerformance, scheduledPosts, type AnalyticsEvent } from "@db/schema";
import { eq } from "drizzle-orm";

export async function trackAnalyticsEvent(event: {
  userId: number;
  eventType: string;
  platform: string;
  contentType?: string;
  metadata?: Record<string, any>;
}) {
  try {
    await db.insert(analyticsEvents).values(event);
  } catch (error) {
    console.error("Failed to track analytics event:", error);
    throw new Error("Failed to track analytics event");
  }
}

export async function updateContentPerformance(postId: number, platform: string, metrics: {
  impressions?: number;
  engagements?: number;
  clicks?: number;
}) {
  try {
    const existing = await db.query.contentPerformance.findFirst({
      where: eq(contentPerformance.postId, postId)
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
  } catch (error) {
    console.error("Failed to update content performance:", error);
    throw new Error("Failed to update content performance");
  }
}

// Development helper to generate sample analytics data
export async function generateSampleAnalytics(userId: number) {
  console.log("Starting sample analytics generation for user:", userId);
  
  const platforms = ["instagram", "facebook", "twitter", "linkedin"];
  const contentTypes = ["beforeAfter", "educational", "promotional", "procedure", "tips", "casestudy", "testimonial"];
  const eventTypes = ["view", "engagement", "click", "share", "save"];
  
  // Helper function to generate random date within a range
  const randomDate = (start: Date, end: Date) => {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  };

  // Helper function to generate realistic engagement numbers
  const generateEngagementMetrics = (baseImpressions: number) => {
    const engagementRate = 0.02 + Math.random() * 0.08; // 2-10% engagement rate
    const clickRate = 0.01 + Math.random() * 0.04; // 1-5% click rate
    return {
      impressions: baseImpressions,
      engagements: Math.floor(baseImpressions * engagementRate),
      clicks: Math.floor(baseImpressions * clickRate),
    };
  };

  try {
    console.log("Creating sample posts...");
    const postIds = [];
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    // Create more sample posts with varied scheduling
    for (let i = 0; i < 15; i++) {
      console.log(`Creating post ${i + 1}...`);
      const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
      const [post] = await db.insert(scheduledPosts)
        .values({
          userId,
          content: {
            text: `Sample ${contentType} post ${i + 1}`,
            hashtags: [`#${contentType}`, '#aestheticsclinic', '#beauty'],
            type: contentType,
          },
          platforms: platforms.slice(0, Math.floor(Math.random() * 3) + 2), // At least 2 platforms
          scheduledFor: randomDate(thirtyDaysAgo, now),
          published: true, // All posts are published for sample data
        })
        .returning();
      
      postIds.push(post.id);
    }

    console.log("Creating performance metrics...");
    // Generate realistic performance metrics for posts
    for (const postId of postIds) {
      for (const platform of platforms) {
        const baseImpressions = Math.floor(Math.random() * 2000) + 500; // 500-2500 base impressions
        const metrics = generateEngagementMetrics(baseImpressions);
        
        await db.insert(contentPerformance)
          .values({
            postId,
            platform,
            ...metrics,
          });
      }
    }

    console.log("Creating analytics events...");
    // Generate more diverse analytics events
    const eventsPerPost = 20; // More events per post for better data
    for (const postId of postIds) {
      for (let i = 0; i < eventsPerPost; i++) {
        const platform = platforms[Math.floor(Math.random() * platforms.length)];
        const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const eventDate = randomDate(thirtyDaysAgo, now);

        await trackAnalyticsEvent({
          userId,
          eventType,
          platform,
          contentType,
          metadata: {
            timestamp: eventDate.toISOString(),
            postId,
            platform,
            contentType,
          },
        });
      }
    }

    console.log("Sample data generation completed successfully");
  } catch (error) {
    console.error("Failed to generate sample analytics data:", error);
    throw new Error("Failed to generate sample analytics data");
  }
}
