import * as fs from 'node:fs';
import * as path from 'node:path';
import { formatDateTokens } from './date-format';

export interface Template {
  name: string;
  filePath: string;
  subDir?: string;
}

/** Lists all .md template files in the given directory (recursively). */
export function loadTemplates(templateDir: string): Template[] {
  if (!fs.existsSync(templateDir)) return [];
  const results: Template[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const rel = path.relative(templateDir, full);
        const subDir = path.dirname(rel);
        results.push({
          name: path.basename(entry.name, '.md'),
          filePath: full,
          subDir: subDir === '.' ? undefined : subDir,
        });
      }
    }
  };
  walk(templateDir);
  return results;
}

/**
 * Reads a template file and processes it:
 *  - Replaces date tokens: {{YYYY}}, {{MM}}, {{DD}}, {{HH}}, {{mm}}, {{ss}}
 *  - Replaces {{title}} with the provided title
 */
export function processTemplate(
  templatePath: string,
  title: string,
  date: Date = new Date(),
): string {
  let content: string;
  try {
    content = fs.readFileSync(templatePath, 'utf8');
  } catch {
    return '';
  }

  // Replace date tokens first
  content = formatDateTokens(content, date);

  // Replace {{title}}
  content = content.replace(/\{\{title\}\}/g, title);

  return content;
}

/**
 * Builds the sanitized base file name (no extension) from a format string.
 *
 * Supported tokens:
 *   {{title}}            – note title
 *   {{YYYY}}, {{MM}} … – date/time (see date-format.ts)
 *   {{N}}, {{N:00}}     – counter placeholder; resolved later by resolveUniqueFilePath
 *
 * e.g. '{{title}}_{{YYYYMMDD}}_{{HH}}h{{mm}}m' → 'my-note_20260408_14h30m'
 */
export function buildBaseFileName(
  format: string,
  title: string,
  date: Date = new Date(),
): string {
  let name = formatDateTokens(format, date);
  name = name.replace(/\{\{title\}\}/g, title);
  // Sanitize characters unsafe on Windows/macOS (keep {{N:00}} intact for later)
  return name.replace(/[<>:"|?*\0]/g, '_');
}

/** Regex that matches {{N}} or {{N:00}} (any number of zero digits). */
const N_TOKEN_RE = /\{\{N(?::(\d+))?\}\}/;

function applyCounter(baseName: string, n: number): string {
  return baseName.replace(/\{\{N(?::(\d+))?\}\}/g, (_, zeroPad?: string) =>
    zeroPad ? String(n).padStart(zeroPad.length, '0') : String(n),
  );
}

/**
 * Resolves a unique file path inside `dir`.
 *
 * Default behaviour (startFromOne = false — unified):
 *   - With {{N}} / {{N:00}} : counter starts at 2  → `name_2`, `name_3` …
 *   - Without {{N}}          : first file = no suffix, conflict → `name_2`, `name_3` …
 *
 * When startFromOne = true:
 *   - With {{N}} / {{N:00}} : counter starts at 1  → `name_1`, `name_2` …
 *   - Without {{N}}          : always appends suffix  → `name_1`, `name_2` …
 *
 * Also ensures `dir` exists (mkdirSync).
 */
export function resolveUniqueFilePath(
  dir: string,
  baseName: string,
  ext: string,
  startFromOne = false,
): string {
  fs.mkdirSync(dir, { recursive: true });

  if (N_TOKEN_RE.test(baseName)) {
    const start = startFromOne ? 1 : 2;
    for (let n = start; n <= 9999; n++) {
      const candidate = path.join(dir, `${applyCounter(baseName, n)}.${ext}`);
      if (!fs.existsSync(candidate)) return candidate;
    }
    return path.join(dir, `${applyCounter(baseName, Date.now())}.${ext}`);
  }

  if (startFromOne) {
    for (let n = 1; n <= 9999; n++) {
      const candidate = path.join(dir, `${baseName}_${n}.${ext}`);
      if (!fs.existsSync(candidate)) return candidate;
    }
    return path.join(dir, `${baseName}_${Date.now()}.${ext}`);
  }

  // Default: no suffix for first file, then _2, _3 …
  const base = path.join(dir, `${baseName}.${ext}`);
  if (!fs.existsSync(base)) return base;

  for (let n = 2; n <= 9999; n++) {
    const candidate = path.join(dir, `${baseName}_${n}.${ext}`);
    if (!fs.existsSync(candidate)) return candidate;
  }
  return path.join(dir, `${baseName}_${Date.now()}.${ext}`);
}

/**
 * @deprecated Use buildBaseFileName + resolveUniqueFilePath instead.
 */
export function buildFileName(
  format: string,
  title: string,
  ext: string,
  date: Date = new Date(),
): string {
  return `${buildBaseFileName(format, title, date)}.${ext}`;
}
