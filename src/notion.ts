import { Client as NotionClient } from "@notionhq/client";
import { getFormattedDate } from "./util.js";

export interface CreateTodoOptions {
  name: string;
  due: string;
  tag: string;
  id: number;
  timeZone: string;
}

export function createNotionTodo(
  notion: NotionClient,
  { name, due, tag, id, timeZone }: CreateTodoOptions
) {
  return notion.pages.create({
    parent: { database_id: process.env.NOTION_DATABASE_ID },
    properties: {
      Due: {
        date: {
          start: due,
          /**
           * Notion does not export `TimeZoneRequest`
           */
          time_zone: timeZone as "America/New_York",
        },
      },
      Name: {
        title: [
          {
            text: {
              content: name,
            },
          },
        ],
      },
      Tags: {
        multi_select: [
          {
            name: tag,
          },
        ],
      },
      ID: {
        number: id,
      },
    },
  });
}

export function getNotionTodos(notion: NotionClient) {
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getFormattedDate(yesterdayDate);

  return notion.databases.query({
    database_id: process.env.NOTION_DATABASE_ID,
    filter: {
      date: { after: yesterday },
      property: "Due",
      type: "date",
    },
  });
}
