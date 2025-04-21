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
  duration: z.object({ days: z.number().min(0), hours: z.number().min(0) }),
  subject: z.string(),
  body: z.string().default(""),
  attachments: z.array(z.object({
    fileId: z.string(),
    name: z.string().min(1),
    mime: z.string(),
    url: z.string().url(),
    ref: z.string().min(1),
  })),
  tags: z.record(z.string(), z.union([z.string().min(1), z.boolean()]))
  // tags: "plan", "pin", "recur", "date", "hide", "svc", "news", ...
```
