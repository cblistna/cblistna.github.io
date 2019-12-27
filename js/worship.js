/*jshint esversion: 6 */

const DateTime = luxon.DateTime;
const today = DateTime.local().setLocale('cs');
const shiftSequence = ['R1', 'R2', 'O1', 'O2', 'N1', 'N2', 'V1', 'V2'];
const shiftsBase = {
  date: DateTime.fromISO('2018-01-01')
    .startOf('day')
    .setLocale('cs'),
  shifts: {
    A: 5,
    B: 7,
    C: 1,
    D: 3
  }
};

function appendEvents(events, elementId) {
  if (events.items.length > 0) {
    const outlet = document.getElementById(elementId);
    const template = document.getElementById('evtTemplate');
    const eventHide = /\[.*\]/;
    events.items.forEach(event => {
      const node = document.importNode(template.content, true);
      const title = event.summary.replace(eventHide, '');
      const start = eventDate(event.start);
      if (start < today) {
        node.querySelector('.calEvent').classList.add('pastEvent');
      }
      node.querySelector('.evtDate').textContent = dateOf(start);
      node.querySelector('.evtTime').textContent = timeOrBlankOf(start);
      node.querySelector('.evtWeekDay').textContent = weekDayOf(start);
      node.querySelector('.evtTitle').textContent = title;
      const eventDetail = node.querySelector('.evtDetail');
      if (event.description) {
        eventDetail.innerHTML = event.description;
      } else {
        eventDetail.parentNode.removeChild(eventDetail);
      }
      const shifts = shiftsFor(start);
      node.querySelector('.evtNote').textContent = `(týden: ${
        start.weekNumber
      }, směny: C-${shifts.C}, D-${shifts.D})`;
      const eventLinks = node.querySelector('.evtLinks');
      if (event.attachments && event.attachments.length > 0) {
        const attachments = [];
        event.attachments.forEach(attachment => {
          const title = attachment.title.substring(
            0,
            attachment.title.length - 4
          );
          const link = linkOf(title, attachment.fileUrl);
          attachments.push(link);
        });
        attachments.forEach((attachment, index) => {
          if (index > 0) {
            eventLinks.appendChild(document.createTextNode(' | '));
          }
          eventLinks.appendChild(attachment);
        });
      } else {
        eventLinks.parentNode.removeChild(eventLinks);
      }
      outlet.appendChild(node);
    });
  }
}

function shiftsFor(date) {
  const offset = Math.round(
    date
      .startOf('day')
      .diff(shiftsBase.date)
      .as('days')
  );
  const shifts = {};
  Object.keys(shiftsBase.shifts).forEach(shift => {
    shifts[shift] = shiftSequence[(shiftsBase.shifts[shift] + offset) % 8];
  });
  return shifts;
}

function linkOf(title, url) {
  const a = document.createElement('a');
  a.appendChild(document.createTextNode(title));
  a.title = title;
  a.href = url;
  a.target = '_blank';
  return a;
}

function eventDate(date) {
  return DateTime.fromISO(date.dateTime ? date.dateTime : date.date).setLocale(
    'cs'
  );
}

function weekDayOf(date) {
  return date.toFormat('ccc');
}

function dateOf(date) {
  return today.year === date.year
    ? date.toFormat('d. LLL')
    : date.toFormat('d. LLL yyyy');
}

function timeOrBlankOf(date) {
  return date.hour === 0 && date.minute === 0 ? '' : date.toFormat('HH:mm');
}

const todaySpan = document.getElementById('today-date');
todaySpan.textContent = today.toFormat('d. LLLL yyyy');

const ga = new GoogleAccess(
  'cblistna',
  '122939969451-nm6pc9104kg6m7avh3pq8sn735ha9jja.apps.googleusercontent.com',
  'iFas6FSxexJ0ztqx6QfUH8kK',
  '1/4tbmdLZ3tItmdMx1zIoc9ZdlBZ8E854-t1whajGynYw'
);

ga
  .init()
  .then(() => {
    const eventsBaseQuery = {
      timeMin: today.minus({weeks: 4}).toISO(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 12
    };

    ga
      .eventsOf(
        'm1b2v3tb387ace2jjub70mq6vo@group.calendar.google.com',
        eventsBaseQuery
      )
      .then(events => appendEvents(events, 'worshipEvents'));
  })
  .catch(console.error);
