import { z } from "jsr:@prgm/zod@3.23.8-alpha.1";

const Tags = [
  "plan",
  "pin",
  "recur",
  "date",
  "hide",
  "svc",
  "news",
] as const;
const TZ = "Europe/Prague" as const;
const TAG = /#([\w-:,]+)/g;
const COMMENT = /\/\/(.*)$/g;
const Instant = z.union([
  z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({
    dateTime: z.string().regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
    ),
  }),
]);

function matchesOf(pattern: RegExp, text: string): string[] {
  return [...text.matchAll(pattern)].map((m) => m[1]);
}

const GoogleEvent = z.object({
  id: z.string().min(5).max(1024),
  start: Instant,
  end: Instant,
  summary: z.string().trim(),
  description: z.string().trim().optional(),
  status: z.enum(["confirmed", "tentative", "cancelled"]).optional(),
  recurringEventId: z.string().min(5).max(1024).optional(),
  visibility: z.enum(["default", "public", "private", "confidential"])
    .optional(),
  attachments: z.array(z.object({
    fileId: z.string(),
    title: z.string().trim().min(1),
    mimeType: z.string(),
    fileUrl: z.string().url(),
  })).default([]),
}).readonly();

export const Event = z.object({
  eventId: z.string().min(5).max(1024),
  type: z.enum(["meeting", "news"]),
  start: z.coerce.date(),
  end: z.coerce.date(),
  durationHours: z.number().min(0),
  subject: z.string(),
  body: z.string().default(""),
  attachments: z.array(z.object({
    fileId: z.string(),
    name: z.string().min(1),
    mime: z.string(),
    url: z.string().url(),
    ref: z.string().min(1),
  })),
  tags: z.map(z.enum(Tags), z.string().min(1).optional()),
}).readonly();
export type Event = z.infer<typeof Event>;

const EventAdapter = GoogleEvent
  .transform((e) =>
    Event.parse({
      eventId: e.id.split("_")[0],
      type: "meeting",
      start: "dateTime" in e.start
        ? e.start.dateTime
        : `${e.start.date} (${TZ})`,
      end: "dateTime" in e.end ? e.end.dateTime : `${e.end.date} (${TZ})`,
      durationHours: 0,
      subject: e.summary
        .replace(TAG, "")
        .replace(COMMENT, "")
        .replace("  ", " ")
        .trim(),
      body: e.description,
      attachments: e.attachments.map((a) => ({
        fileId: a.fileId,
        name: a.title
          .replace(/\.\w+$/, "")
          .replace(TAG, "")
          .replace(COMMENT, "")
          .replace("  ", " ")
          .trim(),
        mime: a.mimeType,
        url: a.fileUrl,
        ref: (matchesOf(TAG, a.title.toLowerCase()))[0] ??
          a.title,
      })).sort((a, b) => a.ref.localeCompare(b.ref)),
      tags: new Map(
        [
          e.summary,
          e.recurringEventId ? "#recur" : "",
          "date" in e.start && "date" in e.end ? "#date" : "",
          e.visibility === "private" ? "#hide" : "",
        ]
          .flatMap((s) => matchesOf(TAG, (s ?? "").toLowerCase()))
          .map((kv) => kv.split(":") as [string, string])
          .filter(([t]) => (Tags as unknown as string[]).includes(t)),
      ),
    })
  )
  .transform((e) =>
    Event.parse({
      ...e,
      type: e.tags.has("news") ? "news" : "meeting",
      durationHours: Math.floor(
        (e.end.getTime() - e.start.getTime()) / 3600_000,
      ),
    })
  ).readonly();

export const Calendar = z.object({ items: z.array(GoogleEvent) })
  .transform((c) => c.items.map((i) => EventAdapter.parse(i)))
  .readonly();
export type Calendar = z.infer<typeof Calendar>;

export const Service = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  moderator: z.string().trim().default(""),
  teacher: z.string().trim().default(""),
});
export type Service = z.infer<typeof Service>;

export const Services = z.object({
  values: z.array(z.array(z.string())),
}).transform((v) =>
  v.values
    .slice(1) // skip header
    .filter((r) => !!r[1]) // skip services without date
    .map((r) => Service.parse({ date: r[1], moderator: r[2], teacher: r[3] }))
);
export type Services = z.infer<typeof Services>;
