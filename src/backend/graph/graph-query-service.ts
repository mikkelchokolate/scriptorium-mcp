import fs from "fs-extra";
import path from "path";

import { createProjectService, type ProjectService } from "../../services/project-service.js";
import type { LoreService } from "../../services/lore-service.js";
import type { LocalizedText, LoreFact } from "../../core/domain/entities.js";
import type {
  GraphCapabilitiesDTO,
  GraphCausalDTO,
  GraphForecastResponseDTO,
  GraphLocale,
  GraphProjectSummaryDTO,
  GraphTemporalDTO,
  GraphTimelineEntryDTO,
  GraphTimelineResponseDTO,
} from "./graph-dtos.js";
import { GraphProjectionService } from "./graph-projection.js";
import { GraphForecastingService } from "./graph-forecasting-service.js";
import { localizeGraphString, resolveGraphText } from "./graph-localization.js";
import { MAX_FORECAST_HORIZON, SUPPORTED_GRAPH_LOCALES, slugifyGraphId, uniqueNumbers } from "./graph-utils.js";

type QueryOptions = {
  locale?: GraphLocale;
};

function normalizeLocale(locale?: string): GraphLocale {
  return locale === "ru" ? "ru" : "en";
}

function toTemporalDTO(input?: {
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

function toCausalDTO(input?: {
  causeConfidence?: number;
  causalPolarity?: string;
  causalDistance?: number;
  evidenceSource?: string;
  forecastHorizonChapters?: number;
}): GraphCausalDTO | undefined {
  if (!input) return undefined;
  const causal: GraphCausalDTO = {
    causeConfidence: input.causeConfidence,
    causalPolarity: input.causalPolarity,
    causalDistance: input.causalDistance,
    evidenceSource: input.evidenceSource,
    forecastHorizonChapters: input.forecastHorizonChapters,
  };
  return Object.values(causal).some((value) => value !== undefined) ? causal : undefined;
}

function resolveLocalizedFactText(locale: GraphLocale, text: LocalizedText | undefined, fallback: string) {
  return resolveGraphText(locale, {
    en: text?.en?.trim() || fallback,
    ru: text?.ru?.trim() || fallback,
  });
}

export class GraphQueryService {
  constructor(
    private readonly projectsRoot: string,
    private readonly projectService: ProjectService = createProjectService(projectsRoot),
    private readonly loreService?: LoreService,
    private readonly projectionService: GraphProjectionService = new GraphProjectionService(projectsRoot, projectService, loreService),
    private readonly forecastingService: GraphForecastingService = new GraphForecastingService(projectsRoot, projectService, loreService),
  ) {}

  public async getSnapshot(project: string, options: QueryOptions = {}) {
    return this.projectionService.buildSnapshot(project, { locale: options.locale, includeNeo4j: true });
  }

  public async getForecast(project: string, options: QueryOptions & { horizon?: number } = {}): Promise<GraphForecastResponseDTO> {
    return this.forecastingService.forecastProject(project, { locale: options.locale, horizon: options.horizon });
  }

  public async getTimeline(project: string, options: QueryOptions = {}): Promise<GraphTimelineResponseDTO> {
    const locale = normalizeLocale(options.locale);
    const entries = this.loreService?.isConnected
      ? await this.getNeo4jTimeline(project, locale)
      : await this.getFileTimeline(project, locale);

    return {
      project,
      locale,
      generatedAt: new Date().toISOString(),
      entries,
    };
  }

  public async listProjects(): Promise<GraphProjectSummaryDTO[]> {
    const projects = await this.projectService.listProjects();
    const summaries = await Promise.all(projects.map(async (project) => {
      const projectDir = this.projectService.projectDir(project);
      const [meta, chapters, characters] = await Promise.all([
        this.projectService.getProjectMeta(project).catch(() => null),
        fs.readdir(path.join(projectDir, "chapters")).catch(() => [] as string[]),
        fs.readdir(path.join(projectDir, "characters")).catch(() => [] as string[]),
      ]);

      return {
        slug: project,
        title: meta?.name || project,
        chapterCount: chapters.filter((file) => /^chapter_\d+\.md$/i.test(file)).length,
        characterCount: characters.filter((file) => file.endsWith(".json") && file !== "index.json").length,
        updatedAt: meta?.created,
      };
    }));

    return summaries.sort((left, right) => left.slug.localeCompare(right.slug));
  }

  public getCapabilities(): GraphCapabilitiesDTO {
    return {
      locales: [...SUPPORTED_GRAPH_LOCALES],
      defaultLocale: "en",
      neo4jConnected: Boolean(this.loreService?.isConnected),
      forecastingAvailable: true,
      liveUpdatesAvailable: true,
      websocketPath: "/ws/projects/:project/graph",
      snapshotPathTemplate: "/api/projects/:project/graph",
      forecastPathTemplate: "/api/projects/:project/graph/forecast",
      timelinePathTemplate: "/api/projects/:project/graph/timeline",
      projectsPath: "/api/projects",
      maxForecastHorizon: MAX_FORECAST_HORIZON,
    };
  }

  private async getNeo4jTimeline(project: string, locale: GraphLocale): Promise<GraphTimelineEntryDTO[]> {
    const events = await this.loreService?.getTimelineEvents(project).catch(() => []) ?? [];
    if (events.length === 0) {
      return this.getFileTimeline(project, locale);
    }

    return events.map((event) => ({
      id: event.id ?? `timeline:${project}:${slugifyGraphId(`${event.chapter}:${event.entity}:${event.event}`)}`,
      project,
      source: "neo4j",
      label: event.localized?.event
        ? resolveLocalizedFactText(locale, event.localized.event, event.event)
        : localizeGraphString(event.event, locale, event.event),
      subtitle: localizeGraphString(`${event.entity}${event.targetEntity ? ` -> ${event.targetEntity}` : ""}`, locale, `${event.entity}${event.targetEntity ? ` -> ${event.targetEntity}` : ""}`),
      description: localizeGraphString(event.relationType || event.event, locale, event.relationType || event.event),
      chapter: event.chapter,
      confidence: event.confidence,
      temporal: toTemporalDTO({
        start: event.temporal?.start,
        end: event.temporal?.end,
        duration: event.temporal?.duration,
        chapterSpanStart: event.temporal?.chapterSpanStart,
        chapterSpanEnd: event.temporal?.chapterSpanEnd,
        timelineAxis: event.temporal?.timelineAxis,
        temporalPrecision: event.temporal?.temporalPrecision,
      }),
      causal: toCausalDTO({
        causeConfidence: event.causal?.causeConfidence,
        causalPolarity: event.causal?.causalPolarity,
        causalDistance: event.causal?.causalDistance,
        evidenceSource: event.causal?.evidenceSource,
        forecastHorizonChapters: event.causal?.forecastHorizonChapters,
      }),
      entity: event.entity,
      targetEntity: event.targetEntity,
      relationType: event.relationType,
      nodeIds: [
        `entity:${project}:${slugifyGraphId(event.entity)}`,
        ...(event.targetEntity ? [`entity:${project}:${slugifyGraphId(event.targetEntity)}`] : []),
      ],
    }));
  }

  private async getFileTimeline(project: string, locale: GraphLocale): Promise<GraphTimelineEntryDTO[]> {
    const facts = await this.projectService.readLoreFacts(project).catch(() => [] as LoreFact[]);
    return facts
      .filter((fact) => fact.chapter !== undefined || fact.temporal?.chapterSpanStart !== undefined || fact.temporal?.chapterSpanEnd !== undefined)
      .map((fact) => ({
        id: `timeline:${project}:${slugifyGraphId(`${fact.category}:${fact.key}`)}`,
        project,
        source: "canonical" as const,
        label: fact.localized?.key
          ? resolveLocalizedFactText(locale, fact.localized.key, fact.key)
          : localizeGraphString(fact.key, locale, fact.key),
        subtitle: localizeGraphString(fact.category, locale, fact.category),
        description: fact.localized?.value
          ? resolveLocalizedFactText(locale, fact.localized.value, fact.value)
          : localizeGraphString(fact.value, locale, fact.value),
        chapter: fact.chapter ?? fact.temporal?.chapterSpanStart ?? fact.temporal?.chapterSpanEnd ?? 0,
        confidence: fact.confidence,
        temporal: toTemporalDTO({
          start: fact.temporal?.start,
          end: fact.temporal?.end,
          duration: fact.temporal?.duration,
          chapterSpanStart: fact.temporal?.chapterSpanStart,
          chapterSpanEnd: fact.temporal?.chapterSpanEnd,
          timelineAxis: fact.temporal?.timelineAxis,
          temporalPrecision: fact.temporal?.temporalPrecision,
        }),
        causal: toCausalDTO({
          causeConfidence: fact.causal?.causeConfidence,
          causalPolarity: fact.causal?.causalPolarity,
          causalDistance: fact.causal?.causalDistance,
          evidenceSource: fact.causal?.evidenceSource,
          forecastHorizonChapters: fact.causal?.forecastHorizonChapters,
        }),
        nodeIds: [`lore_fact:${project}:${slugifyGraphId(`${fact.category}:${fact.key}`)}`],
      }))
      .sort((left, right) => left.chapter - right.chapter);
  }
}
