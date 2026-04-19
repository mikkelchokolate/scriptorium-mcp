const repoUrl = "https://github.com/mikkelchokolate/scriptorium-mcp";
const pagesUrl = "https://mikkelchokolate.github.io/scriptorium-mcp/";

const graphNodes = [
  {
    id: "project",
    kind: "core",
    heroPosition: { x: 42, y: 34 },
    panelPosition: { x: 48, y: 28 },
    labels: {
      en: {
        title: "Project Core",
        kind: "canonical",
        summary: "File-backed source of truth for world, outline, chapters, and characters.",
        description:
          "Every authoring surface resolves back to canonical project files before graph enrichment happens.",
        metrics: [
          ["Storage", "projects/"],
          ["Sync policy", "file-first"],
          ["Mode", "safe public repo"],
        ],
      },
      ru: {
        title: "Ядро проекта",
        kind: "канон",
        summary: "Файловый источник истины для мира, плана, глав и персонажей.",
        description:
          "Любая авторская операция сначала пишет канонические файлы проекта, а уже потом графовый слой строит производные представления.",
        metrics: [
          ["Хранилище", "projects/"],
          ["Синхронизация", "file-first"],
          ["Режим", "безопасная публикация"],
        ],
      },
    },
  },
  {
    id: "bible",
    kind: "core",
    heroPosition: { x: 18, y: 22 },
    panelPosition: { x: 20, y: 18 },
    labels: {
      en: {
        title: "World Bible",
        kind: "knowledge",
        summary: "Structured long-form context for locations, factions, systems, and rules.",
        description:
          "Writers keep the living bible readable in Markdown while graph projection turns it into connected knowledge.",
        metrics: [
          ["Format", "world_bible.md"],
          ["Audience", "author + tools"],
          ["Scope", "setting memory"],
        ],
      },
      ru: {
        title: "Библия мира",
        kind: "знание",
        summary: "Структурный контекст для локаций, фракций, систем и правил.",
        description:
          "Автор хранит живую базу знаний в Markdown, а графовая проекция превращает её в связанную модель мира.",
        metrics: [
          ["Формат", "world_bible.md"],
          ["Пользователи", "автор + инструменты"],
          ["Охват", "память мира"],
        ],
      },
    },
  },
  {
    id: "characters",
    kind: "core",
    heroPosition: { x: 76, y: 20 },
    panelPosition: { x: 76, y: 20 },
    labels: {
      en: {
        title: "Character Forge",
        kind: "roster",
        summary: "Profiles, arcs, and state transitions remain queryable from both files and graph.",
        description:
          "Character records map cleanly into graph nodes, chapter spans, and future continuity checks.",
        metrics: [
          ["Index", "characters/index.json"],
          ["Arc tracking", "yes"],
          ["Explorer tag", "character"],
        ],
      },
      ru: {
        title: "Панель персонажей",
        kind: "ростер",
        summary: "Профили, арки и смена состояния доступны и из файлов, и из графа.",
        description:
          "Записи персонажей естественно маппятся в графовые узлы, диапазоны глав и будущие проверки непрерывности.",
        metrics: [
          ["Индекс", "characters/index.json"],
          ["Отслеживание арки", "да"],
          ["Тег в explorer", "character"],
        ],
      },
    },
  },
  {
    id: "outline",
    kind: "graph",
    heroPosition: { x: 18, y: 68 },
    panelPosition: { x: 18, y: 52 },
    labels: {
      en: {
        title: "Story Architect",
        kind: "outline",
        summary: "Open beats and unresolved arcs feed the forecast engine.",
        description:
          "Outline data becomes a structural signal, helping the system surface dangling arcs before they ship into chapters.",
        metrics: [
          ["Format", "outline.json"],
          ["Forecast use", "open beats"],
          ["Risk type", "orphaned arc"],
        ],
      },
      ru: {
        title: "Story Architect",
        kind: "план",
        summary: "Незавершённые биты и открытые арки питают прогнозную логику.",
        description:
          "Данные плана становятся структурным сигналом и помогают заранее замечать висящие линии до того, как они попадут в главы.",
        metrics: [
          ["Формат", "outline.json"],
          ["Для прогноза", "открытые биты"],
          ["Тип риска", "висящая арка"],
        ],
      },
    },
  },
  {
    id: "chapters",
    kind: "graph",
    heroPosition: { x: 74, y: 66 },
    panelPosition: { x: 78, y: 52 },
    labels: {
      en: {
        title: "Chapter Stream",
        kind: "timeline",
        summary: "Chapter markdown turns into temporal anchors, dependencies, and continuity checkpoints.",
        description:
          "The browser explorer can highlight impacted chapter windows and link risks back to concrete manuscript territory.",
        metrics: [
          ["Source", "chapters/*.md"],
          ["Temporal anchors", "yes"],
          ["Forecast window", "+10 chapters"],
        ],
      },
      ru: {
        title: "Поток глав",
        kind: "таймлайн",
        summary: "Markdown-главы превращаются во временные опоры, зависимости и контрольные точки.",
        description:
          "Браузерный explorer подсвечивает затронутые окна глав и связывает риски с конкретными участками рукописи.",
        metrics: [
          ["Источник", "chapters/*.md"],
          ["Временные опоры", "да"],
          ["Окно прогноза", "+10 глав"],
        ],
      },
    },
  },
  {
    id: "temporal",
    kind: "temporal",
    heroPosition: { x: 49, y: 84 },
    panelPosition: { x: 30, y: 80 },
    labels: {
      en: {
        title: "Temporal Layer",
        kind: "temporal",
        summary: "Localized temporal fields carry start, end, duration, and chapter spans.",
        description:
          "The graph reasoner can detect timeline gaps, impossible intervals, and unresolved foreshadowing windows.",
        metrics: [
          ["Fields", "start / end / duration"],
          ["Locale aware", "en + ru"],
          ["Checks", "gaps + drift"],
        ],
      },
      ru: {
        title: "Временной слой",
        kind: "время",
        summary: "Локализованные temporal-поля хранят start, end, duration и диапазоны глав.",
        description:
          "Графовый reasoner умеет находить пробелы таймлайна, невозможные интервалы и незакрытые окна предвосхищения.",
        metrics: [
          ["Поля", "start / end / duration"],
          ["Локали", "en + ru"],
          ["Проверки", "пробелы + drift"],
        ],
      },
    },
  },
  {
    id: "forecast",
    kind: "forecast",
    heroPosition: { x: 87, y: 45 },
    panelPosition: { x: 88, y: 40 },
    labels: {
      en: {
        title: "Risk Horizon",
        kind: "forecast",
        summary: "Temporal + causal reasoning highlights plot-hole risk before it hits the manuscript.",
        description:
          "Forecast cards explain confidence, impacted chapters, evidence, and remediation patterns rather than giving opaque scores.",
        metrics: [
          ["Horizon", "10 chapters"],
          ["Signals", "causal + temporal"],
          ["Output", "explainable risk cards"],
        ],
      },
      ru: {
        title: "Горизонт рисков",
        kind: "прогноз",
        summary: "Temporal + causal reasoning подсвечивает plot holes ещё до рукописи.",
        description:
          "Карточки прогноза показывают уверенность, затронутые главы, доказательства и способ исправления, а не только голую оценку.",
        metrics: [
          ["Горизонт", "10 глав"],
          ["Сигналы", "causal + temporal"],
          ["Выход", "объяснимые risk cards"],
        ],
      },
    },
  },
];

