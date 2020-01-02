"use strict";

const events = (function() {
  return {
    parseName(event) {
      if (!event || typeof event !== "object") {
        throw new Error("event not defined");
      }
      let name = (event.summary && event.summary.trim()) || "";
      const tags = [];
      const tagPattern = / #([\w-]+)/g;
      let tagMatch;
      do {
        tagMatch = tagPattern.exec(name);
        if (tagMatch) {
          tags.push(tagMatch[1]);
        }
      } while (tagMatch);
      name = name.replace("  ", " ").trim();
      name = name.replace(tagPattern, "").trim();

      let comment;
      const commentPattern = /\/\/(.*)$/;
      const commentMatch = commentPattern.exec(name);
      if (commentMatch) {
        comment = commentMatch[1].trim();
        name = name.replace(commentPattern, "").trim();
      }
      return { name, tags, comment };
    }
  };
})();
