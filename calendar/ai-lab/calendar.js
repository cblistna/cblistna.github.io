/**
 * @module calendar
 *
 * Provides functions for fetching, parsing, and normalizing calendar events, services, and messages
 * from Google Calendar, Google Sheets, and Google Drive for the cblistna.cz project.
 *
 * @example
 * import {
 *   now,
 *   today,
 *   fetchEvents,
 *   fetchServices,
 *   fetchPromo,
 *   fetchMessages,
 *   mergeServiceToEvent
 * } from "./calendar.js";
 *
 * @typedef {Object} Attachment
 * @property {string} fileId
 * @property {string} name
 * @property {string} mime
 * @property {string} url
 * @property {string} ref
 *
 * @typedef {Object} Duration
 * @property {number} days
 * @property {number} hours
 * @property {number} minutes
 * @property {number} spanDays
 *
 * @typedef {Object} CalendarEvent
 * @property {string} eventId
 * @property {boolean} recurring
 * @property {string} start - "yyyy-MM-dd hh:mm" | "yyyy-MM-dd"
 * @property {string} end   - "yyyy-MM-dd hh:mm" | "yyyy-MM-dd"
 * @property {Duration} duration
 * @property {string} subject
 * @property {string} body
 * @property {Attachment[]} attachments
 * @property {Record<string, string|true>} tags
 */

import {
  GOOGLE,
  TZ,
  CALENDAR_ID,
  PROMO_FOLDER_ID,
  SERVICES_SHEET,
  MESSAGES_PARENT_FOLDER_ID,
} from "./config.js";

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

const LOCAL_DATE_TIME_FORMAT = new Intl.DateTimeFormat("cs-CZ", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour24: true,
  TZ,
});

/**
 * Returns the current date and time in the format 'yyyy-MM-dd hh:mm'.
 * @returns {string} Current date and time in 'yyyy-MM-dd hh:mm' format
 * @example
 * // Returns '2024-04-22 13:30'
 * now();
 */
export function now() {
  return toLocalDateTime(new Date());
}

/**
 * Returns the current date in the format 'yyyy-MM-dd'.
 * @returns {string} Current date in the format 'yyyy-MM-dd'.
 * @example
 * // Returns '2024-04-22'
 * today();
 */
export function today() {
  return toLocalDate(new Date());
}

/**
 * Fetches events from a Google Calendar and normalizes them.
 * @param {string} calendarId
 * @returns {Promise<CalendarEvent[]>}
 */
export async function fetchEvents(calendarId = CALENDAR_ID) {
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
    .reduce((eventMap, event) => {
      if (!eventMap.has(event.eventId)) {
        eventMap.set(event.eventId, [event]);
      } else {
        eventMap.get(event.eventId).push(event);
      }
      return eventMap;
    }, new Map())
    .values();
  return [...eventGroups]
    .map((eventGroup) => [
      eventGroup[0],
      ...eventGroup.slice(1).filter((event) => event.tags.important),
    ])
    .flatMap((events) => events)
    .filter((event) => event)
    .sort((eventA, eventB) => eventA.start.localeCompare(eventB.start));
}

/**
 * Fetches service data from a Google Sheet.
 * @param {string} sheetId
 * @returns {Promise<Array<{date: string, moderator: string, teacher: string, subject: string, body: string, worshipLeader: string, childrenProgram: string, projector: string, soundMaster: string, birthdays: string}>>}
 */
export async function fetchServices(sheetId = SERVICES_SHEET) {
  const { values } = await GOOGLE.dataOf(sheetId, "A1:K20");
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
    .sort((serviceA, serviceB) => serviceA.date.localeCompare(serviceB.date));
}

/**
 * Fetches promo events from a Google Drive folder and groups them as calendar events.
 * @param {string} folderId
 * @returns {Promise<Array<{start: string, end?: string, subject: string, tags: Record<string, string|boolean>, body?: string, attachments: Array<{id: string, name: string, label: string, mimeType: string, webViewLink: string, webContentLink: string}>, duration: {days: number, hours: number, minutes: number, spanDays: number}}>>}
 */