const dictionaries = {
  en: {
    brandTagline: "Public product showcase",
    repoButton: "Repository",
    nav: [
      ["overview", "Overview"],
      ["showcase", "Showcase"],
      ["tools", "Tools"],
      ["architecture", "Architecture"],
      ["launch", "Launch"],
    ],
    hero: {
      eyebrow: "Enterprise-grade narrative infrastructure",
      title: "Scriptorium MCP turns writing projects into a living graph platform.",
      copy:
        "A file-first MCP workspace for serious fiction systems: structured worldbuilding, chapter orchestration, bilingual graph exploration, temporal modeling, and explainable plot-hole forecasting up to ten chapters ahead.",
      primary: "Open GitHub Repository",
      secondary: "Explore the Product Surface",
      visualEyebrow: "Live platform surface",
      visualStatus: "PUBLIC REPOSITORY",
      visualFooter:
        "This GitHub Pages site is a polished static walkthrough of the real Scriptorium runtime: the live explorer connects to the Graph API and WebSocket layer locally or on your own host.",
      insightEyebrow: "Forecast pulse",
      stats: [
        ["12", "Core MCP tools covering project setup, worldbuilding, outlining, prose, research, QA, and plugins."],
        ["HTTP + WS", "Dedicated graph delivery surface for browser clients, snapshots, and live delta streams."],
        ["RU / EN", "Localized browser chrome, graph labels, and forecast summaries from the same canonical model."],
        ["+10", "Bounded forecast horizon for temporal and causal continuity risk detection."],
      ],
      heroEvents: [
        ["graph.node.upserted", "Character arc updated after a chapter write."],
        ["graph.timeline.updated", "Temporal anchors recomputed from current manuscript state."],
        ["graph.forecast.updated", "Future continuity window refreshed for the next ten chapters."],
        ["graph.connected", "Web client synchronized with current project snapshot."],
        ["graph.snapshot.ready", "Initial graph projection delivered to the explorer."],
      ],
      heroForecast: [
        ["13", "info"],
        ["14", "info"],
        ["15", "warning"],
        ["16", "warning"],
        ["17", "critical"],
        ["18", "info"],
        ["19", "warning"],
        ["20", "warning"],
        ["21", "info"],
        ["22", "critical"],
      ],
    },
    overview: {
      eyebrow: "Platform pillars",
      title: "Built to stay readable for authors and powerful for systems.",
      copy:
        "The public surface emphasizes real strengths from the repository: file-first safety, optional graph enrichment, multilingual presentation, and a browser story-map that stays grounded in canonical project artifacts.",
      cards: [
        ["01", "File-first core", "Projects remain canonical on disk, which makes publishing safe and keeps author workflows transparent."],
        ["02", "Live graph explorer", "A dedicated Graph API and WebSocket stream let the browser inspect a living knowledge graph without mutating the authoring core."],
        ["03", "Temporal + causal reasoning", "Forecast logic analyzes contradictions, timeline gaps, missing prerequisites, and unresolved foreshadowing windows."],
        ["04", "Bilingual product surface", "English and Russian share one canonical model instead of duplicating entities across locales."],
      ],
    },
    showcase: {
      eyebrow: "Interactive product walkthrough",
      title: "Three surfaces, one story system.",
      copy:
        "Use the tabs to inspect the most important layers: the visual graph explorer, the temporal forecast horizon, and the delivery/runtime posture that keeps the stack explainable.",
      tabs: {
        graph: "Graph Explorer",
        forecast: "Forecast Horizon",
        runtime: "Runtime Model",
      },
      graphTitle: "Visual Graph Explorer",
      graphCopy:
        "Writers can inspect the world as a living graph, search connected structures, and follow forecast signals back to concrete nodes and chapters.",
      graphEventsTitle: "Live event stream",
      forecastTitle: "Temporal Knowledge Graph + causal reasoning",
      forecastCopy:
        "The forecast layer does not pretend to predict the future perfectly. It surfaces explainable risk with evidence, confidence, and impacted chapters so authors can decide what to fix.",
      runtimeTitle: "Operational posture",
      runtimeCopy:
        "Scriptorium keeps the MCP authoring core lean while exposing a separate browser-facing graph service. The result is a clean public story for GitHub without sacrificing local author workflows.",
      runtimeTreeTitle: "Canonical repository shape",
      runtimeEndpointsTitle: "Delivery surface",
      runtimeNotesTitle: "Why this deploys cleanly",
      runtimeTree: [
        "src/",
        "  backend/graph/",
        "  tools/",
        "web/",
        "docs/",
        "projects/   # ignored locally",
        "plugins/",
        "plans/",
      ],
      runtimeEndpoints: [
        ["GET /api/capabilities", "Capability and graph-mode discovery."],
        ["GET /api/projects", "Known workspace projects for the browser client."],
        ["GET /api/projects/:project/graph", "Localized graph snapshot for the explorer."],
        ["GET /api/projects/:project/graph/timeline", "Ordered temporal anchors and chapter context."],
        ["GET /api/projects/:project/graph/forecast", "Explainable risk horizon with evidence and confidence."],
        ["WS /ws/projects/:project/graph", "Live snapshot + delta stream for the active project."],
      ],
      runtimeNotes: [
        ["Safe publishing", "The repository stays public while local manuscript data remains out of git via `.gitignore`."],
        ["Static Pages, live product", "GitHub Pages hosts the polished public showcase while the real explorer runs against the project Graph API."],
        ["Optional graph enrichment", "Neo4j remains additive; the project still works in pure file-backed mode."],
      ],
      forecast: {
        chapters: [
          ["13", "info"],
          ["14", "warning"],
          ["15", "warning"],
          ["16", "critical"],
          ["17", "critical"],
          ["18", "info"],
          ["19", "warning"],
          ["20", "warning"],
          ["21", "info"],
          ["22", "critical"],
        ],
        risks: [
          {
            id: "foreshadowing-gap",
            severity: "warning",
            title: "Foreshadowed relic lacks payoff by chapter 16",
            chapters: "14, 15, 16",
            summary: "The graph sees setup but no visible resolution path yet.",
            detailTitle: "Risk reasoning",
            details: [
              ["Evidence", "A lore fact projects forward three chapters with no mirrored payoff node."],
              ["Impact", "Readers may feel a setup thread was dropped or deprioritized."],
              ["Suggested remediation", "Add a timeline marker, reveal scene, or outline beat before chapter 16 lands."],
            ],
          },
          {
            id: "causal-gap",
            severity: "critical",
            title: "High-impact alliance shift lacks precondition",
            chapters: "16, 17",
            summary: "A strong causal jump appears with insufficient earlier setup.",
            detailTitle: "Risk reasoning",
            details: [
              ["Evidence", "The relation confidence is high, but earlier chapters do not show enough causal groundwork."],
              ["Impact", "The arc may read as abrupt, unearned, or contradictory to current motivation state."],
              ["Suggested remediation", "Insert a motivating incident, dependency edge, or earlier chapter signal."],
            ],
          },
          {
            id: "timeline-gap",
            severity: "info",
            title: "Sparse temporal anchors across the next window",
            chapters: "18, 19, 20",
            summary: "The timeline is likely to drift if no new anchors are added.",
            detailTitle: "Risk reasoning",
            details: [
              ["Evidence", "Several future chapters currently have no explicit temporal anchors."],
              ["Impact", "Continuity pressure rises for travel, recovery, investigations, and causality."],
              ["Suggested remediation", "Register temporal markers or chapter-spanning states before drafting continues."],
            ],
          },
        ],
      },
    },
    tools: {
      eyebrow: "Full MCP toolchain",
      title: "The repository exposes a broad authoring surface, not just a graph demo.",
      copy:
        "This public page makes the whole toolchain legible: project bootstrap, worldbuilding, characters, outlines, prose refinement, critique, research, series planning, plugins, and genre support.",
      cards: [
        ["project_manager", "Project lifecycle", "Create, inspect, export, and safely manage file-backed book projects."],
        ["world_weaver", "World systems", "Build locations, cultures, core systems, timelines, factions, and themes."],
        ["character_forger", "Character intelligence", "Create and evolve characters with tracked arcs and reusable profiles."],
        ["story_architect", "Outline engine", "Shape beats, inspect structure, and surface twist opportunities."],
        ["chapter_weaver", "Chapter drafting", "Write, append, inspect, and list chapters with manuscript continuity in mind."],
        ["lore_guardian", "Consistency layer", "Register facts, run lore checks, and tap graph-backed timeline and contradiction analysis."],
        ["prose_alchemist", "Voice + style", "Edit prose while preserving tone and generating controlled variants."],
        ["series_planner", "Multi-book planning", "Map titles, progression, and series-level scaffolding."],
        ["beta_reader", "Audience simulation", "Generate reader-feedback perspectives for targeted critique loops."],
        ["research_quill", "Research support", "Track facts, bibliography, and validation for grounded writing."],
        ["plugin_manager", "Ontology extensions", "Inspect and reload optional plugins that extend entity and rule vocabularies."],
        ["genre_prompt", "Genre guidance", "Deliver tailored prompt direction for supported genres and writing modes."],
      ],
    },
    architecture: {
      eyebrow: "System architecture",
      title: "One canonical workspace, multiple delivery layers.",
      copy:
        "The architecture stays clean because the MCP authoring layer, the derived graph layer, and the public showcase each have a clear job instead of collapsing into one monolith.",
      steps: [
        ["01", "MCP tools", "Author-facing tools write structured project files and domain records."],
        ["02", "Canonical files", "Projects on disk remain the source of truth for world, outline, chapters, and lore facts."],
        ["03", "Graph projection", "Localized temporal and causal projection builds the analytical graph surface."],
        ["04", "Graph API + stream", "HTTP snapshots and WebSocket deltas expose the browser surface cleanly."],
        ["05", "Explorer + forecast", "The browser visualizes the graph, timeline anchors, and explainable risk horizon."],
      ],
      surfaces: [
        ["A", "Delivery channels", "The repo now ships MCP over stdio, Graph API over HTTP, live deltas over WebSocket, and this public Pages front door."],
        ["B", "Localization model", "English and Russian are modeled as localized fields and UI dictionaries, not duplicated entity trees."],
        ["C", "Operational fit", "Docker, a clean README, and a public Pages site make the project far easier to evaluate and onboard."],
        ["D", "Safe repository posture", "Ignored manuscript directories prevent accidental publication of local author data even in a public repo."],
      ],
    },
    launch: {
      eyebrow: "Launch and evaluate",
      title: "Run the full stack locally, keep the public front door polished.",
      copy:
        "GitHub Pages now tells the product story, while local or hosted runtime can power the live explorer against the real graph service. That separation keeps the public surface elegant and the application honest.",
      primary: "Open Repository",
      secondary: "See All Tools",
      command: [
        "npm install",
        "npm run build:all",
        "npm run dev",
        "",
        "# in a second terminal",
        "npm run dev:web",
        "",
        "# optional runtime endpoints",
        "http://localhost:4319/api/capabilities",
        "ws://localhost:4319/ws/projects/<project>/graph?locale=en",
      ].join("\n"),
    },
    footer: "Scriptorium MCP public Pages showcase. File-first, graph-capable, bilingual, and designed for serious writing systems.",
  },
  ru: {
    brandTagline: "Публичная продуктовая витрина",
    repoButton: "Репозиторий",
    nav: [
      ["overview", "Обзор"],
      ["showcase", "Витрина"],
      ["tools", "Инструменты"],
      ["architecture", "Архитектура"],
      ["launch", "Запуск"],
    ],
    hero: {
      eyebrow: "Инфраструктура для сложных нарративов",
      title: "Scriptorium MCP превращает писательский проект в живую графовую платформу.",
      copy:
        "Это file-first MCP-воркспейс для серьёзной работы с прозой: структурный worldbuilding, управление главами, двуязычный graph explorer, temporal-модель и объяснимый прогноз plot holes на десять глав вперёд.",
      primary: "Открыть GitHub-репозиторий",
      secondary: "Посмотреть продуктовую витрину",
      visualEyebrow: "Живая продуктовая поверхность",
      visualStatus: "ПУБЛИЧНЫЙ РЕПОЗИТОРИЙ",
      visualFooter:
        "Этот GitHub Pages-сайт показывает polished-версию продукта: реальный explorer работает через локальный или размещённый Graph API и WebSocket-слой.",
      insightEyebrow: "Пульс прогноза",
      stats: [
        ["12", "Ключевых MCP-инструментов для старта проекта, мира, плана, прозы, исследований, QA и плагинов."],
        ["HTTP + WS", "Отдельная graph-поверхность для браузера: snapshot-запросы и live delta stream."],
        ["RU / EN", "Локализованные интерфейс, подписи графа и summaries прогноза из одной канонической модели."],
        ["+10", "Ограниченный горизонт прогноза для temporal и causal рисков непрерывности."],
      ],
      heroEvents: [
        ["graph.node.upserted", "Арка персонажа обновлена после записи главы."],
        ["graph.timeline.updated", "Временные опоры пересчитаны по текущему состоянию рукописи."],
        ["graph.forecast.updated", "Окно будущих рисков обновлено на ближайшие десять глав."],
        ["graph.connected", "Браузер синхронизирован с текущим snapshot проекта."],
        ["graph.snapshot.ready", "Начальная графовая проекция доставлена в explorer."],
      ],
      heroForecast: [
        ["13", "info"],
        ["14", "info"],
        ["15", "warning"],
        ["16", "warning"],
        ["17", "critical"],
        ["18", "info"],
        ["19", "warning"],
        ["20", "warning"],
        ["21", "info"],
        ["22", "critical"],
      ],
    },
    overview: {
      eyebrow: "Опорные слои платформы",
      title: "Сделано так, чтобы оставаться понятным автору и мощным для системы.",
      copy:
        "Публичная витрина показывает реальные сильные стороны репозитория: безопасный file-first режим, опциональное graph-обогащение, двуязычную подачу и браузерную story-map, привязанную к каноническим артефактам проекта.",
      cards: [
        ["01", "File-first ядро", "Проекты остаются каноническими на диске. Это безопасно для публикации и прозрачно для автора."],
        ["02", "Живой graph explorer", "Отдельный Graph API и WebSocket-поток позволяют браузеру видеть живой граф без разрастания authoring core."],
        ["03", "Temporal + causal reasoning", "Forecast-логика анализирует противоречия, пробелы таймлайна, missing prerequisites и незакрытые окна foreshadowing."],
        ["04", "Двуязычная поверхность", "Русский и английский живут над одной канонической моделью, а не в двух дублированных деревьях сущностей."],
      ],
    },
    showcase: {
      eyebrow: "Интерактивная walkthrough-витрина",
      title: "Три поверхности, одна story-система.",
      copy:
        "Переключай вкладки, чтобы увидеть важные слои: визуальный graph explorer, temporal forecast horizon и runtime-модель, которая делает стек объяснимым.",
      tabs: {
        graph: "Graph Explorer",
        forecast: "Forecast Horizon",
        runtime: "Runtime Model",
      },
      graphTitle: "Visual Graph Explorer",
      graphCopy:
        "Автор видит мир как живой граф, ищет связанные структуры и проваливается от сигнала прогноза к конкретным узлам и главам.",
      graphEventsTitle: "Live event stream",
      forecastTitle: "Temporal Knowledge Graph + causal reasoning",
      forecastCopy:
        "Прогнозный слой не обещает идеального предсказания. Он показывает объяснимый риск с evidence, confidence и затронутыми главами, чтобы автор сам принимал решение.",
      runtimeTitle: "Операционная модель",
      runtimeCopy:
        "Scriptorium оставляет MCP-ядро для authoring простым, а браузерный графовый слой выносит отдельно. В итоге публичная история на GitHub выглядит чисто, а локальный workflow не страдает.",
      runtimeTreeTitle: "Каноническая форма репозитория",
      runtimeEndpointsTitle: "Поверхность доставки",
      runtimeNotesTitle: "Почему это чисто деплоится",
      runtimeTree: [
        "src/",
        "  backend/graph/",
        "  tools/",
        "web/",
        "docs/",
        "projects/   # игнорируется локально",
        "plugins/",
        "plans/",
      ],
      runtimeEndpoints: [
        ["GET /api/capabilities", "Проверка capability и режима графа."],
        ["GET /api/projects", "Известные проекты воркспейса для браузерного клиента."],
        ["GET /api/projects/:project/graph", "Локализованный snapshot графа для explorer."],
        ["GET /api/projects/:project/graph/timeline", "Отсортированные temporal anchors и контекст глав."],
        ["GET /api/projects/:project/graph/forecast", "Объяснимый горизонт рисков с evidence и confidence."],
        ["WS /ws/projects/:project/graph", "Live snapshot + delta stream для активного проекта."],
      ],
      runtimeNotes: [
        ["Безопасная публикация", "Репозиторий публичный, но локальные рукописи остаются вне git благодаря `.gitignore`."],
        ["Static Pages, live product", "GitHub Pages держит polished-витрину, а настоящий explorer подключается к Graph API."],
        ["Опциональный граф", "Neo4j остаётся дополнительным слоем; проект всё ещё работает и в чистом file-backed режиме."],
      ],
      forecast: {
        chapters: [
          ["13", "info"],
          ["14", "warning"],
          ["15", "warning"],
          ["16", "critical"],
          ["17", "critical"],
          ["18", "info"],
          ["19", "warning"],
          ["20", "warning"],
          ["21", "info"],
          ["22", "critical"],
        ],
        risks: [
          {
            id: "foreshadowing-gap",
            severity: "warning",
            title: "Предвосхищённый артефакт не получает payoff к главе 16",
            chapters: "14, 15, 16",
            summary: "Граф видит setup, но пока не видит явного пути к развязке.",
            detailTitle: "Как это объясняется",
            details: [
              ["Evidence", "Лор-факт тянется вперёд на три главы, но зеркального payoff-узла ещё нет."],
              ["Impact", "У читателя может возникнуть ощущение брошенной или потерянной линии."],
              ["Suggested remediation", "Добавить temporal marker, сцену раскрытия или beat плана до главы 16."],
            ],
          },
          {
            id: "causal-gap",
            severity: "critical",
            title: "Сильный alliance shift без достаточной подготовки",
            chapters: "16, 17",
            summary: "Видна мощная causal-перемычка, но ранних предпосылок пока недостаточно.",
            detailTitle: "Как это объясняется",
            details: [
              ["Evidence", "У связи высокая confidence, но в ранних главах не хватает причинной подготовки."],
              ["Impact", "Арка может читаться как резкая, незаработанная или противоречащая текущей мотивации."],
              ["Suggested remediation", "Вставить мотивирующий инцидент, dependency edge или ранний сигнал в главе."],
            ],
          },
          {
            id: "timeline-gap",
            severity: "info",
            title: "В будущем окне слишком мало temporal anchors",
            chapters: "18, 19, 20",
            summary: "Таймлайн может начать drift, если не добавить новые опоры.",
            detailTitle: "Как это объясняется",
            details: [
              ["Evidence", "У нескольких будущих глав сейчас нет явных временных опор."],
              ["Impact", "Возрастает риск ошибок в путешествиях, восстановлении, расследовании и причинности."],
              ["Suggested remediation", "Зарегистрировать temporal markers или chapter-spanning states до продолжения драфта."],
            ],
          },
        ],
      },
    },
    tools: {
      eyebrow: "Полная MCP-поверхность",
      title: "Репозиторий даёт большой authoring-сет, а не только графовый demo.",
      copy:
        "Эта публичная страница делает видимым весь toolchain: старт проекта, worldbuilding, персонажи, план, редактура, критика, исследования, сериалы, плагины и жанровая поддержка.",
      cards: [
        ["project_manager", "Жизненный цикл проекта", "Создание, инспекция, экспорт и безопасное управление file-backed проектами."],
        ["world_weaver", "Системы мира", "Локации, культуры, core systems, таймлайны, фракции и темы."],
        ["character_forger", "Интеллект персонажей", "Создание и развитие персонажей с арками и переиспользуемыми профилями."],
        ["story_architect", "Движок плана", "Работа с beat-структурой, чтение плана и поиск twist-возможностей."],
        ["chapter_weaver", "Драфтинг глав", "Запись, дописывание и инспекция глав с учётом непрерывности рукописи."],
        ["lore_guardian", "Слой консистентности", "Регистрация фактов, проверка лора и graph-backed анализ таймлайна и противоречий."],
        ["prose_alchemist", "Голос и стиль", "Редактура прозы с сохранением тона и генерацией контролируемых вариантов."],
        ["series_planner", "Многокнижная структура", "Планирование названий, прогрессии и каркаса серии."],
        ["beta_reader", "Симуляция аудитории", "Перспективы читателя для targeted critique loop."],
        ["research_quill", "Исследовательская поддержка", "Факты, библиография и проверка данных для grounded writing."],
        ["plugin_manager", "Онтологические расширения", "Инспекция и перезагрузка плагинов, которые расширяют словарь сущностей и правил."],
        ["genre_prompt", "Жанровое guidance", "Жанровые prompt-направления для поддерживаемых режимов письма."],
      ],
    },
    architecture: {
      eyebrow: "Системная архитектура",
      title: "Один канонический воркспейс, несколько поверхностей доставки.",
      copy:
        "Архитектура остаётся чистой, потому что authoring-слой MCP, производный graph-слой и публичная Pages-витрина у каждого имеют свою задачу.",
      steps: [
        ["01", "MCP tools", "Авторские инструменты пишут структурные проектные файлы и доменные записи."],
        ["02", "Канонические файлы", "Проекты на диске остаются источником истины для мира, плана, глав и lore facts."],
        ["03", "Graph projection", "Локализованная temporal/causal проекция строит аналитический graph surface."],
        ["04", "Graph API + stream", "HTTP snapshots и WebSocket deltas чисто отдают браузерный слой."],
        ["05", "Explorer + forecast", "Браузер визуализирует граф, temporal anchors и объяснимый horizon рисков."],
      ],
      surfaces: [
        ["A", "Каналы доставки", "Теперь у проекта есть MCP по stdio, Graph API по HTTP, live deltas по WebSocket и публичный Pages-front door."],
        ["B", "Локализационная модель", "Русский и английский живут как localized fields и UI dictionaries, а не как дубликаты сущностей."],
        ["C", "Операционная готовность", "Docker, чистый README и публичный Pages-сайт делают проект гораздо проще для оценки и онбординга."],
        ["D", "Безопасный репозиторий", "Игнорирование manuscript-директорий предотвращает случайную публикацию локальных авторских данных."],
      ],
    },
    launch: {
      eyebrow: "Запуск и оценка",
      title: "Полный стек работает локально, а публичный вход выглядит как продукт.",
      copy:
        "Теперь GitHub Pages рассказывает историю продукта, а локальный или размещённый runtime питает настоящий live explorer через graph service. Такое разделение делает публичную поверхность красивой, а приложение честным.",
      primary: "Открыть репозиторий",
      secondary: "Смотреть все инструменты",
      command: [
        "npm install",
        "npm run build:all",
        "npm run dev",
        "",
        "# во втором терминале",
        "npm run dev:web",
        "",
        "# полезные runtime endpoints",
        "http://localhost:4319/api/capabilities",
        "ws://localhost:4319/ws/projects/<project>/graph?locale=ru",
      ].join("\n"),
    },
    footer: "Публичная GitHub Pages-витрина Scriptorium MCP. File-first, graph-capable, двуязычный и сделанный для серьёзных writing systems.",
  },
};

