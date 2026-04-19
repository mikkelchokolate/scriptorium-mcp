import fs from "fs-extra";
import path from "path";

import { createProjectService, type ProjectService } from "../../services/project-service.js";
import type {
  EntityLocalization,
  EntityNode,
  LocalizedText,
  LoreFact,
  ProjectMeta,
  RelationEdge,
  RelationLocalization,
  TimelineEvent,
} from "../../core/domain/entities.js";
import type { LoreService } from "../../services/lore-service.js";
import type {
  GraphFlowEdgeDTO,
  GraphFlowNodeDTO,
  GraphLocale,
  GraphNodeKind,
  GraphProjectionOptions,
  GraphProjectionSnapshotDTO,
  GraphProjectionSummaryDTO,
  GraphResolvedText,
  GraphSourceKind,
  GraphTemporalDTO,
} from "./graph-dtos.js";
import { localizeGraphString, otherGraphLocale, resolveGraphText } from "./graph-localization.js";

type CharacterFileRecord = {
  name: string;
  role?: string;
  backstory?: string;
  arc?: string;
  traits?: string[];
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
  file?: string;
};

type ProjectCharacterIndexEntry = {
  name: string;
  role?: string;
  file?: string;
};

type ChapterFileRecord = {
  number: number;
  title: string;
  summary?: string;
  content?: string;
  createdAt?: string;
  updatedAt?: string;
  file?: string;
};

type OutlineFileRecord = {
  title?: string;
  premise?: string;
  structure?: string;
  beats?: Array<{ name?: string; description?: string; completed?: boolean }>;
  created?: string;
  updated?: string;
};

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || "item";
}

function normalizeLocale(locale?: string): GraphLocale {
  return locale === "ru" ? "ru" : "en";
}

function localizeText(text: LocalizedText | undefined, locale: GraphLocale, fallbackValue: string): GraphResolvedText {
  const fallback = localizeGraphString(fallbackValue, locale, fallbackValue);
  return resolveGraphText(locale, {
    en: text?.en?.trim() || fallback.en || fallbackValue,
    ru: text?.ru?.trim() || fallback.ru || fallbackValue,
  });
}

function localizeString(text: string | undefined, locale: GraphLocale, fallbackValue: string): GraphResolvedText {
  return localizeGraphString(text, locale, fallbackValue);
}

function temporalFromEntity(input?: {
  start?: string;
  end?: string;
  duration?: string;
  chapterSpanStart?: number;
  chapterSpanEnd?: number;
  timelineAxis?: string;
  temporalPrecision?: string;
}): GraphTemporalDTO | undefined {
  if (!input) return undefined;
  const temporal: GraphTemporalDTO = {
    start: input.start,
    end: input.end,
    duration: input.duration,
    chapterSpanStart: input.chapterSpanStart,
    chapterSpanEnd: input.chapterSpanEnd,
    timelineAxis: input.timelineAxis,
    precision: input.temporalPrecision,
  };
  return Object.values(temporal).some((value) => value !== undefined) ? temporal : undefined;
}

function causalFromEntity(input?: {
  causeConfidence?: number;
  causalPolarity?: string;
  causalDistance?: number;
  evidenceSource?: string;
  forecastHorizonChapters?: number;
}) {
  if (!input) return undefined;
  const causal = {
    causeConfidence: input.causeConfidence,
    causalPolarity: input.causalPolarity,
    causalDistance: input.causalDistance,
    evidenceSource: input.evidenceSource,
    forecastHorizonChapters: input.forecastHorizonChapters,
  };
  return Object.values(causal).some((value) => value !== undefined) ? causal : undefined;
}

function temporalFromChapter(chapter: number): GraphTemporalDTO {
  return {
    chapterSpanStart: chapter,
    chapterSpanEnd: chapter,
    timelineAxis: "story_time",
  };
}

function positionFor(index: number, kind: GraphNodeKind): { x: number; y: number } {
  const column = kind === "project" ? 0 : kind === "chapter" || kind === "outline" || kind === "world_bible" ? 1 : kind === "character" ? 2 : kind === "lore_fact" ? 3 : kind === "event" ? 4 : 2;
  return { x: column * 260, y: index * 120 };
}

function positionForChapter(index: number, chapter?: number): { x: number; y: number } {
  return { x: index * 260, y: (chapter ?? index) * 160 };
}

