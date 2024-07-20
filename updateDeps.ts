import { collect, write } from "jsr:@molt/core";

const updates = await collect([
  "./main.tsx",
  "./build.ts",
  "./client/main.tsx",
]);
await write(updates);
