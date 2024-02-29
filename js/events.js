"use strict";

const Events = (function () {
  const tagPattern = / #([\w-]+)/g;
  const commentPattern = /\/\/(.*)$/g;
  const attchmentOrderKeyPattern = /#(\d)/g;

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
      event.start.dateTime || event.start.date + "T00:00:00"
    );
    const end = new Date(
      event.end.dateTime || event.end.date + "T23:59:59"
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

    const attachments = (event.attachments || [])
      .map((attachment) => ({
        name: attachment.title
          .replace(/\.\w+$/, "")
          .replace(attchmentOrderKeyPattern, "")
          .trim(),
        url: attachment.fileUrl,
        orderKey:
          parseMatchingGroupOf(attchmentOrderKeyPattern, attachment.title)[0] ||
          "",
      }))
      .sort((a, b) => a.orderKey.localeCompare(b.orderKey))
      .map((attachment) => {
        delete attachment.orderKey;
        return attachment;
      });
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
      const nextSundayEnd = new Date(sundayEnd.getTime());
      nextSundayEnd.setDate(nextSundayEnd.getDate() + 7);
      return {
        sundayBefore,
        now: new Date(now.getTime()),
        monday: mondayStart,
        sunday: sundayEnd,
        nextSunday: nextSundayEnd
      };
    },

    schedule(events, week = this.weekOf()) {
      const eventOccurrences = events.reduce((acc, event) => {
        const eventId = event.eventId;
        if (!acc[eventId]) {
          acc[eventId] = [];
        }
        acc[eventId].push(event.id);
        return acc;
      }, {});

      const repeating = (event) => eventOccurrences[event.eventId].length > 1;
      const firstOccurrenceOf = (event) => eventOccurrences[event.eventId].indexOf(event.id) === 0;
      const important = (event) => event.tags.includes("important");
      const display = (event) => !event.tags.includes("hide");
      const planned = (event) => event.tags.includes("plan");

      events.reduce((acc, e) => {
        if (week.monday <= e.start && (firstOccurrenceOf(e) || !repeating(e))) {
          const disclose = { start: e.start.toFormat('yyyy-MM-dd hh:mm'), name: e.name, tags: e.tags };
          if (repeating(e)) {
            disclose.tags.push('repeating');
          }
          if (week.sunday < e.start) {
            disclose.tags.push('upcomming');
          }
          acc.push(disclose);
        }
        return acc;
      }, []).forEach((e) => console.log(e.start, e.name, `[${e.tags.join(', ')}]`));

      const sundayBeforeEvents = events.filter(
        (event) =>
          display(event) &&
          event.start > week.sundayBefore &&
          event.start < week.monday &&
          event.start > week.now
      );

      const weekEvents = events.filter(
        (event) =>
          display(event) &&
          repeating(event) &&
          event.start > week.monday &&
          event.start < week.sunday
      );

      const upcomingEvents = events.filter((event) =>
        display(event) &&
        !planned(event) &&
        event.start > week.sundayBefore && (
          !repeating(event) ||
          // (
          //   repeating(event) &&
          //   firstOccurrenceOf(event) &&
          //   week.sunday < event.start && event.start < week.nextSunday
          // ) ||
          important(event)
        )
      );

      const plannedEvents = events.filter((event) =>
        display(event) &&
        !repeating(event) &&
        week.sunday < event.start &&
        planned(event)
      );

      return {
        week,
        events: {
          sundayBefore: sundayBeforeEvents,
          week: weekEvents,
          upcoming: upcomingEvents,
          plan: plannedEvents,
        },
      };
    },
  };
})();
