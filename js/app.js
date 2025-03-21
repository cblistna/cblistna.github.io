/*jshint esversion: 6 */

const DateTime = luxon.DateTime;
const today = DateTime.local().setLocale("cs");

function appendEvents(events, elementId) {
  if (events.length > 0) {
    const outlet = document.getElementById(elementId);
    const template = document.getElementById("evtTemplate");
    const nowPlus7Days = new Date(
      new Date().getTime() + 8 * 24 * 60 * 60 * 1000,
    );
    let weekSeparatorRendered = false;
    events.forEach((event) => {
      if (
        event.tags.includes("hide") || event.tags.includes("plan") ||
        (event.eventId !== event.id && event.start > nowPlus7Days)
      ) {
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
    const plannedEvents = events.filter((e) =>
      e.tags.includes("plan") && !e.tags.includes("hide")
    );
    if (plannedEvents.length > 0) {
      const outlet = document.getElementById("plannedEvents");
      const template = document.getElementById("evtTemplate");
      outlet.appendChild(document.createElement("hr"));
      outlet.appendChild(document.createElement("br"));
      plannedEvents.forEach((event) => {
        console.log(event.name, event.description);
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
}

function appedOtherEvents(files, elementId) {
  const eventPattern =
    /(\d\d\d\d-\d\d-\d\d)( ?(\d\d\d\d-\d\d-\d\d))?_(.*)\.([a-zA-Z0-9]{2,4})$/;
  if (files.length > 0) {
    const outlet = document.getElementById(elementId);
    const template = document.getElementById("evtOtherTemplate");
    outlet.appendChild(document.createElement("hr"));
    outlet.appendChild(document.createElement("br"));
    files.forEach((file) => {
      const [_, from, __, to, title, ext] = eventPattern.exec(file.name);
      const start = DateTime.fromJSDate(new Date(from)).setLocale("cs");
      const node = document.importNode(template.content, true);
      const event = node.querySelector(".otherEvent");
      event.appendChild(
        linkOf(
          `${weekDayOf(start)} ${dateOf(start)} ${title}`,
          file.webViewLink,
        ),
      );
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

function appendMessages(audioFiles, docs, elementId) {
  const outlet = document.getElementById(elementId);
  const template = document.getElementById("msgTemplate");
  audioFiles.forEach((file) => {
    const meta = parseFile(file);
    meta.doc = docs[meta.file.replace(/\.mp3$/, ".pdf")];
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
    link.href = file.webViewLink.substring(
      0,
      file.webViewLink.indexOf("?"),
    );
    link.target = "_blank";
    node.querySelector(".msgTitle").appendChild(link);

    if (meta.doc) {
      const link = document.createElement("a");
      link.appendChild(document.createTextNode("(text)"));
      link.title = meta.doc.name;
      link.href = meta.doc.webViewLink.substring(
        0,
        file.webViewLink.indexOf("?"),
      );
      link.target = "_blank";
      node.querySelector(".msgDoc").appendChild(link);
    }

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
          now.getTime() + 200 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      eventsBaseQuery,
    );

    ga.eventsOf("trinec.v@cb.cz", regularEventsQuery).then((googleEvents) => {
      const events = Events.dropRecurringNotImportant(
        googleEvents.items.map((event) => Events.parse(event)),
      ).filter((event) => !(event.tags || []).includes("hide"));
      appendEvents(events, "regularEvents");
    });

    const otherEventsQuery = {
      orderBy: "name desc",
      pageSize: 70,
      q: "trashed=false and parents in '166V_D3l4DwwOjrLeEhM12m69ZOvbcTc6' and mimeType != 'application/vnd.google-apps.folder'",
      fields: "files(id, name, webViewLink, webContentLink, mimeType)",
    };

    ga.files(otherEventsQuery).then((otherEvents) => {
      appedOtherEvents(otherEvents.files, "otherEvents");
    });

    const messagesAudioQuery = {
      orderBy: "name desc",
      pageSize: 7,
      q: "trashed=false and 'trinec.v@cb.cz' in owners and mimeType contains 'audio' and parents in '1uGEf-9qQ5jEcfpiYOwnefewT4XGXEwa4'",
      fields: "files(id, name, webViewLink, webContentLink)",
    };

    const messagesDocQuery = {
      orderBy: "name desc",
      pageSize: 7,
      q: "trashed=false and 'trinec.v@cb.cz' in owners and mimeType = 'application/pdf' and parents in '1uGEf-9qQ5jEcfpiYOwnefewT4XGXEwa4'",
      fields: "files(id, name, webViewLink, webContentLink)",
    };

    Promise.all([ga.files(messagesAudioQuery), ga.files(messagesDocQuery)])
      .then(
        ([resAudio, resDoc]) => {
          const messageDocs = resDoc.files.reduce((docs, doc) => {
            docs[doc.name] = doc;
            return docs;
          }, {});
          appendMessages(resAudio.files, messageDocs, "messages-list");
        },
      );
  })
  .catch(console.error);
