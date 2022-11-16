declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NOTION_TOKEN: string;
      NOTION_DATABASE_ID: string;
      SCHOOLOGY_KEY: string;
      SCHOOLOGY_SECRET: string;
      SCHOOLOGY_SITE_BASE: string;
      SCHOOLOGY_OAUTH_TOKEN: string;
      SCHOOLOGY_OAUTH_SECRET: string;
      SCHOOLOGY_USER_ID: string;
    }
  }
}

export {};
