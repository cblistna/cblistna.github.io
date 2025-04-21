# Calendar

## Features
- [ ] js only library with jsdoc comments for type hints
- [ ] zero dependencies (drop zod)
- [ ] should parse raw google calendar response
- [ ] resulting structure: 
```js
  eventId: z.string().min(5).max(1024),
  type: z.enum(["meeting", "news"]),
  start: z.coerce.date(),
  end: z.coerce.date(),
  duration: { days: z.number().min(0), hours: z.number().min(0) },
  subject: z.string(),
  body: z.string().default(""),
  attachments: z.array(z.object({
    fileId: z.string(),
    name: z.string().min(1),
    mime: z.string(),
    url: z.string().url(),
    ref: z.string().min(1),
  })),
  tags: z.map(z.enum(Tags), z.string().min(1).optional())
  // tags: "plan", "pin", "recur", "date", "hide", "svc", "news"
```
- [ ] parse raw google drive file response with file name in specific format to event structure, (multiple files with the same prefix, but different attachment name would merge into single event with multiple attachments)
```
2025-03-31[10:20]..2025-03-31[12:10]_Event name (body ...) #tag:value #tag2_Attachment name.jpg
  start: 2025-03-31T10:20
  end: 2025-03-31T12:10
  subject: Event name
  body: body...
  attachment: Attachment name.jpg
  tags: { tag: "value", tag2: true }
```