const state = {
  locale: detectLocale(),
  activeTab: "graph",
  activeNode: "project",
  activeRisk: "foreshadowing-gap",
  eventCursor: 0,
};

const elements = {
  brandTagline: document.getElementById("brand-tagline"),
  navLinks: document.getElementById("nav-links"),
  repoLink: document.getElementById("repo-link"),
  heroEyebrow: document.getElementById("hero-eyebrow"),
  heroTitle: document.getElementById("hero-title"),
  heroCopy: document.getElementById("hero-copy"),
  heroPrimary: document.getElementById("hero-primary"),
  heroSecondary: document.getElementById("hero-secondary"),
  heroStats: document.getElementById("hero-stats"),
  visualEyebrow: document.getElementById("visual-eyebrow"),
  visualStatus: document.getElementById("visual-status"),
  visualFooter: document.getElementById("visual-footer"),
  heroNodeLayer: document.getElementById("hero-node-layer"),
  heroForecastStrip: document.getElementById("hero-forecast-strip"),
  heroLog: document.getElementById("hero-log"),
  insightEyebrow: document.getElementById("insight-eyebrow"),
  overviewEyebrow: document.getElementById("overview-eyebrow"),
  overviewTitle: document.getElementById("overview-title"),
  overviewCopy: document.getElementById("overview-copy"),
  featureGrid: document.getElementById("feature-grid"),
  showcaseEyebrow: document.getElementById("showcase-eyebrow"),
  showcaseTitle: document.getElementById("showcase-title"),
  showcaseCopy: document.getElementById("showcase-copy"),
  demoTabs: document.getElementById("demo-tabs"),
  graphPanelTitle: document.getElementById("graph-panel-title"),
  graphPanelCopy: document.getElementById("graph-panel-copy"),
  graphNodeLayer: document.getElementById("graph-node-layer"),
  graphInspector: document.getElementById("graph-inspector"),
  graphEventsTitle: document.getElementById("graph-events-title"),
  graphEvents: document.getElementById("graph-events"),
  forecastPanelTitle: document.getElementById("forecast-panel-title"),
  forecastPanelCopy: document.getElementById("forecast-panel-copy"),
  forecastChapters: document.getElementById("forecast-chapters"),
  forecastList: document.getElementById("forecast-list"),
  forecastDetail: document.getElementById("forecast-detail"),
  runtimePanelTitle: document.getElementById("runtime-panel-title"),
  runtimePanelCopy: document.getElementById("runtime-panel-copy"),
  runtimeTreeTitle: document.getElementById("runtime-tree-title"),
  runtimeTree: document.getElementById("runtime-tree"),
  runtimeEndpointsTitle: document.getElementById("runtime-endpoints-title"),
  runtimeEndpoints: document.getElementById("runtime-endpoints"),
  runtimeNotesTitle: document.getElementById("runtime-notes-title"),
  runtimeNotes: document.getElementById("runtime-notes"),
  toolsEyebrow: document.getElementById("tools-eyebrow"),
  toolsTitle: document.getElementById("tools-title"),
  toolsCopy: document.getElementById("tools-copy"),
  toolGrid: document.getElementById("tool-grid"),
  architectureEyebrow: document.getElementById("architecture-eyebrow"),
  architectureTitle: document.getElementById("architecture-title"),
  architectureCopy: document.getElementById("architecture-copy"),
  architectureSteps: document.getElementById("architecture-steps"),
  surfaceGrid: document.getElementById("surface-grid"),
  launchEyebrow: document.getElementById("launch-eyebrow"),
  launchTitle: document.getElementById("launch-title"),
  launchCopy: document.getElementById("launch-copy"),
  launchPrimary: document.getElementById("launch-primary"),
  launchSecondary: document.getElementById("launch-secondary"),
  commandCard: document.getElementById("command-card"),
  footerCopy: document.getElementById("footer-copy"),
  panels: Array.from(document.querySelectorAll(".demo-panel")),
  localeButtons: Array.from(document.querySelectorAll(".locale-switch__button")),
};

