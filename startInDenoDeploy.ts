import { main } from "./main.tsx";

const r2SecretAccessKey = Deno.env.get("R2_SECRET_ACCESS_KEY");

if (!r2SecretAccessKey) {
  throw new Error("R2_SECRET_ACCESS_KEY is not set");
}

main({ r2SecretAccessKey });
