import type { Config, Context } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { adminAccount, appSecrets, leads, rateLimits, siteSections } from "../../db/schema.js";
import { COLLECTION_KEYS, SECTION_KEYS, defaults, type SectionKey } from "../lib/defaults.js";

const SESSION_HOURS = 8;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // Netlify Functions accept request bodies up to 6 MB.
const LEAD_STATUSES = ["New", "Contacted", "Qualified", "Closed"];

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store", ...headers } });

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

function validateCollection(value: unknown, key: string) {
  if (!Array.isArray(value) || value.length > 2000) return false;
  if (key === "services") return value.every((item) => (typeof item === "string" ? item.length <= 500 : isPlainObject(item)));
  return value.every((item) => isPlainObject(item));
}

async function readBody(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Request body must be valid JSON.");
  }
}

// ── Site content ─────────────────────────────────────────
async function readSite() {
  const rows = await db.select().from(siteSections);
  const saved = Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<string, any>;
  const site: Record<SectionKey, any> = { ...defaults };
  for (const key of SECTION_KEYS) {
    if (key === "settings" && isPlainObject(saved.settings)) {
      site.settings = {
        ...defaults.settings,
        ...saved.settings,
        socials: { ...defaults.settings.socials, ...((saved.settings.socials as object) || {}) },
      };
    } else if (key === "content" && isPlainObject(saved.content)) {
      site.content = { ...defaults.content, ...saved.content };
    } else if (Array.isArray(saved[key])) {
      site[key] = saved[key];
    }
  }
  return site;
}

function validateSections(body: Record<string, unknown>, label: string) {
  const updates: Partial<Record<SectionKey, unknown>> = {};
  for (const key of SECTION_KEYS) {
    const value = body[key];
    if (value === undefined) continue;
    if (COLLECTION_KEYS.includes(key) && !validateCollection(value, key))
      throw new HttpError(400, `${label}${key} must be a valid list of objects (maximum 2000 entries).`);
    if ((key === "settings" || key === "content") && !isPlainObject(value))
      throw new HttpError(400, `${label}${key} must be an object.`);
    if ((key === "settings" || key === "content") && Object.values(value as object).some((v) => typeof v === "string" && v.length > 10000))
      throw new HttpError(400, `${label}${key} contains text longer than 10000 characters.`);
    updates[key] = value;
  }
  return updates;
}

async function saveSections(tx: Pick<typeof db, "insert">, updates: Partial<Record<SectionKey, unknown>>) {
  for (const [key, value] of Object.entries(updates)) {
    await tx
      .insert(siteSections)
      .values({ key, value })
      .onConflictDoUpdate({ target: siteSections.key, set: { value, updatedAt: new Date() } });
  }
}

const listLeads = () => db.select().from(leads).orderBy(desc(leads.createdAt));

// ── Auth ─────────────────────────────────────────────────
let cachedSecret: string | undefined;
async function getSecret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  if (cachedSecret) return cachedSecret;
  // Generate once and keep it in the database so sessions survive cold starts and redeploys.
  await db
    .insert(appSecrets)
    .values({ key: "jwt", value: crypto.randomBytes(48).toString("hex") })
    .onConflictDoNothing();
  const [row] = await db.select().from(appSecrets).where(eq(appSecrets.key, "jwt"));
  cachedSecret = row.value;
  return cachedSecret;
}

const getAdmin = async () => (await db.select().from(adminAccount).where(eq(adminAccount.id, 1)))[0];

function readCookie(req: Request, name: string) {
  const header = req.headers.get("cookie") || "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return undefined;
}

function cookieAttrs(req: Request) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `Path=/; HttpOnly; SameSite=Lax${secure}`;
}

async function sessionCookie(req: Request, tokenVersion: number) {
  const token = jwt.sign({ admin: true, v: tokenVersion }, await getSecret(), { expiresIn: `${SESSION_HOURS}h` });
  return `adminToken=${token}; ${cookieAttrs(req)}; Max-Age=${SESSION_HOURS * 3600}`;
}

const clearCookie = (req: Request) => `adminToken=; ${cookieAttrs(req)}; Max-Age=0`;

async function isAuthenticated(req: Request) {
  const token = readCookie(req, "adminToken");
  if (!token) return false;
  try {
    const payload = jwt.verify(token, await getSecret()) as { admin?: boolean; v?: number };
    if (!payload.admin) return false;
    const admin = await getAdmin();
    return Boolean(admin && (payload.v ?? 0) === admin.tokenVersion);
  } catch {
    return false;
  }
}

async function requireAuth(req: Request) {
  if (!(await isAuthenticated(req))) throw new HttpError(401, "Please log in again.");
}

