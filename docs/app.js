const repoUrl = "https://github.com/mikkelchokolate/scriptorium-mcp";

const graphNodes = [
  {
    id: "atlas",
    kind: "atlas",
    heroPosition: { x: 50, y: 30 },
    panelPosition: { x: 50, y: 24 },
    heroTilt: -1,
    panelTilt: 0,
    labels: {
      en: {
        title: "Story Atlas",
        chip: "live explorer",
        summary: "A browser desk for world memory, chapter links, and continuity signals.",
        description:
          "The live explorer gives authors a working map of the book: characters, lore facts, chapter anchors, and forecast clues in one place.",
        metrics: [
          ["Surface", "Next.js + React Flow"],
          ["Live feed", "HTTP + WebSocket"],
          ["Audience", "writer and editor"],
        ],
      },
      ru: {
        title: "Story Atlas",
        chip: "live explorer",
        summary: "Браузерный стол для памяти мира, связей глав и сигналов непрерывности.",
        description:
          "Live explorer даёт автору рабочую карту книги: персонажи, факты лора, опоры глав и сигналы прогноза в одном месте.",
        metrics: [
          ["Поверхность", "Next.js + React Flow"],
          ["Live feed", "HTTP + WebSocket"],
          ["Для кого", "автор и редактор"],
        ],
      },
    },
  },
  {
    id: "bible",
    kind: "core",
    heroPosition: { x: 20, y: 18 },
    panelPosition: { x: 20, y: 18 },
    heroTilt: -4,
    panelTilt: -5,
    labels: {
      en: {
        title: "World Bible",
        chip: "living folio",
        summary: "Canonical lore, locations, systems, factions, and rules stay readable in Markdown.",
        description:
          "Scriptorium keeps the living bible author-friendly while the graph layer turns it into connected, queryable knowledge.",
        metrics: [
          ["Canonical file", "world_bible.md"],
          ["Writer value", "clear world memory"],
          ["Graph use", "entity projection"],
        ],
      },
      ru: {
        title: "World Bible",
        chip: "живое досье",
        summary: "Канонический лор, локации, системы, фракции и правила остаются читаемыми в Markdown.",
        description:
          "Scriptorium оставляет живую библию мира удобной для автора, а графовый слой превращает её в связанную и запросную модель знаний.",
        metrics: [
          ["Канон", "world_bible.md"],
          ["Ценность", "память мира"],
          ["Для графа", "проекция сущностей"],
        ],
      },
    },
  },
  {
    id: "cast",
    kind: "core",
    heroPosition: { x: 79, y: 18 },
    panelPosition: { x: 78, y: 18 },
    heroTilt: 3,
    panelTilt: 4,
    labels: {
      en: {
        title: "Cast Ledger",
        chip: "character arcs",
        summary: "Profiles, motivations, and arc movement remain visible chapter by chapter.",
        description:
          "Character records stay grounded in files but can light up the graph when continuity, relationships, or future risk need inspection.",
        metrics: [
          ["Index", "characters/index.json"],
          ["Arc tracking", "enabled"],
          ["Explorer role", "character nodes"],
        ],
      },
      ru: {
        title: "Cast Ledger",
        chip: "арки персонажей",
        summary: "Профили, мотивации и движение арок видны по главам.",
        description:
          "Записи персонажей живут в файлах, но при необходимости подсвечивают граф для проверки непрерывности, отношений и будущих рисков.",
        metrics: [
          ["Индекс", "characters/index.json"],
          ["Трекинг арок", "включён"],
          ["В explorer", "узлы персонажей"],
        ],
      },
    },
  },
  {
    id: "chapters",
    kind: "graph",
    heroPosition: { x: 22, y: 55 },
    panelPosition: { x: 18, y: 52 },
    heroTilt: 2,
    panelTilt: 3,
    labels: {
      en: {
        title: "Chapter Map",
        chip: "manuscript flow",
        summary: "Chapter markdown becomes a readable map of progression, anchors, and narrative pressure.",
        description:
          "The system can tie forecasted risk back to concrete chapter windows instead of leaving authors with abstract warnings.",
        metrics: [
          ["Source", "chapters/*.md"],
          ["Temporal anchors", "yes"],
          ["Risk link", "chapter windows"],
        ],
      },
      ru: {
        title: "Chapter Map",
        chip: "поток рукописи",
        summary: "Markdown-главы превращаются в читаемую карту развития, опор и narrative pressure.",
        description:
          "Система связывает прогнозируемый риск с конкретными окнами глав, а не оставляет автора с абстрактными предупреждениями.",
        metrics: [
          ["Источник", "chapters/*.md"],
          ["Временные опоры", "да"],
          ["Связь риска", "окна глав"],
        ],
      },
    },
  },
  {
    id: "lore",
    kind: "graph",
    heroPosition: { x: 80, y: 54 },
    panelPosition: { x: 80, y: 52 },
    heroTilt: -3,
    panelTilt: -4,
    labels: {
      en: {
        title: "Lore Registry",
        chip: "consistency facts",
        summary: "Registered facts are no longer just notes. They become continuity material.",
        description:
          "Lore Guardian can use these facts for timeline checks, contradictions, foreshadowing windows, and graph enrichment.",
        metrics: [
          ["Tool", "lore_guardian"],
          ["Storage", "lore_facts.json"],
          ["Checks", "timeline + contradiction"],
        ],
      },
      ru: {
        title: "Lore Registry",
        chip: "факты консистентности",
        summary: "Зарегистрированные факты перестают быть просто заметками. Они становятся материалом для непрерывности.",
        description:
          "Lore Guardian использует эти факты для таймлайна, противоречий, окон foreshadowing и графового обогащения.",
        metrics: [
          ["Инструмент", "lore_guardian"],
          ["Хранилище", "lore_facts.json"],
          ["Проверки", "таймлайн + противоречия"],
        ],
      },
    },
  },
  {
    id: "temporal",
    kind: "temporal",
    heroPosition: { x: 33, y: 83 },
    panelPosition: { x: 30, y: 82 },
    heroTilt: -2,
    panelTilt: -3,
    labels: {
      en: {
        title: "Temporal Spine",
        chip: "story time",
        summary: "Start, end, duration, and chapter spans turn the manuscript into a time-aware system.",
        description:
          "The temporal layer surfaces gaps, impossible intervals, and low-anchor zones before continuity drift spreads through the draft.",
        metrics: [
          ["Fields", "start / end / duration"],
          ["Scope", "chapter spans"],
          ["Writer outcome", "fewer timeline slips"],
        ],
      },
      ru: {
        title: "Temporal Spine",
        chip: "время истории",
        summary: "Start, end, duration и диапазоны глав делают рукопись временем-чувствительной системой.",
        description:
          "Temporal-слой находит пробелы, невозможные интервалы и зоны с нехваткой опор до того, как drift разойдётся по тексту.",
        metrics: [
          ["Поля", "start / end / duration"],
          ["Охват", "диапазоны глав"],
          ["Результат", "меньше ошибок таймлайна"],
        ],
      },
    },
  },
  {
    id: "forecast",
    kind: "forecast",
    heroPosition: { x: 67, y: 83 },
    panelPosition: { x: 69, y: 82 },
    heroTilt: 3,
    panelTilt: 2,
    labels: {
      en: {
        title: "Continuity Horizon",
        chip: "forecast desk",
        summary: "Temporal and causal reasoning point at what may break ten chapters from now.",
        description:
          "Forecast cards stay explainable: confidence, impacted chapters, evidence, and likely remediation patterns.",
        metrics: [
          ["Window", "10 chapters"],
          ["Signals", "temporal + causal"],
          ["Output", "explainable risk cards"],
        ],
      },
      ru: {
        title: "Continuity Horizon",
        chip: "стол прогноза",
        summary: "Temporal и causal reasoning показывают, что может сломаться через десять глав.",
        description:
          "Карточки прогноза остаются объяснимыми: confidence, затронутые главы, evidence и вероятные способы исправления.",
        metrics: [
          ["Окно", "10 глав"],
          ["Сигналы", "temporal + causal"],
          ["Выход", "объяснимые risk cards"],
        ],
      },
    },
  },
];

