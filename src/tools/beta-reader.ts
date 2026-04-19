import { z } from "zod";

export const betaReaderSchema = z.object({
  action: z.enum(["simulate", "list_personas"]).describe("Action to perform"),
  project: z.string().describe("Project name/directory"),
  text: z.string().optional().describe("Text excerpt to review"),
  chapter_number: z.number().optional().describe("Chapter number being reviewed"),
  personas: z.array(z.enum([
    "harsh_critic", "genre_fan", "casual_reader", "literary_snob",
    "teen_reader", "sensitivity_reader", "editor", "superfan"
  ])).optional().describe("Which reader personas to simulate"),
  genre: z.string().optional().describe("Genre of the work"),
});

export type BetaReaderInput = z.infer<typeof betaReaderSchema>;

const PERSONA_DESCRIPTIONS: Record<string, { name: string; description: string; focus: string[] }> = {
  harsh_critic: {
    name: "The Harsh Critic",
    description: "A seasoned reviewer who pulls no punches. Finds plot holes, weak characterization, and pacing issues.",
    focus: ["plot holes", "character consistency", "pacing", "clichés", "logic gaps"],
  },
  genre_fan: {
    name: "The Genre Superfan",
    description: "Deeply familiar with genre conventions. Notices when tropes are used well vs. lazily.",
    focus: ["genre conventions", "trope usage", "world-building depth", "genre expectations"],
  },
  casual_reader: {
    name: "The Casual Reader",
    description: "Reads for fun. Gets confused by complex exposition, loses interest if pace drags.",
    focus: ["readability", "engagement", "confusion points", "entertainment value"],
  },
  literary_snob: {
    name: "The Literary Snob",
    description: "Prizes prose quality, thematic depth, and originality above all else.",
    focus: ["prose quality", "thematic resonance", "originality", "subtext", "literary merit"],
  },
  teen_reader: {
    name: "The Teen Reader",
    description: "Young adult audience. Connects with relatable characters, fast pace, and emotional authenticity.",
    focus: ["relatability", "emotional authenticity", "pace", "character voice", "age-appropriate content"],
  },
  sensitivity_reader: {
    name: "The Sensitivity Reader",
    description: "Reviews for representation, harmful stereotypes, and cultural accuracy.",
    focus: ["representation", "stereotypes", "cultural accuracy", "harmful tropes", "inclusive language"],
  },
  editor: {
    name: "The Professional Editor",
    description: "Structural and line-level feedback. Focuses on craft, clarity, and marketability.",
    focus: ["structure", "clarity", "show vs tell", "dialogue", "marketability", "opening hook"],
  },
  superfan: {
    name: "The Superfan",
    description: "Loves everything but gives genuine enthusiasm feedback — what excited them, what they'll remember.",
    focus: ["memorable moments", "favorite characters", "emotional peaks", "quotable lines", "re-read value"],
  },
};

export async function betaReader(input: BetaReaderInput): Promise<string> {
  if (input.action === "list_personas") {
    const lines = Object.entries(PERSONA_DESCRIPTIONS).map(([key, p]) =>
      `**${p.name}** (\`${key}\`)\n  ${p.description}\n  Focus: ${p.focus.join(", ")}`
    );
    return `📚 Available Beta Reader Personas:\n\n${lines.join("\n\n")}`;
  }

  if (input.action === "simulate") {
    if (!input.text) return "Error: 'text' is required for simulation.";
    const selectedPersonas = input.personas ?? ["harsh_critic", "genre_fan", "casual_reader"];
    const chapterRef = input.chapter_number ? ` (Chapter ${input.chapter_number})` : "";
    const genre = input.genre ? ` [${input.genre}]` : "";

    const personaInstructions = selectedPersonas.map(key => {
      const p = PERSONA_DESCRIPTIONS[key];
      return `### ${p.name}${genre}
**Perspective:** ${p.description}
**Focus areas:** ${p.focus.join(", ")}
Provide 3-5 specific, actionable feedback points from this persona's perspective. Be authentic to their voice and priorities.`;
    }).join("\n\n");

    return `🎭 Beta Reader Simulation${chapterRef}\n\n**Text submitted for review:**\n\`\`\`\n${input.text.slice(0, 500)}${input.text.length > 500 ? "\n...[truncated]" : ""}\n\`\`\`\n\n**Instructions for AI — simulate each reader:**\n\n${personaInstructions}\n\n---\n*After all persona feedback, provide a **Consensus Summary**: the 2-3 most critical issues raised by multiple readers.*`;
  }

  return "Unknown action.";
}
