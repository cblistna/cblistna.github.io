import {
  assertEquals,
  assert,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  describe,
  it,
  beforeEach,
} from "https://deno.land/std@0.224.0/testing/bdd.ts";
import { parseGoogleCalendarEvents, setCalendarSettings } from "./calendar.js";

describe("parseGoogleCalendarEvents", () => {
  beforeEach(() => {
    setCalendarSettings({ timeZone: "Europe/Prague" });
  });

  it("returns empty array for invalid input", () => {
    assertEquals(parseGoogleCalendarEvents(null as any), []);
    assertEquals(parseGoogleCalendarEvents({}), []);
    assertEquals(parseGoogleCalendarEvents({ items: null }), []);
  });

  it("parses a single event with local timezone and removes tags from subject/body", () => {
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
    assertEquals(events.length, 1);
    const event = events[0];
    assertEquals(event.eventId, "abc123");
    assertEquals(event.type, "news");
    assert(event.start instanceof Date);
    assert(event.end instanceof Date);
    assertEquals(event.start.getHours(), 10);
    assertEquals(event.end.getHours(), 12);
    assertEquals(event.duration.days, 0);
    assertEquals(event.duration.hours, 2);
    assertEquals(event.subject, "Test Event");
    assertEquals(event.body, "This is a test event.");
    assertEquals(event.attachments.length, 1);
    assertEquals(event.attachments[0].fileId, "file1");
    assertEquals(event.attachments[0].name, "Agenda");
    assertEquals(event.attachments[0].mime, "application/pdf");
    assertEquals(event.attachments[0].url, "https://example.com/file.pdf");
    assertEquals(event.attachments[0].ref, "https://example.com/icon.png");
    assertEquals(event.tags.plan, "2024-09-10");
    assertEquals(event.tags.news, undefined);
    assertEquals(event.tags.pin, undefined);
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
    assertEquals(events.length, 1);
    const event = events[0];
    assert(event.start instanceof Date);
    assert(event.end instanceof Date);
    assertEquals(event.start.getHours(), 0);
    assertEquals(event.start.getMinutes(), 0);
    assertEquals(event.end.getHours(), 0);
    assertEquals(event.end.getMinutes(), 0);
    assertEquals(event.duration.days, 1);
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
    assertEquals(events.length, 1);
    assertEquals(events[0].eventId, "a");
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
    assertEquals(events.length, 1);
    const event = events[0];
    assert(event.start instanceof Date);
    assertEquals(event.start.getHours(), 0);
  });

  it("merges tags from summary and description, summary tags take precedence", () => {
    const response = {
      items: [
        {
          id: "merge1",
          summary: "Event #plan:2024-09-10 #pin:abc",
          description: "Description #plan:shouldnotappear #pin:def #extra:yes",
          start: { dateTime: "2024-09-10T10:00:00+02:00" },
          end: { dateTime: "2024-09-10T12:00:00+02:00" },
        },
      ],
    };
    const events = parseGoogleCalendarEvents(response);
    assertEquals(events.length, 1);
    const event = events[0];
    assertEquals(event.tags.plan, "2024-09-10");
    assertEquals(event.tags.pin, "abc");
    assertEquals(event.tags.extra, "yes");
  });
});
