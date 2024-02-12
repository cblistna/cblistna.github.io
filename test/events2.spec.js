
function dateOf(date) {
  return new Date(date).toISOString().substring(0, 10);
}

function regular(event) {
  return event.tags.some((tag) => tag.startsWith("regular-"));
}

function important(event) {
  return event.tags.some((tag) => tag === "important");
}

function addDaysTo(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function groupForPresentation(date, events) {
  const start = new Date(date);
  const weekEnd = addDaysTo(start, 6);
  const upcomingEnd = addDaysTo(start, 90);
  return events
    .filter((event) => 
      dateOf(start) <= dateOf(event.start) && (
          (
            !regular(event) && (
              dateOf(event.start) <= dateOf(upcomingEnd) ||
              important(event)
            )
          ) || (
            regular(event) &&
              dateOf(event.start) <= dateOf(weekEnd)
          )
        )
    )
    .map((event) => ({ ...event, slide: (
         regular(event) ?
           "regular" :
           (dateOf(upcomingEnd) < dateOf(event.start) ?
             "plan" :
             "upcoming"
           )
        )
      })
    )
    .sort((a, b) => {
      return a.slide === b.slide ?
         a.start.localeCompare(b.start) :
         (a.slide === "regular" ?
           -1 : 1
         );
    });
}

describe("Event presentation", function () {
  describe("#groupEvents()", () => {
    it("should group events", () => {
      const events = groupForPresentation("2024-02-05", [
        { eventId: "5", name: "e5", start: "2024-01-06", tags: ["important"]},
        { eventId: "10", name: "r10", start: "2024-02-05", tags: ["regular-r10"]},
        { eventId: "20", name: "e20", start: "2024-02-06", tags: []},
        { eventId: "30", name: "r30", start: "2024-02-07", tags: ["regular-r30"]},
        { eventId: "40", name: "r10", start: "2024-02-13", tags: ["regular-r10"]},
        { eventId: "50", name: "e50", start: "2024-02-14", tags: []},
        { eventId: "55", name: "r55", start: "2024-02-15", tags: ["regular-r55"]},
        { eventId: "60", name: "r30", start: "2024-02-16", tags: ["regular-r30"]},
        { eventId: "70", name: "e70", start: "2024-12-03", tags: ["important"]},
        { eventId: "80", name: "e80", start: "2024-12-04", tags: []},
      ]);
      expect(events.map((e) => e.name).join(",")).to.eql("r10,r30,e20,e50,e70");
      expect(events.map((e) => e.slide).join(",")).to.eql("regular,regular,upcoming,upcoming,plan");
    });
  });
});
