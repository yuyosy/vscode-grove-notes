import * as fs from 'node:fs';
import * as path from 'node:path';
import { minimatch } from 'minimatch';
import { createGitignoreFilter } from './gitignore-utils';

/**
 * VCS metadata directories that are always excluded from all scans and views,
 * regardless of user settings or .gitignore content.
 */
export const SYSTEM_IGNORE_PATTERNS: ReadonlyArray<string> = ['.git', '.jj'];

export type PathSeparatorOption = 'auto' | 'slash' | 'backslash';

export function resolvePathSeparator(option: PathSeparatorOption): string {
  if (option === 'slash') return '/';
  if (option === 'backslash') return '\\';
  return path.sep;
}

export function normalizePathSeparators(
  filePath: string,
  option: PathSeparatorOption = 'auto',
): string {
  const separator = resolvePathSeparator(option);
  return separator === '/'
    ? filePath.replaceAll('\\', '/')
    : filePath.replaceAll('/', '\\');
}

export function getRelativeDisplayPath(
  basePath: string,
  targetPath: string,
  option: PathSeparatorOption = 'auto',
): string {
  return normalizePathSeparators(path.relative(basePath, targetPath), option);
}

/**
 * Returns true if the given entry should be excluded based on the pattern list.
 *
 * Each pattern is tested against two targets:
 *  - `entryName`  – the bare file/folder name  (e.g. "node_modules", "*.log")
 *  - `relPath`    – the path relative to the walk root, using forward slashes
 *                   (e.g. "src/utils/foo.tmp" — used for patterns that contain '/')
 *
 * Matching uses minimatch with `{dot: true}` so dotfiles are handled correctly.
 */
function matchesAnyPattern(
  entryName: string,
  relPath: string,
  patterns: string[],
): boolean {
  const rel = relPath.replace(/\\/g, '/');
  for (const pattern of patterns) {
    const p = pattern.replace(/\\/g, '/');
    if (p.includes('/')) {
      // Path-based pattern: match against relative path
      if (minimatch(rel, p, { dot: true })) return true;
    } else {
      // Name-based pattern: match against entry name only
      if (minimatch(entryName, p, { dot: true })) return true;
    }
  }
  return false;
}

/** Recursively walks a directory, returning absolute paths of all files. */
export function walkDir(
  dir: string,
  ignorePatterns: string[] = [],
  useGitignore = false,
): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const gitignored = useGitignore ? createGitignoreFilter(dir) : () => false;

  function walk(current: string) {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      const relPath = path.relative(dir, full);
      if (
        matchesAnyPattern(entry.name, relPath, ignorePatterns) ||
        gitignored(full, entry.isDirectory())
      )
        continue;
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
  rootPath: string = dir,
  useGitignore = false,
): { name: string; fullPath: string; isDirectory: boolean }[] {
  if (!fs.existsSync(dir)) return [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    const gitignored = useGitignore
      ? createGitignoreFilter(rootPath)
      : () => false;
    return entries
      .filter((e) => {
        const fullPath = path.join(dir, e.name);
        return (
          !matchesAnyPattern(
            e.name,
            path.relative(rootPath, fullPath),
            ignorePatterns,
          ) && !gitignored(fullPath, e.isDirectory())
        );
      })
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
