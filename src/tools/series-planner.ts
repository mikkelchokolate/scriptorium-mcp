import { z } from "zod";
import fs from "fs-extra";
import path from "path";

export const seriesPlannerSchema = z.object({
  action: z.enum(["create_series", "add_book", "get_series", "generate_title", "generate_blurb"]).describe("Action to perform"),
  project: z.string().describe("Project name/directory (series root)"),
  series_name: z.string().optional().describe("Name of the series"),
  genre: z.string().optional().describe("Genre"),
  book_number: z.number().optional().describe("Book number in series"),
  book_title: z.string().optional().describe("Book title"),
  book_premise: z.string().optional().describe("Book premise"),
  overarching_plot: z.string().optional().describe("Series-wide overarching plot"),
  protagonist: z.string().optional().describe("Main protagonist name"),
  tone: z.string().optional().describe("Tone/mood of the book"),
  keywords: z.array(z.string()).optional().describe("Keywords for title/blurb generation"),
});

export type SeriesPlannerInput = z.infer<typeof seriesPlannerSchema>;

export async function seriesPlanner(input: SeriesPlannerInput, projectsRoot: string): Promise<string> {
  const projectDir = path.join(projectsRoot, input.project);
  await fs.ensureDir(projectDir);
  const seriesPath = path.join(projectDir, "series.json");

  if (input.action === "create_series") {
    const series = {
      name: input.series_name ?? "Untitled Series",
      genre: input.genre ?? "fantasy",
      overarching_plot: input.overarching_plot ?? "",
      books: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
    };
    await fs.writeJson(seriesPath, series, { spaces: 2 });
    return `Series "${series.name}" (${series.genre}) created at ${seriesPath}`;
  }

  if (input.action === "add_book") {
    if (!await fs.pathExists(seriesPath)) return "No series found. Use 'create_series' first.";
    const series = await fs.readJson(seriesPath);
    const bookNum = input.book_number ?? (series.books.length + 1);
    const book = {
      number: bookNum,
      title: input.book_title ?? `Book ${bookNum}`,
      premise: input.book_premise ?? "",
      protagonist: input.protagonist ?? "",
      status: "planned",
      added: new Date().toISOString(),
    };
    const existing = series.books.findIndex((b: any) => b.number === bookNum);
    if (existing >= 0) series.books[existing] = book;
    else series.books.push(book);
    series.books.sort((a: any, b: any) => a.number - b.number);
    series.updated = new Date().toISOString();
    await fs.writeJson(seriesPath, series, { spaces: 2 });
    return `Book ${bookNum} "${book.title}" added to series "${series.name}".`;
  }

  if (input.action === "get_series") {
    if (!await fs.pathExists(seriesPath)) return "No series found. Use 'create_series' first.";
    const series = await fs.readJson(seriesPath);
    const bookList = series.books.map((b: any) =>
      `  Book ${b.number}: "${b.title}" [${b.status}]${b.premise ? " — " + b.premise.slice(0, 80) : ""}`
    ).join("\n");
    return `# Series: ${series.name}\nGenre: ${series.genre}\nOverarching Plot: ${series.overarching_plot}\n\nBooks (${series.books.length}):\n${bookList || "  No books added yet."}`;
  }

  if (input.action === "generate_title") {
    const genre = input.genre ?? "fantasy";
    const keywords = input.keywords ?? [];
    const tone = input.tone ?? "epic";
    return `📚 Title Generation Request\n\n**Genre:** ${genre}\n**Tone:** ${tone}\n**Keywords:** ${keywords.join(", ") || "none"}\n**Premise:** ${input.book_premise ?? "not provided"}\n\n**Instructions for AI:**\nGenerate 10 compelling book titles for this ${genre} novel. Consider:\n- Single evocative word titles (e.g., "Mistborn", "Dune")\n- Two-word power combinations (e.g., "Red Rising", "Dark Matter")\n- Phrase titles with mystery (e.g., "The Name of the Wind")\n- Series subtitle format (e.g., "Chronicles of X: The Y of Z")\n\nFor each title, provide a one-line explanation of why it works.`;
  }

  if (input.action === "generate_blurb") {
    const protagonist = input.protagonist ?? "the protagonist";
    return `📝 Blurb Generation Request\n\n**Title:** ${input.book_title ?? "Untitled"}\n**Genre:** ${input.genre ?? "fantasy"}\n**Protagonist:** ${protagonist}\n**Premise:** ${input.book_premise ?? "not provided"}\n**Tone:** ${input.tone ?? "not specified"}\n\n**Instructions for AI:**\nWrite 3 versions of a back-cover blurb:\n\n1. **Short hook** (50 words) — for social media / Amazon subtitle\n2. **Standard blurb** (150 words) — for back cover / Amazon description\n3. **Extended blurb** (300 words) — for LitRes / detailed listing\n\nEach should:\n- Open with a hook that creates immediate tension\n- Introduce the protagonist and their core conflict\n- Hint at stakes without spoiling\n- End with a compelling question or call to read`;
  }

  return "Unknown action.";
}
