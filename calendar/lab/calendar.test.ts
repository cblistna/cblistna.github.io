import { describe, it, beforeEach } from "jsr:@std/testing/bdd";
import { expect } from "jsr:@std/expect";
import { parseGoogleCalendarEvents, setCalendarSettings } from "./calendar.js";

describe("parseGoogleCalendarEvents", () => {
  beforeEach(() => {
    setCalendarSettings({ timeZone: "Europe/Prague" });
  });

  it("returns empty array for invalid input", () => {
    expect(parseGoogleCalendarEvents(null as any)).toEqual([]);
    expect(parseGoogleCalendarEvents({})).toEqual([]);
    expect(parseGoogleCalendarEvents({ items: null })).toEqual([]);
  });

  it("parses a single event with local timezone and removes tags from subject only", () => {
    const response = {
      items: [
        {
          id: "abc123",
          summary: "Test Event #plan:2024-09-10 #news",
          description: "This is a test event. #pin",
          start: {
            dateTime: "2024-09-10T10:00:00+02:00",
            timeZone: "Europe/Prague",
          },
          end: {
            dateTime: "2024-09-10T12:00:00+02:00",
            timeZone: "Europe/Prague",
          },
          attachments: [
            {
              fileId: "file1",
              name: "Agenda",
              mime: "application/pdf",
              url: "https://example.com/file.pdf",
              ref: "https://example.com/icon.png",
            },
          ],
        },
      ],
    };
    const events = parseGoogleCalendarEvents(response);
    expect(events.length).toBe(1);
    const event = events[0];
    expect(event.eventId).toBe("abc123");
    expect(event.type).toBe("news");
    expect(event.start instanceof Date).toBe(true);
    expect(event.end instanceof Date).toBe(true);
    expect(event.start.getHours()).toBe(10);
    expect(event.end.getHours()).toBe(12);
    expect(event.duration.days).toBe(0);
    expect(event.duration.hours).toBe(2);
    expect(event.subject).toBe("Test Event");
    expect(event.body).toBe("This is a test event. #pin");
    expect(event.attachments.length).toBe(1);
    expect(event.attachments[0].fileId).toBe("file1");
    expect(event.attachments[0].name).toBe("Agenda");
    expect(event.attachments[0].mime).toBe("application/pdf");
    expect(event.attachments[0].url).toBe("https://example.com/file.pdf");
    expect(event.attachments[0].ref).toBe("https://example.com/icon.png");
    expect(event.tags.plan).toBe("2024-09-10");
    expect(event.tags.news).toBe(true);
    expect(event.tags.pin).toBeUndefined();
  });

  it("parses all-day event as local midnight", () => {
    const response = {
      items: [
        {
          id: "allday1",
          summary: "All Day Event",
          start: { date: "2024-10-11" },
          end: { date: "2024-10-12" },
        },
      ],
    };
    const events = parseGoogleCalendarEvents(response);
    expect(events.length).toBe(1);
    const event = events[0];
    expect(event.start instanceof Date).toBe(true);
    expect(event.end instanceof Date).toBe(true);
    expect(event.start.getHours()).toBe(0);
    expect(event.start.getMinutes()).toBe(0);
    expect(event.end.getHours()).toBe(0);
    expect(event.end.getMinutes()).toBe(0);
    expect(event.duration.days).toBe(1);
  });

  it("skips events without id or summary", () => {
    const response = {
      items: [
        {
          id: "a",
          summary: "ok",
          start: { date: "2024-01-01" },
          end: { date: "2024-01-02" },
        },
        { summary: "missing id" },
        { id: "missing summary" },
        {},
      ],
    };
    const events = parseGoogleCalendarEvents(response);
    expect(events.length).toBe(1);
    expect(events[0].eventId).toBe("a");
  });

  it("respects global timezone setting for all-day events", () => {
    setCalendarSettings({ timeZone: "UTC" });
    const response = {
      items: [
        {
          id: "allday2",
          summary: "All Day UTC",
          start: { date: "2024-10-11" },
          end: { date: "2024-10-12" },
        },
      ],
    };
    const events = parseGoogleCalendarEvents(response);
    expect(events.length).toBe(1);
    const event = events[0];
    expect(event.start instanceof Date).toBe(true);
    expect(event.start.getHours()).toBe(0);
  });

  it("parses tags only from summary, not from description", () => {
    const response = {
      items: [
        {
          id: "merge1",
          summary: "Event #plan:2024-09-10 #pin:abc",
          description: "Description #plan:shouldnotappear #pin:def #extra",
          start: { dateTime: "2024-09-10T10:00:00+02:00" },
          end: { dateTime: "2024-09-10T12:00:00+02:00" },
        },
      ],
    };
    const events = parseGoogleCalendarEvents(response);
    expect(events.length).toBe(1);
    const event = events[0];
    expect(event.tags.plan).toBe("2024-09-10");
    expect(event.tags.pin).toBe("abc");
    expect(event.tags.extra).toBeUndefined();
    expect(event.body).toBe(
      "Description #plan:shouldnotappear #pin:def #extra"
    );
  });

  it("ignores tags with empty value", () => {
    const response = {
      items: [
        {
          id: "emptytag",
          summary: "Event #empty: #foo:bar #bar",
          start: { date: "2024-10-11" },
          end: { date: "2024-10-12" },
        },
      ],
    };
    const events = parseGoogleCalendarEvents(response);
    expect(events.length).toBe(1);
    const event = events[0];
    expect(event.tags.empty).toBe(true);
    expect(event.tags.foo).toBe("bar");
    expect(event.tags.bar).toBe(true);
  });
});
