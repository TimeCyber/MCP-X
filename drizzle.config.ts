import type { Config } from "drizzle-kit"

export default {
  dialect: "sqlite",
  schema: "services/database/schema.ts",
  out: "./drizzle",
} satisfies Config