function detectLocale() {
  const saved = window.localStorage.getItem("scriptorium-pages-locale");
  if (saved === "en" || saved === "ru") return saved;
  return navigator.language.toLowerCase().startsWith("ru") ? "ru" : "en";
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function getDictionary() {
  return dictionaries[state.locale];
}

function render() {
  const dict = getDictionary();
  document.documentElement.lang = state.locale;
  document.title = state.locale === "ru"
    ? "Scriptorium MCP | Графовая платформа для писателя"
    : "Scriptorium MCP | Narrative Graph Platform";

  elements.brandTagline.textContent = dict.brandTagline;
  elements.repoLink.textContent = dict.repoButton;
  elements.repoLink.href = repoUrl;

  renderNav(dict);
  renderHero(dict);
  renderOverview(dict);
  renderShowcase(dict);
  renderTools(dict);
  renderArchitecture(dict);
  renderLaunch(dict);
  renderFooter(dict);

  elements.localeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.locale === state.locale);
  });
}

function renderNav(dict) {
  elements.navLinks.innerHTML = dict.nav
    .map(([href, label]) => `<a href="#${href}">${escapeHtml(label)}</a>`)
    .join("");
}

function renderHero(dict) {
  elements.heroEyebrow.textContent = dict.hero.eyebrow;
  elements.heroTitle.textContent = dict.hero.title;
  elements.heroCopy.textContent = dict.hero.copy;
  elements.heroPrimary.textContent = dict.hero.primary;
  elements.heroPrimary.href = repoUrl;
  elements.heroSecondary.textContent = dict.hero.secondary;
  elements.heroSecondary.href = "#showcase";
  elements.visualEyebrow.textContent = dict.hero.visualEyebrow;
  elements.visualStatus.textContent = dict.hero.visualStatus;
  elements.visualFooter.textContent = dict.hero.visualFooter;
  elements.insightEyebrow.textContent = dict.hero.insightEyebrow;

  elements.heroStats.innerHTML = dict.hero.stats
    .map(([value, label]) => `
      <article class="stat-card">
        <strong>${escapeHtml(value)}</strong>
        <span>${escapeHtml(label)}</span>
      </article>
    `)
    .join("");

  renderNodes(elements.heroNodeLayer, "hero");
  renderForecastStrip(elements.heroForecastStrip, dict.hero.heroForecast);
  renderEventStream(elements.heroLog, dict.hero.heroEvents);
}

