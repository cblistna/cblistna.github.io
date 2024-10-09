import { describe, it } from "jsr:@std/testing/bdd";
import { assertEquals } from "jsr:@std/assert";
import { z } from "jsr:@prgm/zod@3.23.8-alpha.1";

const EventTags = [
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

const EventInstant = z.union([
  z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({
    dateTime: z.string().regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/,
    ),
  }),
]);

type EventInstant = z.infer<typeof EventInstant>;

const Event = z.object({
  eventId: z.string().min(5).max(1024),
  type: z.enum(["meeting", "news"]),
  start: z.coerce.date(),
  end: z.coerce.date(),
  durationHours: z.number().min(0),
  subject: z.string(),
  body: z.string().default(""),
  // FIXME: make body optional
  attachments: z.array(z.object({
    fileId: z.string(),
    name: z.string().min(1),
    mime: z.string(),
    url: z.string().url(),
    ref: z.string().min(1),
  })),
  tags: z.map(z.enum(EventTags), z.string().min(1).optional()),
});

type Event = z.infer<typeof Event>;

// FIXME: make it readonly

const CEvent = z.object({
  id: z.string().min(5).max(1024),
  start: EventInstant,
  end: EventInstant,
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
}).transform((v) =>
  Event.parse({
    eventId: v.id.split("_")[0],
    type: "meeting",
    start: "dateTime" in v.start ? v.start.dateTime : `${v.start.date} (${TZ})`,
    end: "dateTime" in v.end ? v.end.dateTime : `${v.end.date} (${TZ})`,
    durationHours: 0,
    subject: v.summary
      .replace(TAG, "")
      .replace(COMMENT, "")
      .replace("  ", " ")
      .trim(),
    body: v.description,
    attachments: v.attachments.map((a) => ({
      fileId: a.fileId,
      name: a.title
        .replace(/\.\w+$/, "")
        .replace(TAG, "")
        .replace(COMMENT, "")
        .replace("  ", " ")
        .trim(),
      mime: a.mimeType,
      url: a.fileUrl,
      ref: (parseMatching(TAG, a.title.toLowerCase()))[0] ??
        a.title,
    })).sort((a, b) => a.ref.localeCompare(b.ref)),
    tags: new Map(
      [
        v.summary,
        v.recurringEventId ? "#recur" : "",
        "date" in v.start && "date" in v.end ? "#date" : "",
        v.visibility === "private" ? "#hide" : "",
      ]
        .flatMap((s) => parseMatching(TAG, (s ?? "").toLowerCase()))
        .map((kv) => kv.split(":") as [string, string])
        .filter(([t]) => (EventTags as unknown as string[]).includes(t)),
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
  );

// FIXME: make NEvent readonly!

function parseMatching(pattern: RegExp, text: string) {
  pattern.lastIndex = 0;
  const matches: string[] = [];
  let match;
  do {
    match = pattern.exec(text);
    if (match) {
      matches.push(match[1].trim());
    }
  } while (match);
  return matches;
}

describe("calendar events", () => {
  it("should parse google calendar payload", () => {
    const events = JSON.parse(Deno.readTextFileSync("events.json")).items
      .map((item: unknown) => CEvent.parse(item));

    const services = JSON.parse(Deno.readTextFileSync("services.json")).values
      .slice(1)
      .map((r: Array<string>) => ({ date: r[1], lead: r[2], sermon: r[3] }))
      .reduce((acc: Record<string, unknown>, s: { date?: string }) => {
        acc[s.date!] = s;
        delete s.date;
        return acc;
      }, {});

    events.forEach((e: Event) => {
      const date = e.start.toISOString().substring(0, 10);
      if (e.tags.has("svc") && services[date]) {
        const svc = services[date];
        e.body = `Vedení: ${svc.lead}, Kázání: ${svc.sermon}${
          e.body ? `<br>${e.body}` : ""
        }`;
      }
    });

    const eventLine = (e: Event) =>
      [
        `[${e.start.toISOString().substring(0, 16)}Z, ${
          e.end.toISOString().substring(0, 16)
        }Z)`,
        `${e.subject}`,
        `${[...e.tags].map(([tag, _value]) => `#${tag}`).join(" ")}` ||
        undefined,
        `[${e.durationHours}h]`,
        `${e.body}`,
        `${
          e.attachments.reduce((acc, a) => {
            acc.push(`!${a.name}[${a.ref}]`);
            return acc;
          }, [] as string[])
        }`,
      ].filter((p) => p).join(" ");

    const plan = events.reduce((acc: Map<string, Event[]>, e: Event) => {
      if (!acc.has(e.eventId)) acc.set(e.eventId, []);
      acc.get(e.eventId)!.push(e);
      return acc;
    }, new Map());

    const output = [...plan.entries()]
      .map(([_id, el]) => eventLine(el[0]))
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

    console.log(output);

    assertEquals(output, expected);
  });
});