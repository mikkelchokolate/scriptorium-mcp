import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import type { OntologyPlugin, EntityTypeDef, RelationTypeDef, ConsistencyRule } from "../core/domain/entities.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGINS_DIR = path.join(__dirname, "..", "..", "plugins");

class PluginService {
  private static instance: PluginService;
  private plugins: Map<string, OntologyPlugin> = new Map();
  private loaded = false;

  private constructor() {}

  public static getInstance(): PluginService {
    if (!PluginService.instance) {
      PluginService.instance = new PluginService();
    }
    return PluginService.instance;
  }

  public async loadPlugins(pluginsDir: string = PLUGINS_DIR): Promise<void> {
    await fs.ensureDir(pluginsDir);
    const files = await fs.readdir(pluginsDir);
    const jsonFiles = files.filter((file) => file.endsWith(".json") && file !== "ontology-schema.json");

    this.plugins.clear();
    for (const file of jsonFiles) {
      try {
        const plugin = await fs.readJson(path.join(pluginsDir, file)) as OntologyPlugin;
        plugin._filename = file;
        this.validatePlugin(plugin);
        this.plugins.set(plugin.name, plugin);
        console.error(`[Scriptorium] Loaded optional ontology plugin: ${plugin.name} v${plugin.version}`);
      } catch (error) {
        console.error(`[Scriptorium] Failed to load plugin ${file}: ${String(error)}`);
      }
    }
    this.loaded = true;
  }

  private validatePlugin(plugin: OntologyPlugin): void {
    if (!plugin.name) throw new Error("Plugin missing 'name'");
    if (!plugin.version) throw new Error("Plugin missing 'version'");
    if (!Array.isArray(plugin.entityTypes)) throw new Error("Plugin missing 'entityTypes' array");
    if (!Array.isArray(plugin.relationTypes)) throw new Error("Plugin missing 'relationTypes' array");

    for (const entityType of plugin.entityTypes) {
      if (!entityType.name || !/^[A-Z][a-zA-Z0-9]+$/.test(entityType.name)) {
        throw new Error(`Invalid entity type name: "${entityType.name}" (must be PascalCase)`);
      }
    }

    for (const relationType of plugin.relationTypes) {
      if (!relationType.name || !/^[A-Z_]+$/.test(relationType.name)) {
        throw new Error(`Invalid relation type name: "${relationType.name}" (must be UPPER_SNAKE_CASE)`);
      }
    }
  }

  public async ensureLoaded(): Promise<void> {
    if (!this.loaded) {
      await this.loadPlugins();
    }
  }

  public getPlugin(name: string): OntologyPlugin | undefined {
    return this.plugins.get(name);
  }

  public getAllPlugins(): OntologyPlugin[] {
    return Array.from(this.plugins.values());
  }

  public getAllEntityTypes(): EntityTypeDef[] {
    return this.getAllPlugins().flatMap((plugin) => plugin.entityTypes);
  }

  public getAllRelationTypes(): RelationTypeDef[] {
    return this.getAllPlugins().flatMap((plugin) => plugin.relationTypes);
  }

  public getAllConsistencyRules(): ConsistencyRule[] {
    return this.getAllPlugins().flatMap((plugin) => plugin.consistencyRules ?? []);
  }

  public isValidEntityType(typeName: string): boolean {
    return this.getAllEntityTypes().some((entityType) => entityType.name === typeName);
  }

  public listPluginsSummary(): string {
    if (this.plugins.size === 0) {
      return "No ontology plugins loaded. Plugins are optional extensions.";
    }

    const lines = Array.from(this.plugins.values()).map((plugin) => `  - ${plugin.name} v${plugin.version}: ${plugin.entityTypes.length} entity types, ${plugin.relationTypes.length} relation types${plugin.description ? ` — ${plugin.description}` : ""}`);
    return `Loaded optional ontology plugins (${this.plugins.size}):\n\n${lines.join("\n")}`;
  }
}

export const pluginService = PluginService.getInstance();
export default pluginService;