function renderOverview(dict) {
  elements.overviewEyebrow.textContent = dict.overview.eyebrow;
  elements.overviewTitle.textContent = dict.overview.title;
  elements.overviewCopy.textContent = dict.overview.copy;

  elements.featureGrid.innerHTML = dict.overview.cards
    .map(([icon, title, copy]) => `
      <article class="feature-card">
        <div class="feature-card__icon">${escapeHtml(icon)}</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
      </article>
    `)
    .join("");
}

function renderShowcase(dict) {
  elements.showcaseEyebrow.textContent = dict.showcase.eyebrow;
  elements.showcaseTitle.textContent = dict.showcase.title;
  elements.showcaseCopy.textContent = dict.showcase.copy;

  elements.demoTabs.innerHTML = Object.entries(dict.showcase.tabs)
    .map(([id, label]) => `
      <button class="demo-tab ${state.activeTab === id ? "is-active" : ""}" data-tab="${id}" type="button" role="tab" aria-selected="${state.activeTab === id}">
        ${escapeHtml(label)}
      </button>
    `)
    .join("");

  elements.panels.forEach((panel) => {
    panel.classList.toggle("is-active", panel.dataset.panel === state.activeTab);
  });

  elements.graphPanelTitle.textContent = dict.showcase.graphTitle;
  elements.graphPanelCopy.textContent = dict.showcase.graphCopy;
  elements.graphEventsTitle.textContent = dict.showcase.graphEventsTitle;
  renderNodes(elements.graphNodeLayer, "panel");
  renderInspector();
  renderEventStream(elements.graphEvents, dict.hero.heroEvents);

  elements.forecastPanelTitle.textContent = dict.showcase.forecastTitle;
  elements.forecastPanelCopy.textContent = dict.showcase.forecastCopy;
  renderForecastPanel(dict.showcase.forecast);

  elements.runtimePanelTitle.textContent = dict.showcase.runtimeTitle;
  elements.runtimePanelCopy.textContent = dict.showcase.runtimeCopy;
  elements.runtimeTreeTitle.textContent = dict.showcase.runtimeTreeTitle;
  elements.runtimeTree.textContent = dict.showcase.runtimeTree.join("\n");
  elements.runtimeEndpointsTitle.textContent = dict.showcase.runtimeEndpointsTitle;
  elements.runtimeEndpoints.innerHTML = dict.showcase.runtimeEndpoints
    .map(([endpoint, copy]) => `
      <article class="endpoint-card">
        <strong>${escapeHtml(endpoint)}</strong>
        <span>${escapeHtml(copy)}</span>
      </article>
    `)
    .join("");
  elements.runtimeNotesTitle.textContent = dict.showcase.runtimeNotesTitle;
  elements.runtimeNotes.innerHTML = dict.showcase.runtimeNotes
    .map(([title, copy]) => `
      <div class="bullet-item">
        ${escapeHtml(title)}
        <small>${escapeHtml(copy)}</small>
      </div>
    `)
    .join("");
}

