import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

// Serves admin-uploaded media stored in Netlify Blobs at the same /uploads/... URLs the old server used.
export default async (req: Request) => {
  const key = decodeURIComponent(new URL(req.url).pathname.replace(/^\/uploads\//, ""));
  const ext = (key.match(/\.[a-z0-9]+$/i)?.[0] || "").toLowerCase();
  if (!/^[\w.-]+$/.test(key) || !CONTENT_TYPES[ext]) return new Response("Not found", { status: 404 });

  const data = await getStore("uploads").get(key, { type: "arrayBuffer" });
  if (!data) return new Response("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": CONTENT_TYPES[ext],
    "Cache-Control": "public, max-age=31536000, immutable",
    "Accept-Ranges": "bytes",
    "X-Content-Type-Options": "nosniff",
  };

  // Byte-range support so browsers (notably Safari) can stream uploaded videos.
  const range = req.headers.get("range")?.match(/^bytes=(\d*)-(\d*)$/);
  if (range && (range[1] || range[2])) {
    const size = data.byteLength;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new Response(data.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) },
    });
  }

  return new Response(data, { headers: { ...headers, "Content-Length": String(data.byteLength) } });
};

export const config: Config = {
  path: "/uploads/*",
};
