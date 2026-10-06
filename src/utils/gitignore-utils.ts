import * as fs from 'node:fs';
import * as path from 'node:path';
import ignore from 'ignore';

/** Preserve rule order, negations, escaped characters and trailing spaces. */
export function readGitignorePatterns(folderPath: string): string[] {
  try {
    return fs
      .readFileSync(path.join(folderPath, '.gitignore'), 'utf8')
      .split(/\r?\n/);
  } catch {
    return [];
  }
}

/** Applies root and nested .gitignore rules with Git's excluded-parent semantics. */
export function createGitignoreFilter(rootPath: string) {
  const root = path.resolve(rootPath);
  const matchers = new Map<string, ReturnType<typeof ignore>>();
  const directories = new Map<string, boolean>();
  const isIgnored = (filePath: string, isDirectory: boolean): boolean => {
    const fullPath = path.resolve(filePath);
    const relative = path.relative(root, fullPath);
    if (
      !relative ||
      relative === '..' ||
      relative.startsWith(`..${path.sep}`) ||
      path.isAbsolute(relative)
    )
      return false;
    if (isDirectory && directories.has(fullPath))
      return directories.get(fullPath) ?? false;
    const parent = path.dirname(fullPath);
    if (parent !== root && isIgnored(parent, true)) return true;

    const ancestors: string[] = [];
    for (let dir = parent; ; dir = path.dirname(dir)) {
      ancestors.unshift(dir);
      if (dir === root) break;
    }
    let ignored = false;
    for (const dir of ancestors) {
      let matcher = matchers.get(dir);
      if (!matcher) {
        matcher = ignore({ ignorecase: false }).add(readGitignorePatterns(dir));
        matchers.set(dir, matcher);
      }
      const target =
        path.relative(dir, fullPath).replace(/\\/g, '/') +
        (isDirectory ? '/' : '');
      const result = matcher.test(target);
      if (result.ignored) ignored = true;
      else if (result.unignored) ignored = false;
    }
    if (isDirectory) directories.set(fullPath, ignored);
    return ignored;
  };
  return isIgnored;
}