export async function fetchPromo(folderId = PROMO_FOLDER_ID) {
  const { files } = await GOOGLE.filesOf({
    orderBy: "name desc",
    pageSize: 70,
    q: `trashed=false and parents in '${folderId}' and mimeType != 'application/vnd.google-apps.folder'`,
    fields: "files(id, name, webViewLink, webContentLink, mimeType)",
  });
  const events = groupFilesToEvents(files);
  const todaysDate = today();
  return events
    .map((event) => {
      event.tags.promo = true;
      return event;
    })
    .filter((event) => event.start >= todaysDate)
    .sort((eventA, eventB) => eventA.start.localeCompare(eventB.start));
}

/**
 * Fetches message events from Google Drive subfolders, grouping audio and PDF files as event attachments.
 * Each event contains date, speaker, title, audio, text, and tags.
 * @param {string} [parentFolderId=MESSAGES_PARENT_FOLDER_ID] - Google Drive folder ID containing message folders.
 * @returns {Promise<Array<{
 *   date: string,
 *   speaker: string,
 *   title: string,
 *   audio?: {
 *     id: string,
 *     name: string,
 *     label: string,
 *     mimeType: string,
 *     webViewLink: string,
 *     webContentLink: string
 *   },
 *   text?: {
 *     id: string,
 *     name: string,
 *     label: string,
 *     mimeType: string,
 *     webViewLink: string,
 *     webContentLink: string
 *   },
 *   tags: Record<string, string|boolean>
 * }>>}
 */
export async function fetchMessages(
  parentFolderId = MESSAGES_PARENT_FOLDER_ID
) {
  const { files: folders } = await GOOGLE.filesOf({
    orderBy: "name desc",
    pageSize: 2,
    q: `trashed=false
          and 'trinec.v@cb.cz' in owners
          and parents in '${parentFolderId}'
          and mimeType = 'application/vnd.google-apps.folder'`,
    fields: "files(id, name)",
  });
  const { files } = await GOOGLE.filesOf({
    orderBy: "name desc",
    pageSize: 20,
    q: `trashed=false
          and 'trinec.v@cb.cz' in owners
          and (${folders.map((f) => `parents in '${f.id}'`).join(" or ")})
          and (mimeType contains 'audio' or mimeType = 'application/pdf')`,
    fields: "files(id, name, mimeType, webViewLink, webContentLink)",
  });
  return groupFilesToEvents(files)
    .map((event) => ({
      date: event.start,
      speaker: event.subject,
      title: event.body,
      audio: event.attachments.find((attachment) =>
        attachment.mimeType.startsWith("audio/")
      ),
      text: event.attachments.find(
        (attachment) => attachment.mimeType === "application/pdf"
      ),
      tags: event.tags,
    }))
    .sort((messageA, messageB) => messageB.date.localeCompare(messageA.date));
}

/**
 * Merges service data into calendar events by matching event start date with service date.
 * If an event has a 'svc' tag and a matching service is found, adds moderator and teacher info to event tags.
 *
 * @param {CalendarEvent[]} events - Array of calendar event objects.
 * @param {Array<{date: string, moderator: string, teacher: string}>} services - Array of service objects.
 * @returns {void}
 */
export function mergeServicesToEvents(events, services) {
  const servicesByDate = services.reduce((acc, service) => {
    const { date } = service;
    acc[date] = service;
    return acc;
  }, {});
  events.forEach((event) => {
    const date = event.start.substring(0, 10);
    if (event.tags.svc && servicesByDate[date]) {
      const service = servicesByDate[date];
      event.tags.moderator = service.moderator;
      event.tags.teacher = service.teacher;
    }
  });
}

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
      .map((attachment) => ({
        fileId: (attachment.fileId || "").trim(),
        name: (attachment.title || attachment.name || "").trim(),
        mime: (attachment.mimeType || attachment.mime || "").trim(),
        url: (attachment.fileUrl || attachment.url || "").trim(),
        ref: (attachment.iconLink || attachment.ref || "").trim(),
      }))
      .filter(
        (attachment) =>
          attachment.fileId &&
          attachment.name &&
          attachment.mime &&
          attachment.url &&
          attachment.ref
      );
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

