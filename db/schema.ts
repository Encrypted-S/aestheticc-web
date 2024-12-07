import { pgTable, text, integer, timestamp, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  email: text("email").unique().notNull(),
  name: text("name").notNull(),
  googleId: text("google_id").unique(),
  avatarUrl: text("avatar_url"),
  subscriptionStatus: text("subscription_status").default("free"),
  stripeCustomerId: text("stripe_customer_id").unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const templates = pgTable("templates", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  title: text("title").notNull(),
  description: text("description"),
  category: text("category").notNull(),
  content: jsonb("content").notNull(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const scheduledPosts = pgTable("scheduled_posts", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull(),
  content: jsonb("content").notNull(),
  platforms: text("platforms").array().notNull(),
  scheduledFor: timestamp("scheduled_for").notNull(),
  published: boolean("published").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertTemplateSchema = createInsertSchema(templates);
export const selectTemplateSchema = createSelectSchema(templates);
export const insertScheduledPostSchema = createInsertSchema(scheduledPosts);
export const selectScheduledPostSchema = createSelectSchema(scheduledPosts);

export type User = z.infer<typeof selectUserSchema>;
export type Template = z.infer<typeof selectTemplateSchema>;
export type ScheduledPost = z.infer<typeof selectScheduledPostSchema>;

export const analyticsEvents = pgTable("analytics_events", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  userId: integer("user_id").notNull().references(() => users.id),
  eventType: text("event_type").notNull(),
  platform: text("platform").notNull(),
  contentType: text("content_type"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contentPerformance = pgTable("content_performance", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  postId: integer("post_id").references(() => scheduledPosts.id),
  platform: text("platform").notNull(),
  impressions: integer("impressions").default(0),
  engagements: integer("engagements").default(0),
  clicks: integer("clicks").default(0),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAnalyticsEventSchema = createInsertSchema(analyticsEvents);
export const selectAnalyticsEventSchema = createSelectSchema(analyticsEvents);
export const insertContentPerformanceSchema = createInsertSchema(contentPerformance);
export const selectContentPerformanceSchema = createSelectSchema(contentPerformance);

export type AnalyticsEvent = z.infer<typeof selectAnalyticsEventSchema>;
export type ContentPerformance = z.infer<typeof selectContentPerformanceSchema>;