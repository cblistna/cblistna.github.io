import { parseFilenameToEvent, groupFilesToEvents } from "./file-events.js";

// Simple test framework
function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
  } catch (error) {
    console.error(`❌ ${name}`);
    console.error(error);
  }
}

function assertEquals(actual, expected, message) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  
  if (actualStr !== expectedStr) {
    throw new Error(`${message || 'Assertion failed'}: expected ${expectedStr}, got ${actualStr}`);
  }
}

// Tests for parseFilenameToEvent
test('Basic date only', () => {
  const result = parseFilenameToEvent('2025-04-22_Meeting with Client_Discussion about project_document.pdf');
  console.log(result);
  
  assertEquals(
    result.startDate.toISOString().slice(0, 10), 
    '2025-04-22',
    'Start date should be correctly parsed'
  );
  assertEquals(result.subject, 'Meeting with Client', 'Subject should be correctly parsed');
  assertEquals(result.body, 'Discussion about project', 'Body should be correctly parsed');
  assertEquals(result.attachments, ['document.pdf'], 'Attachment should be correctly parsed');
});

test('With tags', () => {
  const result = parseFilenameToEvent('2025-04-22_Meeting #important #location:Office_Notes_notes.txt');
  
  assertEquals(result.subject, 'Meeting', 'Subject should have tags removed');
  assertEquals(result.tags, { important: true, location: 'Office' }, 'Tags should be correctly parsed');
});

test('With start and end dates and times', () => {
  const result = parseFilenameToEvent('2025-04-22 10:00,2025-04-22 11:30_Conference Call_Agenda__');
  
  const startDate = new Date(2025, 3, 22, 10, 0);
  const endDate = new Date(2025, 3, 22, 11, 30);
  
  assertEquals(
    result.startDate.toISOString(),
    startDate.toISOString(),
    'Start date and time should be correctly parsed'
  );
  assertEquals(
    result.endDate.toISOString(),
    endDate.toISOString(),
    'End date and time should be correctly parsed'
  );
});

// Tests for groupFilesToEvents
test('Group files with same sections 1 & 2 and empty body into one event', () => {
  const filenames = [
    '2025-04-22_Meeting__attachment1.pdf',
    '2025-04-22_Meeting__attachment2.docx'
  ];
  
  const result = groupFilesToEvents(filenames);
  
  assertEquals(result.length, 1, 'Should create one event');
  assertEquals(
    result[0].attachments.sort(), 
    ['attachment1.pdf', 'attachment2.docx'].sort(), 
    'Should include both attachments'
  );
});

test('Do not group files if any has non-empty body', () => {
  const filenames = [
    '2025-04-22_Meeting__attachment1.pdf',
    '2025-04-22_Meeting_Some notes_attachment2.docx'  // This has body
  ];
  
  const result = groupFilesToEvents(filenames);
  
  assertEquals(result.length, 2, 'Should create separate events');
});
