export const config = {
  api: {
    geminiKey: process.env["NEXT_PUBLIC_GEMINI_API_KEY"] || "",
    geminiModel: process.env["NEXT_PUBLIC_GEMINI_MODEL"] || "gemini-2.5-flash",
    retries: 3,
    timeout: 30000,
  },
  NODE_ENV: process.env["NODE_ENV"] || "development",
  IS_PRODUCTION: process.env["NODE_ENV"] === "production",
  IS_DEVELOPMENT: process.env["NODE_ENV"] === "development",
};
