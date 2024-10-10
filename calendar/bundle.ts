import { bundle } from "jsr:@deno/emit";
const bundled = await bundle(new URL("./calendar.ts", import.meta.url));
console.log(bundled.code);