function buildTemporalFromFile(input?: { chapter?: number; createdAt?: string; updatedAt?: string }): GraphTemporalDTO | undefined {
  if (!input?.chapter && !input?.createdAt && !input?.updatedAt) return undefined;
  return input.chapter ? temporalFromChapter(input.chapter) : undefined;
}

export class GraphProjectionService {
  constructor(
    private readonly projectsRoot: string,
    private readonly projectService: ProjectService = createProjectService(projectsRoot),
    private readonly loreService?: LoreService,
  ) {}

  public async buildSnapshot(project: string, options: GraphProjectionOptions = {}): Promise<GraphProjectionSnapshotDTO> {
    const locale = normalizeLocale(options.locale);
    const connected = options.includeNeo4j !== false && Boolean(this.loreService?.isConnected);
    const warnings: string[] = [];

    const [meta, worldBible, outline, facts, chapters, characters] = await Promise.all([
      this.safeReadProjectMeta(project, warnings),
      this.safeReadWorldBible(project, warnings),
      this.safeReadOutline(project, warnings),
      this.safeReadLoreFacts(project, warnings),
      this.safeReadChapters(project, warnings),
      this.safeReadCharacters(project, warnings),
    ]);

    const [neo4jEntities, neo4jRelations, timelineEvents] = connected
      ? await Promise.all([
        this.loreService!.getEntitiesActiveDuring(project).catch((error) => {
          warnings.push(`Neo4j entities unavailable: ${String(error)}`);
          return [] as EntityNode[];
        }),
        this.loreService!.getRelationsByChapterWindow(project).catch((error) => {
          warnings.push(`Neo4j relations unavailable: ${String(error)}`);
          return [] as RelationEdge[];
        }),
        this.loreService!.getTimelineEvents(project).catch((error) => {
          warnings.push(`Neo4j timeline unavailable: ${String(error)}`);
          return [] as TimelineEvent[];
        }),
      ])
      : [[], [], []];

    const nodes: GraphFlowNodeDTO[] = [];
    const edges: GraphFlowEdgeDTO[] = [];
    const edgeKeys = new Set<string>();

    const addEdge = (edge: GraphFlowEdgeDTO): void => {
      const key = `${edge.source}->${edge.target}:${edge.type}`;
      if (edgeKeys.has(key)) return;
      edgeKeys.add(key);
      edges.push(edge);
    };

    const projectNode = this.buildProjectNode(project, meta, locale);
    nodes.push(projectNode);

    let index = 1;

    if (worldBible) {
      const node = this.buildDocumentNode(project, "world_bible", "World Bible", worldBible.slice(0, 240), "world_bible", locale, index++, {
        source: "canonical",
        temporal: { timelineAxis: "publication_time" },
        details: { length: worldBible.length },
      });
      nodes.push(node);
      addEdge(this.connectNodes(projectNode.id, node.id, project, "contains", locale, "canonical", node.data.temporal));
    }

    if (outline) {
      const node = this.buildDocumentNode(project, "outline", outline.title ?? "Outline", outline.premise ?? "Project outline", "outline", locale, index++, {
        source: "canonical",
        temporal: { timelineAxis: "publication_time" },
        details: {
          structure: outline.structure,
          beats: outline.beats?.length ?? 0,
        },
      });
      nodes.push(node);
      addEdge(this.connectNodes(projectNode.id, node.id, project, "contains", locale, "canonical", node.data.temporal));
    }

    for (const chapter of chapters) {
      const node = this.buildChapterNode(project, chapter, locale, index++);
      nodes.push(node);
      addEdge(this.connectNodes(projectNode.id, node.id, project, "contains", locale, "canonical", node.data.temporal));
    }

    for (const character of characters) {
      const node = this.buildCharacterNode(project, character, locale, index++);
      nodes.push(node);
      addEdge(this.connectNodes(projectNode.id, node.id, project, "contains", locale, "canonical", node.data.temporal));
    }

    for (const fact of facts) {
      const node = this.buildLoreFactNode(project, fact, locale, index++);
      nodes.push(node);
      addEdge(this.connectNodes(projectNode.id, node.id, project, "contains", locale, "canonical", node.data.temporal));
      if (fact.chapter !== undefined) {
        addEdge(this.connectNodes(`chapter:${project}:${String(fact.chapter).padStart(2, "0")}`, node.id, project, "anchors", locale, "derived", node.data.temporal));
      }
    }

    const characterNames = characters.map((character) => character.name);
    for (const chapter of chapters) {
      const chapterNodeId = `chapter:${project}:${String(chapter.number).padStart(2, "0")}`;
      for (const mention of this.findMentions(chapter.content ?? chapter.summary ?? "", characterNames)) {
        addEdge(this.connectNodes(chapterNodeId, `character:${project}:${slugify(mention)}`, project, "mentions", locale, "derived", temporalFromChapter(chapter.number)));
      }
    }

    for (const entity of neo4jEntities) {
      const node = this.buildEntityNode(entity, project, locale, index++);
      nodes.push(node);
      addEdge(this.connectNodes(projectNode.id, node.id, project, "contains", locale, "neo4j", node.data.temporal));
    }

    for (const relation of neo4jRelations) {
      addEdge(this.buildRelationEdge(relation, locale));
    }

    for (const event of timelineEvents) {
      const node = this.buildTimelineEventNode(project, event, locale, index++);
      nodes.push(node);
      addEdge(this.connectNodes(projectNode.id, node.id, project, "contains", locale, "neo4j", node.data.temporal));
      addEdge(this.connectNodes(`entity:${project}:${slugify(event.entity)}`, node.id, project, "triggers", locale, "neo4j", node.data.temporal));
      if (event.targetEntity) {
        addEdge(this.connectNodes(node.id, `entity:${project}:${slugify(event.targetEntity)}`, project, "affects", locale, "neo4j", node.data.temporal));
      }
    }

    const source: GraphSourceKind = connected && (neo4jEntities.length > 0 || neo4jRelations.length > 0 || timelineEvents.length > 0)
      ? "neo4j"
      : nodes.length > 1 || edges.length > 0
        ? "canonical"
        : "empty";

    const lastUpdated = new Date().toISOString();
    const summary: GraphProjectionSummaryDTO = {
      project: meta.name || project,
      nodes: nodes.length,
      edges: edges.length,
      characters: characters.length,
      chapters: chapters.length,
      loreFacts: facts.length,
      entities: neo4jEntities.length,
      isConnectedToNeo4j: connected,
      lastUpdated,
    };

    return {
      project,
      locale,
      source,
      generatedAt: lastUpdated,
      summary,
      nodes,
      edges,
      warnings,
    };
  }

