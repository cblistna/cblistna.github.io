import { describe, it } from "jsr:@std/testing/bdd";
import { assertEquals } from "jsr:@std/assert";
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
type Event = z.infer<typeof Event>;

const EventAdapter = GoogleEvent
  .transform((ce) =>
    Event.parse({
      eventId: ce.id.split("_")[0],
      type: "meeting",
      start: "dateTime" in ce.start
        ? ce.start.dateTime
        : `${ce.start.date} (${TZ})`,
      end: "dateTime" in ce.end ? ce.end.dateTime : `${ce.end.date} (${TZ})`,
      durationHours: 0,
      subject: ce.summary
        .replace(TAG, "")
        .replace(COMMENT, "")
        .replace("  ", " ")
        .trim(),
      body: ce.description,
      attachments: ce.attachments.map((a) => ({
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
          ce.summary,
          ce.recurringEventId ? "#recur" : "",
          "date" in ce.start && "date" in ce.end ? "#date" : "",
          ce.visibility === "private" ? "#hide" : "",
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

export const Calendar = z.object({
  items: z.array(GoogleEvent),
}).transform((c) => c.items.map((i) => EventAdapter.parse(i))).readonly();

export type Calendar = z.infer<typeof Calendar>;

const Service = z.object({
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
  moderator: z.string().trim().default(""),
  teacher: z.string().trim().default(""),
});
type Service = z.infer<typeof Service>;

const ServicesAdapter = z.object({
  values: z.array(z.array(z.string())),
}).transform((v) =>
  v.values
    .slice(1) // skip header
    .filter((r) => !!r[1]) // skip services without date
    .map((r) => Service.parse({ date: r[1], moderator: r[2], teacher: r[3] }))
);

describe("calendar events", () => {
  it("should parse google calendar payload", () => {
    const services: Map<string, Service> = new Map(
      ServicesAdapter.parse(JSON.parse(Deno.readTextFileSync("services.json")))
        .map((s) => [s.date, s]),
    );

    const events = Calendar.parse(
      JSON.parse(Deno.readTextFileSync("events.json")),
    )
      .map((event: Event) => {
        const service = services.get(
          event.start.toISOString().substring(0, 10),
        );
        if (!service || !event.tags.has("svc")) return event;
        return Event.parse({
          ...event,
          body: `Vedení: ${service.moderator}, Kázání: ${service.teacher}${
            event.body ? `<br>${event.body}` : ""
          }`,
        });
      });

    const ts = (d: Date) => `${d.toISOString().substring(0, 16)}Z`;
    const eventLine = (e: Event) =>
      [
        `[${ts(e.start)}, ${ts(e.end)})`,
        `${e.subject}`,
        [...e.tags].map(([tag]) => `#${tag}`).join(" "),
        `[${e.durationHours}h]`,
        `${e.body}`,
        e.attachments.map((a) => `!${a.name}[${a.ref}]`).join(","),
      ].filter((p) => p).join(" ");

    const plan = events.reduce((acc: Map<string, Event[]>, e: Event) => {
      if (!acc.has(e.eventId)) acc.set(e.eventId, []);
      acc.get(e.eventId)!.push(e);
      return acc;
    }, new Map());

    const output = [...plan.entries()]
      .map(([_id, series]) => eventLine(series[0]))
      .join("\n");

    const expected =
      `[2024-09-30T10:00Z, 2024-10-02T15:00Z) Swap v Dolní Líštné #plan #pin #hide [53h] Na podporu klubu Open Door #pin // comment !Z Plakát[1],!Plakát[2]
[2024-10-02T15:00Z, 2024-10-02T17:30Z) Setkání žen a dívek - Na hlubinu s Ním #plan [2h]
[2024-10-03T14:00Z, 2024-10-03T15:30Z) Klub Open Door (Otevřené dveře) #recur [1h]
[2024-10-04T15:00Z, 2024-10-04T17:00Z) Dorost #recur [2h]
[2024-10-05T16:00Z, 2024-10-05T18:00Z) Mládež #recur [2h]
[2024-10-06T07:30Z, 2024-10-06T09:30Z) Shromáždění #svc #recur [2h] Vedení: Jan Hrycek, Kázání: Mirko Tichý
[2024-10-07T16:00Z, 2024-10-07T17:30Z) Modlitby ve sboru #recur [1h]
[2024-10-10T22:00Z, 2024-10-13T22:00Z) Sborová dovolená #date [72h] Malenovice<br>&lt;a href="https://cblistna.cz"&gt;Listna&lt;/p&gt;<br>&lt;br /&gt;<br>&lt;img src="https://picsum.photos/200 /&gt;<br>&lt;b&gt;hi&lt;/b&gt;<br>&lt;h1&gt;Malenovice&lt;/h1&gt;<br><u>https://cblistna.cz</u>
[2024-10-19T06:00Z, 2024-10-19T10:00Z) Sborová brigáda [4h]
[2024-10-24T22:00Z, 2024-10-25T22:00Z) Sborový půst #recur #date [24h]
[2024-10-25T22:00Z, 2024-10-26T22:00Z) Modlitební řetěz #recur #date [24h]
[2024-10-31T23:00Z, 2024-11-03T23:00Z) Sesterská chata - odpočinek s Biblí v ruce #date [72h] !Pozvánka[Pozvánka.pdf]`;

    assertEquals(output, expected);
  });
});
