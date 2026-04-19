import { z } from "zod";
import fs from "fs-extra";
import path from "path";
import { withErrorHandling, ScriptoriumError, logOperation } from "../utils/error-handler.js";
import { createProjectService } from "../services/project-service.js";
import eventBus from "../utils/event-bus.js";

export const storyArchitectSchema = z.object({
  action: z.enum(["create_outline", "get_outline", "add_beat", "suggest_twist"]).describe("Action to perform"),
  project: z.string().describe("Project name/directory"),
  structure: z.enum(["three_act", "heros_journey", "save_the_cat", "seven_point", "fichtean_curve"]).optional(),
  title: z.string().optional().describe("Story title"),
  premise: z.string().optional().describe("One-sentence premise"),
  beat: z.object({
    act: z.string(),
    name: z.string(),
    description: z.string(),
  }).optional().describe("Story beat to add"),
  context: z.string().optional().describe("Context for twist suggestion"),
});

export type StoryArchitectInput = z.infer<typeof storyArchitectSchema>;

interface OutlineBeat {
  name: string;
  description: string;
  completed: boolean;
  act?: string;
}

interface StoryOutline {
  title: string;
  premise: string;
  structure: keyof typeof STRUCTURES;
  beats: OutlineBeat[];
  created: string;
  updated: string;
}

const STRUCTURES = {
  three_act: [
    "Act 1 - Setup", "Inciting Incident", "First Plot Point",
    "Act 2A - Rising Action", "Midpoint", "Act 2B - Complications",
    "Second Plot Point", "Act 3 - Climax", "Resolution",
  ],
  heros_journey: [
    "Ordinary World", "Call to Adventure", "Refusal of the Call",
    "Meeting the Mentor", "Crossing the Threshold", "Tests/Allies/Enemies",
    "Approach to the Inmost Cave", "Ordeal", "Reward",
    "The Road Back", "Resurrection", "Return with the Elixir",
  ],
  save_the_cat: [
    "Opening Image", "Theme Stated", "Set-Up", "Catalyst",
    "Debate", "Break into Two", "B Story", "Fun and Games",
    "Midpoint", "Bad Guys Close In", "All Is Lost", "Dark Night of the Soul",
    "Break into Three", "Finale", "Final Image",
  ],
  seven_point: [
    "Hook", "Plot Turn 1", "Pinch Point 1", "Midpoint",
    "Pinch Point 2", "Plot Turn 2", "Resolution",
  ],
  fichtean_curve: [
    "Inciting Crisis", "Rising Action Crisis 1", "Rising Action Crisis 2",
    "Rising Action Crisis 3", "Climax", "Falling Action", "Resolution",
  ],
} as const;

const TWIST_TEMPLATES = [
  "A trusted ally has been steering events toward a goal they never revealed.",
  "The protagonist's most certain memory is incomplete in a consequential way.",
  "The conflict everyone sees is a symptom of a deeper, older bargain.",
  "A presumed loss becomes leverage for an opposing force.",
  "The antagonist is protecting something the protagonist also needs to survive.",
  "A victory closes one problem and silently activates a worse one.",
  "Two apparently separate story lines are caused by the same hidden decision.",
  "The price of success is to become responsible for the system being resisted.",
  "A missing witness or artifact was removed by someone on the protagonist's side.",
  "The final obstacle is created by an earlier compromise the protagonist justified.",
];

function hashText(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function selectDeterministicTwists(context: string): string[] {
  const seed = hashText(context || "story_architect");
  const start = seed % TWIST_TEMPLATES.length;
  return Array.from({ length: 3 }, (_, offset) => TWIST_TEMPLATES[(start + offset) % TWIST_TEMPLATES.length]);
}

export const storyArchitect = withErrorHandling(async (input: StoryArchitectInput, projectsRoot: string): Promise<string> => {
  const projectService = createProjectService(projectsRoot);
  await projectService.ensureProjectDirectories(input.project);

  const outlinePath = path.join(projectService.projectDir(input.project), "outline.json");
  const readOutline = async (): Promise<StoryOutline | null> => {
    if (!await fs.pathExists(outlinePath)) {
      return null;
    }
    return fs.readJson(outlinePath) as Promise<StoryOutline>;
  };

  if (input.action === "create_outline") {
    const structure = input.structure ?? "three_act";
    const beats: OutlineBeat[] = STRUCTURES[structure].map((name) => ({ name, description: "", completed: false }));
    const now = new Date().toISOString();
    const outline: StoryOutline = {
      title: input.title ?? "Untitled",
      premise: input.premise ?? "",
      structure,
      beats,
      created: now,
      updated: now,
    };

    await projectService.withLock(`outline:${input.project}`, () => projectService.writeJsonAtomic(outlinePath, outline));
    logOperation("outline_created", outline.title, { project: input.project, structure });
    eventBus.emitEvent("outline.updated", {
      project: input.project,
      actor: "story_architect",
      details: { action: input.action, structure, title: outline.title },
    });
    return `Outline created using "${structure}" for "${outline.title}".`;
  }

  if (input.action === "get_outline") {
    const outline = await readOutline();
    if (!outline) {
      return "No outline found. Use 'create_outline' first.";
    }
    const beatList = outline.beats.map((beat, index) => `  ${index + 1}. [${beat.completed ? "x" : " "}] ${beat.name}${beat.description ? `: ${beat.description}` : ""}`).join("\n");
    return `# ${outline.title}\nPremise: ${outline.premise}\nStructure: ${outline.structure}\n\nBeats:\n${beatList}`;
  }

  if (input.action === "add_beat") {
    if (!input.beat) {
      throw new ScriptoriumError("'beat' object is required.", "VALIDATION_ERROR");
    }

    const outline = await readOutline();
    if (!outline) {
      return "No outline found. Use 'create_outline' first.";
    }

    const beatName = input.beat.name.toLowerCase();
    const existingIndex = outline.beats.findIndex((beat) => beat.name.toLowerCase() === beatName || beat.name.toLowerCase().includes(beatName));

    if (existingIndex >= 0) {
      outline.beats[existingIndex] = {
        ...outline.beats[existingIndex],
        description: input.beat.description,
        act: input.beat.act,
        completed: true,
      };
    } else {
      outline.beats.push({
        name: input.beat.name,
        description: input.beat.description,
        act: input.beat.act,
        completed: true,
      });
    }

    outline.updated = new Date().toISOString();
    await projectService.withLock(`outline:${input.project}`, () => projectService.writeJsonAtomic(outlinePath, outline));
    logOperation("outline_beat_added", input.beat.name, { project: input.project });
    eventBus.emitEvent("outline.updated", {
      project: input.project,
      actor: "story_architect",
      details: { action: input.action, beat: input.beat.name },
    });
    return `Beat "${input.beat.name}" updated in outline.`;
  }

  if (input.action === "suggest_twist") {
    const context = input.context ?? `${input.project}:${input.title ?? ""}:${input.premise ?? ""}`;
    const twists = selectDeterministicTwists(context);
    const prefix = input.context ? `Context: ${input.context}\n\n` : "";
    return `${prefix}Suggested Plot Twists:\n\n${twists.map((twist, index) => `${index + 1}. ${twist}`).join("\n")}`;
  }

  throw new ScriptoriumError("Unknown action for story_architect.", "VALIDATION_ERROR");
}, "story_architect");
