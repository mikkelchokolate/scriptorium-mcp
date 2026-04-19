import { z } from "zod";
import fs from "fs-extra";
import path from "path";

export const proseAlchemistSchema = z.object({
  action: z.enum(["edit", "set_style_guide", "get_style_guide", "suggest_variants", "check_voice"]).describe("Action to perform"),
  project: z.string().describe("Project name/directory"),
  text: z.string().optional().describe("Text to edit or analyze"),
  style: z.enum(["literary", "pulp", "minimalist", "baroque", "grimdark", "cozy", "thriller", "lyrical"]).optional(),
  instructions: z.string().optional().describe("Specific editing instructions"),
  author_voice_sample: z.string().optional().describe("Sample of author's writing to capture voice"),
});

export type ProseAlchemistInput = z.infer<typeof proseAlchemistSchema>;

const STYLE_GUIDES: Record<string, string> = {
  literary: `## Literary Style
- Prioritize interiority and psychological depth
- Use precise, evocative language; avoid clichés
- Vary sentence length for rhythm; favor complex sentences
- Show don't tell — use concrete sensory details
- Subtext over exposition`,

  pulp: `## Pulp Style
- Fast pace, short punchy sentences
- Action-forward; keep things moving
- Vivid, visceral descriptions
- Dialogue-heavy, snappy exchanges
- Cliffhangers at every chapter end`,

  minimalist: `## Minimalist Style (Hemingway/Carver)
- Short, declarative sentences
- Iceberg theory — what's unsaid matters most
- Avoid adverbs; use strong verbs
- Sparse dialogue tags (said, asked only)
- Trust the reader`,

  baroque: `## Baroque Style
- Rich, ornate prose with layered metaphors
- Long, winding sentences with subordinate clauses
- Dense imagery and symbolism
- Elevated diction
- Philosophical asides welcome`,

  grimdark: `## Grimdark Style
- Moral ambiguity — no clean heroes
- Visceral, unflinching violence and consequence
- Bleak atmosphere; hope is earned, not given
- Subvert tropes; avoid deus ex machina
- Characters are flawed, sometimes irredeemably`,

  cozy: `## Cozy Style
- Warm, inviting tone; safe world despite mystery
- Charming, quirky characters
- Light humor; witty observations
- Sensory comfort details (food, warmth, community)
- Conflict resolved without graphic violence`,

  thriller: `## Thriller Style
- Relentless tension; every scene raises stakes
- Short chapters, fast cuts
- Dramatic irony — reader knows more than protagonist
- Ticking clock elements
- Twists earned through planted clues`,

  lyrical: `## Lyrical Style
- Prose as poetry; sound and rhythm matter
- Extended metaphors and motifs
- Emotional resonance over plot momentum
- Nature as mirror to inner state
- Repetition for emphasis`,
};

export async function proseAlchemist(input: ProseAlchemistInput, projectsRoot: string): Promise<string> {
  const projectDir = path.join(projectsRoot, input.project);
  await fs.ensureDir(projectDir);
  const styleGuidePath = path.join(projectDir, "style_guide.md");
  const voicePath = path.join(projectDir, "author_voice.md");

  if (input.action === "set_style_guide") {
    const style = input.style ?? "literary";
    const guide = STYLE_GUIDES[style] ?? STYLE_GUIDES.literary;
    const custom = input.instructions ? `\n\n## Custom Instructions\n${input.instructions}` : "";
    const voiceSample = input.author_voice_sample
      ? `\n\n## Author Voice Sample\n\`\`\`\n${input.author_voice_sample}\n\`\`\``
      : "";
    const content = `# Style Guide: ${style}\nProject: ${input.project}\nUpdated: ${new Date().toISOString()}\n\n${guide}${custom}${voiceSample}`;
    await fs.writeFile(styleGuidePath, content, "utf-8");
    if (input.author_voice_sample) {
      await fs.writeFile(voicePath, `# Author Voice\n\n## Sample\n${input.author_voice_sample}\n\n## Notes\n${input.instructions ?? ""}`, "utf-8");
    }
    return `Style guide set to "${style}" for project "${input.project}".`;
  }

  if (input.action === "get_style_guide") {
    if (!await fs.pathExists(styleGuidePath)) {
      return `No style guide found. Use 'set_style_guide' to create one.\n\nAvailable styles: ${Object.keys(STYLE_GUIDES).join(", ")}`;
    }
    return await fs.readFile(styleGuidePath, "utf-8");
  }

  if (input.action === "edit") {
    if (!input.text) return "Error: 'text' is required for editing.";
    let guide = "";
    if (await fs.pathExists(styleGuidePath)) {
      guide = await fs.readFile(styleGuidePath, "utf-8");
    }
    const styleHint = input.style ? STYLE_GUIDES[input.style] ?? "" : "";
    const instructions = input.instructions ?? "Improve clarity, flow, and prose quality.";

    return `📝 Prose Edit Request\n\n**Original text:**\n${input.text}\n\n**Style context:**\n${styleHint || guide || "No style guide set."}\n\n**Instructions for AI:**\n${instructions}\n\n*[The AI co-author will rewrite this passage according to the style guide and instructions above.]*`;
  }

  if (input.action === "suggest_variants") {
    if (!input.text) return "Error: 'text' is required.";
    return `🔀 Variant Suggestions Request\n\n**Original:**\n${input.text}\n\n**Instructions for AI:**\nProvide 3 distinct rewrites of the above passage:\n1. More concise/punchy version\n2. More lyrical/atmospheric version\n3. More dialogue-driven version\n\nMaintain the core meaning and plot beats.`;
  }

  if (input.action === "check_voice") {
    if (!input.text) return "Error: 'text' is required.";
    let voiceSample = "";
    if (await fs.pathExists(voicePath)) {
      voiceSample = await fs.readFile(voicePath, "utf-8");
    }
    if (!voiceSample && !input.author_voice_sample) {
      return "No author voice sample found. Use 'set_style_guide' with 'author_voice_sample' to register the author's voice first.";
    }
    const sample = input.author_voice_sample ?? voiceSample;
    return `🎭 Voice Consistency Check\n\n**Author Voice Sample:**\n${sample}\n\n**Text to Check:**\n${input.text}\n\n**Instructions for AI:**\nAnalyze whether the text to check matches the author's voice. Note:\n- Sentence rhythm and length patterns\n- Vocabulary level and word choices\n- Use of metaphor and imagery\n- Dialogue style\n- Narrative distance\n\nProvide specific suggestions to align the text with the author's voice.`;
  }

  return "Unknown action.";
}
