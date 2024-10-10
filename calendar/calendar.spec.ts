import { describe, it } from "jsr:@std/testing/bdd";
import { assertEquals } from "jsr:@std/assert";
import { Calendar, Event, Service, Services } from "./calendar.ts";

describe("calendar", () => {
  it("should parse google calendar events", () => {
    const services: Map<string, Service> = new Map(
      Services.parse(JSON.parse(Deno.readTextFileSync("services.json")))
        .map((s) => [s.date, s]),
    );

    const events = Calendar.parse(
      JSON.parse(Deno.readTextFileSync("events.json")),
    )
      .map((event) => {
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

    const plan = events.reduce((acc, e) => {
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
