export interface GenrePromptDefinition {
  name: string;
  systemPrompt: string;
  tropes: string[];
  avoid: string[];
}

export type GenrePromptCatalog = Record<string, GenrePromptDefinition>;

export interface GenrePromptLocaleMeta {
  genreNotFound(genre: string, available: string): string;
  expertPrompt: string;
  systemPromptLabel: string;
  tropesLabel: string;
  avoidLabel: string;
  availablePromptsTitle: string;
}
