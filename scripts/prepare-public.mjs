import { cp, mkdir } from "node:fs/promises";

await mkdir("public", { recursive: true });
await Promise.all([
  cp("app.js", "public/app.js"),
  cp("config.js", "public/config.js"),
  cp("assets", "public/assets", { recursive: true }),
]);