function renderTools(dict) {
  elements.toolsEyebrow.textContent = dict.tools.eyebrow;
  elements.toolsTitle.textContent = dict.tools.title;
  elements.toolsCopy.textContent = dict.tools.copy;
  elements.toolGrid.innerHTML = dict.tools.cards
    .map(([name, label, copy]) => `
      <article class="tool-card">
        <div class="tool-card__label">${escapeHtml(label)}</div>
        <h3>${escapeHtml(name)}</h3>
        <p>${escapeHtml(copy)}</p>
      </article>
    `)
    .join("");
}

function renderArchitecture(dict) {
  elements.architectureEyebrow.textContent = dict.architecture.eyebrow;
  elements.architectureTitle.textContent = dict.architecture.title;
  elements.architectureCopy.textContent = dict.architecture.copy;
  elements.architectureSteps.innerHTML = dict.architecture.steps
    .map(([index, title, copy]) => `
      <article class="architecture-step">
        <div class="architecture-step__index">${escapeHtml(index)}</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
      </article>
    `)
    .join("");

  elements.surfaceGrid.innerHTML = dict.architecture.surfaces
    .map(([icon, title, copy]) => `
      <article class="surface-card">
        <div class="surface-card__icon">${escapeHtml(icon)}</div>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(copy)}</p>
      </article>
    `)
    .join("");
}

