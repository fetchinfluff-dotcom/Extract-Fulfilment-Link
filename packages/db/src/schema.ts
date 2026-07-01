import { boolean, jsonb, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const workspaces = pgTable("workspaces", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ownerUserId: uuid("owner_user_id").notNull(),
  planCode: text("plan_code").notNull().default("trial"),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow()
});

export const workspaceMembers = pgTable("workspace_members", {
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull().default("owner"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  name: text("name").notNull(),
  sourceUrl: text("source_url").notNull(),
  canonicalSourceUrl: text("canonical_source_url"),
  sourcePlatform: text("source_platform"),
  targetCountry: text("target_country").notNull().default("US"),
  targetLanguage: text("target_language").notNull().default("en"),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("draft"),
  activeVersionId: uuid("active_version_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true })
});

export const sourceSnapshots = pgTable("source_snapshots", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  adapterVersion: text("adapter_version").notNull(),
  method: text("method").notNull(),
  contentHash: text("content_hash").notNull(),
  redactedPayload: jsonb("redacted_payload").notNull(),
  warnings: jsonb("warnings").notNull(),
  confidenceScore: numeric("confidence_score").notNull(),
  extractedAt: timestamp("extracted_at", { withTimezone: true }).notNull().defaultNow()
});

export const generatedVersions = pgTable("generated_versions", {
  id: uuid("id").primaryKey().defaultRandom(),
  projectId: uuid("project_id").notNull().references(() => projects.id),
  versionNumber: numeric("version_number").notNull(),
  structuredContentJson: jsonb("structured_content_json").notNull(),
  sanitizedHtml: text("sanitized_html").notNull(),
  seoJson: jsonb("seo_json").notNull(),
  complianceReportJson: jsonb("compliance_report_json").notNull(),
  manuallyEdited: boolean("manually_edited").notNull().default(false),
  createdByUserId: uuid("created_by_user_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const usageLedger = pgTable("usage_ledger", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  eventType: text("event_type").notNull(),
  projectId: uuid("project_id").references(() => projects.id),
  creditsDelta: numeric("credits_delta").notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  metadataJson: jsonb("metadata_json").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspaces.id),
  actorUserId: uuid("actor_user_id"),
  action: text("action").notNull(),
  resourceType: text("resource_type").notNull(),
  resourceId: uuid("resource_id"),
  metadataJson: jsonb("metadata_json").notNull(),
  ipHash: text("ip_hash"),
  userAgentHash: text("user_agent_hash"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow()
});
