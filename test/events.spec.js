const expect = chai.expect;

describe("Google event", function() {
  function throwOnNoEvent(fn) {
    [undefined, null, "not and object", () => {}].forEach(event => {
      expect(() => fn(event)).to.throw("event not defined");
    });
  }

  describe("#parseSummary()", () => {
    it("should parse simple summary", () => {
      const event = Events.parseSummary({ summary: "Summary" });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse summary tags", () => {
      const event = Events.parseSummary({ summary: "Summary #tag1 #tag2" });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse summary comment", () => {
      const event = Events.parseSummary({ summary: "Summary // comment" });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.equal("comment");
    });

    it("should parse summary tags in comment", () => {
      const event = Events.parseSummary({
        summary: "Summary #tag1 // comment #tag2"
      });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.equal("comment");
    });

    it("should strip leading and trailing spaces from summary", () => {
      const event = Events.parseSummary({ summary: " Summary " });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should remove extra spaces from summary with tags", () => {
      const event = Events.parseSummary({
        summary: "Summary #tag1  cont  #tag2"
      });
      expect(event.name).to.equal("Summary cont");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.be.undefined;
    });

    it("should set default empty name from non existing summary", () => {
      const event = Events.parseSummary({});
      expect(event.name).to.equal("");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse comment only summary", () => {
      const event = Events.parseSummary({ summary: "// comment" });
      expect(event.name).to.equal("");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.equal("comment");
    });

    it("should throw on no event", () => {
      throwOnNoEvent(Events.parseSummary);
    });
  });

  describe("#parseDates()", () => {
    it("should parse dates", () => {
      const event = Events.parseDates({
        start: {
          dateTime: "2019-12-31T17:00:00+01:00",
          timeZone: "Europe/Prague"
        },
        end: {
          dateTime: "2019-12-31T21:00:00+01:00",
          timeZone: "Europe/Prague"
        }
      });
      expect(event.start.getTime()).to.equal(Date.parse("2019-12-31T16:00Z"));
      expect(event.end.getTime()).to.equal(Date.parse("2019-12-31T20:00Z"));
    });

    it("should parse dates of all day events", () => {
      const event = Events.parseDates({
        start: {
          date: "2019-12-30"
        },
        end: {
          date: "2019-12-31"
        }
      });
      expect(event.start.getTime()).to.equal(
        Date.parse("2019-12-29T23:00:00Z")
      );
      expect(event.end.getTime()).to.equal(Date.parse("2019-12-31T22:59:59Z"));
    });

    it("should throw on no event", () => {
      throwOnNoEvent(Events.parseDates);
    });
  });

  describe("#parseDescription()", () => {
    it("should parse description", () => {
      expect(Events.parseDescription({})).to.be.undefined;
      expect(
        Events.parseDescription({ description: "description" })
      ).to.be.equal("description");
      expect(
        Events.parseDescription({ description: " description\ncont\n" })
      ).to.be.equal("description\ncont");
    });

    it("should throw on no event", () => {
      throwOnNoEvent(Events.parseDescription);
    });
  });

  describe("#parseAttachments()", () => {
    it("should parse no attachments", () => {
      expect(Events.parseAttachments({})).to.eql([]);
    });

    it("should parse simple attachment", () => {
      expect(
        Events.parseAttachments({
          attachments: [
            {
              title: " title ",
              fileUrl: "url"
            }
          ]
        })
      ).to.eql([{ name: "title", url: "url" }]);
    });

    it("should parse attachment with file extension", () => {
      expect(
        Events.parseAttachments({
          attachments: [
            {
              title: "title.pdf",
              fileUrl: "url"
            }
          ]
        })
      ).to.eql([{ name: "title", url: "url" }]);
    });

    it("should throw on no event", () => {
      throwOnNoEvent(Events.parseAttachments);
    });
  });
});
