import { Client as NotionClient } from "@notionhq/client";
import type { QueryDatabaseResponse } from "@notionhq/client/build/src/api-endpoints.js";
import { createNotionTodo, getNotionTodos } from "./notion.js";
import {
  Client as SchoologyClient,
  Event,
  Section,
  User,
} from "./schoology.js";
import { getConfig, getFormattedDate } from "./util.js";

const notion = new NotionClient({
  auth: process.env.NOTION_TOKEN,
});

const schoology = new SchoologyClient({
  clientKey: process.env.SCHOOLOGY_KEY,
  clientSecret: process.env.SCHOOLOGY_SECRET,
  siteBase: process.env.SCHOOLOGY_SITE_BASE,
});

schoology.setToken({
  oauth_token: process.env.SCHOOLOGY_OAUTH_TOKEN,
  oauth_token_secret: process.env.SCHOOLOGY_OAUTH_SECRET,
});

function getNewTodos(pages: QueryDatabaseResponse, events: Event[]) {
  type Page = { properties: Record<string, { number: number }> };

  const existingIds = new Set<number>(
    pages.results.map((page) => (page as unknown as Page).properties.ID.number)
  );

  return events.filter((event) => !existingIds.has(event.id));
}

async function createTodosFromEvents(
  pages: QueryDatabaseResponse,
  events: Event[],
  user: User,
  sections: Section[],
  config: Record<string, string>
) {
  const newEvents = getNewTodos(pages, events);
  if (newEvents.length === 0) return console.log("No new events");

  const courseNameMap = new Map<number, string>(
    sections.map((section) => [+section.id, section.course_title])
  );

  newEvents.forEach((event) => {
    const courseName = courseNameMap.get(event.section_id);

    if (!courseName)
      return console.log(
        `No course name for ${event.section_id} - ${event.title}`
      );

    const tag = config[courseName];
    if (!tag) return console.log(`No tag for ${courseName}`);

    console.log(`Creating todo for: ${event.title}`);

    createNotionTodo(notion, {
      name: event.title,
      due: event.start,
      tag,
      id: event.id,
      timeZone: user.tz_name,
    });
  });
}

const today = getFormattedDate(new Date());

const [todos, events, user, sections, config] = await Promise.all([
  getNotionTodos(notion),
  schoology.users.listEvents(process.env.SCHOOLOGY_USER_ID, today),
  schoology.users.get(process.env.SCHOOLOGY_USER_ID),
  schoology.users.getSections(process.env.SCHOOLOGY_USER_ID),
  getConfig(),
]);

await createTodosFromEvents(todos, events, user, sections, config);