  private buildProjectNode(project: string, meta: ProjectMeta, locale: GraphLocale): GraphFlowNodeDTO {
    return {
      id: `project:${project}`,
      type: "project",
      position: positionFor(0, "project"),
      data: {
        label: localizeString(meta.name || project, locale, project),
        subtitle: localizeString(meta.genre || "project", locale, meta.genre || "project"),
        description: localizeString(meta.description || "Project overview", locale, meta.description || "Project overview"),
        kind: "project",
        project,
        source: "canonical",
        confidence: 1,
        createdAt: meta.created,
        updatedAt: new Date().toISOString(),
        details: {
          mode: meta.mode,
          livingBibleSynced: meta.living_bible_synced,
          version: meta.version,
          ontologyPlugins: meta.ontology_plugins ?? [],
        },
      },
    };
  }

  private buildDocumentNode(
    project: string,
    idSuffix: "world_bible" | "outline",
    title: string,
    description: string,
    kind: GraphNodeKind,
    locale: GraphLocale,
    index: number,
    options: { source: GraphSourceKind; temporal?: GraphTemporalDTO; details?: Record<string, unknown> },
  ): GraphFlowNodeDTO {
    return {
      id: `${idSuffix}:${project}`,
      type: idSuffix,
      position: positionFor(index, kind),
      data: {
        label: localizeString(title, locale, title),
        subtitle: localizeString(kind === "outline" ? "Outline" : "World Bible", locale, kind === "outline" ? "Outline" : "World Bible"),
        description: localizeString(description, locale, description),
        kind,
        project,
        source: options.source,
        temporal: options.temporal,
        details: options.details,
      },
    };
  }

  private buildChapterNode(project: string, chapter: ChapterFileRecord, locale: GraphLocale, index: number): GraphFlowNodeDTO {
    return {
      id: `chapter:${project}:${String(chapter.number).padStart(2, "0")}`,
      type: "chapter",
      position: positionForChapter(index, chapter.number),
      data: {
        label: localizeString(chapter.title, locale, chapter.title),
        subtitle: localizeString(`Chapter ${chapter.number}`, locale, `Chapter ${chapter.number}`),
        description: localizeString(chapter.summary ?? `Chapter ${chapter.number}`, locale, chapter.summary ?? `Chapter ${chapter.number}`),
        kind: "chapter",
        project,
        source: "canonical",
        chapter: chapter.number,
        temporal: temporalFromChapter(chapter.number),
        createdAt: chapter.createdAt,
        updatedAt: chapter.updatedAt,
        details: { file: chapter.file },
      },
    };
  }

