export interface GraphI18nMessages {
  exact: Record<string, string>;
  chapter(number: string): string;
  chapterShort(number: string): string;
  forecast: {
    contradictionTitle(issue: string, entity: string): string;
    contradictionSummary(details: string | undefined, entity: string): string;
    contradictionEvidence(issue: string, entity: string): string;
    timelineGapTitle(previous: number, current: number): string;
    timelineGapSummary(impacted: number[]): string;
    timelineEvidence(previous: number, current: number): string;
    foreshadowingFactTitle(expectedChapter: number): string;
    foreshadowingFactSummary(key: string, forecastHorizon: number): string;
    causalForeshadowingTitle(expectedChapter: number): string;
    causalForeshadowingSummary(from: string, relationType: string, to: string, forecastHorizon: number): string;
    causalGapTitle(anchorChapter: number): string;
    causalGapSummary(anchorChapter: number, from: string): string;
    outlineTitle: string;
    outlineSummary(incompleteCount: number, futureLimit: number): string;
    openBeat(index: number): string;
  };
}
