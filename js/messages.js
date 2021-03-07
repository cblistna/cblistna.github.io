"use strict";
const pattern = /^(?<date>\d{4}-\d\d-\d\d)(?:T(?<time>\d\d\d\d))*_(?<speakers>[\p{L} ,]*)_(?<title>[\p{L}\d ;,.!@#$%&()+=-]*?)(?:_(?<tags>(?:#[a-zA-Z][a-zA-Z0-9]* ?)+))*(?:\.(?<filetype>[\w]+))?$/u;

function decode(text) {
  if (!text) {
    return undefined;
  }
  return text
    .replaceAll('#h', '#')
    .replaceAll('#u', '_')
    .replaceAll('#q', '?')
    .replaceAll('#c', ':')
    .replaceAll('#a', '*')
    .replaceAll('#Q', '"')
    .replaceAll('#s', '/')
    .replaceAll('#p', '|');
}

function encode(text) {
  if (text === undefined || text === null) {
    return undefined;
  }
  return text
    .replaceAll('#', '#h')
    .replaceAll('_', '#u')
    .replaceAll('?', '#q')
    .replaceAll(':', '#c')
    .replaceAll('*', '#a')
    .replaceAll('"', '#Q')
    .replaceAll('/', '#s')
    .replaceAll('|', '#p');
}

const Message = (function () {
  return {
    parse(file) {
      const match = pattern.exec(file);
      if (!match) {
        return undefined;
      }
      const { date, time, speakers, title, tags, filetype } = match.groups;
      return {
        date,
        time: time ? [time.slice(0, 2), ':', time.slice(2)].join('') : undefined,
        speakers: speakers ? speakers.split(/, ?/) : [],
        title: decode(title) || '',
        tags: tags ? tags.split(' ') : [],
        file,
        filetype
      };
    },

    stringify(message) {
      return message != undefined && message !== null ?
          `${message.date}${message.time ? 'T' + message.time.replace(':', '') : ''}`
          + `_${message.speakers.join(', ')}`
          + `_${encode(message.title)}`
          + `${message.tags.length ? '_' + message.tags.join(' ') : ''}`
          + `${message.filetype ? '.' + message.filetype : ''}`
        : undefined;
    }

  }
})();