  private buildCharacterNode(project: string, character: CharacterFileRecord, locale: GraphLocale, index: number): GraphFlowNodeDTO {
    return {
      id: `character:${project}:${slugify(character.name)}`,
      type: "character",
      position: positionFor(index, "character"),
      data: {
        label: localizeString(character.name, locale, character.name),
        subtitle: localizeString(character.role || "character", locale, character.role || "character"),
        description: localizeString(character.backstory || character.arc || character.notes || character.name, locale, character.backstory || character.arc || character.notes || character.name),
        kind: "character",
        project,
        source: "canonical",
        createdAt: character.createdAt,
        updatedAt: character.updatedAt,
        details: {
          role: character.role,
          arc: character.arc,
          traits: character.traits ?? [],
          notes: character.notes,
          file: character.file,
        },
      },
    };
  }

  private buildLoreFactNode(project: string, fact: LoreFact, locale: GraphLocale, index: number): GraphFlowNodeDTO {
    return {
      id: `lore_fact:${project}:${slugify(`${fact.category}:${fact.key}`)}`,
      type: "lore_fact",
      position: positionFor(index, "lore_fact"),
      data: {
        label: fact.localized?.key ? localizeText(fact.localized.key, locale, fact.key) : localizeString(fact.key, locale, fact.key),
        subtitle: localizeString(fact.category, locale, fact.category),
        description: fact.localized?.value ? localizeText(fact.localized.value, locale, fact.value) : localizeString(fact.value, locale, fact.value),
        kind: "lore_fact",
        project,
        source: "canonical",
        confidence: fact.confidence,
        chapter: fact.chapter,
        temporal: fact.temporal ? temporalFromEntity(fact.temporal) : (fact.chapter !== undefined ? temporalFromChapter(fact.chapter) : undefined),
        causal: causalFromEntity(fact.causal),
        createdAt: fact.added,
        details: {
          category: fact.category,
          source: fact.source,
          temporal: fact.temporal,
          causal: fact.causal,
        },
      },
    };
  }

  private buildEntityNode(entity: EntityNode, project: string, locale: GraphLocale, index: number): GraphFlowNodeDTO {
    return {
      id: `entity:${project}:${slugify(entity.name)}`,
      type: entity.type || "entity",
      position: positionFor(index, "entity"),
      data: {
        label: this.resolveLocalizedEntityName(entity.localized, entity.name, locale),
        subtitle: localizeString(entity.type, locale, entity.type),
        description: this.resolveLocalizedEntityDescription(entity.localized, entity.observations, locale, entity.name),
        kind: "entity",
        project,
        source: "neo4j",
        confidence: entity.confidence,
        aliases: entity.aliases,
        tags: entity.tags,
        temporal: temporalFromEntity(entity.temporal),
        causal: causalFromEntity(entity.causal),
        createdAt: entity.created,
        updatedAt: entity.updated,
        chapter: entity.chapter,
        details: {
          entityId: entity.id,
          properties: entity.properties,
          provenance: entity.provenance,
          causal: entity.causal,
        },
      },
    };
  }

  private buildTimelineEventNode(project: string, event: TimelineEvent, locale: GraphLocale, index: number): GraphFlowNodeDTO {
    return {
      id: `event:${project}:${slugify(`${event.chapter}:${event.entity}:${event.event}`)}`,
      type: "event",
      position: positionFor(index, "event"),
      data: {
        label: event.localized?.event ? localizeText(event.localized.event, locale, event.event) : localizeString(event.event, locale, event.event),
        subtitle: localizeString(`${event.entity}${event.targetEntity ? ` → ${event.targetEntity}` : ""}`, locale, `${event.entity}${event.targetEntity ? ` → ${event.targetEntity}` : ""}`),
        description: localizeString(event.event, locale, event.event),
        kind: "event",
        project,
        source: "neo4j",
        confidence: event.confidence,
        temporal: temporalFromEntity(event.temporal),
        causal: causalFromEntity(event.causal),
        chapter: event.chapter,
        details: {
          entity: event.entity,
          targetEntity: event.targetEntity,
          relationType: event.relationType,
          causal: event.causal,
          provenance: event.provenance,
        },
      },
    };
  }

