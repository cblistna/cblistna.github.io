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

  function parseId(event) {
    assertEvent(event);
    return { id: event.id, eventId: event.id.replace(/_\w+$/, "") };
  }

  function parseSummary(event) {
    assertEvent(event);
    let name = (event.summary && event.summary.trim()) || "";

    const tags = parseMatchingGroupOf(tagPattern, name);

    name = name.replace(tagPattern, "").trim();
    name = name.replace("  ", " ");

    const comment = parseMatchingGroupOf(commentPattern, name).pop();
    name = name.replace(commentPattern, "").trim();

    return { name, tags, comment };
  }

  function parseDates(event) {
    assertEvent(event);
    const start = new Date(
      event.start.dateTime || event.start.date + "T00:00:00+01:00"
    );
    const end = new Date(
      event.end.dateTime || event.end.date + "T23:59:59+01:00"
    );
    return { start, end };
  }

  function parseDescription(event) {
    assertEvent(event);
    const description = event.description
      ? event.description.trim()
      : undefined;
    return { description };
  }

  function parseAttachments(event) {
    assertEvent(event);
    const attachments = (event.attachments || []).map((attachment) => ({
      name: attachment.title.replace(/\.\w+$/, "").trim(),
      url: attachment.fileUrl,
    }));
    return { attachments };
  }

  function parseSingleEvent(event) {
    assertEvent(event);
    return {
      ...parseId(event),
      ...parseSummary(event),
      ...parseDescription(event),
      ...parseDates(event),
      ...parseAttachments(event),
    };
  }

  return {
    parse(events) {
      if (Array.isArray(events)) {
        return events.map((event) => parseSingleEvent(event));
      }
      return parseSingleEvent(events);
    },

    /**
     * @deprecated
     */
    dropRecurringNotImportant(events) {
      const ids = {};
      return events.filter((event) => {
        const unique = !!!ids[event.eventId];
        const important = event.tags.includes("important");
        ids[event.eventId] = true;
        return unique || important;
      });
    },

    weekOf(now = new Date()) {
      const monday = now.getDate() - now.getDay() + 1;
      const sunday = monday + 6;
      const mondayStart = new Date(now.getTime());
      mondayStart.setDate(monday);
      mondayStart.setHours(0);
      mondayStart.setMinutes(0);
      mondayStart.setSeconds(0);
      const sundayEnd = new Date(now.getTime());
      sundayEnd.setDate(sunday);
      sundayEnd.setHours(23);
      sundayEnd.setMinutes(59);
      sundayEnd.setSeconds(59);
      const sundayBefore = new Date(mondayStart.getTime());
      sundayBefore.setDate(mondayStart.getDate() - 1);
      return {
        sundayBefore,
        now: new Date(now.getTime()),
        monday: mondayStart,
        sunday: sundayEnd,
      };
    },

    schedule(events, week = this.weekOf()) {
      const sundayBeforeEvents = events.filter(
        (event) =>
          event.start > week.sundayBefore &&
          event.start < week.monday &&
          event.start > week.now
      );

      const weekEvents = events.filter(
        (event) => event.start > week.monday && event.start < week.sunday
      );

      const occurences = events.reduce((acc, event) => {
        const eventId = event.eventId;
        if (!acc[eventId]) {
          acc[eventId] = [];
        }
        acc[eventId].push(event.id);
        return acc;
      }, {});

      const incomingEvents = events.filter((event) => {
        const repeating = occurences[event.eventId].length > 1;
        const firstOccurence =
          occurences[event.eventId].indexOf(event.id) === 0;
        const important = event.tags.includes("important");
        return (
          event.start > week.sunday &&
          (!repeating || firstOccurence || important)
        );
      });

      const topEvents = events.filter((event) => event.tags.includes("top"));

      return {
        week,
        events: {
          sundayBefore: sundayBeforeEvents,
          week: weekEvents,
          incoming: incomingEvents,
          top: topEvents,
        },
      };
    },
  };
})();
