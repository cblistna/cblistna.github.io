/*jshint esversion: 6 */

const DateTime = luxon.DateTime;
const today = DateTime.local().setLocale("cs");
let messagesMonthly = new Map();

function dateOf(date) {
  return today.year === date.year
    ? date.toFormat("d. LLL")
    : date.toFormat("d. LLL yyyy");
}

function createYearTabs(years) {
  const dropdown = document.querySelector(".dropdown-content");

  for (let year of years) {
    const listItem = document.createElement("li");
    listItem.classList.add(
      "border-b",
      "border-brown-dark",
      "pt-2",
      "pb-2",
      "md:w-32",
      "bg-yellow-900"
    );
    listItem.setAttribute("id", year);

    listItem.addEventListener("click", () => {
      fetchArchiveMessages(ga, year);
      appendYearTitle(year);
    });

    const link = document.createElement("a");
    link.classList.add("block", "text-white", "no-underline");
    link.innerText = year;
    listItem.appendChild(link);
    dropdown.appendChild(listItem);
  }
}

function createMessageLink(message) {
  const link = document.createElement("a");
  link.appendChild(document.createTextNode(message.title));
  link.title = message.title;
  link.href = message.link.substring(0, message.link.indexOf("?"));
  link.target = "_blank";
  link.classList.add("no-underline");

  return link;
}

function appendMessages(elementId) {
  const outlet = document.getElementById(elementId);
  while (outlet.hasChildNodes()) {
    outlet.removeChild(outlet.lastChild);
  }
  const msgTemplate = document.getElementById("msgTemplate");
  const msgMonthlyTemplate = document.getElementById("msgMonthly");
  let sortedMonthyMessages = new Map(
    [...messagesMonthly.entries()].sort().reverse()
  );

  for (let [key, value] of sortedMonthyMessages) {
    let msgMonthNode = document.importNode(msgMonthlyTemplate.content, true);
    const msgList = msgMonthNode.querySelector(".msgList");
    let formatedMonth = new Date(key).toLocaleString("cs", { month: "long" });
    msgMonthNode.querySelector(".msgMonthTitle").textContent =
      formatedMonth.charAt(0).toUpperCase() + formatedMonth.slice(1);

    value.map((message) => {
      let msgNode = document.importNode(msgTemplate.content, true);
      msgNode.querySelector(".msgDate").textContent = dateOf(message.date);
      msgNode.querySelector(".msgAuthor").textContent = message.author;

      const link = createMessageLink(message);
      msgNode.querySelector(".msgTitle").appendChild(link);
      msgList.appendChild(msgNode);
    });

    outlet.appendChild(msgMonthNode);
  }
  cleanMap();
}

function cleanMap() {
  sortedMonthyMessages = new Map();
  messagesMonthly = new Map();
}

function parseFile(file) {
  const meta = {
    file: file.name,
    link: file.webViewLink,
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

function fetchArchiveMessages(ga, messagesYear = new Date().getFullYear()) {
  ga.init()
    .then(() => {
      let messagesQuery = {
        orderBy: "name asc",
        pageSize: 100,
        q: `mimeType contains 'audio' and name contains '${messagesYear}' and trashed=false and 'trinec.v@cb.cz' in owners`,
        fields: "files(id, name, webViewLink, webContentLink)",
      };

      ga.files(messagesQuery)
        .then((res) => {
          assortMessagesByMonth(res.files);
        })
        .then(() => {
          appendMessages("msgContainer");
        });
    })
    .catch(console.error);
}

function appendYearTitle(title = 2019) {
  const archiveHeader = document.querySelector("#archive-title");
  archiveHeader.textContent = `Rok ${title}`;
}

function assortMessagesByMonth(messages) {
  const unsortedMessages = Array.from(messages.reverse());
  let months = [];
  let parsedMessages = unsortedMessages.map((message) => {
    let parsedMessage = parseFile(message);

    let month = parsedMessage.date.toFormat("MM");
    if (!months.includes(month)) {
      months.push(month);
    }
    return parsedMessage;
  });

  for (let sortedMonth of months) {
    let sortedMessages = parsedMessages.filter(
      (message) => message.date.toFormat("MM") === sortedMonth
    );
    messagesMonthly.set(sortedMonth, sortedMessages);
  }
}

(function () {
  const menu = document.querySelector(".dropdown");
  const menuContent = document.querySelector(".dropdown-content");
  menu.addEventListener("click", () => {
    if (menuContent.classList.contains("hidden")) {
      menuContent.classList.remove("hidden");
    } else {
      menuContent.classList.add("hidden");
    }
  });
})();

function getMessagesYears() {
  const initalYear = 2006;
  const currentYear = today.year;
  let yearsCount = 0;

  let messageYears = [...new Array(currentYear - initalYear)].map(() => {
    yearsCount++;
    let year = initalYear + yearsCount;
    return year;
  });
  return messageYears;
}

(function () {
  const messagesYears = getMessagesYears();
  createYearTabs(messagesYears.reverse());
})();

(function () {
  const thisYear = new Date().getFullYear();
  fetchArchiveMessages(ga, thisYear);
  appendYearTitle(thisYear);
})();
