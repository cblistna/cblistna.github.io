const expect = chai.expect;

describe("Google event", function() {
  describe("#parseSummary()", () => {
    it("should parse simple summary", () => {
      const event = events.parseSummary({ summary: "Summary" });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse summary tags", () => {
      const event = events.parseSummary({ summary: "Summary #tag1 #tag2" });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse summary comment", () => {
      const event = events.parseSummary({ summary: "Summary // comment" });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.equal("comment");
    });

    it("should parse summary tags in comment", () => {
      const event = events.parseSummary({
        summary: "Summary #tag1 // comment #tag2"
      });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.equal("comment");
    });

    it("should strip leading and trailing spaces from summary", () => {
      const event = events.parseSummary({ summary: " Summary " });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should remove extra spaces from summary with tags", () => {
      const event = events.parseSummary({ summary: "Summary #tag1  cont  #tag2" });
      expect(event.name).to.equal("Summary cont");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.be.undefined;
    });

    it("should set default empty name from non existing summary", () => {
      const event = events.parseSummary({});
      expect(event.name).to.equal("");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse comment only summary", () => {
      const event = events.parseSummary({ summary: "// comment" });
      expect(event.name).to.equal("");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.equal("comment");
    });

    it("should throw on no event", () => {
      expect(() => events.parseSummary()).to.throw("event not defined");
      expect(() => events.parseSummary(null)).to.throw("event not defined");
      expect(() => events.parseSummary(undefined)).to.throw("event not defined");
      expect(() => events.parseSummary("not an object")).to.throw(
        "event not defined"
      );
      expect(() => events.parseSummary(() => {})).to.throw("event not defined");
    });
  });

  describe("#parseDates()", () => {
    it("should parse dates", () => {
      const event = events.parseDates({
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
      const event = events.parseDates({
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
      expect(() => events.parseDates()).to.throw("event not defined");
      expect(() => events.parseDates(null)).to.throw("event not defined");
      expect(() => events.parseDates(undefined)).to.throw("event not defined");
      expect(() => events.parseDates("not an object")).to.throw(
        "event not defined"
      );
      expect(() => events.parseDates(() => {})).to.throw("event not defined");
    });
  });

  describe("#parseDescription()", () => {
    it("should parse description", () => {
      expect(events.parseDescription({})).to.be.true;
    });

    it("should throw on no event", () => {
      expect(() => events.parseDescription()).to.throw("event not defined");
      expect(() => events.parseDescription(null)).to.throw("event not defined");
      expect(() => events.parseDescription(undefined)).to.throw("event not defined");
      expect(() => events.parseDescription("not an object")).to.throw(
        "event not defined"
      );
      expect(() => events.parseDates(() => {})).to.throw("event not defined");
    });
  });

  describe("#parseAttachments()", () => {
    it("should parse attachments", () => {
      expect(events.parseDescription({})).to.be.true;
    });

    it("should throw on no event", () => {
      expect(() => events.parseAttachments()).to.throw("event not defined");
      expect(() => events.parseAttachments(null)).to.throw("event not defined");
      expect(() => events.parseAttachments(undefined)).to.throw("event not defined");
      expect(() => events.parseAttachments("not an object")).to.throw(
        "event not defined"
      );
      expect(() => events.parseAttachments(() => {})).to.throw("event not defined");
    });
  });
});
