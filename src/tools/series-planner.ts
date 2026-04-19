import { z } from "zod";
import fs from "fs-extra";
import path from "path";

import { getMcpMessages } from "../core/i18n/mcp/index.js";
import { SERVER_LOCALE, resolveRequestLocale, withLocaleInput } from "../core/i18n/runtime.js";

const serverMessages = getMcpMessages(SERVER_LOCALE);

const seriesPlannerSchemaBase = z.object({
  action: z.enum(["create_series", "add_book", "get_series", "generate_title", "generate_blurb"]).describe(serverMessages.seriesPlanner.schema.action),
  project: z.string().describe(serverMessages.seriesPlanner.schema.project),
  series_name: z.string().optional().describe(serverMessages.seriesPlanner.schema.seriesName),
  genre: z.string().optional().describe(serverMessages.seriesPlanner.schema.genre),
  book_number: z.number().optional().describe(serverMessages.seriesPlanner.schema.bookNumber),
  book_title: z.string().optional().describe(serverMessages.seriesPlanner.schema.bookTitle),
  book_premise: z.string().optional().describe(serverMessages.seriesPlanner.schema.bookPremise),
  overarching_plot: z.string().optional().describe(serverMessages.seriesPlanner.schema.overarchingPlot),
  protagonist: z.string().optional().describe(serverMessages.seriesPlanner.schema.protagonist),
  tone: z.string().optional().describe(serverMessages.seriesPlanner.schema.tone),
  keywords: z.array(z.string()).optional().describe(serverMessages.seriesPlanner.schema.keywords),
});

export const seriesPlannerSchema = withLocaleInput(seriesPlannerSchemaBase);
export type SeriesPlannerInput = z.infer<typeof seriesPlannerSchema>;

export async function seriesPlanner(input: SeriesPlannerInput, projectsRoot: string): Promise<string> {
  const locale = resolveRequestLocale(input);
  const messages = getMcpMessages(locale).seriesPlanner;
  const projectDir = path.join(projectsRoot, input.project);
  await fs.ensureDir(projectDir);
  const seriesPath = path.join(projectDir, "series.json");

  if (input.action === "create_series") {
    const series = {
      name: input.series_name ?? messages.untitledSeries,
      genre: input.genre ?? "fantasy",
      overarching_plot: input.overarching_plot ?? "",
      books: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    await fs.writeJson(seriesPath, series, { spaces: 2 });
    return messages.createSeriesSuccess(series.name, series.genre, seriesPath);
  }

  if (input.action === "add_book") {
    if (!await fs.pathExists(seriesPath)) return messages.noSeries;
    const series = await fs.readJson(seriesPath);
    const bookNum = input.book_number ?? (series.books.length + 1);
    const book = {
      number: bookNum,
      title: input.book_title ?? messages.defaultBookTitle(bookNum),
      premise: input.book_premise ?? "",
      protagonist: input.protagonist ?? "",
      status: "planned",
      added: new Date().toISOString(),
    };
    const existing = series.books.findIndex((item: any) => item.number === bookNum);
    if (existing >= 0) series.books[existing] = book;
    else series.books.push(book);
    series.books.sort((left: any, right: any) => left.number - right.number);
    series.updated = new Date().toISOString();
    await fs.writeJson(seriesPath, series, { spaces: 2 });
    return messages.addBookSuccess(bookNum, book.title, series.name);
  }

  if (input.action === "get_series") {
    if (!await fs.pathExists(seriesPath)) return messages.noSeries;
    const series = await fs.readJson(seriesPath);
    const bookList = series.books.map((book: any) =>
      `  ${locale.startsWith("ru") ? "Книга" : "Book"} ${book.number}: "${book.title}" [${book.status}]${book.premise ? ` - ${book.premise.slice(0, 80)}` : ""}`,
    ).join("\n") || messages.noBooks;
    return messages.getSeriesSummary({
      name: series.name,
      genre: series.genre,
      overarchingPlot: series.overarching_plot,
      count: series.books.length,
      bookList,
    });
  }

  if (input.action === "generate_title") {
    const genre = input.genre ?? "fantasy";
    const keywords = input.keywords ?? [];
    const tone = input.tone ?? "epic";
    return messages.generateTitleRequest({
      genre,
      tone,
      keywords: keywords.join(", ") || (locale.startsWith("ru") ? "нет" : "none"),
      premise: input.book_premise ?? (locale.startsWith("ru") ? "не указана" : "not provided"),
    });
  }

  if (input.action === "generate_blurb") {
    return messages.generateBlurbRequest({
      title: input.book_title ?? (locale.startsWith("ru") ? "Без названия" : "Untitled"),
      genre: input.genre ?? "fantasy",
      protagonist: input.protagonist ?? (locale.startsWith("ru") ? "главный герой" : "the protagonist"),
      premise: input.book_premise ?? (locale.startsWith("ru") ? "не указана" : "not provided"),
      tone: input.tone ?? (locale.startsWith("ru") ? "не указан" : "not specified"),
    });
  }

  return messages.unknownAction;
}
