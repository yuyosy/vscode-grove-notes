import * as fs from 'node:fs';
import type { TagIndex } from '../types';
import { walkDir } from './file-utils';
import { parseFrontMatter } from './front-matter';

/** A shared index with no inherited keys, so every tag name is safe. */
export function buildTagIndex(
  notePath: string,
  ignorePatterns: string[],
): TagIndex {
  const index: TagIndex = Object.create(null);
  for (const file of walkDir(notePath, ignorePatterns).filter((file) =>
    file.endsWith('.md'),
  )) {
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    for (const tag of new Set(parseFrontMatter(text)?.tags ?? [])) {
      index[tag] ??= [];
      index[tag].push(file);
    }
  }
  return index;
}
