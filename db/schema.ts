import { pgTable, text, integer, jsonb, timestamp } from "drizzle-orm/pg-core";

// One row per editable section of the website (settings, content, projects, …).
export const siteSections = pgTable("site_sections", {
  key: text().primaryKey(),
  value: jsonb().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Single admin account (id = 1). tokenVersion invalidates old sessions after a password change.
export const adminAccount = pgTable("admin_account", {
  id: integer().primaryKey(),
  passwordHash: text("password_hash").notNull(),
  tokenVersion: integer("token_version").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Server-generated secrets (e.g. the session signing key) when no env var is configured.
export const appSecrets = pgTable("app_secrets", {
  key: text().primaryKey(),
  value: text().notNull(),
});

export const leads = pgTable("leads", {
  id: text().primaryKey(),
  name: text().notNull(),
  phone: text().notNull().default(""),
  email: text().notNull().default(""),
  message: text().notNull(),
  type: text().notNull().default("General inquiry"),
  status: text().notNull().default("New"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Rate limiting that works across serverless instances.
export const rateLimits = pgTable("rate_limits", {
  key: text().primaryKey(),
  count: integer().notNull().default(0),
  windowStart: timestamp("window_start", { withTimezone: true }).defaultNow().notNull(),
});