/**
 * Helper: Parse a file name into event data.
 * @param {string} name
 * @returns {{start: string, end?: string, subject: string, tags: Record<string, string|boolean>, body?: string, attachmentName?: string}}
 */
function parseEventFileName(name) {
  const nameWithoutExt = name.replace(/\.[^._]+$/, "");
  const sections = nameWithoutExt.split("_");
  const [startEndRaw = ""] = sections;
  const [startRaw, endRaw] = startEndRaw.split(",").map((s) => s.trim());
  const start = startRaw;
  const end = endRaw && endRaw.length > 0 ? endRaw : undefined;
  let subjectRaw = sections[1] ? sections[1].trim() : "";
  const tagRegex = /#(\w+)(?::([^#\s]+))?/g;
  const tags = {};
  subjectRaw = subjectRaw.replace(tagRegex, (m, tag, value) => {
    tags[tag] = value !== undefined ? value : true;
    return "";
  });
  const subject = subjectRaw.replace(/\s+/g, " ").trim();
  const body = sections[2] ? sections[2].trim() : "";
  const attachmentName = sections[3] ? sections[3].trim() : "";
  return { start, end, subject, tags, body, attachmentName };
}

/**
 * Helper: Calculate event duration for file events.
 * @param {string} start
 * @param {string} end
 * @returns {{days: number, hours: number, minutes: number, spanDays: number}}
 */
function calculateFileEventDuration(start, end) {
  let startDate, endDate;
  if (start.length === 10) {
    startDate = new Date(`${start}T00:00:00`);
  } else {
    startDate = new Date(start.replace(" ", "T") + ":00");
  }
  if (end.length === 10) {
    endDate = new Date(`${end}T00:00:00`);
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

/**
 * Parses Google Drive API file data into calendar event objects, grouping attachments.
 * @param {Array<{name: string, id: string, mimeType: string, webViewLink: string, webContentLink: string}>} files
 * @returns {Array<{start: string, end?: string, subject: string, tags: Record<string, string|boolean>, body?: string, attachments: Array<{id: string, name: string, label: string, mimeType: string, webViewLink: string, webContentLink: string}>, duration: {days: number, hours: number, minutes: number, spanDays: number}}>}
 */
function groupFilesToEvents(files) {
  const eventMap = new Map();
  for (const file of files) {
    const parsed = parseEventFileName(file.name);
    const eventKey = `${parsed.start}__${parsed.subject}`;
    let start = parsed.start;
    let end = parsed.end;
    if (!end) {
      end = start;
    }
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
    if (!eventMap.has(eventKey)) {
      eventMap.set(eventKey, {
        start,
        ...(end ? { end } : {}),
        subject: parsed.subject,
        tags: { ...parsed.tags },
        ...(parsed.body ? { body: parsed.body } : {}),
        attachments: [],
        duration: calculateFileEventDuration(start, end),
      });
    } else {
      const event = eventMap.get(eventKey);
      event.tags = { ...event.tags, ...parsed.tags };
    }
    const attachmentLabel = parsed.attachmentName || parsed.subject;
    if (attachmentLabel) {
      eventMap.get(eventKey).attachments.push({
        id: file.id,
        name: file.name,
        label: attachmentLabel,
        mimeType: file.mimeType,
        webViewLink: file.webViewLink,
        webContentLink: file.webContentLink,
      });
    }
    if (parsed.body) {
      eventMap.get(eventKey).body = parsed.body;
    }
  }
  return Array.from(eventMap.values());
}
