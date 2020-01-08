"use strict";

const Events = (function () {
  const tagPattern = / #([\w-]+)/g;
  const commentPattern = /\/\/(.*)$/g;

  function parseMatchingGroupOf(pattern, text) {
    pattern.lastIndex = 0;
    const matches = [];
    let match;
    do {
      match = pattern.exec(text);
      if (match) {
        matches.push(match[1].trim());
      }
    } while (match);
    return matches;
  }

  function assertEvent(event) {
    if (!event || typeof event !== "object") {
      throw new Error("event not defined");
    }
  }

  return {
    parse(event) {
      assertEvent(event);
      return {
        ...this.parseId(event),
        ...this.parseSummary(event),
        ...this.parseDescription(event),
        ...this.parseDates(event),
        ...this.parseAttachments(event)
      };
    },

    dropRecurringNotImportant(events) {
      const ids = {};
      return events.filter(event => {
        const unique = !!!ids[event.eventId];
        const important = (event.tags || []).includes('important');
        ids[event.eventId] = true;
        return unique || important;
      });
    },

    parseId(event) {
      assertEvent(event);
      return { eventId: event.id.replace(/_\w+$/, '') };
    },

    parseSummary(event) {
      assertEvent(event);
      let name = (event.summary && event.summary.trim()) || "";

      const tags = parseMatchingGroupOf(tagPattern, name);

      name = name.replace(tagPattern, "").trim();
      name = name.replace("  ", " ");

      const comment = parseMatchingGroupOf(commentPattern, name).pop();
      name = name.replace(commentPattern, "").trim();

      return { name, tags, comment };
    },

    parseDates(event) {
      assertEvent(event);
      const start = new Date(
        event.start.dateTime || event.start.date + "T00:00:00+01:00"
      );
      const end = new Date(
        event.end.dateTime || event.end.date + "T23:59:59+01:00"
      );
      return { start, end };
    },

    parseDescription(event) {
      assertEvent(event);
      const description = event.description ? event.description.trim() : undefined;
      return { description };
    },

    parseAttachments(event) {
      assertEvent(event);
      const attachments = (event.attachments || []).map(attachment => ({
        name: attachment.title.replace(/\.\w+$/, "").trim(),
        url: attachment.fileUrl
      }));
      return { attachments };
    }
  };
})();
