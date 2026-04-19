import fs from "fs-extra";
import path from "path";

import { createProjectService, type ProjectService } from "../../services/project-service.js";
import type { LocalizedTextMap } from "../../core/i18n/locales.js";
import type { LoreService } from "../../services/lore-service.js";
import type { Contradiction, LoreFact, RelationEdge, TimelineEvent } from "../../core/domain/entities.js";
import type {
  GraphForecastChainStepDTO,
  GraphForecastEvidenceDTO,
  GraphForecastResponseDTO,
  GraphForecastRiskDTO,
  GraphLocale,
} from "./graph-dtos.js";
import { resolveGraphText } from "./graph-localization.js";
import { clampForecastHorizon, normalizeGraphLocale, slugifyGraphId, uniqueNumbers } from "./graph-utils.js";

type ForecastOptions = {
  locale?: GraphLocale;
  horizon?: number;
};

type OutlineRecord = {
  beats?: Array<{ name?: string; description?: string; completed?: boolean }>;
};

type RiskSeverity = GraphForecastRiskDTO["severity"];

function severityScore(severity: RiskSeverity): number {
  if (severity === "critical") return 3;
  if (severity === "warning") return 2;
  return 1;
}

function buildEvidence(
  locale: GraphLocale,
  kind: GraphForecastEvidenceDTO["kind"],
  values: LocalizedTextMap,
  options: { chapter?: number; nodeIds?: string[]; edgeIds?: string[] } = {},
): GraphForecastEvidenceDTO {
  return {
    kind,
    label: resolveGraphText(locale, values),
    chapter: options.chapter,
    nodeIds: options.nodeIds,
    edgeIds: options.edgeIds,
  };
}

export class GraphForecastingService {
  constructor(
    private readonly projectsRoot: string,
    private readonly projectService: ProjectService = createProjectService(projectsRoot),
    private readonly loreService?: LoreService,
  ) {}

  public async forecastProject(project: string, options: ForecastOptions = {}): Promise<GraphForecastResponseDTO> {
    const locale = normalizeGraphLocale(options.locale);
    const horizon = clampForecastHorizon(options.horizon);

    const [facts, outline, chapters, timelineEvents, causalRelations, contradictions] = await Promise.all([
      this.projectService.readLoreFacts(project).catch(() => [] as LoreFact[]),
      this.readOutline(project),
      this.readChapterNumbers(project),
      this.readTimelineEvents(project),
      this.readCausalRelations(project, horizon),
      this.readContradictions(project),
    ]);

    const currentChapter = Math.max(0, ...chapters, ...facts.map((fact) => fact.chapter ?? 0), ...timelineEvents.map((event) => event.chapter ?? 0));
    const futureLimit = currentChapter + horizon;
    const risks: GraphForecastRiskDTO[] = [];

    risks.push(...this.buildContradictionRisks(project, locale, contradictions));
    risks.push(...this.buildTimelineGapRisks(project, locale, currentChapter, futureLimit, facts, timelineEvents));
    risks.push(...this.buildForeshadowingRisks(project, locale, currentChapter, futureLimit, facts, timelineEvents, causalRelations));
    risks.push(...this.buildCausalGapRisks(project, locale, currentChapter, futureLimit, timelineEvents, causalRelations));
    risks.push(...this.buildOutlineRisks(locale, currentChapter, futureLimit, outline));

    const deduped = Array.from(new Map(risks.map((risk) => [risk.id, risk])).values())
      .sort((left, right) => {
        const severityDiff = severityScore(right.severity) - severityScore(left.severity);
        if (severityDiff !== 0) return severityDiff;
        return right.confidence - left.confidence;
      })
      .slice(0, 12);

    return {
      project,
      locale,
      generatedAt: new Date().toISOString(),
      horizon,
      currentChapter,
      risks: deduped,
      summary: {
        total: deduped.length,
        critical: deduped.filter((risk) => risk.severity === "critical").length,
        warning: deduped.filter((risk) => risk.severity === "warning").length,
        info: deduped.filter((risk) => risk.severity === "info").length,
      },
    };
  }

