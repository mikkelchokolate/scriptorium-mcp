import { EventEmitter } from 'events';
import path from 'path';
import fs from 'fs-extra';

export type ScriptoriumEvent =
  | 'project.created'
  | 'world.updated'
  | 'character.created'
  | 'character.updated'
  | 'chapter.created'
  | 'chapter.appended'
  | 'fact.registered'
  | 'lore.checked'
  | 'outline.updated';

export interface EventPayload {
  project: string;
  timestamp: string;
  actor?: string;
  details?: Record<string, unknown>;
  changes?: string[];
}

class ScriptoriumEventBus extends EventEmitter {
  private static instance: ScriptoriumEventBus;
  private readonly auditLogPath: string;

  private constructor(projectsRoot: string) {
    super();
    this.auditLogPath = path.resolve(projectsRoot, '..', 'scriptorium-audit.log');
    this.setupListeners();
  }

  public static getInstance(projectsRoot: string = './projects'): ScriptoriumEventBus {
    if (!ScriptoriumEventBus.instance) {
      ScriptoriumEventBus.instance = new ScriptoriumEventBus(projectsRoot);
    }
    return ScriptoriumEventBus.instance;
  }

  private setupListeners(): void {
    this.on('project.created', (payload: EventPayload) => {
      this.log(`Project created: ${payload.project}`, payload);
    });

    this.on('world.updated', (payload: EventPayload) => {
      this.log(`World updated in project ${payload.project}`, payload);
    });

    this.on('character.created', (payload: EventPayload) => {
      this.log(`Character created in project ${payload.project}`, payload);
    });

    this.on('character.updated', (payload: EventPayload) => {
      this.log(`Character updated in project ${payload.project}`, payload);
    });

    this.on('chapter.created', (payload: EventPayload) => {
      this.log(`Chapter created in project ${payload.project}`, payload);
    });

    this.on('chapter.appended', (payload: EventPayload) => {
      this.log(`Chapter appended in project ${payload.project}`, payload);
    });

    this.on('fact.registered', (payload: EventPayload) => {
      this.log(`Fact registered in project ${payload.project}`, payload);
    });

    this.on('lore.checked', (payload: EventPayload) => {
      this.log(`Lore consistency checked in project ${payload.project}`, payload);
    });

    this.on('outline.updated', (payload: EventPayload) => {
      this.log(`Outline updated in project ${payload.project}`, payload);
    });
  }

  private async log(message: string, payload?: EventPayload): Promise<void> {
    const entry = `[${new Date().toISOString()}] ${message} | project=${payload?.project || 'global'}\n`;
    await fs.appendFile(this.auditLogPath, entry, 'utf-8').catch(() => {});
    console.error(`[Scriptorium EventBus] ${message}`);
  }

  public emitEvent(event: ScriptoriumEvent, payload: Omit<EventPayload, 'timestamp'>): void {
    const fullPayload: EventPayload = {
      ...payload,
      timestamp: new Date().toISOString(),
    };
    this.emit(event, fullPayload);
  }
}

export type { ScriptoriumEventBus };
export const eventBus = ScriptoriumEventBus.getInstance();
export default eventBus;
