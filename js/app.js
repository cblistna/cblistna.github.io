/*jshint esversion: 6 */

const DateTime = luxon.DateTime;
const today = DateTime.local().setLocale("cs");

function appendEvents(events, elementId) {
  if (events.length > 0) {
    const outlet = document.getElementById(elementId);
    const template = document.getElementById("evtTemplate");
    const nowPlus7Days = new Date(
      new Date().getTime() + 8 * 24 * 60 * 60 * 1000
    );
    let weekSeparatorRendered = false;
    events.forEach((event) => {
      if (event.tags.includes("hide")) {
        return;
      }
      if (!weekSeparatorRendered && event.start > nowPlus7Days) {
        outlet.appendChild(document.createElement("hr"));
        outlet.appendChild(document.createElement("br"));
        weekSeparatorRendered = true;
      }
      const node = document.importNode(template.content, true);
      const start = DateTime.fromJSDate(event.start).setLocale("cs");
      const date = dateOf(start).split(" ");
      node.querySelector(".evtDate").textContent = date[0];
      node.querySelector(".evtMonth").textContent = date[1];
      node.querySelector(".evtTime").textContent = timeOrBlankOf(start);
      node.querySelector(".evtWeekDay").textContent = weekDayOf(start);
      node.querySelector(".evtTitle").textContent = event.name;
      const eventDetail = node.querySelector(".evtDetail");
      if (event.description) {
        eventDetail.innerHTML = event.description;
      } else {
        eventDetail.parentNode.removeChild(eventDetail);
      }
      const eventLinks = node.querySelector(".evtLinks");
      if (event.attachments && event.attachments.length > 0) {
        event.attachments
          .map((attachment) => linkOf(attachment.name, attachment.url))
          .forEach((attachment, index) => {
            if (index > 0) {
              eventLinks.appendChild(document.createTextNode(" | "));
            }
            eventLinks.appendChild(attachment);
          });
      } else {
        eventLinks.parentNode.removeChild(eventLinks);
      }
      if (event.tags.includes("JFYI")) {
        node.querySelector(".calEvent").classList.add("text-gray-500");
      }
      outlet.appendChild(node);
    });
  }
}

function linkOf(title, url) {
  const a = document.createElement("a");
  a.appendChild(document.createTextNode(title));
  a.title = title;
  a.href = url;
  a.target = "_blank";
  return a;
}

function weekDayOf(date) {
  return date.toFormat("ccc");
}

function dateOf(date) {
  return today.year === date.year
    ? date.toFormat("d. LLL")
    : date.toFormat("d. LLL yyyy");
}

function timeOrBlankOf(date) {
  return date.hour === 0 && date.minute === 0 ? "" : date.toFormat("HH:mm");
}

function appendMessages(files, elementId) {
  const outlet = document.getElementById(elementId);
  const template = document.getElementById("msgTemplate");
  files.forEach((file) => {
    const meta = parseFile(file);
    if (!(meta.date.isValid && meta.title && meta.author)) {
      return;
    }
    const node = document.importNode(template.content, true);
    node.querySelector(".msgDate").textContent = dateOf(meta.date);
    // node.querySelector('.msgTitle').textContent = meta.title;
    node.querySelector(".msgAuthor").textContent = meta.author;

    const link = document.createElement("a");
    link.appendChild(document.createTextNode(meta.title));
    link.title = meta.title;
    link.href = file.webContentLink.substring(
      0,
      file.webContentLink.indexOf("&export=")
    );
    link.target = "_blank";
    node.querySelector(".msgTitle").appendChild(link);

    outlet.appendChild(node);
  });
}

function parseFile(file) {
  const meta = {
    file: file.name,
  };
  const parts = file.name.substring(0, file.name.length - 4).split(/_/, -1);
  meta.date = DateTime.fromISO(parts.shift()).setLocale("cs");
  meta.author = parts.shift();
  meta.title = parts.shift();
  meta.tags = [];
  parts.forEach((part) => {
    if (part.startsWith("#")) {
      meta.tags.push(part.substring(1));
    }
  });
  return meta;
}

ga.init()
  .then(() => {
    const now = new Date();
    const eventsBaseQuery = {
      timeMin: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 150,
    };

    const regularEventsQuery = Object.assign(
      {
        timeMax: new Date(
          now.getTime() + 200 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      eventsBaseQuery
    );

    ga.eventsOf("trinec.v@cb.cz", regularEventsQuery).then((googleEvents) => {
      const events = Events.dropRecurringNotImportant(
        googleEvents.items.map((event) => Events.parse(event))
      ).filter((event) => !(event.tags || []).includes("hide"));
      appendEvents(events, "regularEvents");
    });

    const messagesQuery = {
      orderBy: "name desc",
      pageSize: 7,
      q: "trashed=false and 'trinec.v@cb.cz' in owners and mimeType contains 'audio'",
      fields: "files(id, name, webViewLink, webContentLink)",
    };

    ga.files(messagesQuery).then((res) =>
      appendMessages(res.files, "messages-list")
    );
  })
  .catch(console.error);