function renderLaunch(dict) {
  elements.launchEyebrow.textContent = dict.launch.eyebrow;
  elements.launchTitle.textContent = dict.launch.title;
  elements.launchCopy.textContent = dict.launch.copy;
  elements.launchPrimary.textContent = dict.launch.primary;
  elements.launchPrimary.href = repoUrl;
  elements.launchSecondary.textContent = dict.launch.secondary;
  elements.launchSecondary.href = "#tools";
  elements.commandCard.textContent = dict.launch.command;
}

function renderFooter(dict) {
  elements.footerCopy.textContent = dict.footer;
}

function renderNodes(target, mode) {
  target.innerHTML = graphNodes
    .map((node) => {
      const localized = node.labels[state.locale];
      const position = mode === "hero" ? node.heroPosition : node.panelPosition;
      return `
        <button
          class="graph-node ${state.activeNode === node.id ? "is-active" : ""}"
          data-node="${node.id}"
          data-kind="${node.kind}"
          style="--x:${position.x}%; --y:${position.y}%"
          type="button"
        >
          <span class="graph-node__kind">${escapeHtml(localized.kind)}</span>
          <strong>${escapeHtml(localized.title)}</strong>
          <span>${escapeHtml(localized.summary)}</span>
        </button>
      `;
    })
    .join("");
}

