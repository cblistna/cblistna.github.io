import { GOOGLE } from "./google-access.js";

/**
 * @typedef {Object} Attachment
 * @property {string} fileId
 * @property {string} name
 * @property {string} mime
 * @property {string} url
 * @property {string} ref
 */

/**
 * @typedef {Object} Duration
 * @property {number} days
 * @property {number} hours
 * @property {number} minutes
 * @property {number} spanDays
 */

/**
 * @typedef {Object} CalendarEvent
 * @property {string} eventId
 * @property {boolean} recurring
 * @property {string} start // "yyyy-MM-dd hh:mm" | "yyyy-MM-dd"
 * @property {string} end   // "yyyy-MM-dd hh:mm" | "yyyy-MM-dd"
 * @property {Duration} duration
 * @property {string} subject
 * @property {string} body
 * @property {Attachment[]} attachments
 * @property {Record<string, string|true>} tags
 */

const TZ = "Europe/Prague";
const LOCAL_DATE_TIME_FORMAT = new Intl.DateTimeFormat("cs-CZ", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour24: true,
  TZ,
});

function toLocalDateTime(date) {
  const parts = LOCAL_DATE_TIME_FORMAT.formatToParts(date).reduce(
    (acc, part) => {
      acc[part.type] = part.value;
      return acc;
    },
    {}
  );

  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function toLocalDate(date) {
  return toLocalDateTime(date).substring(0, 10);
}

/**
 * Returns the current date and time in the format 'yyyy-MM-dd hh:mm'.
 * @returns {string} Current date and time in 'yyyy-MM-dd hh:mm' format
 * @example
 * // Returns '2024-04-22 13:30'
 * now();
 */
export function now() {
  toLocalDateTime(new Date());
}

/**
 * Returns the current date in the format 'yyyy-MM-dd'.
 * @returns Returns the current date in the format 'yyyy-MM-dd'.
 * @example
 * // Returns '2024-04-22'
 * today();
 */
export function today() {
  return toLocalDate(new Date());
}

/**
 * Parse a raw Google Calendar event into a normalized structure.
 * @param {any} rawEvent
 * @returns {CalendarEvent}
 */
function parseGoogleCalendarEvent(rawEvent) {
  // Remove recurring suffix from eventId
  function cleanEventId(id) {
    return id ? id.replace(/_\w+$/, "") : "";
  }

  function minusDays(dateStr, offset) {
    const date = new Date(dateStr + "T00:00:00.000Z");
    date.setDate(date.getDate() - offset);
    return toLocalDate(date);
  }

  // Parse date/time and indicate if it's date-only
  function parseDateTime(dtObj) {
    if (!dtObj) return { value: "", isDateOnly: false };
    if (dtObj.dateTime) {
      // "2024-04-22T13:30:00+02:00"
      return {
        value: dtObj.dateTime.slice(0, 16).replace("T", " "),
        isDateOnly: false,
      };
    } else if (dtObj.date) {
      // "2024-04-22"
      return { value: dtObj.date, isDateOnly: true };
    }
    return { value: "", isDateOnly: false };
  }

  // Calculate duration, assuming 00:00/23:59 for date-only
  function calculateDuration(startObj, endObj) {
    let startDate, endDate;
    if (startObj.isDateOnly) {
      startDate = new Date(`${startObj.value}T00:00:00`);
    } else {
      startDate = new Date(startObj.value.replace(" ", "T") + ":00");
    }
    if (endObj.isDateOnly) {
      endDate = new Date(`${endObj.value}T00:00:00`);
    } else {
      endDate = new Date(endObj.value.replace(" ", "T") + ":00");
    }
    let diffMs = endDate - startDate;
    if (diffMs < 0) diffMs = 0;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    diffMs -= days * 24 * 60 * 60 * 1000;
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    diffMs -= hours * 60 * 60 * 1000;
    const minutes = Math.floor(diffMs / (60 * 1000));
    const spanDays = hours > 0 || minutes > 0 ? days + 1 : days;
    return { days, hours, minutes, spanDays };
  }

  // Parse tags from summary
  function parseTags(summary) {
    const tags = {};
    if (!summary) return tags;
    const tagRegex = /#([a-zA-Z0-9_]+)(?::([^#]+))?/g;
    let match;
    while ((match = tagRegex.exec(summary))) {
      const key = match[1].trim();
      let value = match[2] !== undefined ? match[2].trim() : true;
      if (value === "") value = true;
      tags[key] = value;
    }
    return tags;
  }

  // Parse attachments
  function parseAttachments(attachments) {
    if (!Array.isArray(attachments)) return [];
    return attachments
      .map((a) => ({
        fileId: (a.fileId || "").trim(),
        name: (a.title || a.name || "").trim(),
        mime: (a.mimeType || a.mime || "").trim(),
        url: (a.fileUrl || a.url || "").trim(),
        ref: (a.iconLink || a.ref || "").trim(),
      }))
      .filter((a) => a.fileId && a.name && a.mime && a.url && a.ref);
  }

  // Parse start/end
  const startObj = parseDateTime(rawEvent.start);
  const endObj = parseDateTime(rawEvent.end);

  const start = startObj.value;
  const end = endObj.isDateOnly ? minusDays(endObj.value, 1) : endObj.value;

  // Subject/body
  const summary = (rawEvent.summary || "").trim();
  const subject = summary.replace(/#[a-zA-Z0-9_]+(?::[^#]+)?/g, "").trim();
  const body = (rawEvent.description || "").trim();

  return {
    eventId: cleanEventId(rawEvent.id || ""),
    recurring: !!rawEvent.recurringEventId,
    start,
    end,
    duration: calculateDuration(startObj, endObj),
    subject,
    body,
    attachments: parseAttachments(rawEvent.attachments),
    tags: parseTags(summary),
  };
}

export async function fetchEvents(calendarId) {
  const todayPlus = (offsetMs = 0) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return new Date(date.getTime() + offsetMs).toISOString();
  };
  const days = (d) => d * 24 * 3600_000;

  const { items } = await GOOGLE.eventsOf(calendarId, {
    timeMin: todayPlus(),
    timeMax: todayPlus(days(365)),
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 365,
  });
  const eventGroups = items
    .map(parseGoogleCalendarEvent)
    .reduce((acc, event) => {
      if (!acc.has(event.eventId)) {
        acc.set(event.eventId, [event]);
      } else {
        acc.get(event.eventId).push(event);
      }
      return acc;
    }, new Map())
    .values();
  return [...eventGroups]
    .map((group) => [
      group[0],
      ...group.slice(1).filter((e) => e.tags.important),
    ])
    .flatMap((events) => events)
    .filter((e_1) => e_1)
    .sort((a, b) => a.start.localeCompare(b.start));
}

export async function fetchServices(sheetId, range) {
  const { values } = await GOOGLE.dataOf(sheetId, range);
  const todaysDate = today();
  return values
    .slice(1)
    .map((row) => ({
      date: row[1],
      moderator: row[2],
      teacher: row[3],
      subject: row[4],
      body: row[5],
      worshipLeader: row[6],
      childrenProgram: row[7],
      projector: row[8],
      soundMaster: row[9],
      birthdays: row[10],
    }))
    .filter((service) => service.date && service.date >= todaysDate)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Parses Google Drive API file data into calendar event objects, grouping attachments.
 * @param {Array<{name: string, id: string, mimeType: string, webViewLink: string, webContentLink: string}>} files
 * @returns {Array<{start: string, end?: string, subject: string, tags: Record<string, string|boolean>, body?: string, attachments: Array<{id: string, name: string, mimeType: string, webViewLink: string, webContentLink: string}>}>}
 */
function groupFilesToEvents(files) {
  /**
   * Parse a file name into event data.
   * @param {string} name
   * @returns {{start: string, end?: string, subject: string, tags: Record<string, string|boolean>, body?: string, attachmentName?: string}}
   */
  function parseFileName(name) {
    // Remove file extension before splitting
    const nameWithoutExt = name.replace(/\.[^._]+$/, "");
    const sections = nameWithoutExt.split("_");
    // Section 1: start and end
    const [startEndRaw = ""] = sections;
    const [startRaw, endRaw] = startEndRaw.split(",").map((s) => s.trim());
    const start = startRaw;
    const end = endRaw && endRaw.length > 0 ? endRaw : undefined;
    // Section 2: subject (with tags)
    let subjectRaw = sections[1] ? sections[1].trim() : "";
    const tagRegex = /#(\w+)(?::([^#\s]+))?/g;
    const tags = {};
    subjectRaw = subjectRaw.replace(tagRegex, (m, tag, value) => {
      tags[tag] = value !== undefined ? value : true;
      return "";
    });
    const subject = subjectRaw.replace(/\s+/g, " ").trim();
    // Section 3: body
    const body = sections[2] ? sections[2].trim() : "";
    // Section 4: attachment name
    const attachmentName = sections[3] ? sections[3].trim() : "";
    return { start, end, subject, tags, body, attachmentName };
  }

  // Helper to calculate duration (same as in parseGoogleCalendarEvent)
  function calculateDuration(start, end) {
    let startDate, endDate;
    if (start.length === 10) {
      startDate = new Date(`${start}T00:00:00`);
    } else {
      startDate = new Date(start.replace(" ", "T") + ":00");
    }
    if (end.length === 10) {
      endDate = new Date(`${end}T00:00:00`);
      // Add one day for duration calculation only
      endDate.setDate(endDate.getDate() + 1);
    } else {
      endDate = new Date(end.replace(" ", "T") + ":00");
    }
    let diffMs = endDate - startDate;
    if (diffMs < 0) diffMs = 0;
    const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    diffMs -= days * 24 * 60 * 60 * 1000;
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    diffMs -= hours * 60 * 60 * 1000;
    const minutes = Math.floor(diffMs / (60 * 1000));
    const spanDays = hours > 0 || minutes > 0 ? days + 1 : days;
    return { days, hours, minutes, spanDays };
  }

  // Group by start+subject
  const eventMap = new Map();
  for (const file of files) {
    const parsed = parseFileName(file.name);
    const key = `${parsed.start}__${parsed.subject}`;
    // Determine start and end
    let start = parsed.start;
    let end = parsed.end;
    // If no end, use start
    if (!end) {
      end = start;
    }
    // If start has time and end does not, add 1 hour to start for end
    if (start && start.length === 16 && (!end || end.length === 10)) {
      const startDate = new Date(start.replace(" ", "T") + ":00");
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(
        2,
        "0"
      )}-${String(endDate.getDate()).padStart(2, "0")} ${String(
        endDate.getHours()
      ).padStart(2, "0")}:${String(endDate.getMinutes()).padStart(2, "0")}`;
    }
    if (!eventMap.has(key)) {
      eventMap.set(key, {
        start,
        ...(end ? { end } : {}),
        recurring: false,
        subject: parsed.subject,
        tags: parsed.tags,
        ...(parsed.body ? { body: parsed.body } : {}),
        attachments: [],
        duration: calculateDuration(start, end),
      });
    }
    // Always add as attachment if attachmentName exists, otherwise use subject
    const attachmentLabel = parsed.attachmentName || parsed.subject;
    if (attachmentLabel) {
      eventMap.get(key).attachments.push({
        id: file.id,
        name: file.name, // original file name
        label: attachmentLabel, // user-friendly label
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
      });
    }
    // If body is not empty, set it (single file event)
    if (parsed.body) {
      eventMap.get(key).body = parsed.body;
    }
  }
  return Array.from(eventMap.values());
}

export async function fetchPromo(folderId) {
  const { files } = await GOOGLE.filesOf({
    orderBy: "name desc",
    pageSize: 70,
    q: `trashed=false and parents in '${folderId}' and mimeType != 'application/vnd.google-apps.folder'`,
    fields: "files(id, name, webViewLink, webContentLink, mimeType)",
  });
  const events = groupFilesToEvents(files);
  const todaysDate = today();
  return events
    .filter((event) => event.start >= todaysDate)
    .sort((a, b) => a.start.localeCompare(b.start));
}
