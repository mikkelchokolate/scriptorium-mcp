import fs from "fs-extra";
import path from "path";
import { randomUUID } from "crypto";
import { ScriptoriumError, logOperation } from "../utils/error-handler.js";
import type { LoreFact, ProjectMeta } from "../core/domain/entities.js";

export class ProjectService {
  private readonly projectsRoot: string;
  private readonly locks: Map<string, Promise<void>> = new Map();

  constructor(projectsRoot: string) {
    this.projectsRoot = projectsRoot;
  }

  public async writeJsonAtomic<T>(filePath: string, data: T): Promise<void> {
    const tmpPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJson(tmpPath, data, { spaces: 2 });
      await fs.move(tmpPath, filePath, { overwrite: true });
    } catch (err) {
      await fs.remove(tmpPath).catch(() => {});
      throw new ScriptoriumError(`Atomic write failed for ${filePath}: ${String(err)}`, "IO_ERROR");
    }
  }

  public async writeMarkdownAtomic(filePath: string, content: string): Promise<void> {
    const tmpPath = `${filePath}.${randomUUID()}.tmp`;
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(tmpPath, content, "utf-8");
      await fs.move(tmpPath, filePath, { overwrite: true });
    } catch (err) {
      await fs.remove(tmpPath).catch(() => {});
      throw new ScriptoriumError(`Atomic write failed for ${filePath}: ${String(err)}`, "IO_ERROR");
    }
  }

  public async withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const existing = this.locks.get(key) ?? Promise.resolve();
    let resolve!: () => void;
    const next = new Promise<void>((r) => {
      resolve = r;
    });
    this.locks.set(key, next);

    try {
      await existing;
      return await fn();
    } finally {
      resolve();
      if (this.locks.get(key) === next) {
        this.locks.delete(key);
      }
    }
  }

  public projectDir(project: string): string {
    return path.join(this.projectsRoot, project);
  }

  public getWorldBiblePath(project: string): string {
    return path.join(this.projectDir(project), "world_bible.md");
  }

  public getLegacyLivingWorldBiblePath(project: string): string {
    return path.join(this.projectDir(project), "living_world_bible.md");
  }

  public async ensureProjectDirectories(project: string): Promise<void> {
    const projectDir = this.projectDir(project);
    await fs.ensureDir(projectDir);
    await fs.ensureDir(path.join(projectDir, "chapters"));
    await fs.ensureDir(path.join(projectDir, "characters"));
    await fs.ensureDir(path.join(projectDir, "world"));
    await fs.ensureDir(path.join(projectDir, "exports"));
  }

  public async getProjectMeta(project: string): Promise<ProjectMeta> {
    const metaPath = path.join(this.projectDir(project), "project.json");
    if (!await fs.pathExists(metaPath)) {
      throw new ScriptoriumError(`Project "${project}" not found`, "NOT_FOUND");
    }
    return fs.readJson(metaPath) as Promise<ProjectMeta>;
  }

  public async writeProjectMeta(project: string, meta: ProjectMeta): Promise<void> {
    const metaPath = path.join(this.projectDir(project), "project.json");
    await this.withLock(`meta:${project}`, () => this.writeJsonAtomic(metaPath, meta));
  }

  public async updateProjectMeta(project: string, updates: Partial<ProjectMeta>): Promise<void> {
    const metaPath = path.join(this.projectDir(project), "project.json");
    await this.withLock(`meta:${project}`, async () => {
      const meta = await this.getProjectMeta(project);
      await this.writeJsonAtomic(metaPath, { ...meta, ...updates });
    });
  }

  public async listProjects(): Promise<string[]> {
    const entries = await fs.readdir(this.projectsRoot).catch(() => []);
    const projects: string[] = [];
    for (const entry of entries) {
      const stat = await fs.stat(path.join(this.projectsRoot, entry)).catch(() => null);
      if (stat?.isDirectory()) {
        projects.push(entry);
      }
    }
    return projects;
  }

  public async readLoreFacts(project: string): Promise<LoreFact[]> {
    const factsPath = path.join(this.projectDir(project), "lore_facts.json");
    if (!await fs.pathExists(factsPath)) {
      return [];
    }
    return fs.readJson(factsPath) as Promise<LoreFact[]>;
  }

  public async writeLoreFacts(project: string, facts: LoreFact[]): Promise<void> {
    const factsPath = path.join(this.projectDir(project), "lore_facts.json");
    await this.withLock(`facts:${project}`, () => this.writeJsonAtomic(factsPath, facts));
  }

  public async appendLoreFact(project: string, fact: LoreFact): Promise<void> {
    await this.withLock(`facts:${project}`, async () => {
      const facts = await this.readLoreFacts(project);
      const existing = facts.findIndex((item) => item.category === fact.category && item.key.toLowerCase() === fact.key.toLowerCase());
      if (existing >= 0) {
        facts[existing] = fact;
      } else {
        facts.push(fact);
      }
      await this.writeJsonAtomic(path.join(this.projectDir(project), "lore_facts.json"), facts);
    });
    logOperation("fact_appended", fact.key, { project });
  }

  public async readWorldBible(project: string): Promise<string | null> {
    const canonicalPath = this.getWorldBiblePath(project);
    const legacyPath = this.getLegacyLivingWorldBiblePath(project);

    if (await fs.pathExists(canonicalPath)) {
      return fs.readFile(canonicalPath, "utf-8");
    }

    if (await fs.pathExists(legacyPath)) {
      const legacyContent = await fs.readFile(legacyPath, "utf-8");
      await this.writeWorldBible(project, legacyContent);
      await fs.remove(legacyPath).catch(() => {});
      return legacyContent;
    }

    return null;
  }

  public async writeWorldBible(project: string, content: string): Promise<void> {
    const biblePath = this.getWorldBiblePath(project);
    await this.withLock(`bible:${project}`, async () => {
      await this.writeMarkdownAtomic(biblePath, content);
      await this.removeLegacyLivingBible(project);
    });
  }

  public async appendToWorldBible(project: string, section: string): Promise<void> {
    await this.withLock(`bible:${project}`, async () => {
      const existing = await this.readWorldBible(project) ?? `# World Bible — ${project}\n\n`;
      const next = existing.endsWith("\n") ? `${existing}${section}\n` : `${existing}\n${section}\n`;
      await this.writeMarkdownAtomic(this.getWorldBiblePath(project), next);
      await this.removeLegacyLivingBible(project);
    });
  }

  public async appendToMarkdownSection(project: string, header: string, entry: string): Promise<void> {
    await this.withLock(`bible:${project}`, async () => {
      const existing = await this.readWorldBible(project) ?? `# World Bible — ${project}\n\n${header}\n`;
      const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const sectionRegex = new RegExp(`(^${escapedHeader}\\n)([\\s\\S]*?)(?=^##\\s|$)`, "m");
      const match = existing.match(sectionRegex);

      let next: string;
      if (!match) {
        next = `${existing.trimEnd()}\n\n${header}\n- ${entry}\n`;
      } else {
        const currentBody = match[2].trimEnd();
        const bullet = `- ${entry}`;
        const updatedSection = `${match[1]}${currentBody ? `${currentBody}\n${bullet}` : `${bullet}`}\n`;
        next = existing.replace(sectionRegex, updatedSection);
      }

      await this.writeMarkdownAtomic(this.getWorldBiblePath(project), next);
      await this.removeLegacyLivingBible(project);
    });
  }

  public async removeLegacyLivingBible(project: string): Promise<void> {
    const legacyPath = this.getLegacyLivingWorldBiblePath(project);
    if (await fs.pathExists(legacyPath)) {
      await fs.remove(legacyPath).catch(() => {});
    }
  }

  public async readChapter(project: string, chapterNum: number): Promise<string | null> {
    const padded = String(chapterNum).padStart(2, "0");
    const chapterPath = path.join(this.projectDir(project), "chapters", `chapter_${padded}.md`);
    if (!await fs.pathExists(chapterPath)) {
      return null;
    }
    return fs.readFile(chapterPath, "utf-8");
  }

  public async writeChapter(project: string, chapterNum: number, content: string): Promise<void> {
    const padded = String(chapterNum).padStart(2, "0");
    const chapterPath = path.join(this.projectDir(project), "chapters", `chapter_${padded}.md`);
    await this.withLock(`chapter:${project}:${chapterNum}`, () => this.writeMarkdownAtomic(chapterPath, content));
  }

  public async appendToChapter(project: string, chapterNum: number, content: string): Promise<void> {
    await this.withLock(`chapter:${project}:${chapterNum}`, async () => {
      const existing = await this.readChapter(project, chapterNum) ?? "";
      await this.writeMarkdownAtomic(
        path.join(this.projectDir(project), "chapters", `chapter_${String(chapterNum).padStart(2, "0")}.md`),
        `${existing}${existing.endsWith("\n") || content.startsWith("\n") ? "" : "\n"}${content}`,
      );
    });
  }
}

export function createProjectService(projectsRoot: string): ProjectService {
  return new ProjectService(projectsRoot);
}
