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

/**
 * Parse a raw Google Calendar event into a normalized structure.
 * @param {any} rawEvent
 * @returns {CalendarEvent}
 */
export function parseGoogleCalendarEvent(rawEvent) {
  // Remove recurring suffix from eventId
  function cleanEventId(id) {
    return id ? id.replace(/_\w+$/, '') : '';
  }

  // Parse date/time and indicate if it's date-only
  function parseDateTime(dtObj) {
    if (!dtObj) return { value: '', isDateOnly: false };
    if (dtObj.dateTime) {
      // "2024-04-22T13:30:00+02:00"
      return { value: dtObj.dateTime.slice(0, 16).replace('T', ' '), isDateOnly: false };
    } else if (dtObj.date) {
      // "2024-04-22"
      return { value: dtObj.date, isDateOnly: true };
    }
    return { value: '', isDateOnly: false };
  }

  // Calculate duration, assuming 00:00/23:59 for date-only
  function calculateDuration(startObj, endObj) {
    let startDate, endDate;
    if (startObj.isDateOnly) {
      startDate = new Date(`${startObj.value}T00:00:00`);
    } else {
      startDate = new Date(startObj.value.replace(' ', 'T') + ':00');
    }
    if (endObj.isDateOnly) {
      endDate = new Date(`${endObj.value}T23:59:59.999`);
    } else {
      endDate = new Date(endObj.value.replace(' ', 'T') + ':00');
    }
    let diffMs = endDate - startDate;
    if (diffMs < 0) diffMs = 0;
    const days = Math.floor((diffMs + 1) / (24 * 60 * 60 * 1000));
    diffMs -= days * 24 * 60 * 60 * 1000;
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    diffMs -= hours * 60 * 60 * 1000;
    const minutes = Math.floor(diffMs / (60 * 1000));
    return { days, hours, minutes };
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
      if (value === '') value = true;
      tags[key] = value;
    }
    return tags;
  }

  // Parse attachments
  function parseAttachments(attachments) {
    if (!Array.isArray(attachments)) return [];
    return attachments
      .map(a => ({
        fileId: (a.fileId || '').trim(),
        name: (a.title || a.name || '').trim(),
        mime: (a.mimeType || a.mime || '').trim(),
        url: (a.fileUrl || a.url || '').trim(),
        ref: (a.iconLink || a.ref || '').trim(),
      }))
      .filter(a => a.fileId && a.name && a.mime && a.url && a.ref);
  }

  // Parse start/end
  const startObj = parseDateTime(rawEvent.start);
  const endObj = parseDateTime(rawEvent.end);

  // For output fields: if isDateOnly, use just date string; else, use datetime string
  const start = startObj.isDateOnly ? startObj.value : startObj.value;
  const end = endObj.isDateOnly ? endObj.value : endObj.value;

  // Subject/body
  const summary = (rawEvent.summary || '').trim();
  const description = (rawEvent.description || '').trim();
  const subject = summary.replace(/#[a-zA-Z0-9_]+(?::[^#]+)?/g, '').trim();

  return {
    eventId: cleanEventId(rawEvent.id || ''),
    recurring: !!rawEvent.recurringEventId,
    start,
    end,
    duration: calculateDuration(startObj, endObj),
    subject,
    body: description,
    attachments: parseAttachments(rawEvent.attachments),
    tags: parseTags(summary),
  };
}