const dictionaries = {
  en: {
    pageTitle: "Scriptorium MCP | Writing Studio for Living Books",
    brandTagline: "Editorial Atelier",
    repoButton: "Repository",
    nav: [
      ["overview", "Overview"],
      ["showcase", "Studio"],
      ["tools", "Tools"],
      ["architecture", "Architecture"],
      ["launch", "Launch"],
    ],
    hero: {
      eyebrow: "Writing workspace for living book projects",
      title: "Keep your world bible, cast, chapters, and continuity in one working studio.",
      copy:
        "Scriptorium MCP is a file-first workspace for novels and long-form book projects. Build the world, track the cast, shape chapters, inspect a living story graph, and catch continuity risk before it hardens into the manuscript.",
      primary: "Open GitHub Repository",
      secondary: "Walk the Studio",
      visualEyebrow: "Desk view",
      visualStatus: "Pages showcase live",
      visualFooter:
        "This public site is the editorial front door. The real explorer still runs against the repository's graph API and WebSocket layer.",
      insightEyebrow: "Continuity pulse",
      stats: [
        ["World Bible", "A canonical folio for setting memory, rules, factions, themes, and story context."],
        ["Story Atlas", "A browser map of characters, lore facts, chapter anchors, and relationship lines."],
        ["RU / EN", "One canonical model rendered in English and Russian across UI, graph labels, and forecasts."],
        ["10 chapters", "A bounded continuity horizon for temporal and causal plot-risk detection."],
      ],
      events: [
        ["character_forger", "A character arc moved after a new chapter draft landed."],
        ["graph.timeline.updated", "Fresh temporal anchors were inferred from the current manuscript state."],
        ["lore_guardian", "A new lore fact entered the registry and became continuity material."],
        ["graph.forecast.updated", "The next ten chapters were rescored for continuity risk."],
        ["story_architect", "An outline beat changed and the structural pressure map refreshed."],
      ],
      forecast: [
        ["11", "info"],
        ["12", "info"],
        ["13", "warning"],
        ["14", "warning"],
        ["15", "critical"],
        ["16", "critical"],
        ["17", "info"],
        ["18", "warning"],
        ["19", "info"],
        ["20", "warning"],
      ],
    },
    overview: {
      eyebrow: "What the studio gives a writer",
      title: "Made for books, not generic dashboards.",
      copy:
        "The public showcase now frames Scriptorium as a serious writing product: a calm editorial surface on top of real project structure, live graph exploration, and continuity intelligence.",
      cards: [
        ["I", "Living memory", "World rules, places, factions, and lore stay legible to the author while feeding the deeper graph layer."],
        ["II", "Cast and arcs", "Characters are not isolated files. They become a working ledger of state, motive, and change."],
        ["III", "Chapter awareness", "The manuscript is visible as chapter spans, anchors, and progression windows rather than a flat folder."],
        ["IV", "Continuity watch", "Temporal and causal signals can warn about dropped setups, gaps, or abrupt turns before they hit readers."],
      ],
    },
    showcase: {
      eyebrow: "Studio walkthrough",
      title: "Open the folio, inspect the story.",
      copy:
        "Each panel below reflects a real part of the product: the world and chapter atlas, the continuity desk, and the engine room that keeps the system honest.",
      tabs: {
        graph: "Writer's Atlas",
        forecast: "Continuity Desk",
        runtime: "Engine Room",
      },
      graphTitle: "Writer's Atlas",
      graphCopy:
        "The explorer feels like a working archive for the book: world bible, cast ledger, lore notes, chapter anchors, and future risk all remain navigable from the browser.",
      graphBadges: ["World Bible", "Cast Ledger", "Chapter Links"],
      graphEventsTitle: "Recent studio activity",
      graphInspectorLabel: "Selected folio card",
      forecastTitle: "Continuity Desk",
      forecastCopy:
        "Forecasting stays bounded and explainable. Instead of claiming certainty, Scriptorium points to the next places where setup, time, or causality may fail the manuscript.",
      forecastBadges: ["Temporal", "Causal", "10-chapter window"],
      runtimeTitle: "Engine Room",
      runtimeCopy:
        "The public site is polished and calm, but the underlying system remains explicit: file-first project storage, a separate graph service, optional Neo4j enrichment, and a clean deployment story.",
      runtimeBadges: ["File-first", "Optional Neo4j", "GitHub Pages"],
      runtimeTreeTitle: "Repository shape",
      runtimeTree: [
        "src/",
        "  backend/graph/",
        "  tools/",
        "web/",
        "docs/",
        "projects/   # local manuscripts stay ignored",
        "plugins/",
        "plans/",
      ],
      runtimeEndpointsTitle: "Graph delivery surface",
      runtimeEndpoints: [
        ["GET /api/capabilities", "Discover whether live graph, forecasting, and locales are available."],
        ["GET /api/projects", "List known workspace projects for the browser desk."],
        ["GET /api/projects/:project/graph", "Load a localized graph snapshot for the active book."],
        ["GET /api/projects/:project/graph/timeline", "Read ordered chapter anchors and temporal context."],
        ["GET /api/projects/:project/graph/forecast", "Inspect explainable risk cards for the next writing window."],
        ["WS /ws/projects/:project/graph", "Stream live graph deltas into the browser desk."],
      ],
      runtimeNotesTitle: "Why this public site works",
      runtimeNotes: [
        ["Book-safe repo posture", "Local manuscript directories remain excluded from git, so the public repository stays safe."],
        ["Separate public front door", "GitHub Pages tells the product story without pretending to be the live runtime."],
        ["Honest architecture", "The MCP core, graph service, browser explorer, and Pages showcase each keep a clear responsibility."],
      ],
      forecast: {
        chapters: [
          ["11", "info"],
          ["12", "warning"],
          ["13", "warning"],
          ["14", "critical"],
          ["15", "critical"],
          ["16", "warning"],
          ["17", "info"],
          ["18", "warning"],
          ["19", "info"],
          ["20", "critical"],
        ],
        risks: [
          {
            id: "payoff-gap",
            severity: "warning",
            title: "A planted relic may reach chapter 14 without payoff",
            chapters: "12, 13, 14",
            summary: "The manuscript shows setup energy, but the graph still lacks a visible resolution path.",
            detailTitle: "Why the desk is worried",
            details: [
              ["Evidence", "A lore fact projects forward three chapters with no mirrored reveal or payoff node."],
              ["Impact", "Readers may feel the book planted importance and then quietly walked away from it."],
              ["Editorial move", "Add a reveal beat, a scene marker, or a linking chapter event before chapter 14 lands."],
            ],
          },
          {
            id: "causal-jump",
            severity: "critical",
            title: "An alliance shift looks stronger than its setup",
            chapters: "14, 15",
            summary: "The causal relation is strong, but earlier chapters do not yet carry enough precondition weight.",
            detailTitle: "Why the desk is worried",
            details: [
              ["Evidence", "A high-confidence relation points to a sharp turn with weak earlier support in the timeline."],
              ["Impact", "The turn may read as unearned, abrupt, or out of character once drafted."],
              ["Editorial move", "Seed motive, pressure, or consequence one or two chapters earlier."],
            ],
          },
          {
            id: "timeline-thin",
            severity: "info",
            title: "The next chapter band is temporally thin",
            chapters: "17, 18, 19",
            summary: "Several future chapters still have too few anchors for clean continuity control.",
            detailTitle: "Why the desk is worried",
            details: [
              ["Evidence", "The current graph has sparse temporal markers across the projected window."],
              ["Impact", "Travel, recovery, age, and event order are more likely to drift while drafting."],
              ["Editorial move", "Register dates, durations, or chapter-span states before the manuscript expands."],
            ],
          },
        ],
      },
    },
    tools: {
      eyebrow: "Full writing desk",
      title: "A broad authoring surface sits behind the quiet design.",
      copy:
        "Scriptorium is not just a graph. The studio includes project setup, worldbuilding, character work, outlining, chapter drafting, prose refinement, research, critique, and extension points.",
      cards: [
        ["project_manager", "Workspace", "Create, inspect, export, and safely manage file-backed book projects."],
        ["world_weaver", "Worldbuilding", "Grow locations, cultures, systems, timelines, factions, and themes."],
        ["character_forger", "Cast", "Create characters, update profiles, and track arc movement."],
        ["story_architect", "Structure", "Shape outline beats, inspect plot pressure, and surface twist options."],
        ["chapter_weaver", "Drafting", "Write, append, inspect, and list chapters with continuity in view."],
        ["lore_guardian", "Continuity", "Register facts, inspect lore, and run timeline and contradiction checks."],
        ["prose_alchemist", "Style", "Refine prose while preserving voice and generating controlled variants."],
        ["series_planner", "Series design", "Plan multi-book movement, titles, and progression."],
        ["beta_reader", "Reader response", "Simulate critique perspectives for scenes and excerpts."],
        ["research_quill", "Research", "Track facts, sources, and grounding material for the book."],
        ["plugin_manager", "Extensions", "Inspect optional ontology plugins and richer entity vocabularies."],
        ["genre_prompt", "Guidance", "Pull genre-aware prompt direction for drafting sessions."],
      ],
    },
    architecture: {
      eyebrow: "How the studio stays clean",
      title: "One manuscript source of truth, multiple useful views.",
      copy:
        "The writing desk works because the project remains canonical on disk. Everything else the atlas, the forecast desk, and this public site derives from that source with clear boundaries.",
      steps: [
        ["01", "Writing tools", "MCP tools write project files that remain understandable outside the browser UI."],
        ["02", "Canonical folio", "World bible, characters, outline, chapters, and lore facts stay readable on disk."],
        ["03", "Graph projection", "The system turns those files into localized entities, temporal spans, and causal hints."],
        ["04", "Live graph service", "HTTP snapshots and WebSocket deltas feed the browser without bloating the authoring core."],
        ["05", "Atlas and forecast", "The browser desk helps the author inspect structure, risk, and continuity before revising."],
      ],
      surfaces: [
        ["A", "For writers", "The surface language stays close to books, scenes, chapters, and memory rather than abstract ops jargon."],
        ["B", "For teams", "Editors and technical evaluators can still see the engine room, API surface, and deployment posture."],
        ["C", "For localization", "English and Russian are modeled as views over one canonical story system."],
        ["D", "For safe publishing", "A public repo and public Pages site do not expose local manuscript data because the workspace stays ignored."],
      ],
    },
    launch: {
      eyebrow: "Run the studio",
      title: "Keep the public face elegant, keep the runtime real.",
      copy:
        "GitHub Pages now works as a polished editorial front door. The actual browser explorer and graph service still run locally or on your own host when you want the live experience.",
      primary: "Open Repository",
      secondary: "Review the Tools",
      command: [
        "npm install",
        "npm run build:all",
        "npm run dev",
        "",
        "# second terminal",
        "npm run dev:web",
        "",
        "# useful endpoints",
        "http://localhost:4319/api/capabilities",
        "ws://localhost:4319/ws/projects/<project>/graph?locale=en",
      ].join("\n"),
    },
    footer: "Scriptorium MCP public atelier. File-first writing, a living book graph, bilingual presentation, and continuity intelligence for serious long-form projects.",
  },
  ru: {
    pageTitle: "Scriptorium MCP | Писательская студия для живых книг",
    brandTagline: "Editorial Atelier",
    repoButton: "Репозиторий",
    nav: [
      ["overview", "Обзор"],
      ["showcase", "Студия"],
      ["tools", "Инструменты"],
      ["architecture", "Архитектура"],
      ["launch", "Запуск"],
    ],
    hero: {
      eyebrow: "Рабочее пространство для живых книжных проектов",
      title: "Держи world bible, состав персонажей, главы и continuity в одной студии.",
      copy:
        "Scriptorium MCP это file-first воркспейс для романов и больших книжных проектов. Здесь можно строить мир, вести состав персонажей, формировать главы, смотреть живой story graph и замечать continuity-risk до того, как он зацементируется в рукописи.",
      primary: "Открыть GitHub-репозиторий",
      secondary: "Пройти по студии",
      visualEyebrow: "Вид стола",
      visualStatus: "Pages-витрина активна",
      visualFooter:
        "Этот публичный сайт является editorial front door. Настоящий explorer по-прежнему работает поверх graph API и WebSocket-слоя репозитория.",
      insightEyebrow: "Пульс continuity",
      stats: [
        ["World Bible", "Каноническое досье для памяти мира, правил, фракций, тем и контекста истории."],
        ["Story Atlas", "Браузерная карта персонажей, lore facts, chapter anchors и линий отношений."],
        ["RU / EN", "Одна каноническая модель, которая рендерится на русском и английском в UI, графе и прогнозах."],
        ["10 глав", "Ограниченный горизонт для temporal и causal анализа рисков сюжета."],
      ],
      events: [
        ["character_forger", "Арка персонажа сдвинулась после нового драфта главы."],
        ["graph.timeline.updated", "Из текущего состояния рукописи были выведены новые temporal anchors."],
        ["lore_guardian", "Новый факт вошёл в реестр лора и стал материалом для continuity."],
        ["graph.forecast.updated", "Следующие десять глав были пересчитаны на предмет рисков."],
        ["story_architect", "Изменился beat плана, и карта структурного давления обновилась."],
      ],
      forecast: [
        ["11", "info"],
        ["12", "info"],
        ["13", "warning"],
        ["14", "warning"],
        ["15", "critical"],
        ["16", "critical"],
        ["17", "info"],
        ["18", "warning"],
        ["19", "info"],
        ["20", "warning"],
      ],
    },
    overview: {
      eyebrow: "Что эта студия даёт автору",
      title: "Сделано для книг, а не для безличных дашбордов.",
      copy:
        "Публичная витрина теперь показывает Scriptorium как серьёзный писательский продукт: спокойную editorial-поверхность поверх реальной структуры проекта, живого graph explorer и continuity intelligence.",
      cards: [
        ["I", "Живая память мира", "Правила мира, места, фракции и лор остаются понятными автору и одновременно питают более глубокий графовый слой."],
        ["II", "Состав и арки", "Персонажи перестают быть изолированными файлами и становятся рабочим реестром состояния, мотива и изменения."],
        ["III", "Осознание глав", "Рукопись видна как диапазоны глав, опоры и окна развития, а не как плоская папка."],
        ["IV", "Наблюдение за continuity", "Temporal и causal сигналы помогают заранее увидеть dropped setups, gaps и резкие повороты."],
      ],
    },
    showcase: {
      eyebrow: "Прогулка по студии",
      title: "Открой folio и посмотри на историю изнутри.",
      copy:
        "Каждая панель ниже отражает реальный слой продукта: atlas мира и глав, continuity desk и engine room, который делает систему честной.",
      tabs: {
        graph: "Writer's Atlas",
        forecast: "Continuity Desk",
        runtime: "Engine Room",
      },
      graphTitle: "Writer's Atlas",
      graphCopy:
        "Explorer ощущается как рабочий архив книги: world bible, реестр персонажей, lore notes, chapter anchors и future risk остаются навигируемыми прямо в браузере.",
      graphBadges: ["World Bible", "Cast Ledger", "Chapter Links"],
      graphEventsTitle: "Последняя активность студии",
      graphInspectorLabel: "Выбранная карточка",
      forecastTitle: "Continuity Desk",
      forecastCopy:
        "Прогноз остаётся ограниченным и объяснимым. Вместо притворства полной точности Scriptorium показывает ближайшие места, где setup, время или причинность могут подвести рукопись.",
      forecastBadges: ["Temporal", "Causal", "Окно 10 глав"],
      runtimeTitle: "Engine Room",
      runtimeCopy:
        "Публичный сайт выглядит спокойно и изящно, но под ним остаётся прозрачная система: file-first хранение проекта, отдельный graph service, optional Neo4j и чистая история деплоя.",
      runtimeBadges: ["File-first", "Optional Neo4j", "GitHub Pages"],
      runtimeTreeTitle: "Форма репозитория",
      runtimeTree: [
        "src/",
        "  backend/graph/",
        "  tools/",
        "web/",
        "docs/",
        "projects/   # локальные рукописи остаются вне git",
        "plugins/",
        "plans/",
      ],
      runtimeEndpointsTitle: "Поверхность graph delivery",
      runtimeEndpoints: [
        ["GET /api/capabilities", "Понять, доступны ли live graph, forecasting и локали."],
        ["GET /api/projects", "Получить список известных проектов для браузерного стола."],
        ["GET /api/projects/:project/graph", "Загрузить локализованный graph snapshot для активной книги."],
        ["GET /api/projects/:project/graph/timeline", "Прочитать упорядоченные опоры глав и temporal context."],
        ["GET /api/projects/:project/graph/forecast", "Посмотреть объяснимые risk cards на ближайшее окно письма."],
        ["WS /ws/projects/:project/graph", "Стримить live graph deltas прямо в браузерную студию."],
      ],
      runtimeNotesTitle: "Почему этот публичный сайт работает",
      runtimeNotes: [
        ["Безопасный репозиторий", "Локальные директории рукописей исключены из git, поэтому публичный репозиторий остаётся безопасным."],
        ["Отдельный front door", "GitHub Pages рассказывает историю продукта, не притворяясь живым runtime."],
        ["Честная архитектура", "MCP-ядро, graph service, браузерный explorer и Pages-витрина имеют чёткие роли."],
      ],
      forecast: {
        chapters: [
          ["11", "info"],
          ["12", "warning"],
          ["13", "warning"],
          ["14", "critical"],
          ["15", "critical"],
          ["16", "warning"],
          ["17", "info"],
          ["18", "warning"],
          ["19", "info"],
          ["20", "critical"],
        ],
        risks: [
          {
            id: "payoff-gap",
            severity: "warning",
            title: "Посаженный артефакт может дойти до главы 14 без payoff",
            chapters: "12, 13, 14",
            summary: "В рукописи уже есть setup-энергия, но в графе пока не видно явной линии развязки.",
            detailTitle: "Почему стол волнуется",
            details: [
              ["Evidence", "Факт лора тянется вперёд на три главы, но зеркального reveal или payoff-узла ещё нет."],
              ["Impact", "Читателю может показаться, что книга пообещала важность и тихо о ней забыла."],
              ["Editorial move", "Добавить reveal beat, marker сцены или chapter event до главы 14."],
            ],
          },
          {
            id: "causal-jump",
            severity: "critical",
            title: "Сдвиг союза выглядит сильнее, чем его подготовка",
            chapters: "14, 15",
            summary: "Causal relation уже сильна, но в ранних главах пока не хватает предпосылок.",
            detailTitle: "Почему стол волнуется",
            details: [
              ["Evidence", "Связь с высокой confidence указывает на резкий поворот при слабой подготовке в таймлайне."],
              ["Impact", "Поворот может читаться как незаработанный, резкий или не в характере."],
              ["Editorial move", "Посеять мотив, давление или последствие на одну-две главы раньше."],
            ],
          },
          {
            id: "timeline-thin",
            severity: "info",
            title: "Следующая полоса глав слишком тонка по temporal markers",
            chapters: "17, 18, 19",
            summary: "У нескольких будущих глав пока слишком мало опор для чистого контроля continuity.",
            detailTitle: "Почему стол волнуется",
            details: [
              ["Evidence", "В текущем графе мало temporal markers в прогнозируемом окне."],
              ["Impact", "Путешествия, восстановление, возраст и порядок событий начинают чаще drift."],
              ["Editorial move", "Зарегистрировать даты, durations или chapter-span states до расширения рукописи."],
            ],
          },
        ],
      },
    },
    tools: {
      eyebrow: "Полный писательский стол",
      title: "За спокойным дизайном скрывается большой набор authoring-инструментов.",
      copy:
        "Scriptorium это не просто граф. Внутри студии есть настройка проекта, worldbuilding, персонажи, план, draft глав, редактирование прозы, research, critique и extension points.",
      cards: [
        ["project_manager", "Workspace", "Создание, инспекция, экспорт и безопасное управление file-backed проектами."],
        ["world_weaver", "Worldbuilding", "Рост локаций, культур, систем, таймлайнов, фракций и тем."],
        ["character_forger", "Cast", "Создание персонажей, обновление профилей и трекинг арок."],
        ["story_architect", "Structure", "Работа с beat-структурой, плотностью сюжета и возможностями twist."],
        ["chapter_weaver", "Drafting", "Запись, дописывание и чтение глав с оглядкой на continuity."],
        ["lore_guardian", "Continuity", "Регистрация фактов, инспекция лора и проверки таймлайна и противоречий."],
        ["prose_alchemist", "Style", "Улучшение прозы с сохранением голоса и контролируемыми вариантами."],
        ["series_planner", "Series design", "Планирование движения серии, названий и общей прогрессии."],
        ["beta_reader", "Reader response", "Симуляция читательского отклика для сцен и отрывков."],
        ["research_quill", "Research", "Факты, источники и grounding material для книги."],
        ["plugin_manager", "Extensions", "Инспекция optional ontology plugins и richer entity vocabularies."],
        ["genre_prompt", "Guidance", "Жанровое направление для сессий письма."],
      ],
    },
    architecture: {
      eyebrow: "Почему студия остаётся чистой",
      title: "Один канонический источник рукописи, несколько полезных представлений.",
      copy:
        "Рабочий стол работает потому, что проект остаётся каноническим на диске. Всё остальное atlas, continuity desk и этот публичный сайт выводится из этого источника с понятными границами.",
      steps: [
        ["01", "Writing tools", "MCP-инструменты пишут проектные файлы, понятные и без браузерного UI."],
        ["02", "Canonical folio", "World bible, персонажи, план, главы и lore facts остаются читаемыми на диске."],
        ["03", "Graph projection", "Система превращает эти файлы в localized entities, temporal spans и causal hints."],
        ["04", "Live graph service", "HTTP snapshots и WebSocket deltas питают браузер, не раздувая authoring core."],
        ["05", "Atlas и forecast", "Браузерный стол помогает автору видеть структуру, риск и continuity до ревизии."],
      ],
      surfaces: [
        ["A", "Для автора", "Язык поверхности остаётся близким к книге, сценам, главам и памяти мира, а не к абстрактным ops-терминам."],
        ["B", "Для команды", "Редактор и технический оценщик всё ещё видят engine room, API-поверхность и deployment posture."],
        ["C", "Для локализации", "Русский и английский живут как представления над одной канонической story system."],
        ["D", "Для безопасной публикации", "Публичный репозиторий и публичный Pages-сайт не раскрывают локальные manuscript-данные."],
      ],
    },
    launch: {
      eyebrow: "Запуск студии",
      title: "Публичное лицо может быть изящным, а runtime оставаться настоящим.",
      copy:
        "GitHub Pages теперь выступает polished editorial front door. Реальный browser explorer и graph service по-прежнему запускаются локально или на твоём собственном хосте, когда нужен live-режим.",
      primary: "Открыть репозиторий",
      secondary: "Посмотреть инструменты",
      command: [
        "npm install",
        "npm run build:all",
        "npm run dev",
        "",
        "# второй терминал",
        "npm run dev:web",
        "",
        "# полезные endpoints",
        "http://localhost:4319/api/capabilities",
        "ws://localhost:4319/ws/projects/<project>/graph?locale=ru",
      ].join("\n"),
    },
    footer: "Публичная atelier-витрина Scriptorium MCP. File-first письмо, живой граф книги, двуязычная подача и continuity intelligence для серьёзных long-form проектов.",
  },
};

