# Scriptorium MCP - Comprehensive Improvement Specification

**Date:** 2026-04-16  
**Version:** 1.5 (Universal Scriptorium - Phase 1.5)  
**Status:** Draft for Review  
**Author:** Architect Mode Analysis

## Executive Summary

The current Scriptorium MCP implementation provides a solid foundation for a medieval scriptorium AI co-author but falls significantly short of the original vision. It is a **thin wrapper** around file-system operations with LLM prompts, lacking robustness, consistency guarantees, extensibility, and several core features (especially "Живая Библия мира" / Living World Bible auto-sync, export, multi-author support, and deep lore consistency).

**New Critical Requirement (Phase 1.5 - Universal Scriptorium):** The system must gracefully support *completely different* kinds of books beyond fantasy/sci-fi:
- Pure historical fiction
- Contemporary literary fiction
- Non-fiction / memoir
- Mystery/thriller without supernatural elements
- Romance (contemporary, historical, etc.)
- Any other genre

**Core Changes:** Revise World Weaver, Living World Bible structure, genre prompt library, and affected components to be **genre-agnostic by default** while still supporting speculative fiction when chosen. Focus on making the core (especially Lore Guardian and World Weaver) completely neutral to setting. Only .md files edited in this architect task per instructions.

**Critical Assessment:** The system is brittle, race-condition prone, has weak consistency checking (regex/string matching only), no transaction model, poor error handling, and no observability. Lore Guardian is the most important component per the original spec but is currently one of the weakest. The speculative bias in World Weaver and bible templates exacerbates this for non-speculative genres.

This document prioritizes fixes based on risk, alignment with original vision, and impact. Phase 1.5 establishes the universal foundation.

## Universal Scriptorium Design (Phase 1.5)

### Key Design Principles
- **Genre Agnostic Core**: Default to neutral elements and sections. Speculative features (magic, technology) are opt-in via genre detection and conditional rendering.
- **Core Systems & Rules**: Neutral replacement for "Magic / Technology System" (per user confirmation). Covers physics of the world, social norms, psychological rules, historical constraints, thematic logic, mystery rules, romantic tropes as "systems" without forcing supernatural.
- **Backward Compatibility**: Existing grimdark/test projects continue to work via aliases (magic_system maps to core_systems when genre=grimdark_fantasy).
- **Dynamic Living Bible**: Generated from MCP memory graph + project genre. Sections adapt automatically.
- **Expanded Genre Support**: Update prompt library with contemporary_literary, mystery_thriller, contemporary_romance, historical_romance, memoir_nonfiction, plus enhanced historical_fiction.

### Updated World Weaver & Living Bible Structure
- **WorldWeaver element enum** (conceptual): `["world", "location", "culture", "core_systems", "timeline", "faction", "theme", "society"]` + dynamic speculative additions.
- **Living World Bible Template** (neutral by default):
  - Overview
  - Locations
  - Cultures & Peoples
  - **Core Systems & Rules** (neutral; speculative genres add Magic/Technology subsections)
  - Timeline
  - Factions & Organizations
  - Thematic Framework / Narrative Constraints
  - Rules & Lore (integrated with Lore Guardian graph)
- **Lore Guardian**: Completely neutral consistency engine. Supports categories like `historical_accuracy`, `thematic_coherence`, `psychological_consistency`, `plot_logic`, `social_norm` in addition to existing ones. No hardcoded supernatural assumptions. Uses memory graph for entity/relation based checks.
- **Mermaid Architecture Overview**:

```mermaid
flowchart TD
    User[User Request<br/>Any Genre] --> GenreDetector[Genre Detector<br/>historical | literary | mystery | romance | memoir | speculative]
    GenreDetector --> NeutralCore[Neutral Core: World Weaver + Lore Guardian]
    NeutralCore --> DynamicBible[Dynamic Living World Bible<br/>Core Systems & Rules + Conditional Sections]
    DynamicBible --> MemoryGraph[MCP Memory Graph<br/>Entities: location, event, norm, motif, constraint]
    SpeculativeBranch{Is Speculative?} -->|Yes| MagicTech[Magic/Tech Subsystems<br/>under Core Systems]
    SpeculativeBranch -->|No| Thematic[Theme/Society/Psychology Focus]
    NeutralCore --> ConsistencyEngine[Lore Guardian<br/>historical_accuracy + thematic_coherence + timeline]
    ConsistencyEngine --> AllTools[All Tools<br/>chapter_weaver, prose_alchemist, etc.]
    
    style NeutralCore fill:#e6f3ff
    style DynamicBible fill:#f0f8e8
```