  private buildContradictionRisks(project: string, locale: GraphLocale, contradictions: Contradiction[]): GraphForecastRiskDTO[] {
    return contradictions.map((contradiction) => {
      const severity: RiskSeverity = contradiction.severity === "error"
        ? "critical"
        : contradiction.severity === "warning"
          ? "warning"
          : "info";
      const nodeIds = [
        `entity:${project}:${slugifyGraphId(contradiction.entity)}`,
        `character:${project}:${slugifyGraphId(contradiction.entity)}`,
        ...(contradiction.relatedEntity ? [
          `entity:${project}:${slugifyGraphId(contradiction.relatedEntity)}`,
          `character:${project}:${slugifyGraphId(contradiction.relatedEntity)}`,
        ] : []),
      ];

      return {
        id: `contradiction:${project}:${slugifyGraphId(`${contradiction.entity}:${contradiction.issue}`)}`,
        type: contradiction.issue.toLowerCase().includes("orphaned") ? "orphaned_arc" : "contradiction",
        severity,
        confidence: severity === "critical" ? 0.92 : 0.76,
        title: resolveGraphText(locale, {
          en: contradiction.issue,
          ru: contradiction.issue.toLowerCase().includes("orphaned")
            ? `Изолированная сюжетная линия: ${contradiction.entity}`
            : `Противоречие: ${contradiction.entity}`,
        }),
        summary: resolveGraphText(locale, {
          en: contradiction.details ?? contradiction.issue,
          ru: contradiction.details
            ? `Детали: ${contradiction.details}`
            : `Проверьте сущность "${contradiction.entity}" и связанные факты перед дальнейшими главами.`,
        }),
        impactedChapters: uniqueNumbers([contradiction.chapter]),
        evidence: [
          buildEvidence(locale, contradiction.issue.toLowerCase().includes("orphaned") ? "entity" : "contradiction", {
            en: contradiction.issue,
            ru: contradiction.issue.toLowerCase().includes("orphaned")
              ? `Сущность "${contradiction.entity}" не связана с остальным графом`
              : `Обнаружено противоречие для "${contradiction.entity}"`,
          }, { chapter: contradiction.chapter, nodeIds }),
        ],
        nodeIds,
      };
    });
  }

  private buildTimelineGapRisks(
    project: string,
    locale: GraphLocale,
    currentChapter: number,
    futureLimit: number,
    facts: LoreFact[],
    timelineEvents: TimelineEvent[],
  ): GraphForecastRiskDTO[] {
    const chapterAnchors = uniqueNumbers([
      ...facts.map((fact) => fact.chapter),
      ...timelineEvents.map((event) => event.chapter),
    ]);

    const risks: GraphForecastRiskDTO[] = [];
    for (let index = 1; index < chapterAnchors.length; index += 1) {
      const previous = chapterAnchors[index - 1];
      const current = chapterAnchors[index];
      if (current - previous < 4) continue;
      if (current <= currentChapter || previous > futureLimit) continue;

      const impacted = uniqueNumbers(Array.from({ length: current - previous - 1 }, (_, offset) => previous + offset + 1).filter((chapter) => chapter > currentChapter && chapter <= futureLimit));
      if (impacted.length === 0) continue;

      risks.push({
        id: `timeline-gap:${project}:${previous}-${current}`,
        type: "timeline_gap",
        severity: impacted.length > 3 ? "warning" : "info",
        confidence: impacted.length > 3 ? 0.72 : 0.6,
        title: resolveGraphText(locale, {
          en: `Timeline gap between chapters ${previous} and ${current}`,
          ru: `Пробел в таймлайне между главами ${previous} и ${current}`,
        }),
        summary: resolveGraphText(locale, {
          en: `The graph has no temporal anchors for chapters ${impacted.join(", ")}. This makes continuity drift more likely within the next ${impacted.length} chapter(s).`,
          ru: `В графе нет временных опор для глав ${impacted.join(", ")}. Это повышает риск потери непрерывности в ближайших ${impacted.length} главах.`,
        }),
        impactedChapters: impacted,
        evidence: [
          buildEvidence(locale, "timeline", {
            en: `Known anchors: chapter ${previous} and chapter ${current}`,
            ru: `Известные временные точки: глава ${previous} и глава ${current}`,
          }),
        ],
      });
    }

    return risks;
  }