const state = {
  locale: detectLocale(),
  activeTab: "graph",
  activeNode: "atlas",
  activeRisk: "payoff-gap",
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
  graphBadges: document.getElementById("graph-badges"),
  graphNodeLayer: document.getElementById("graph-node-layer"),
  graphInspector: document.getElementById("graph-inspector"),
  graphEventsTitle: document.getElementById("graph-events-title"),
  graphEvents: document.getElementById("graph-events"),
  forecastPanelTitle: document.getElementById("forecast-panel-title"),
  forecastPanelCopy: document.getElementById("forecast-panel-copy"),
  forecastBadges: document.getElementById("forecast-badges"),
  forecastChapters: document.getElementById("forecast-chapters"),
  forecastList: document.getElementById("forecast-list"),
  forecastDetail: document.getElementById("forecast-detail"),
  runtimePanelTitle: document.getElementById("runtime-panel-title"),
  runtimePanelCopy: document.getElementById("runtime-panel-copy"),
  runtimeBadges: document.getElementById("runtime-badges"),
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
  return String(value)
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
  document.title = dict.pageTitle;

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
  renderForecastStrip(elements.heroForecastStrip, dict.hero.forecast);
  renderEventStream(elements.heroLog, dict.hero.events);
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
  renderBadges(elements.graphBadges, dict.showcase.graphBadges);
  elements.graphEventsTitle.textContent = dict.showcase.graphEventsTitle;
  renderNodes(elements.graphNodeLayer, "panel");
  renderInspector(dict.showcase.graphInspectorLabel);
  renderEventStream(elements.graphEvents, dict.hero.events);

  elements.forecastPanelTitle.textContent = dict.showcase.forecastTitle;
  elements.forecastPanelCopy.textContent = dict.showcase.forecastCopy;
  renderBadges(elements.forecastBadges, dict.showcase.forecastBadges);
  renderForecastPanel(dict.showcase.forecast);

  elements.runtimePanelTitle.textContent = dict.showcase.runtimeTitle;
  elements.runtimePanelCopy.textContent = dict.showcase.runtimeCopy;
  renderBadges(elements.runtimeBadges, dict.showcase.runtimeBadges);
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

function renderBadges(target, items) {
  target.innerHTML = items.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("");
}

function renderNodes(target, mode) {
  target.innerHTML = graphNodes
    .map((node) => {
      const localized = node.labels[state.locale];
      const position = mode === "hero" ? node.heroPosition : node.panelPosition;
      const tilt = mode === "hero" ? node.heroTilt : node.panelTilt;
      return `
        <button
          class="graph-node ${state.activeNode === node.id ? "is-active" : ""}"
          data-node="${node.id}"
          data-kind="${node.kind}"
          style="--x:${position.x}%; --y:${position.y}%; --tilt:${tilt}deg"
          type="button"
        >
          <span class="graph-node__kind">${escapeHtml(localized.chip)}</span>
          <strong>${escapeHtml(localized.title)}</strong>
          <span>${escapeHtml(localized.summary)}</span>
        </button>
      `;
    })
    .join("");
}

function renderInspector(label) {
  const node = graphNodes.find((item) => item.id === state.activeNode) ?? graphNodes[0];
  const localized = node.labels[state.locale];
  elements.graphInspector.innerHTML = `
    <div class="eyebrow">${escapeHtml(label)}</div>
    <h3>${escapeHtml(localized.title)}</h3>
    <p>${escapeHtml(localized.description)}</p>
    <div class="pill-row">
      <span class="pill">${escapeHtml(localized.chip)}</span>
      <span class="pill">${escapeHtml(node.kind)}</span>
    </div>
    <div class="mini-stat-row">
      ${localized.metrics
        .map(([title, value]) => `
          <div class="mini-stat">
            <span>${escapeHtml(title)}</span>
            <strong>${escapeHtml(value)}</strong>
          </div>
        `)
        .join("")}
    </div>
  `;
}

function renderForecastStrip(target, items) {
  target.innerHTML = items
    .map(([chapter, severity]) => `
      <div class="forecast-cell forecast-cell--${severity}">
        <span>Ch. ${escapeHtml(chapter)}</span>
        <div class="forecast-cell__bar"></div>
      </div>
    `)
    .join("");
}

function renderForecastPanel(forecast) {
  elements.forecastChapters.innerHTML = forecast.chapters
    .map(([chapter, severity]) => `<div class="chapter-pill chapter-pill--${severity}">Ch. ${escapeHtml(chapter)}</div>`)
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
    visible.push(events[(state.eventCursor + index) % events.length]);
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

function startTicker() {
  window.setInterval(() => {
    const events = getDictionary().hero.events;
    state.eventCursor = (state.eventCursor + 1) % events.length;
    renderEventStream(elements.heroLog, events);
    renderEventStream(elements.graphEvents, events);
  }, 3400);
}

installEvents();
render();
startTicker();
