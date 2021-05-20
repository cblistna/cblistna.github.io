describe("Google event", function () {
  function throwOnNoEvent(fn) {
    [undefined, null, "not and object", () => {}].forEach((event) => {
      expect(() => fn(event)).to.throw("event not defined");
    });
  }

  const minimalGoogleEvent = {
    id: "1",
    start: { date: "2021-01-01" },
    end: { date: "2021-01-01" },
  };

  describe("#dropRecuuringNotImportant()", () => {
    it("should drop reccuring not important events", () => {
      const events = Events.dropRecurringNotImportant([
        { eventId: "1", name: "name1", tags: [] },
        { eventId: "2", name: "name2", tags: [] },
        { eventId: "1", name: "name12", tags: [] },
        { eventId: "1", name: "name13", tags: ["important"] },
      ]);
      expect(events.map((e) => e.name)).to.eql(["name1", "name2", "name13"]);
    });
  });

  describe("#parse()", () => {
    it("should parse google event", () => {
      const event = Events.parse({
        id: "event1_suffix",
        summary: "Summary #tag1 // comment #tag2",
        description: "Description",
        start: {
          dateTime: "2020-01-10T10:20:00+01:00",
          timeZone: "Europe/Prague",
        },
        end: {
          dateTime: "2020-01-10T12:20:00+01:00",
          timeZone: "Europe/Prague",
        },
        attachments: [
          {
            title: "Attachment",
            fileUrl: "https://seznam.cz/file",
          },
        ],
      });
      expect(event.id).to.equal("event1_suffix");
      expect(event.eventId).to.equal("event1");
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.equal("comment");
      expect(event.description).to.equal("Description");
      expect(event.start.getTime()).to.equal(Date.parse("2020-01-10T09:20Z"));
      expect(event.end.getTime()).to.equal(Date.parse("2020-01-10T11:20Z"));
      expect(event.attachments).to.eql([
        { name: "Attachment", url: "https://seznam.cz/file" },
      ]);
    });

    it("should throw on no event", () => {
      throwOnNoEvent(Events.parse);
    });
  });

  describe("parse id", () => {
    it("should parse event id", () => {
      const event = Events.parse({ ...minimalGoogleEvent, id: "id1" });
      expect(event.id).to.eql("id1");
      expect(event.eventId).to.eql("id1");
    });

    it("should parse recurring event id", () => {
      const event = Events.parse({ ...minimalGoogleEvent, id: "id2_suffix" });
      expect(event.id).to.eql("id2_suffix");
      expect(event.eventId).to.eql("id2");
    });
  });

  describe("parse summary", () => {
    it("should parse simple summary", () => {
      const event = Events.parse({ ...minimalGoogleEvent, summary: "Summary" });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse summary tags", () => {
      const event = Events.parse({
        ...minimalGoogleEvent,
        summary: "Summary #tag1 #tag2",
      });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse summary comment", () => {
      const event = Events.parse({
        ...minimalGoogleEvent,
        summary: "Summary // comment",
      });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.equal("comment");
    });

    it("should parse summary tags in comment", () => {
      const event = Events.parse({
        ...minimalGoogleEvent,
        summary: "Summary #tag1 // comment #tag2",
      });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.equal("comment");
    });

    it("should strip leading and trailing spaces from summary", () => {
      const event = Events.parse({
        ...minimalGoogleEvent,
        summary: " Summary ",
      });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should remove extra spaces from summary with tags", () => {
      const event = Events.parse({
        ...minimalGoogleEvent,
        summary: "Summary #tag1  cont  #tag2",
      });
      expect(event.name).to.equal("Summary cont");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.be.undefined;
    });

    it("should set default empty name from non existing summary", () => {
      const event = Events.parse({ ...minimalGoogleEvent });
      expect(event.name).to.equal("");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse comment only summary", () => {
      const event = Events.parse({
        ...minimalGoogleEvent,
        summary: "// comment",
      });
      expect(event.name).to.equal("");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.equal("comment");
    });

    it("should parse list of google events", () => {
      const events = Events.parse([
        {
          ...minimalGoogleEvent,
        },
      ]);
      expect(events.length).to.eq(1);
    });
  });

  describe("parse dates", () => {
    it("should parse dates", () => {
      const event = Events.parse({
        ...minimalGoogleEvent,
        start: {
          dateTime: "2019-12-31T17:00:00+01:00",
          timeZone: "Europe/Prague",
        },
        end: {
          dateTime: "2019-12-31T21:00:00+01:00",
          timeZone: "Europe/Prague",
        },
      });
      expect(event.start.getTime()).to.equal(Date.parse("2019-12-31T16:00Z"));
      expect(event.end.getTime()).to.equal(Date.parse("2019-12-31T20:00Z"));
    });

    it("should parse dates of all day events", () => {
      const event = Events.parse({
        ...minimalGoogleEvent,
        start: {
          date: "2019-12-30",
        },
        end: {
          date: "2019-12-31",
        },
      });
      expect(event.start.getTime()).to.equal(
        Date.parse("2019-12-29T23:00:00Z")
      );
      expect(event.end.getTime()).to.equal(Date.parse("2019-12-31T22:59:59Z"));
    });
  });

  describe("parse description", () => {
    it("should parse description", () => {
      expect(Events.parse({ ...minimalGoogleEvent }).description).to.be
        .undefined;
      expect(
        Events.parse({ ...minimalGoogleEvent, description: "description" })
          .description
      ).to.be.equal("description");
      expect(
        Events.parse({
          ...minimalGoogleEvent,
          description: " description\ncont\n",
        }).description
      ).to.be.equal("description\ncont");
    });
  });

  describe("parse attachments", () => {
    it("should parse no attachments", () => {
      expect(Events.parse({ ...minimalGoogleEvent }).attachments).to.eql([]);
    });

    it("should parse simple attachment", () => {
      expect(
        Events.parse({
          ...minimalGoogleEvent,
          attachments: [
            {
              title: " title ",
              fileUrl: "url",
            },
          ],
        }).attachments
      ).to.eql([{ name: "title", url: "url" }]);
    });

    it("should parse attachment with file extension", () => {
      expect(
        Events.parse({
          ...minimalGoogleEvent,
          attachments: [
            {
              title: "title.pdf",
              fileUrl: "url",
            },
          ],
        }).attachments
      ).to.eql([{ name: "title", url: "url" }]);
    });

    it("should parse attachments in order", () => {
      expect(
        Events.parse({
          ...minimalGoogleEvent,
          attachments: [
            {
              title: "a-title #2",
              fileUrl: "url",
            },
            {
              title: "b-title #1",
              fileUrl: "url",
            },
          ],
        }).attachments
      ).to.eql([
        { name: "b-title", url: "url" },
        { name: "a-title", url: "url" },
      ]);
    });
  });
  describe("#weekOf()", () => {
    it("should return week on Sunday", () => {
      const now = new Date("2021-05-16T09:00:00");
      const monday = new Date("2021-05-17T00:00:00");
      const sunday = new Date("2021-05-23T23:59:59");
      const week = Events.weekOf(now); // Sunday
      expect(week.sundayBefore.toISOString()).to.eq(
        new Date("2021-05-16T00:00:00").toISOString()
      );
      expect(week.now.toISOString()).to.eq(now.toISOString());
      expect(week.monday.toISOString()).to.eq(monday.toISOString());
      expect(week.sunday.toISOString()).to.eq(sunday.toISOString());
    });
    it("should return week on Monday", () => {
      const now = new Date("2021-05-17T00:00:00");
      const monday = new Date("2021-05-17T00:00:00");
      const sunday = new Date("2021-05-23T23:59:59");
      const week = Events.weekOf(now); // Monday
      expect(week.sundayBefore.toISOString()).to.eq(
        new Date("2021-05-16T00:00:00").toISOString()
      );
      expect(week.now.toISOString()).to.eq(now.toISOString());
      expect(week.monday.toISOString()).to.eq(monday.toISOString());
      expect(week.sunday.toISOString()).to.eq(sunday.toISOString());
    });
    it("should return week on Saturay", () => {
      const now = new Date("2021-05-22T23:59:59");
      const monday = new Date("2021-05-17T00:00:00");
      const sunday = new Date("2021-05-23T23:59:59");
      const week = Events.weekOf(now); // Saturday
      expect(week.sundayBefore.toISOString()).to.eq(
        new Date("2021-05-16T00:00:00").toISOString()
      );
      expect(week.now.toISOString()).to.eq(now.toISOString());
      expect(week.monday.toISOString()).to.eq(monday.toISOString());
      expect(week.sunday.toISOString()).to.eq(sunday.toISOString());
    });
  });

  describe("#shedule()", () => {
    function eventNames(events) {
      return events.map((event) => event.name);
    }

    const week = Events.weekOf(new Date("2021-05-16T10:00:00")); // Sunday at 10:00

    const events = Events.parse([
      {
        id: "1",
        summary: "Sunday before 10:00",
        start: { dateTime: "2021-05-16T09:59:59" },
        end: { dateTime: "2021-05-16T11:00:00" },
      },
      {
        id: "2",
        summary: "Sunday evening",
        start: { dateTime: "2021-05-16T19:00:00" },
        end: { dateTime: "2021-05-16T21:00:00" },
      },
      {
        id: "3",
        summary: "Monday afternoon",
        start: { dateTime: "2021-05-17T16:00:00" },
        end: { dateTime: "2021-05-17T18:00:00" },
      },
      {
        id: "4",
        summary: "Next sunday morning // 1",
        start: { dateTime: "2021-05-23T09:30:00" },
        end: { dateTime: "2021-05-23T11:30:00" },
      },
      {
        id: "5",
        summary: "Upcoming 1",
        start: { dateTime: "2021-05-24T00:00:00" },
        end: { dateTime: "2021-05-24T08:00:00" },
      },
      {
        id: "6_a",
        summary: "Upcoming 2a #highlight",
        start: { dateTime: "2021-05-30T09:00:00" },
        end: { dateTime: "2021-05-30T10:00:00" },
      },
      {
        id: "6_b",
        summary: "Upcoming 2b #highlight",
        start: { dateTime: "2021-05-30T09:00:00" },
        end: { dateTime: "2021-05-30T10:00:00" },
      },
      {
        id: "4_a",
        summary: "Next sunday morning // 2",
        start: { dateTime: "2021-05-30T09:30:00" },
        end: { dateTime: "2021-05-30T11:30:00" },
      },
      {
        id: "7",
        summary: "Upcoming 3 top // #top",
        start: { dateTime: "2021-06-14T00:00:00" },
        end: { dateTime: "2021-06-14T08:00:00" },
      },
      {
        id: "4_b",
        summary: "Next sunday morning // 3 #important",
        start: { dateTime: "2021-06-20T09:30:00" },
        end: { dateTime: "2021-06-20T11:30:00" },
      },
    ]);

    const schedule = Events.schedule(events, week);

    it("should contain week", () => {
      expect(schedule.week).to.eql(week);
    });

    it("should schedule today's events", () => {
      expect(eventNames(schedule.events.sundayBefore)).to.eql([
        "Sunday evening",
      ]);
    });
    it("should schedule week events", () => {
      expect(eventNames(schedule.events.week)).to.eql([
        "Monday afternoon",
        "Next sunday morning",
      ]);
    });
    it("should schedule upcoming events", () => {
      expect(eventNames(schedule.events.upcoming)).to.eql([
        "Upcoming 1",
        "Upcoming 2a",
        "Upcoming 3 top",
        "Next sunday morning",
      ]);
    });
    it("should schedule top events", () => {
      expect(eventNames(schedule.events.top)).to.eql(["Upcoming 3 top"]);
    });
    it("should schedule highlight events", () => {
      expect(eventNames(schedule.events.highlight)).to.eql(["Upcoming 2a"]);
    });
  });
});