  private buildForeshadowingRisks(
    project: string,
    locale: GraphLocale,
    currentChapter: number,
    futureLimit: number,
    facts: LoreFact[],
    timelineEvents: TimelineEvent[],
    causalRelations: RelationEdge[],
  ): GraphForecastRiskDTO[] {
    const risks: GraphForecastRiskDTO[] = [];

    for (const fact of facts) {
      const forecastHorizon = fact.causal?.forecastHorizonChapters;
      if (!forecastHorizon || !fact.chapter) continue;
      const expectedChapter = fact.chapter + forecastHorizon;
      if (expectedChapter <= currentChapter || expectedChapter > futureLimit) continue;

      const hasResolution = facts.some((candidate) =>
        (candidate.chapter ?? 0) >= expectedChapter &&
        (candidate.key.toLowerCase() === fact.key.toLowerCase() || candidate.value.toLowerCase().includes(fact.key.toLowerCase())),
      ) || timelineEvents.some((candidate) =>
        candidate.chapter >= expectedChapter &&
        (candidate.entity.toLowerCase() === fact.key.toLowerCase() || candidate.targetEntity?.toLowerCase() === fact.key.toLowerCase()),
      );

      if (hasResolution) continue;

      const nodeIds = [`lore_fact:${project}:${slugifyGraphId(`${fact.category}:${fact.key}`)}`];
      risks.push({
        id: `foreshadowing:${project}:${slugifyGraphId(`${fact.key}:${expectedChapter}`)}`,
        type: "foreshadowing_gap",
        severity: "warning",
        confidence: 0.74,
        title: resolveGraphText(locale, {
          en: `Foreshadowed thread may stall by chapter ${expectedChapter}`,
          ru: `Намеченная линия может зависнуть к главе ${expectedChapter}`,
        }),
        summary: resolveGraphText(locale, {
          en: `The fact "${fact.key}" projects forward ${forecastHorizon} chapter(s), but the graph does not show a matching payoff yet.`,
          ru: `Факт "${fact.key}" протянут вперёд на ${forecastHorizon} глав, но в графе пока не видно соответствующей развязки.`,
        }),
        impactedChapters: [expectedChapter],
        evidence: [
          buildEvidence(locale, "fact", {
            en: `${fact.key}: ${fact.value}`,
            ru: `${fact.key}: ${fact.value}`,
          }, { chapter: fact.chapter, nodeIds }),
        ],
        nodeIds,
      });
    }

    for (const relation of causalRelations) {
      const forecastHorizon = relation.causal?.forecastHorizonChapters;
      const anchorChapter = relation.temporal?.chapterSpanStart ?? relation.temporal?.chapterSpanEnd ?? relation.chapter;
      if (!forecastHorizon || !anchorChapter) continue;
      const expectedChapter = anchorChapter + forecastHorizon;
      if (expectedChapter <= currentChapter || expectedChapter > futureLimit) continue;

      const chainExists = timelineEvents.some((event) =>
        event.chapter >= expectedChapter &&
        (event.entity === relation.from || event.entity === relation.to || event.targetEntity === relation.from || event.targetEntity === relation.to),
      );

      if (chainExists) continue;

      const edgeId = relation.id ? `edge:${relation.id}` : undefined;
      risks.push({
        id: `causal-foreshadowing:${project}:${slugifyGraphId(`${relation.from}:${relation.type}:${relation.to}:${expectedChapter}`)}`,
        type: "foreshadowing_gap",
        severity: "warning",
        confidence: 0.71,
        title: resolveGraphText(locale, {
          en: `Causal setup lacks a visible payoff by chapter ${expectedChapter}`,
          ru: `Причинная связка не получает видимой развязки к главе ${expectedChapter}`,
        }),
        summary: resolveGraphText(locale, {
          en: `${relation.from} ${relation.type.replace(/_/g, " ").toLowerCase()} ${relation.to}, but no projected follow-up appears in the next ${forecastHorizon} chapter(s).`,
          ru: `Связь ${relation.from} → ${relation.to} (${relation.type.replace(/_/g, " ").toLowerCase()}) пока не получает продолжения в ближайших ${forecastHorizon} главах.`,
        }),
        impactedChapters: [expectedChapter],
        evidence: [
          buildEvidence(locale, "relation", {
            en: `${relation.from} ${relation.type.replace(/_/g, " ")} ${relation.to}`,
            ru: `${relation.from} ${relation.type.replace(/_/g, " ")} ${relation.to}`,
          }, { chapter: anchorChapter, edgeIds: edgeId ? [edgeId] : undefined }),
        ],
        causalChain: [{
          from: relation.from,
          relation: relation.type,
          to: relation.to,
          confidence: relation.causal?.causeConfidence ?? relation.confidence,
          edgeId,
        }],
        edgeIds: edgeId ? [edgeId] : undefined,
      });
    }

    return risks;
  }