  private buildRelationEdge(relation: RelationEdge, locale: GraphLocale): GraphFlowEdgeDTO {
    return {
      id: `edge:${relation.id}`,
      source: `entity:${relation.project}:${slugify(relation.from)}`,
      target: `entity:${relation.project}:${slugify(relation.to)}`,
      type: relation.type,
      data: {
        label: this.resolveLocalizedRelationLabel(relation.localized, relation.type, locale),
        relationType: relation.type,
        project: relation.project,
        source: "neo4j",
        confidence: relation.confidence,
        temporal: temporalFromEntity(relation.temporal),
        causal: causalFromEntity(relation.causal),
        createdAt: relation.created,
        updatedAt: relation.updated,
        details: {
          properties: relation.properties,
          provenance: relation.provenance,
          causal: relation.causal,
        },
      },
    };
  }

  private connectNodes(
    source: string,
    target: string,
    project: string,
    relationType: string,
    locale: GraphLocale,
    sourceKind: GraphSourceKind,
    temporal?: GraphTemporalDTO,
  ): GraphFlowEdgeDTO {
    return {
      id: `edge:${source}->${target}:${relationType}`,
      source,
      target,
      type: relationType,
      data: {
        label: localizeString(relationType.replace(/_/g, " "), locale, relationType.replace(/_/g, " ")),
        relationType,
        project,
        source: sourceKind,
        temporal,
      },
    };
  }

  private resolveLocalizedEntityName(localized: EntityLocalization | undefined, fallback: string, locale: GraphLocale): GraphResolvedText {
    return localizeText(localized?.name, locale, fallback);
  }

  private resolveLocalizedEntityDescription(localized: EntityLocalization | undefined, observations: string[], locale: GraphLocale, fallback: string): GraphResolvedText {
    const preferred = localized?.observations?.[0];
    const defaultObservation = observations[0] ?? fallback;
    return preferred ? localizeText(preferred, locale, defaultObservation) : localizeString(defaultObservation, locale, defaultObservation);
  }

  private resolveLocalizedRelationLabel(localized: RelationLocalization | undefined, fallback: string, locale: GraphLocale): GraphResolvedText {
    const fallbackLabel = fallback.replace(/_/g, " ");
    return localized?.label ? localizeText(localized.label, locale, fallbackLabel) : localizeString(fallbackLabel, locale, fallbackLabel);
  }

  private findMentions(text: string, names: string[]): string[] {
    const haystack = text.toLowerCase();
    return names.filter((name) => haystack.includes(name.toLowerCase()));
  }

  private async safeReadProjectMeta(project: string, warnings: string[]): Promise<ProjectMeta> {
    try {
      return await this.projectService.getProjectMeta(project);
    } catch (error: unknown) {
      warnings.push(`Project metadata unavailable: ${String(error)}`);
      return this.fallbackProjectMeta(project);
    }
  }

  private fallbackProjectMeta(project: string): ProjectMeta {
    return {
      name: project,
      genre: "unknown",
      description: "",
      created: new Date().toISOString(),
      mode: "solo_author",
      living_bible_synced: false,
      version: "0.0.0",
    };
  }

  private async safeReadWorldBible(project: string, warnings: string[]): Promise<string | null> {
    try {
      return await this.projectService.readWorldBible(project);
    } catch (error: unknown) {
      warnings.push(`World bible unavailable: ${String(error)}`);
      return null;
    }
  }

  private async safeReadOutline(project: string, warnings: string[]): Promise<OutlineFileRecord | null> {
    const outlinePath = path.join(this.projectsRoot, project, "outline.json");
    try {
      if (!(await fs.pathExists(outlinePath))) return null;
      return (await fs.readJson(outlinePath)) as OutlineFileRecord;
    } catch (error: unknown) {
      warnings.push(`Outline unavailable: ${String(error)}`);
      return null;
    }
  }

  private async safeReadLoreFacts(project: string, warnings: string[]): Promise<LoreFact[]> {
    try {
      return await this.projectService.readLoreFacts(project);
    } catch (error: unknown) {
      warnings.push(`Lore facts unavailable: ${String(error)}`);
      return [];
    }
  }

