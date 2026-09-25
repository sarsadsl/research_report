export {};

declare global {
  interface CloudflareEnv {
    RESEARCH_DB: D1Database;
  }
}