  private buildCausalGapRisks(
    project: string,
    locale: GraphLocale,
    currentChapter: number,
    futureLimit: number,
    timelineEvents: TimelineEvent[],
    causalRelations: RelationEdge[],
  ): GraphForecastRiskDTO[] {
    const risks: GraphForecastRiskDTO[] = [];

    for (const relation of causalRelations) {
      const anchorChapter = relation.temporal?.chapterSpanStart ?? relation.temporal?.chapterSpanEnd ?? relation.chapter;
      if (!anchorChapter || anchorChapter <= currentChapter || anchorChapter > futureLimit) continue;
      if ((relation.causal?.causeConfidence ?? relation.confidence) < 0.7) continue;

      const hasPrecondition = timelineEvents.some((event) =>
        event.chapter < anchorChapter &&
        (event.entity === relation.from || event.targetEntity === relation.from),
      );
      if (hasPrecondition) continue;

      const edgeId = relation.id ? `edge:${relation.id}` : undefined;
      risks.push({
        id: `causal-gap:${project}:${slugifyGraphId(`${relation.from}:${relation.type}:${relation.to}:${anchorChapter}`)}`,
        type: "causal_gap",
        severity: "critical",
        confidence: 0.84,
        title: resolveGraphText(locale, {
          en: `High-impact causal jump around chapter ${anchorChapter}`,
          ru: `Резкий причинный скачок около главы ${anchorChapter}`,
        }),
        summary: resolveGraphText(locale, {
          en: `A strong causal relation is scheduled near chapter ${anchorChapter}, but the graph does not show enough earlier setup for ${relation.from}.`,
          ru: `Сильная причинная связь намечена около главы ${anchorChapter}, но в графе пока не видно достаточной подготовки для ${relation.from}.`,
        }),
        impactedChapters: [anchorChapter],
        evidence: [
          buildEvidence(locale, "relation", {
            en: `${relation.from} ${relation.type.replace(/_/g, " ")} ${relation.to}`,
            ru: `${relation.from} ${relation.type.replace(/_/g, " ")} ${relation.to}`,
          }, { chapter: anchorChapter, edgeIds: edgeId ? [edgeId] : undefined }),
        ],
        causalChain: [{
          from: relation.from,
          relation: relation.type,
          to: relation.to,
          confidence: relation.causal?.causeConfidence ?? relation.confidence,
          edgeId,
        }],
        nodeIds: [
          `entity:${project}:${slugifyGraphId(relation.from)}`,
          `entity:${project}:${slugifyGraphId(relation.to)}`,
        ],
        edgeIds: edgeId ? [edgeId] : undefined,
      });
    }

    return risks;
  }

  private buildOutlineRisks(
    locale: GraphLocale,
    currentChapter: number,
    futureLimit: number,
    outline: OutlineRecord | null,
  ): GraphForecastRiskDTO[] {
    if (!outline?.beats?.length) return [];

    const incomplete = outline.beats.filter((beat) => !beat.completed);
    if (incomplete.length === 0) return [];

    return [{
      id: `outline-risk:${currentChapter}:${futureLimit}:${incomplete.length}`,
      type: "orphaned_arc",
      severity: incomplete.length >= 4 ? "warning" : "info",
      confidence: incomplete.length >= 4 ? 0.63 : 0.52,
      title: resolveGraphText(locale, {
        en: "Several future beats remain structurally unresolved",
        ru: "Несколько будущих битов остаются структурно неразрешёнными",
      }),
      summary: resolveGraphText(locale, {
        en: `${incomplete.length} outline beat(s) are still open while the forecast window reaches chapter ${futureLimit}. This can turn into dangling arcs if the graph does not gain new links soon.`,
        ru: `${incomplete.length} битов плана всё ещё не закрыты, а окно прогноза уже доходит до главы ${futureLimit}. Без новых связей в графе это легко превращается в висящие линии.`,
      }),
      impactedChapters: uniqueNumbers([currentChapter + 1, futureLimit]),
      evidence: incomplete.slice(0, 3).map((beat, index) => buildEvidence(locale, "outline", {
        en: beat.name || `Open beat ${index + 1}`,
        ru: beat.name || `Незавершённый бит ${index + 1}`,
      })),
    }];
  }

  private async readOutline(project: string): Promise<OutlineRecord | null> {
    const outlinePath = path.join(this.projectService.projectDir(project), "outline.json");
    if (!await fs.pathExists(outlinePath)) return null;
    return fs.readJson(outlinePath) as Promise<OutlineRecord>;
  }

  private async readChapterNumbers(project: string): Promise<number[]> {
    const chaptersDir = path.join(this.projectService.projectDir(project), "chapters");
    if (!await fs.pathExists(chaptersDir)) return [];
    const files = await fs.readdir(chaptersDir);
    return uniqueNumbers(files.map((file) => {
      const match = file.match(/^chapter_(\d+)\.md$/i);
      return match ? Number(match[1]) : undefined;
    }));
  }

  private async readTimelineEvents(project: string): Promise<TimelineEvent[]> {
    if (!this.loreService?.isConnected) return [];
    return this.loreService.getTimelineEvents(project).catch(() => [] as TimelineEvent[]);
  }

  private async readCausalRelations(project: string, horizon: number): Promise<RelationEdge[]> {
    if (!this.loreService?.isConnected) return [];
    return this.loreService.getCausalRelations(project, { maxDistance: horizon, minConfidence: 0.4 }).catch(() => [] as RelationEdge[]);
  }

  private async readContradictions(project: string): Promise<Contradiction[]> {
    if (!this.loreService?.isConnected) return [];
    return this.loreService.findContradictions(project).catch(() => [] as Contradiction[]);
  }
}
