import { z } from "zod";
import fs from "fs-extra";
import path from "path";

import { getMcpMessages } from "../core/i18n/mcp/index.js";
import { SERVER_LOCALE, resolveRequestLocale, withLocaleInput } from "../core/i18n/runtime.js";

const STYLE_VALUES = ["literary", "pulp", "minimalist", "baroque", "grimdark", "cozy", "thriller", "lyrical"] as const;
const serverMessages = getMcpMessages(SERVER_LOCALE);

const proseAlchemistSchemaBase = z.object({
  action: z.enum(["edit", "set_style_guide", "get_style_guide", "suggest_variants", "check_voice"]).describe(serverMessages.proseAlchemist.schema.action),
  project: z.string().describe(serverMessages.proseAlchemist.schema.project),
  text: z.string().optional().describe(serverMessages.proseAlchemist.schema.text),
  style: z.enum(STYLE_VALUES).optional().describe(serverMessages.proseAlchemist.schema.style),
  instructions: z.string().optional().describe(serverMessages.proseAlchemist.schema.instructions),
  author_voice_sample: z.string().optional().describe(serverMessages.proseAlchemist.schema.authorVoiceSample),
});

export const proseAlchemistSchema = withLocaleInput(proseAlchemistSchemaBase);
export type ProseAlchemistInput = z.infer<typeof proseAlchemistSchema>;

export async function proseAlchemist(input: ProseAlchemistInput, projectsRoot: string): Promise<string> {
  const locale = resolveRequestLocale(input);
  const messages = getMcpMessages(locale).proseAlchemist;
  const projectDir = path.join(projectsRoot, input.project);
  await fs.ensureDir(projectDir);
  const styleGuidePath = path.join(projectDir, "style_guide.md");
  const voicePath = path.join(projectDir, "author_voice.md");

  if (input.action === "set_style_guide") {
    const style = input.style ?? "literary";
    const guide = messages.styleGuides[style] ?? messages.styleGuides.literary;
    const custom = input.instructions ? `\n\n${messages.customInstructionsHeading}\n${input.instructions}` : "";
    const voiceSample = input.author_voice_sample
      ? `\n\n${messages.authorVoiceSampleHeading}\n\`\`\`\n${input.author_voice_sample}\n\`\`\``
      : "";
    const content = `${messages.styleGuideTitle(style)}\n${messages.styleGuideProject}: ${input.project}\n${messages.styleGuideUpdated}: ${new Date().toISOString()}\n\n${guide}${custom}${voiceSample}`;
    await fs.writeFile(styleGuidePath, content, "utf-8");
    if (input.author_voice_sample) {
      await fs.writeFile(
        voicePath,
        `${messages.authorVoiceTitle}\n\n${messages.sampleHeading}\n${input.author_voice_sample}\n\n${messages.notesHeading}\n${input.instructions ?? ""}`,
        "utf-8",
      );
    }
    return messages.setStyleGuideSuccess(style, input.project);
  }

  if (input.action === "get_style_guide") {
    if (!await fs.pathExists(styleGuidePath)) {
      return messages.noStyleGuide([...STYLE_VALUES]);
    }
    return await fs.readFile(styleGuidePath, "utf-8");
  }

  if (input.action === "edit") {
    if (!input.text) return messages.editTextRequired;
    let guide = "";
    if (await fs.pathExists(styleGuidePath)) {
      guide = await fs.readFile(styleGuidePath, "utf-8");
    }
    const styleHint = input.style ? messages.styleGuides[input.style] ?? "" : "";
    const instructions = input.instructions ?? messages.defaultEditInstructions;

    return messages.editRequest({
      text: input.text,
      styleContext: styleHint || guide || messages.noStyleGuideSet,
      instructions,
    });
  }

  if (input.action === "suggest_variants") {
    if (!input.text) return messages.variantsTextRequired;
    return messages.variantsRequest(input.text);
  }

  if (input.action === "check_voice") {
    if (!input.text) return messages.voiceTextRequired;
    let voiceSample = "";
    if (await fs.pathExists(voicePath)) {
      voiceSample = await fs.readFile(voicePath, "utf-8");
    }
    if (!voiceSample && !input.author_voice_sample) {
      return messages.noVoiceSample;
    }
    const sample = input.author_voice_sample ?? voiceSample;
    return messages.voiceCheckRequest({ sample, text: input.text });
  }

  return messages.unknownAction;
}
