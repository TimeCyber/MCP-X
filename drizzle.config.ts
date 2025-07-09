import type { Config } from "drizzle-kit"

export default {
  dialect: "sqlite",
  schema: "services/database/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "./database.db"
  }
} satisfies Config
