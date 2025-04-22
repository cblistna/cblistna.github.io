import { parseGoogleCalendarEvent } from './calendar.js';

function assertEqual(actual, expected, message) {
  const actStr = JSON.stringify(actual);
  const expStr = JSON.stringify(expected);
  if (actStr !== expStr) {
    throw new Error(`${message}\nExpected: ${expStr}\nActual:   ${actStr}`);
  }
}

// Test: Basic event with dateTime
(function testBasicEvent() {
  const raw = {
    id: 'abcdefg_123',
    summary: 'Team Meeting #plan:yes #pin',
    description: 'Discuss project status.',
    start: { dateTime: '2024-04-22T09:00:00+02:00' },
    end: { dateTime: '2024-04-22T10:30:00+02:00' },
    attachments: [
      {
        fileId: 'f1',
        title: 'Agenda',
        mimeType: 'application/pdf',
        fileUrl: 'https://file.url/agenda',
        iconLink: 'icon1',
      }
    ]
  };
  const event = parseGoogleCalendarEvent(raw);
  assertEqual(event.eventId, 'abcdefg', 'eventId');
  assertEqual(event.recurring, false, 'recurring');
  assertEqual(event.start, '2024-04-22 09:00', 'start');
  assertEqual(event.end, '2024-04-22 10:30', 'end');
  assertEqual(event.duration, { days: 0, hours: 1, minutes: 30 }, 'duration');
  assertEqual(event.subject, 'Team Meeting', 'subject');
  assertEqual(event.body, 'Discuss project status.', 'body');
  assertEqual(event.attachments.length, 1, 'attachments length');
  assertEqual(event.attachments[0].fileId, 'f1', 'attachment fileId');
  assertEqual(event.tags, { plan: 'yes', pin: true }, 'tags');
})();

// Test: Recurring event, all-day (date only)
(function testRecurringAllDay() {
  const raw = {
    id: 'xyz987_abc',
    recurringEventId: 'xyz987',
    summary: 'Holiday #recur #svc:calendar',
    start: { date: '2024-12-24' },
    end: { date: '2024-12-25' },
    attachments: [],
  };
  const event = parseGoogleCalendarEvent(raw);
  assertEqual(event.eventId, 'xyz987', 'eventId');
  assertEqual(event.recurring, true, 'recurring');
  assertEqual(event.start, '2024-12-24', 'start');
  assertEqual(event.end, '2024-12-25', 'end');
  // Duration should be at least 1 day (from 2024-12-24 00:00 to 2024-12-25 23:59)
  assertEqual(event.duration.days === 2, true, 'duration days');
  assertEqual(event.subject, 'Holiday', 'subject');
  assertEqual(event.body, '', 'body');
  assertEqual(event.attachments.length, 0, 'attachments');
  assertEqual(event.tags, { recur: true, svc: 'calendar' }, 'tags');
})();

// Test: Tag overwrite
(function testTagOverwrite() {
  const raw = {
    id: 'tagtest',
    summary: 'Test #foo:1 #foo:2 #bar',
    start: { date: '2024-01-01' },
    end: { date: '2024-01-01' },
  };
  const event = parseGoogleCalendarEvent(raw);
  assertEqual(event.tags, { foo: '2', bar: true }, 'tag overwrite');
})();

// Test: Date only event, check start/end format and duration
(function testDateOnlyEvent() {
  const raw = {
    id: 'dateonly',
    summary: 'Vacation #plan',
    start: { date: '2025-07-01' },
    end: { date: '2025-07-03' },
  };
  const event = parseGoogleCalendarEvent(raw);
  assertEqual(event.start, '2025-07-01', 'start should be date string');
  assertEqual(event.end, '2025-07-03', 'end should be date string');
  // Duration should be calculated as if times are 00:00 and 23:59
  assertEqual(event.duration.days === 3, true, 'duration days');
})();

(function testOnRawCalendarData() {
  const rawEvents = JSON.parse(Deno.readTextFileSync("events.json")).items;
  rawEvents
    .map(re => parseGoogleCalendarEvent(re))
    .filter(e => !e.recurring && Object.keys(e.tags).length > 0)
    .forEach(e => {
      console.log(e)
    });


}());

console.log('All tests passed!');
