/*jshint esversion: 6 */

const DateTime = luxon.DateTime;
const today = DateTime.local().setLocale("cs");

function Event(event) {
  const start = DateTime.fromJSDate(event.start).setLocale("cs");
  const [day, month] = dateOf(start).split(" ");
  return `
    <div class="calEvent">
      <div class="evtDateCol">
        <p class="flex flex-row px-3 text-xl pb-2">
          <span class="w-12 pr-12 font-thin">${weekDayOf(start)}</span>
          <span class="w-6 text-right font-medium">${day}</span>
          <span class="w-12 pl-3 font-medium">${month}</span>
          <span class="w-16 text-right font-thin">${timeOrBlankOf(start)}</span>
          <span class="flex-grow w-24 text-justify pl-8 font-semibold"
          >${event.name}</span>
        </p>
        <div class="evtDescriptionCol text-blue-600">
          ${
            event.description
              ? `
            <div class="evtTitleDetail">
              <p class="flex flex-row flex-row items-center">
                <span class="w-16 ml-1"></span>
                <span class="w-16 ml-8"></span>
                <span
                  class="evtDetail font-weight-normal text-muted w-auto ml-16"
                >${event.description}</span>
              </p>
            </div>`
              : ""
          }
          ${
            event.attachments && event.attachments.length > 0
              ? `
            <div class="font-weight-normal">
              <p>
                <span class="w-16 ml-1"></span>
                <span class="w-16 ml-8"></span>
                <span class="evtLinks w-auto ml-48">
                ${event.attachments
                  .map(
                    (attachment) =>
                      `<a href="${attachment.url}" title="${attachment.name}" target="_blank">${attachment.name}</a>`
                  )
                  .join(" | ")}
                </span>
              </p>
            </div>
              `
              : ""
          }
        </div>
      </div>
    </div>
`;
}

function appendEvents(events) {
  const nowPlus7Days = new Date(new Date().getTime() + 8 * 24 * 60 * 60 * 1000);
  const { regular, upcoming, planned } = events.reduce(
    (acc, event) => {
      if (event.tags.includes("plan")) {
        acc.planned.push(event);
      } else if (event.start <= nowPlus7Days) {
        acc.regular.push(event);
      } else {
        acc.upcoming.push(event);
      }
      return acc;
    },
    { regular: [], upcoming: [], planned: [] }
  );
  if (regular.length > 0) {
    document.getElementById("regularEvents").innerHTML = `
      ${regular.map((event) => Event(event)).join("\n")}
    `;
  }
  if (upcoming.length > 0) {
    document.getElementById("upcomingEvents").innerHTML = `
      <hr class="my-6" />
      ${upcoming.map((event) => Event(event)).join("\n")}
    `;
  }
  if (planned.length > 0) {
    document.getElementById("plannedEvents").innerHTML = `
      <hr class="my-6" />
      <div class="text-gray-600">
        ${planned.map((event) => Event(event)).join("\n")}
      </div>
    `;
  }
}

const eventPattern =
  /(\d\d\d\d-\d\d-\d\d)( ?(\d\d\d\d-\d\d-\d\d))?_(.*)\.([a-zA-Z0-9]{2,4})$/;

function fileEventOf(file) {
  const match = eventPattern.exec(file.name);
  if (!match) return;
  const [_, from, __, to, name, ext] = match;
  if (ext === "url") return;
  const start = DateTime.fromJSDate(new Date(from)).setLocale("cs");
  const end = to
    ? DateTime.fromJSDate(new Date(to)).setLocale("cs")
    : undefined;
  return { start, end, name, ext, url: file.webViewLink };
}

function FileEvent(event) {
  const [day, month] = dateOf(event.start).split(" ");
  return `
    <div class="calEvent">
      <div class="evtDateCol">
        <p class="flex flex-row px-3 text-xl pb-2">
          <span class="w-12 pr-12 font-thin">${weekDayOf(event.start)}</span>
          <span class="w-6 text-right font-medium">${day}</span>
          <span class="w-12 pl-3 font-medium">${month}</span>
          <span class="w-16 text-right font-thin"></span>
          <span class="flex-grow w-24 text-justify pl-8 font-semibold text-blue-600"
          ><a href="${event.url}" target="_blank">${event.name}</a></span>
        </p>
      </div>
    </div>
`;
}

function appendOtherEvents(files) {
  if (files.length > 0) {
    const today = DateTime.fromJSDate(new Date()).setLocale("cs");
    document.getElementById("otherEvents").innerHTML = `
      <hr class="my-6" />
      ${files
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((file) => fileEventOf(file))
        .filter((event) => !!event)
        .filter((event) => today <= event.start)
        .map((event) => FileEvent(event))
        .join("\n")}
    `;
  }
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

function urlOf(file) {
  return file.webViewLink.substring(0, file.webViewLink.indexOf("?"));
}

function appendMessages(audioFiles, docs, elementId) {
  audioFiles.forEach((file) => {
    const meta = parseFile(file);
    meta.doc = docs[meta.file.replace(/\.mp3$/, ".pdf")];
    if (!(meta.date.isValid && meta.title && meta.author)) {
      return;
    }

    document.getElementById(elementId).innerHTML += `
      <div class="msgRow flex flex-col md:flex-row flex-wrap px-3 text-xl pb-2">
        <div class="w-32 mr-2 font-weight-normal">${dateOf(meta.date)}</div>
        <div class="msgTitle mr-2 font-semibold">
          <a href="${urlOf(file)}" title="${file.name}" target="_blank">
            ${meta.title}</a></div>
        <div
          class="msgAuthor font-weight-normal text-muted mr-3 font-light"
        >${meta.author}</div><span
          class="msgDoc font-light"
        >${
          meta.doc
            ? `<a href="${urlOf(meta.doc)}" title="${
                meta.doc.name
              }" target="_blank">(text)</a>`
            : ""
        }</span>
      </div>
    `;
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
          now.getTime() + 250 * 24 * 60 * 60 * 1000
        ).toISOString(),
      },
      eventsBaseQuery
    );

    ga.eventsOf("trinec.v@cb.cz", regularEventsQuery).then((googleEvents) => {
      const events = Events.dropRecurringNotImportant(
        googleEvents.items.map((event) => Events.parse(event))
      ).filter((event) => !(event.tags || []).includes("hide"));
      appendEvents(events);
    });

    const otherEventsQuery = {
      orderBy: "name desc",
      pageSize: 70,
      q: "trashed=false and parents in '166V_D3l4DwwOjrLeEhM12m69ZOvbcTc6' and mimeType != 'application/vnd.google-apps.folder'",
      fields: "files(id, name, webViewLink, webContentLink, mimeType)",
    };

    ga.files(otherEventsQuery).then((otherEvents) => {
      appendOtherEvents(otherEvents.files);
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

    Promise.all([
      ga.files(messagesAudioQuery),
      ga.files(messagesDocQuery),
    ]).then(([resAudio, resDoc]) => {
      const messageDocs = resDoc.files.reduce((docs, doc) => {
        docs[doc.name] = doc;
        return docs;
      }, {});
      appendMessages(resAudio.files, messageDocs, "messages-list");
    });
  })
  .catch(console.error);
