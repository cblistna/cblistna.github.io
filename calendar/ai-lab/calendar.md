# Calendar

## Features
- [ ] js only library with jsdoc type comments
- [ ] zero dependencies (drop zod)
- [ ] should parse raw google calendar response
- [ ] resulting structure: 
```js
{
  eventId: z.string().min(5).max(1024), // from event id, without "_*$" recurring suffix
  recurring: z.boolean(), // is it recurring id, based on recurringEventId presence
  start: z.string(), // "yyyy-MM-dd hh:mm" | "yyyy-MM-dd"
  end: z.string(), // "yyyy-MM-dd hh:mm" | "yyyy-MM-dd"
  duration: z.object({ days: z.number().min(0), hours: z.number().min(0), minutes: z.number().min(0) }),
  subject: z.string().min(1), // value should be trimmed
  body: z.string().default(""), // value should be trimmed
  attachments: z.array(z.object({
    fileId: z.string().min(1),
    name: z.string().min(1),
    mime: z.string().min(1),
    url: z.string().url(),
    ref: z.string().min(1),
  })),
  tags: z.record(z.string(), z.union([z.string().min(1), z.boolean()]))
  // tags are encoded in event summary in form: #tag:value, both tag and value are string
  // tag value is optional, if value not present or is empty string then tag value would be boolean true
  // tags: "plan", "pin", "recur", "date", "hide", "svc", "news", ...
  // on multiple tags in the same summary usa the last value
  // duration calculation, when start or end misses time values, assume 00:00 time for start and 23:59 for end time
}
```
