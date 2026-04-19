import { z } from "zod";

export const researchQuillSchema = z.object({
  action: z.enum(["research", "fact_check", "add_source", "list_sources"]).describe("Action to perform"),
  project: z.string().describe("Project name/directory"),
  query: z.string().optional().describe("Research query or topic"),
  context: z.string().optional().describe("Context from the book where this research is needed"),
  period: z.string().optional().describe("Historical period (e.g., 'Medieval Europe 1200s')"),
  domain: z.enum(["history", "science", "geography", "culture", "technology", "medicine", "military", "mythology", "general"]).optional(),
  claim: z.string().optional().describe("Specific claim to fact-check"),
  source: z.object({
    title: z.string(),
    author: z.string().optional(),
    url: z.string().optional(),
    notes: z.string().optional(),
  }).optional().describe("Source to add to project bibliography"),
});

export type ResearchQuillInput = z.infer<typeof researchQuillSchema>;

import fs from "fs-extra";
import path from "path";

export async function researchQuill(input: ResearchQuillInput, projectsRoot: string): Promise<string> {
  const projectDir = path.join(projectsRoot, input.project);
  await fs.ensureDir(projectDir);
  const sourcesPath = path.join(projectDir, "bibliography.json");

  let sources: any[] = [];
  if (await fs.pathExists(sourcesPath)) {
    sources = await fs.readJson(sourcesPath);
  }

  if (input.action === "add_source") {
    if (!input.source) return "Error: 'source' object is required.";
    sources.push({ ...input.source, added: new Date().toISOString() });
    await fs.writeJson(sourcesPath, sources, { spaces: 2 });
    return `Source added: "${input.source.title}"${input.source.author ? " by " + input.source.author : ""}`;
  }

  if (input.action === "list_sources") {
    if (sources.length === 0) return "No sources in bibliography. Use 'add_source' to add references.";
    const lines = sources.map((s: any, i: number) =>
      `  ${i + 1}. "${s.title}"${s.author ? " — " + s.author : ""}${s.url ? "\n     URL: " + s.url : ""}${s.notes ? "\n     Notes: " + s.notes : ""}`
    );
    return `📚 Bibliography for "${input.project}" (${sources.length} sources):\n\n${lines.join("\n\n")}`;
  }

  if (input.action === "research") {
    if (!input.query) return "Error: 'query' is required for research.";
    const domain = input.domain ?? "general";
    const period = input.period ? `\n**Historical Period:** ${input.period}` : "";
    const context = input.context ? `\n**Book Context:** ${input.context}` : "";

    return `🔍 Research Request\n\n**Query:** ${input.query}\n**Domain:** ${domain}${period}${context}\n\n**Instructions for AI:**\nProvide comprehensive research on this topic for fiction writing purposes:\n\n1. **Key Facts** — 5-7 accurate, specific facts relevant to the query\n2. **Common Misconceptions** — What fiction often gets wrong about this topic\n3. **Authentic Details** — Sensory/specific details that will make writing feel real (sounds, smells, textures, terminology)\n4. **Dramatic Potential** — Aspects of this topic that create natural narrative tension\n5. **Recommended Sources** — 3 reliable sources for deeper research\n\n⚠️ Note: Always verify critical facts with primary sources before publication.`;
  }

  if (input.action === "fact_check") {
    if (!input.claim) return "Error: 'claim' is required for fact-checking.";
    const context = input.context ? `\n**Book Context:** ${input.context}` : "";
    const domain = input.domain ?? "general";

    return `✅ Fact-Check Request\n\n**Claim to verify:** "${input.claim}"\n**Domain:** ${domain}${context}\n\n**Instructions for AI:**\nAnalyze this claim for factual accuracy:\n\n1. **Verdict:** TRUE / FALSE / PARTIALLY TRUE / ANACHRONISTIC / PLAUSIBLE BUT UNVERIFIED\n2. **Explanation:** Why is this claim accurate or inaccurate?\n3. **Correction (if needed):** What is the accurate version?\n4. **Fiction Latitude:** How much does this matter for fiction? Can it be kept for narrative purposes?\n5. **Sources:** Where can this be verified?\n\n⚠️ This is an AI assessment — verify with authoritative sources for publication.`;
  }

  return "Unknown action.";
}
