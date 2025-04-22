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

export const TZ = "Europe/Prague";
const LOCAL_DATE_TIME_FORMAT = new Intl.DateTimeFormat("cs-CZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour24: true,
    TZ
})

function toLocalDateTime(date) {
  const parts = LOCAL_DATE_TIME_FORMAT
    .formatToParts(date)
    .reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});

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
export function parseGoogleCalendarEvent(rawEvent) {
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
    const spanDays = (hours > 0 || minutes > 0) ? days +1 : days;
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
  const end = endObj.isDateOnly
    ? minusDays(endObj.value, 1)
    : endObj.value;

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
