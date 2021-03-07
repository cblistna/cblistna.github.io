const fixtures = {
  complete: {
      date: '2021-03-21',
      time: '22:00',
      speakers: ['Jakub Vrtaňa', 'Richard Sikora'],
      title: 'Silné kázání 123 ;,.!@$%&-+= (_#?:*"/|)',
      tags: ['#tag', '#tag2'],
      file: '2021-03-21T2200_Jakub Vrtaňa, Richard Sikora_Silné kázání 123 ;,.!@$%&-+= (#u#h#q#c#a#Q#s#p)_#tag #tag2.mp3',
      filetype: 'mp3'
    },
  minimal: {
      date: '2021-03-22',
      time: undefined,
      speakers: [],
      title: '',
      tags: [],
      file: '2021-03-22__',
      filetype: undefined
    }
}

describe('Message', () => {
  it('should parse complete message of file', () => {
    expect(Message.parse(fixtures.complete.file)).to.eql(fixtures.complete);
  });
  it('should parse minimal message of file', () => {
    expect(Message.parse(fixtures.minimal.file)).to.eql(fixtures.minimal);
  });
  it('should stringify complete message to file', () => {
    expect(Message.stringify(fixtures.complete)).to.equal(fixtures.complete.file);
  });
  it('should stringify minimal message to file', () => {
    expect(Message.stringify(fixtures.minimal)).to.equal(fixtures.minimal.file);
  });
});