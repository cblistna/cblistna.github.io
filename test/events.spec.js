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
        { eventId: "1", name: "name1" },
        { eventId: "2", name: "name2" },
        { eventId: "1", name: "name12" },
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
      expect(event.eventId).to.eql("id1");
    });

    it("should parse recurring event id", () => {
      const event = Events.parse({ ...minimalGoogleEvent, id: "id2_suffix" });
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
  });
  describe("#thisWeek()", () => {
    it("should return week on Sunday", () => {
      const now = new Date("2021-05-16T00:00:00");
      const monday = new Date("2021-05-17T00:00:00");
      const sunday = new Date("2021-05-23T23:59:59");
      const week = Events.thisWeek(now); // Sunday
      console.log(week);
      expect(week.now.toISOString()).to.eq(now.toISOString());
      expect(week.monday.toISOString()).to.eq(monday.toISOString());
      expect(week.sunday.toISOString()).to.eq(sunday.toISOString());
    });
    it("should return week on Monday", () => {
      const now = new Date("2021-05-17T00:00:00");
      const monday = new Date("2021-05-17T00:00:00");
      const sunday = new Date("2021-05-23T23:59:59");
      const week = Events.thisWeek(now); // Monday
      console.log(week);
      expect(week.now.toISOString()).to.eq(now.toISOString());
      expect(week.monday.toISOString()).to.eq(monday.toISOString());
      expect(week.sunday.toISOString()).to.eq(sunday.toISOString());
    });
    it("should return week on Saturay", () => {
      const now = new Date("2021-05-22T23:59:59");
      const monday = new Date("2021-05-17T00:00:00");
      const sunday = new Date("2021-05-23T23:59:59");
      const week = Events.thisWeek(now); // Saturday
      console.log(week);
      expect(week.now.toISOString()).to.eq(now.toISOString());
      expect(week.monday.toISOString()).to.eq(monday.toISOString());
      expect(week.sunday.toISOString()).to.eq(sunday.toISOString());
    });
  });
});
