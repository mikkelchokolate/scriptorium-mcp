const dictionaries = {
  en: {
    heroEyebrow: "Live browser interface",
    heroTitle: "Scriptorium Graph Explorer",
    heroCopy: "Inspect your story world as a living graph, watch temporal signals and causal hints, and surface continuity risks before they reach the page.",
    projectInputPlaceholder: "Project slug (for example: my_novel)",
    openProject: "Open project",
    availableProjects: "Workspace",
    projectShelf: "Project shelf",
    projectShelfCopy: "Pick an existing project or type a slug manually to open the live graph explorer.",
    noProjects: "No projects were found in the graph service workspace yet.",
    capabilities: "Capabilities",
    liveLayer: "Live graph layer",
    liveLayerCopy: "This UI talks to the Scriptorium graph HTTP and WebSocket service, so the browser can track canonical file changes and Neo4j-derived signals together.",
    liveUpdates: "Live updates",
    forecasting: "Forecasting",
    neo4jStatus: "Neo4j",
    locales: "Locales",
    loading: "Loading…",
    loadingGraph: "Opening the graph explorer…",
    explorerEyebrow: "Visual graph explorer",
    live: "Live",
    connecting: "Connecting",
    offline: "Offline",
    fileMode: "File-first",
    nodesCount: "{{count}} nodes",
    edgesCount: "{{count}} edges",
    refresh: "Refresh",
    back: "Back",
    searchPlaceholder: "Search nodes, labels, edges…",
    snapshotSource: "Source: {{source}}",
    noGraphData: "The project has no graphable data yet.",
    snapshotSummary: "Snapshot",
    overview: "Overview",
    charactersSimple: "Characters",
    chaptersSimple: "Chapters",
    loreFactsSimple: "Lore facts",
    entitiesSimple: "Graph entities",
    selectedNode: "Selected node",
    nothingSelected: "Nothing selected",
    pickNode: "Click a node in the graph to inspect it.",
    temporal: "Temporal",
    forecastWindow: "Forecast window",
    forecastEyebrow: "Temporal + causal forecast",
    forecastTitle: "Plot-hole risk horizon",
    forecastCopy: "These warnings are derived from the current graph, chapter timeline, and causal markers for roughly the next ten chapters.",
    forecastCount: "{{count}} risks",
    criticalCount: "{{count}} critical",
    impactedChapters: "Impacted chapters: {{chapters}}",
    noForecastRisks: "No forecast risks surfaced right now.",
    timelineEyebrow: "Timeline",
    timelineTitle: "Temporal anchors",
    noTimeline: "No timeline entries are available yet.",
    chapters: "{{count}} chapters",
    characters: "{{count}} characters",
  },
  ru: {
    heroEyebrow: "Живой интерфейс в браузере",
    heroTitle: "Scriptorium Graph Explorer",
    heroCopy: "Смотри на мир книги как на живой граф, отслеживай временные и причинные сигналы и замечай риски непрерывности до того, как они попадут в текст.",
    projectInputPlaceholder: "Слаг проекта (например: my_novel)",
    openProject: "Открыть проект",
    availableProjects: "Воркспейс",
    projectShelf: "Полка проектов",
    projectShelfCopy: "Выбери существующий проект или введи слаг вручную, чтобы открыть live graph explorer.",
    noProjects: "В рабочем пространстве graph service пока нет проектов.",
    capabilities: "Возможности",
    liveLayer: "Живой графовый слой",
    liveLayerCopy: "Этот UI подключается к HTTP- и WebSocket-сервису Scriptorium, поэтому браузер видит и канонические файловые изменения, и сигналы, выведенные из Neo4j.",
    liveUpdates: "Live-обновления",
    forecasting: "Прогнозирование",
    neo4jStatus: "Neo4j",
    locales: "Локали",
    loading: "Загрузка…",
    loadingGraph: "Открываю графовый интерфейс…",
    explorerEyebrow: "Визуальный graph explorer",
    live: "Live",
    connecting: "Подключение",
    offline: "Оффлайн",
    fileMode: "Файловый режим",
    nodesCount: "{{count}} узлов",
    edgesCount: "{{count}} рёбер",
    refresh: "Обновить",
    back: "Назад",
    searchPlaceholder: "Искать узлы, подписи, рёбра…",
    snapshotSource: "Источник: {{source}}",
    noGraphData: "У проекта пока нет данных для графа.",
    snapshotSummary: "Снимок",
    overview: "Обзор",
    charactersSimple: "Персонажи",
    chaptersSimple: "Главы",
    loreFactsSimple: "Факты лора",
    entitiesSimple: "Граф-сущности",
    selectedNode: "Выбранный узел",
    nothingSelected: "Ничего не выбрано",
    pickNode: "Нажми на узел графа, чтобы посмотреть детали.",
    temporal: "Время",
    forecastWindow: "Окно прогноза",
    forecastEyebrow: "Временной и причинный прогноз",
    forecastTitle: "Горизонт рисков plot hole",
    forecastCopy: "Эти предупреждения выводятся из текущего графа, таймлайна глав и причинных маркеров примерно на ближайшие десять глав.",
    forecastCount: "{{count}} рисков",
    criticalCount: "{{count}} критических",
    impactedChapters: "Затронутые главы: {{chapters}}",
    noForecastRisks: "Сейчас прогноз не видит явных рисков.",
    timelineEyebrow: "Таймлайн",
    timelineTitle: "Временные опоры",
    noTimeline: "Временных записей пока нет.",
    chapters: "{{count}} глав",
    characters: "{{count}} персонажей",
  },
} as const;

export type AppLocale = keyof typeof dictionaries;
export const APP_LOCALES = Object.keys(dictionaries) as AppLocale[];
export const DEFAULT_APP_LOCALE = "en" as AppLocale;

const localeLabels: Partial<Record<AppLocale, string>> = {
  en: "English",
  ru: "Русский",
};

type AppDictionary = typeof dictionaries[typeof DEFAULT_APP_LOCALE];
export type AppTranslationKey = keyof AppDictionary;

export function isSupportedLocale(locale: string): locale is AppLocale {
  return Object.prototype.hasOwnProperty.call(dictionaries, locale);
}

export function otherLocales(locale: AppLocale): AppLocale[] {
  return APP_LOCALES.filter((candidate) => candidate !== locale);
}

export function localeName(locale: string): string {
  if (isSupportedLocale(locale) && localeLabels[locale]) {
    return localeLabels[locale]!;
  }

  const normalized = locale.split("-")[0];
  try {
    const displayNames = new Intl.DisplayNames([DEFAULT_APP_LOCALE], { type: "language" });
    return displayNames.of(normalized) ?? locale.toUpperCase();
  } catch {
    return locale.toUpperCase();
  }
}

export function t(locale: AppLocale, key: AppTranslationKey, params?: Record<string, string>): string {
  const dictionary = dictionaries[locale] ?? dictionaries[DEFAULT_APP_LOCALE];
  let template = String(dictionary[key] ?? dictionaries[DEFAULT_APP_LOCALE][key]);
  if (!params) return template;
  for (const [paramKey, value] of Object.entries(params)) {
    template = template.replaceAll(`{{${paramKey}}}`, value);
  }
  return template;
}