  private async safeReadCharacters(project: string, warnings: string[]): Promise<CharacterFileRecord[]> {
    const indexPath = path.join(this.projectsRoot, project, "characters", "index.json");
    try {
      if (!(await fs.pathExists(indexPath))) return [];
      const index = (await fs.readJson(indexPath)) as Record<string, ProjectCharacterIndexEntry>;
      const entries = await Promise.all(Object.values(index).map(async (entry): Promise<CharacterFileRecord> => {
        const filePath = entry.file ? path.join(this.projectsRoot, project, "characters", entry.file) : null;
        const raw = filePath && await fs.pathExists(filePath) ? await fs.readJson(filePath) as Record<string, unknown> : {};
        return {
          name: entry.name,
          role: entry.role,
          backstory: typeof raw.backstory === "string" ? raw.backstory : undefined,
          arc: typeof raw.arc === "string" ? raw.arc : undefined,
          traits: Array.isArray(raw.traits) ? raw.traits.filter((value): value is string => typeof value === "string") : undefined,
          notes: typeof raw.notes === "string" ? raw.notes : undefined,
          createdAt: typeof raw.created === "string" ? raw.created : undefined,
          updatedAt: typeof raw.updated === "string" ? raw.updated : undefined,
          file: entry.file,
        };
      }));
      return entries;
    } catch (error: unknown) {
      warnings.push(`Characters unavailable: ${String(error)}`);
      return [];
    }
  }

  private async safeReadChapters(project: string, warnings: string[]): Promise<ChapterFileRecord[]> {
    const chaptersDir = path.join(this.projectsRoot, project, "chapters");
    const indexPath = path.join(chaptersDir, "index.json");
    try {
      const entries: Array<{ number?: number; title?: string; summary?: string; file?: string }> = [];
      if (await fs.pathExists(indexPath)) {
        const index = await fs.readJson(indexPath) as Record<string, { number?: number; title?: string; summary?: string; file?: string }> | Array<{ number?: number; title?: string; summary?: string; file?: string }>;
        if (Array.isArray(index)) {
          entries.push(...index);
        } else {
          entries.push(...Object.values(index));
        }
      } else if (await fs.pathExists(chaptersDir)) {
        const files = (await fs.readdir(chaptersDir)).filter((file) => /^chapter_\d+\.md$/i.test(file));
        for (const file of files) {
          const match = file.match(/chapter_(\d+)\.md/i);
          if (match) entries.push({ number: Number(match[1]), file });
        }
      }

      const resolved = await Promise.all(entries.map(async (entry): Promise<ChapterFileRecord | null> => {
        const number = entry.number ?? this.parseChapterNumber(entry.file);
        if (!number) return null;
        const fileName = entry.file ?? `chapter_${String(number).padStart(2, "0")}.md`;
        const filePath = path.join(chaptersDir, fileName);
        const exists = await fs.pathExists(filePath);
        const content = exists ? await fs.readFile(filePath, "utf-8") : undefined;
        const stat = exists ? await fs.stat(filePath) : null;
        return {
          number,
          title: entry.title ?? this.extractChapterTitle(content) ?? `Chapter ${number}`,
          summary: entry.summary ?? this.extractChapterSummary(content),
          content,
          createdAt: stat?.birthtime?.toISOString(),
          updatedAt: stat?.mtime?.toISOString(),
          file: fileName,
        };
      }));

      return resolved.filter((item): item is ChapterFileRecord => item !== null).sort((left, right) => left.number - right.number);
    } catch (error: unknown) {
      warnings.push(`Chapters unavailable: ${String(error)}`);
      return [];
    }
  }

  private parseChapterNumber(file?: string): number | null {
    if (!file) return null;
    const match = file.match(/chapter_(\d+)\.md/i);
    return match ? Number(match[1]) : null;
  }

  private extractChapterTitle(content?: string): string | undefined {
    if (!content) return undefined;
    const heading = content.match(/^#\s+(.+)$/m);
    return heading?.[1]?.trim();
  }

  private extractChapterSummary(content?: string): string | undefined {
    if (!content) return undefined;
    const summary = content.match(/^\*\*Summary:\*\*\s*(.+)$/m);
    if (summary?.[1]) return summary[1].trim();
    const lines = content.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    return lines.find((line) => !line.startsWith("#") && !line.startsWith("**"));
  }
}

export function createGraphProjectionService(
  projectsRoot: string,
  projectService: ProjectService = createProjectService(projectsRoot),
  loreService?: LoreService,
): GraphProjectionService {
  return new GraphProjectionService(projectsRoot, projectService, loreService);
}
