import * as fs from 'node:fs';
import * as path from 'node:path';

/** Recursively walks a directory, returning absolute paths of all files. */
export function walkDir(dir: string, ignorePatterns: string[] = []): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  function walk(current: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (ignorePatterns.includes(entry.name)) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results;
}

/** Returns direct children (files and directories) of a directory, filtered by ignorePatterns. */
export function readDirEntries(
  dir: string,
  ignorePatterns: string[] = [],
): { name: string; fullPath: string; isDirectory: boolean }[] {
  if (!fs.existsSync(dir)) return [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    return entries
      .filter((e) => !ignorePatterns.includes(e.name))
      .map((e) => ({
        name: e.name,
        fullPath: path.join(dir, e.name),
        isDirectory: e.isDirectory(),
      }));
  } catch {
    return [];
  }
}

/** Ensures that the file (and all parent directories) exist. */
export function ensureFile(filePath: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '');
  }
}

/** Returns mtime of a file, or 0 if it can't be read. */
export function getMtime(filePath: string): number {
  try {
    return fs.statSync(filePath).mtimeMs;
  } catch {
    return 0;
  }
}
