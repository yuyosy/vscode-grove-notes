import * as fs from 'node:fs';
import * as path from 'node:path';
import type { Memento } from 'vscode';
import { SYSTEM_IGNORE_PATTERNS } from './utils/file-utils';
import { createGitignoreFilter } from './utils/gitignore-utils';

const RECENT_LIMIT = 20;

interface NoteActivityEntries {
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

  getRecent(root: string, useGitignore: boolean): string[] {
    const { recent } = this.getEntries(root);
    const isIgnored = useGitignore ? createGitignoreFilter(root) : () => false;
    return recent
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
  }

  record(root: string, filePath: string, useGitignore: boolean): void {
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
    const recent = [
      relative,
      ...entries.recent.filter((entry) => pathKey(entry) !== key),
    ].slice(0, RECENT_LIMIT);
    this.save(root, { ...entries, recent });
  }

  updatePath(root: string, from: string, to?: string): void {
    if (!root) return;
    const source = relativePath(root, from);
    if (!source) return;
    const target = to && relativePath(root, to);
    const entries = this.getEntries(root);
    let changed = false;

    const updated = new Map<string, string>();
    for (const entry of entries.recent) {
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
    if (changed) this.save(root, { ...entries, recent: [...updated.values()] });
  }

  private storageKey(root: string): string {
    return `noteActivity:${pathKey(path.resolve(root))}`;
  }

  private getEntries(root: string): NoteActivityEntries {
    return this.state.get(this.storageKey(root), { recent: [] });
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