function renderInspector() {
  const node = graphNodes.find((item) => item.id === state.activeNode) ?? graphNodes[0];
  const localized = node.labels[state.locale];

  elements.graphInspector.innerHTML = `
    <div class="eyebrow">${state.locale === "ru" ? "Выбранный узел" : "Selected node"}</div>
    <h3>${escapeHtml(localized.title)}</h3>
    <p>${escapeHtml(localized.description)}</p>
    <div class="pill-row">
      <span class="pill">${escapeHtml(localized.kind)}</span>
      <span class="pill">${escapeHtml(node.kind)}</span>
    </div>
    <div class="mini-stat-row">
      ${localized.metrics
        .map(([label, value]) => `
          <div class="mini-stat">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function renderForecastStrip(target, items) {
  target.innerHTML = items
    .map(([label, severity]) => `
      <div class="forecast-cell forecast-cell--${severity}">
        <span>Ch. ${escapeHtml(label)}</span>
        <div class="forecast-cell__bar"></div>
      </div>
    `)
    .join("");
}

function renderForecastPanel(forecast) {
  elements.forecastChapters.innerHTML = forecast.chapters
    .map(([label, severity]) => `
      <div class="chapter-pill chapter-pill--${severity}">Ch. ${escapeHtml(label)}</div>
    `)
    .join("");

  elements.forecastList.innerHTML = forecast.risks
    .map((risk) => `
      <button class="risk-card risk-card--${risk.severity} ${state.activeRisk === risk.id ? "is-active" : ""}" data-risk="${risk.id}" type="button">
        <div class="risk-card__meta">
          <span class="risk-chip">${escapeHtml(risk.severity)}</span>
          <span class="pill">${escapeHtml(risk.chapters)}</span>
        </div>
        <h3>${escapeHtml(risk.title)}</h3>
        <p>${escapeHtml(risk.summary)}</p>
      </button>
    `)
    .join("");

  const activeRisk = forecast.risks.find((risk) => risk.id === state.activeRisk) ?? forecast.risks[0];
  elements.forecastDetail.innerHTML = `
    <div class="eyebrow">${escapeHtml(activeRisk.detailTitle)}</div>
    <h3>${escapeHtml(activeRisk.title)}</h3>
    <p>${escapeHtml(activeRisk.summary)}</p>
    <div class="risk-detail__list">
      ${activeRisk.details
        .map(([title, copy]) => `
          <div class="risk-detail__item">
            ${escapeHtml(title)}
            <small>${escapeHtml(copy)}</small>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function renderEventStream(target, events) {
  const visible = [];
  for (let index = 0; index < 3; index += 1) {
    const item = events[(state.eventCursor + index) % events.length];
    visible.push(item);
  }

  target.innerHTML = visible
    .map(([title, copy]) => `
      <div class="event-line">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(copy)}</span>
      </div>
    `)
    .join("");
}

function installEvents() {
  document.addEventListener("click", (event) => {
    const localeButton = event.target.closest("[data-locale]");
    if (localeButton instanceof HTMLElement) {
      const locale = localeButton.dataset.locale;
      if (locale === "en" || locale === "ru") {
        state.locale = locale;
        window.localStorage.setItem("scriptorium-pages-locale", locale);
        render();
      }
      return;
    }

    const tabButton = event.target.closest("[data-tab]");
    if (tabButton instanceof HTMLElement) {
      const nextTab = tabButton.dataset.tab;
      if (nextTab === "graph" || nextTab === "forecast" || nextTab === "runtime") {
        state.activeTab = nextTab;
        render();
      }
      return;
    }

    const nodeButton = event.target.closest("[data-node]");
    if (nodeButton instanceof HTMLElement) {
      state.activeNode = nodeButton.dataset.node ?? state.activeNode;
      render();
      return;
    }

    const riskButton = event.target.closest("[data-risk]");
    if (riskButton instanceof HTMLElement) {
      state.activeRisk = riskButton.dataset.risk ?? state.activeRisk;
      render();
    }
  });
}

function installRevealObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
      }
    });
  }, { threshold: 0.16 });

  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
}

function startTicker() {
  window.setInterval(() => {
    const events = getDictionary().hero.heroEvents;
    state.eventCursor = (state.eventCursor + 1) % events.length;
    renderEventStream(elements.heroLog, events);
    renderEventStream(elements.graphEvents, events);
  }, 3200);
}

installEvents();
installRevealObserver();
render();
startTicker();
