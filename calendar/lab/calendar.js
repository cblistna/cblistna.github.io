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
 */

/**
 * @typedef {Object} CalendarEvent
 * @property {string} eventId
 * @property {"meeting"|"news"} type
 * @property {Date} start
 * @property {Date} end
 * @property {Duration} duration
 * @property {string} subject
 * @property {string} body
 * @property {Attachment[]} attachments
 * @property {Record<string, string|undefined>} tags
 */

/**
 * @typedef {Object} CalendarSettings
 * @property {string} timeZone
 */

/** @type {CalendarSettings} */
export let calendarSettings = { timeZone: "Europe/Prague" };

/**
 * Set global calendar settings
 * @param {Partial<CalendarSettings>} settings
 */
export function setCalendarSettings(settings) {
  calendarSettings = { ...calendarSettings, ...settings };
}

/**
 * Convert date string to Date in local timezone.
 * @param {string} dateStr
 * @param {string} [tz]
 * @returns {Date}
 */
function toLocalDate(dateStr, tz = calendarSettings.timeZone) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Date(dateStr + "T00:00:00");
  }
  return new Date(dateStr);
}

/**
 * Extract tags from text and return { tags, textWithoutTags }
 * @param {string} text
 * @returns {{tags: Record<string, string|undefined>, text: string}}
 */
function extractTags(text) {
  if (!text) return { tags: {}, text: "" };
  const tagRegex = /#(\w+)(?::([\w\-,]+))?/g;
  const tags = {};
  let match;
  let cleanText = text;
  while ((match = tagRegex.exec(text))) {
    tags[match[1]] = match[2];
    cleanText = cleanText.replace(match[0], "");
  }
  cleanText = cleanText.replace(/\s{2,}/g, " ").trim();
  return { tags, text: cleanText };
}

/**
 * Parse Google Calendar API response into normalized events
 * @param {object} response
 * @returns {CalendarEvent[]}
 */
export function parseGoogleCalendarEvents(response) {
  if (!response || !Array.isArray(response.items)) return [];
  return response.items
    .filter((e) => e && e.id && e.summary)
    .map((e) => {
      const start = e.start?.dateTime || e.start?.date;
      const end = e.end?.dateTime || e.end?.date;
      const startDate = start ? toLocalDate(start, e.start?.timeZone) : null;
      const endDate = end ? toLocalDate(end, e.end?.timeZone) : null;
      const durationMs =
        startDate && endDate ? endDate.getTime() - startDate.getTime() : 0;
      const duration = {
        days: Math.floor(durationMs / (1000 * 60 * 60 * 24)),
        hours: Math.floor((durationMs / (1000 * 60 * 60)) % 24),
      };
      // Extract tags from summary and description, remove them from both
      const { tags: summaryTags, text: cleanSummary } = extractTags(
        e.summary || ""
      );
      const { tags: descTags, text: cleanDesc } = extractTags(
        e.description || ""
      );
      // Merge tags (summary tags take precedence)
      const tags = { ...descTags, ...summaryTags };
      /** @type {"meeting"|"news"} */
      let type = "meeting";
      if (
        Object.prototype.hasOwnProperty.call(tags, "news") &&
        (tags.news === undefined ||
          tags.news === "" ||
          typeof tags.news === "string")
      ) {
        type = "news";
      }
      return {
        eventId: e.id,
        type,
        start: startDate,
        end: endDate,
        duration,
        subject: cleanSummary,
        body: cleanDesc || "",
        attachments: Array.isArray(e.attachments)
          ? e.attachments.map((a) => ({
              fileId: a.fileId || "",
              name: a.name || a.title || "",
              mime: a.mime || a.mimeType || "",
              url: a.url || a.fileUrl || "",
              ref: a.ref || a.iconLink || "",
            }))
          : [],
        tags,
      };
    });
}
