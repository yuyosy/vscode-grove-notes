import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Memento } from 'vscode';
import { DEFAULT_RECENT_LIMIT } from './contributions/configurations';
import { SYSTEM_IGNORE_PATTERNS } from './utils/file-utils';
import { createGitignoreFilter } from './utils/gitignore-utils';

interface NoteActivityEntries {
  pinned: string[];
  recent: string[];
}

function relativePath(root: string, filePath: string): string | undefined {
  const relative = path.relative(root, filePath);
  if (
    relative &&
    !path.isAbsolute(relative) &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`)
  ) {
    return relative;
  }
}

function pathKey(filePath: string): string {
  return process.platform === 'win32' ? filePath.toLowerCase() : filePath;
}

function isFile(filePath: string): boolean {
  try {
    return fs.lstatSync(filePath).isFile();
  } catch {
    return false;
  }
}

function isNotePath(relative: string): boolean {
  return !relative
    .split(path.sep)
    .some((segment) => SYSTEM_IGNORE_PATTERNS.includes(segment.toLowerCase()));
}

export class NoteActivity {
  constructor(
    private readonly state: Memento,
    private readonly onChange: () => void,
  ) {}

  getVisibleEntries(
    root: string,
    useGitignore: boolean,
    recentLimit = DEFAULT_RECENT_LIMIT,
  ): NoteActivityEntries {
    const { pinned, recent } = this.getEntries(root);
    const isIgnored = useGitignore ? createGitignoreFilter(root) : () => false;
    const visiblePaths = (entries: string[]) =>
      entries
        .map((entry) => path.resolve(root, entry))
        .filter((filePath) => {
          const relative = relativePath(root, filePath);
          return (
            relative &&
            isNotePath(relative) &&
            !isIgnored(filePath, false) &&
            isFile(filePath)
          );
        });
    return {
      pinned: visiblePaths(pinned),
      recent:
        recentLimit === 0 ? [] : visiblePaths(recent).slice(0, recentLimit),
    };
  }

  isPinned(root: string, filePath: string): boolean {
    const relative = relativePath(root, filePath);
    return (
      !!relative &&
      this.getEntries(root).pinned.some(
        (entry) => pathKey(entry) === pathKey(relative),
      )
    );
  }

  record(
    root: string,
    filePath: string,
    useGitignore: boolean,
    limit = DEFAULT_RECENT_LIMIT,
  ): void {
    const relative = relativePath(root, filePath);
    if (
      !root ||
      !relative ||
      !isNotePath(relative) ||
      !isFile(filePath) ||
      (useGitignore && createGitignoreFilter(root)(filePath, false))
    )
      return;

    const entries = this.getEntries(root);
    const key = pathKey(relative);
    if (entries.recent[0] && pathKey(entries.recent[0]) === key) return;
    // Keep the existing history when the display limit is lowered.
    const retention = Math.max(
      DEFAULT_RECENT_LIMIT,
      limit,
      entries.recent.length,
    );
    const recent = [
      relative,
      ...entries.recent.filter((entry) => pathKey(entry) !== key),
    ].slice(0, retention);
    this.save(root, { ...entries, recent });
  }

  setPinned(root: string, filePath: string, pinned: boolean): void {
    const relative = relativePath(root, filePath);
    if (!root || !relative || !isNotePath(relative)) return;

    const entries = this.getEntries(root);
    const key = pathKey(relative);
    if (entries.pinned.some((entry) => pathKey(entry) === key) === pinned)
      return;
    const updatedPins = pinned
      ? [...entries.pinned, relative]
      : entries.pinned.filter((entry) => pathKey(entry) !== key);
    this.save(root, { ...entries, pinned: updatedPins });
  }

  updatePath(root: string, from: string, to?: string): void {
    if (!root) return;
    const source = relativePath(root, from);
    if (!source) return;
    const target = to && relativePath(root, to);
    const entries = this.getEntries(root);
    let changed = false;

    const update = (paths: string[]): string[] => {
      const updated = new Map<string, string>();
      for (const entry of paths) {
        const suffix = relativePath(source, entry);
        let destination = entry;
        if (suffix !== undefined || pathKey(source) === pathKey(entry)) {
          changed = true;
          if (!target) continue;
          destination = suffix ? path.join(target, suffix) : target;
        }
        const key = pathKey(destination);
        if (!updated.has(key)) updated.set(key, destination);
      }
      return [...updated.values()];
    };
    const pinned = update(entries.pinned);
    const recent = update(entries.recent);
    if (changed) this.save(root, { pinned, recent });
  }

  private storageKey(root: string): string {
    return `noteActivity:${pathKey(path.resolve(root))}`;
  }

  private getEntries(root: string): NoteActivityEntries {
    const entries = this.state.get<Partial<NoteActivityEntries>>(
      this.storageKey(root),
    );
    return { pinned: entries?.pinned ?? [], recent: entries?.recent ?? [] };
  }

  private save(root: string, entries: NoteActivityEntries): void {
    void this.state
      .update(this.storageKey(root), entries)
      .then(undefined, (error) => {
        console.error('GroveNotes could not save note activity.', error);
      });
    this.onChange();
  }
}
