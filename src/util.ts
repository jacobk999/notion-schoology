import { readFile } from "node:fs/promises";

export function getFormattedDate(date: Date) {
  const [formattedDate] = date.toISOString().split("T");
  return formattedDate;
}

export async function getConfig(): Promise<Record<string, string>> {
  const file = await readFile("./config.json", "utf8");
  return JSON.parse(file);
}