// Fixed-window counter stored in the database so limits apply across function instances.
async function hitRateLimit(key: string, limit: number, windowMinutes = 10) {
  const [row] = await db
    .insert(rateLimits)
    .values({ key, count: 1, windowStart: new Date() })
    .onConflictDoUpdate({
      target: rateLimits.key,
      set: {
        count: sql`CASE WHEN ${rateLimits.windowStart} < now() - make_interval(mins => ${windowMinutes}) THEN 1 ELSE ${rateLimits.count} + 1 END`,
        windowStart: sql`CASE WHEN ${rateLimits.windowStart} < now() - make_interval(mins => ${windowMinutes}) THEN now() ELSE ${rateLimits.windowStart} END`,
      },
    })
    .returning();
  return row.count > limit;
}

const clearRateLimit = (key: string) => db.delete(rateLimits).where(eq(rateLimits.key, key));

function checkPassword(password: string, label = "Use a password") {
  if (password.length < 10 || password.length > 200) throw new HttpError(400, `${label} between 10 and 200 characters.`);
}

// ── Uploads ──────────────────────────────────────────────
const ALLOWED_TYPES = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
  [".gif", "image/gif"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"],
]);

function matchesSignature(ext: string, head: Buffer) {
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
    case ".png":
      return head.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case ".gif":
      return head.toString("ascii", 0, 3) === "GIF";
    case ".webp":
      return head.toString("ascii", 0, 4) === "RIFF" && head.toString("ascii", 8, 12) === "WEBP";
    case ".mp4":
      return head.toString("ascii", 4, 8) === "ftyp";
    case ".webm":
      return head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3;
    default:
      return false;
  }
}

