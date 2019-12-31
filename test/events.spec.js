const expect = chai.expect;

describe("Google event", function() {
  describe("#parseName()", () => {
    it("should parse simple summary", () => {
      const event = events.parseName({ summary: "Summary" });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse summary tags", () => {
      const event = events.parseName({ summary: "Summary #tag1 #tag2" });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse summary comment", () => {
      const event = events.parseName({ summary: "Summary // comment" });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.equal("comment")
    });

    it("should parse summary tags in comment", () => {
      const event = events.parseName({ summary: "Summary #tag1 // comment #tag2" });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql(["tag1", "tag2"]);
      expect(event.comment).to.equal("comment")
    });

    it("should strip leading and trailing spaces from summary", () => {
      const event = events.parseName({ summary: "  Summary  " });
      expect(event.name).to.equal("Summary");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should set default empty name from non existing summary", () => {
      const event = events.parseName({});
      expect(event.name).to.equal("");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.be.undefined;
    });

    it("should parse comment only summary", () => {
      const event = events.parseName({ summary: "// comment"});
      expect(event.name).to.equal("");
      expect(event.tags).to.eql([]);
      expect(event.comment).to.equal("comment");
    });

    it("should throw on no event", () => {
      expect(() => events.parseName()).to.throw("event not defined");
      expect(() => events.parseName(null)).to.throw("event not defined");
      expect(() => events.parseName(undefined)).to.throw("event not defined");
      expect(() => events.parseName('not an object')).to.throw("event not defined");
      expect(() => events.parseName(() => {})).to.throw("event not defined");
    });
  });
});