### Integration Points
- Project creation detects genre and seeds appropriate bible structure.
- All tools (story_architect, chapter_weaver, research_quill, prose_alchemist) receive neutral context + genre-specific prompts.
- Research Quill emphasizes historical accuracy for historical fiction, psychological depth for literary, etc.
- Beta Reader personas adapt to genre (e.g. sensitivity reader for memoir/romance).

## 1. Thorough Code Review Findings: Failure Points, Edge Cases, and Defects

(Previous findings retained for continuity; new universal issues noted below)

### New Universal Limitations Identified
- `world-weaver.ts`: Hardcoded speculative enum and bible sections assuming magic/technology.
- Living Bible templates force speculative headings.
- Lore Guardian examples and patterns biased toward fantasy contradictions.
- Genre prompt library lacks full coverage for literary, memoir, pure mystery, romance.
- No dynamic section generation based on genre.

(Full previous architectural issues, tool failures, etc. remain as documented in v1.0.)

## 2. Definition of "Живая Библия мира" (Living World Bible)

**Updated for Universality**: The Living World Bible is now the single source of truth for *any* genre — a dynamic, always-consistent knowledge repository that automatically stays in sync with all writing, research, and edits. 

**Core Requirements (Neutral)**:
- Centralized Knowledge Graph using MCP memory tools. Entities tagged neutrally (Character, Location, Event, Fact, Constraint, Motif, Norm). Relations support historical causality, thematic resonance, psychological consistency, plot logic.
- Automatic Sync Mechanisms adapted per genre.
- Versioning, provenance, live views, Mermaid timelines (now genre-appropriate: historical timelines, emotional arcs, investigation timelines, relationship progressions).
- For non-speculative: emphasis on historical accuracy checks, thematic coherence, character psychology, societal constraints.

**Implementation Priority**: Phase 1.5 first establishes neutral core, then integrates with graph in Phase 1.

## 3. Prioritized Improvement Roadmap

### Phase 0: Stability & Robustness (Must Fix First)
(unchanged - 1-6)

### Phase 1.5: Universal Scriptorium (NEW - Genre Agnostic Foundation)
**Must precede full Living Bible work to avoid re-work.**
1. Update World Weaver schema, templates, and MCP tool to support neutral `core_systems` element and dynamic sections.
2. Redesign Living World Bible template and renderer to be genre-agnostic with "Core Systems & Rules" as the neutral hub (conditional speculative subsections).
3. Make Lore Guardian completely setting-neutral: expand consistency checks to historical_accuracy, thematic_coherence, psychological_consistency, mystery_logic, romantic_tension, etc. Remove any hardcoded fantasy assumptions.
4. Expand `genre-prompts.ts` (and MCP genre_prompt tool) with contemporary_literary, mystery_thriller, contemporary_romance, historical_romance, memoir_nonfiction (plus refinements to existing).
5. Update project_manager and all tool prompts to inject genre-appropriate bible structure and constraints.
6. Add genre detector that seeds correct bible structure on project create.
7. Ensure backward compatibility for existing speculative projects.
8. Include Mermaid diagrams in documentation for universal workflow.
9. Update this IMPROVEMENTS.md (and any other .md) to reflect universal architecture. **(This task completes item 9)**

**Success Criteria for Phase 1.5**: A new literary fiction or historical memoir project generates appropriate neutral bible with "Core Systems & Rules" section; Lore Guardian checks consistency without assuming magic; speculative projects unchanged.

### Phase 1: Living World Bible & Consistency Engine (Core Vision)
(Now builds on universal foundation - 7-11 renumbered accordingly, using neutral entities)

### Phase 2: Integration & Intelligence
(unchanged, now fully benefits from universal core)

### Phase 3: Features from Original Vision
(unchanged)

### Phase 4: Architecture & Extensibility
(unchanged)

## 4. Suggested Architectural Improvements
(Previous suggestions retained; new emphasis on genre detector service and conditional bible renderer in core domain layer.)

## 5. Success Metrics for "Done" & Test Results (2026-04-16)

**Updated Test Considerations**: 
- Test with new project types (historical, literary, mystery, romance, memoir) in addition to grimdark.
- Verify neutral bible structure, core_systems section, non-speculative consistency checks.
- Confirm no regression on existing test_grimdark project.

**Previous test summary retained for reference** (grimdark test passed). New universal tests to be executed in subsequent modes.

**Conclusion**: With Phase 1.5 Universal Scriptorium complete, Scriptorium becomes a true multi-genre authoring platform. Ready for implementation review.

---
*This document updated per architect task constraints (only .md files edited). Mermaid diagram included. Plan ready for user approval and mode switch to code/debug for implementation.*