async function handleUpload(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > MAX_UPLOAD_BYTES + 64 * 1024)
    throw new HttpError(413, "File too large. Max 5 MB per upload.");
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new HttpError(400, "Choose an image or video file (JPEG, PNG, WebP, GIF, MP4 or WebM).");
  }
  const file = form.get("file");
  if (!file || typeof file === "string") throw new HttpError(400, "Choose an image or video file (JPEG, PNG, WebP, GIF, MP4 or WebM).");
  if (file.size > MAX_UPLOAD_BYTES) throw new HttpError(413, "File too large. Max 5 MB per upload.");
  const ext = (file.name.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase();
  if (!ALLOWED_TYPES.has(ext) || ALLOWED_TYPES.get(ext) !== file.type)
    throw new HttpError(400, "Unsupported file type. Use JPG, PNG, WebP, GIF, MP4 or WebM.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (!matchesSignature(ext, bytes.subarray(0, 16)))
    throw new HttpError(400, "File contents do not match a supported image/video format.");
  const filename = `${Date.now()}-${crypto.randomBytes(4).toString("hex")}${ext}`;
  await getStore("uploads").set(filename, bytes);
  return json({ url: `/uploads/${filename}`, filename, size: file.size, mimetype: file.type });
}

// ── Router ───────────────────────────────────────────────
async function route(req: Request, context: Context) {
  const path = new URL(req.url).pathname.replace(/^\/api/, "").replace(/\/+$/, "") || "/";
  const method = req.method;
  const ip = context.ip || "unknown";

  if (method === "GET" && path === "/health") return json({ ok: true, service: "webphase-api" });

  if (method === "GET" && path === "/public") return json(await readSite());

  if (method === "GET" && path === "/auth/status") {
    const [admin, authenticated] = await Promise.all([getAdmin(), isAuthenticated(req)]);
    return json({ configured: Boolean(admin), authenticated });
  }

  if (method === "POST" && path === "/auth/setup") {
    const body = await readBody(req);
    const password = String(body?.password || "");
    checkPassword(password);
    if (await getAdmin()) throw new HttpError(409, "Admin account already exists.");
    const hash = await bcrypt.hash(password, 12);
    const [created] = await db.insert(adminAccount).values({ id: 1, passwordHash: hash }).onConflictDoNothing().returning();
    if (!created) throw new HttpError(409, "Admin account already exists.");
    return json({ ok: true }, 200, { "Set-Cookie": await sessionCookie(req, created.tokenVersion) });
  }

  if (method === "POST" && path === "/auth/login") {
    const limitKey = `login:${ip}`;
    if (await hitRateLimit(limitKey, 10)) throw new HttpError(429, "Too many login attempts. Wait 10 minutes and try again.");
    const admin = await getAdmin();
    if (!admin) throw new HttpError(400, "Set up your admin password first.");
    const body = await readBody(req);
    const password = String(body?.password || "");
    if (password.length > 200 || !(await bcrypt.compare(password, admin.passwordHash)))
      throw new HttpError(401, "Incorrect password.");
    await clearRateLimit(limitKey);
    return json({ ok: true }, 200, { "Set-Cookie": await sessionCookie(req, admin.tokenVersion) });
  }

  if (method === "POST" && path === "/auth/logout") return json({ ok: true }, 200, { "Set-Cookie": clearCookie(req) });

  if (method === "POST" && path === "/auth/password") {
    await requireAuth(req);
    const body = await readBody(req);
    const current = String(body?.currentPassword || "");
    const next = String(body?.newPassword || "");
    const admin = await getAdmin();
    if (!(await bcrypt.compare(current, admin.passwordHash))) throw new HttpError(401, "Current password is incorrect.");
    checkPassword(next, "New password must be");
    // Bumping tokenVersion signs out every existing session.
    await db
      .update(adminAccount)
      .set({ passwordHash: await bcrypt.hash(next, 12), tokenVersion: admin.tokenVersion + 1, updatedAt: new Date() })
      .where(eq(adminAccount.id, 1));
    return json({ ok: true, message: "Password changed. Please sign in again." }, 200, { "Set-Cookie": clearCookie(req) });
  }

  if (method === "POST" && path === "/leads") {
    const body = (await readBody(req)) || {};
    const { name = "", phone = "", email = "", message = "", type = "General inquiry" } = body;
    if ([name, phone, email, message].some((v) => typeof v !== "string")) throw new HttpError(400, "Please provide valid contact details.");
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, "Please enter a valid email address.");
    if (!name.trim() || !message.trim()) throw new HttpError(400, "Name and message are required.");
    if (name.trim().length > 160 || phone.trim().length > 80 || email.trim().length > 254 || message.trim().length > 10000 || typeof type !== "string" || type.length > 120)
      throw new HttpError(400, "One or more contact fields exceed the allowed length.");
    if (await hitRateLimit(`lead:${ip}`, 15)) throw new HttpError(429, "Too many inquiries from this connection. Please try again later.");
    const id = crypto.randomUUID();
    await db.insert(leads).values({ id, name: name.trim(), phone: phone.trim(), email: email.trim(), message: message.trim(), type });
    return json({ ok: true, id });
  }

  // Everything below requires an admin session.
  await requireAuth(req);

  if (method === "GET" && path === "/admin") return json({ ...(await readSite()), leads: await listLeads() });

  if (method === "PUT" && path === "/admin") {
    const body = await readBody(req);
    if (!isPlainObject(body)) throw new HttpError(400, "Request body must be an object.");
    const updates = validateSections(body, "");
    await db.transaction((tx) => saveSections(tx, updates));
    return json({ ok: true });
  }

  if (method === "POST" && path === "/upload") return handleUpload(req);

  const leadMatch = path.match(/^\/leads\/([^/]+)$/);
  if (leadMatch && method === "PATCH") {
    const body = await readBody(req);
    if (!LEAD_STATUSES.includes(body?.status)) throw new HttpError(400, "Invalid lead status.");
    const updated = await db.update(leads).set({ status: body.status }).where(eq(leads.id, leadMatch[1])).returning();
    if (!updated.length) throw new HttpError(404, "Lead not found.");
    return json({ ok: true });
  }
  if (leadMatch && method === "DELETE") {
    await db.delete(leads).where(eq(leads.id, leadMatch[1]));
    return json({ ok: true });
  }

  if (method === "GET" && path === "/admin/backup") {
    const backup = JSON.stringify({ ...(await readSite()), leads: await listLeads() }, null, 2);
    return new Response(backup, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="webphase-backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  }

  if (method === "POST" && path === "/admin/restore") {
    const incoming = await readBody(req);
    if (!isPlainObject(incoming)) throw new HttpError(400, "Invalid backup file. Expected a JSON object.");
    const updates = validateSections(incoming, "Backup ");
    if (incoming.leads !== undefined && !validateCollection(incoming.leads, "leads"))
      throw new HttpError(400, "Backup leads must be a valid list with at most 2000 entries.");
    const restoredLeads = Array.isArray(incoming.leads)
      ? (incoming.leads as Record<string, any>[])
          .filter((l) => typeof l.name === "string" && typeof l.message === "string")
          .map((l) => ({
            id: typeof l.id === "string" && l.id ? l.id : crypto.randomUUID(),
            name: l.name,
            phone: String(l.phone || ""),
            email: String(l.email || ""),
            message: l.message,
            type: String(l.type || "General inquiry"),
            status: LEAD_STATUSES.includes(l.status) ? l.status : "New",
            createdAt: l.createdAt && !Number.isNaN(Date.parse(l.createdAt)) ? new Date(l.createdAt) : new Date(),
          }))
      : undefined;
    await db.transaction(async (tx) => {
      await saveSections(tx, updates);
      if (restoredLeads) {
        await tx.delete(leads);
        if (restoredLeads.length) await tx.insert(leads).values(restoredLeads).onConflictDoNothing();
      }
    });
    return json({ ok: true });
  }

  throw new HttpError(404, "API route not found.");
}

export default async (req: Request, context: Context) => {
  try {
    return await route(req, context);
  } catch (error) {
    if (error instanceof HttpError) return json({ error: error.message }, error.status);
    console.error("API error:", error);
    return json({ error: "Server error. Please try again in a moment." }, 500);
  }
};

export const config: Config = {
  path: "/api/*",
};
