/**
 * 🪶 Deterministic "Quill Embeddings" (no external APIs, no local AI)
 *
 * This module provides a lightweight, fully deterministic text → vector embedding.
 * It is NOT an LLM embedding. Instead, it uses feature hashing over tokens.
 *
 * Purpose:
 * - Enables Neo4j VECTOR INDEX + similarity search without calling any external service.
 * - Works offline and is reproducible.
 *
 * Caveats:
 * - Lower semantic quality than neural embeddings.
 * - Still very useful for fuzzy retrieval across names/observations/aliases.
 */

export interface EmbeddingOptions {
  dimensions?: number; // default 256
  lowercase?: boolean; // default true
  maxTokens?: number;  // default 2048
}

export function embedText(text: string, opts: EmbeddingOptions = {}): number[] {
  const dimensions = opts.dimensions ?? 256;
  const lowercase = opts.lowercase ?? true;
  const maxTokens = opts.maxTokens ?? 2048;

  const v = new Array<number>(dimensions).fill(0);
  const t = (lowercase ? text.toLowerCase() : text)
    .replace(/[^\p{L}\p{N}\s_-]+/gu, " ")
    .trim();

  if (!t) return v;

  const tokens = t.split(/\s+/).slice(0, maxTokens);

  for (const tok of tokens) {
    if (tok.length < 2) continue;
    const h = fnv1a32(tok);
    const idx = h % dimensions;
    const sign = (h & 1) === 0 ? 1 : -1;
    v[idx] += sign * (1 + Math.log(1 + tok.length));
  }

  return l2Normalize(v);
}

function l2Normalize(vec: number[]): number[] {
  let sumSq = 0;
  for (const x of vec) sumSq += x * x;
  const norm = Math.sqrt(sumSq) || 1;
  return vec.map(x => x / norm);
}

/**
 * FNV-1a 32-bit hash (fast, deterministic)
 */
function fnv1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
    hash >>>= 0;
  }
  return hash;
}
