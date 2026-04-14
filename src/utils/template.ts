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
 *   {{N}}, {{00N}}      – counter placeholder; resolved later by resolveUniqueFilePath
 *                         Leading zeros set padding width: {{0N}} → 01, 02 …; {{00N}} → 001, 002 …
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
  // Sanitize characters unsafe on Windows/macOS ({{00N}} is safe — no problematic chars)
  return name.replace(/[<>:"|?*\0]/g, '_');
}

/** Regex that matches {{N}} or {{00N}} (leading zeros set padding width). */
const N_TOKEN_RE = /\{\{(0*)N\}\}/;

/**
 * Resolves a template's subDir to a concrete nested path under the notes root.
 *
 * Within each folder name, `.` acts as a hierarchy separator (creates nested dirs).
 * `{{.}}` is an escape for a literal dot that should NOT split into a new level.
 * Date tokens ({{YYYY}} etc.) are replaced using `date`.
 *
 * Examples (date = 2026-04-15):
 *   '{{YYYY}}.{{YYYY-MM}}.{{YYYY-MM-DD}}'  → '2026/2026-04/2026-04-15'
 *   '{{YYYY}}.{{MM}}'                       → '2026/04'
 *   'archive.{{YYYY}}'                      → 'archive/2026'
 *   'v1{{.}}0'                              → 'v1.0'  (no split)
 */
export function resolveTemplateSubDir(
  subDir: string,
  date: Date = new Date(),
): string {
  const DOT_PLACEHOLDER = '\x00';
  const segments: string[] = [];

  // Split existing OS path separators first (handles nested template folders)
  const dirParts = subDir.split(/[\\/]/);

  for (const part of dirParts) {
    if (!part) continue;
    // Protect {{.}} from the dot-split by replacing with a placeholder
    const clean = part.replace(/\{\{\.\}\}/g, DOT_PLACEHOLDER);
    // Split by . to expand into sub-hierarchy
    for (const sub of clean.split('.')) {
      const restored = sub.replace(new RegExp(DOT_PLACEHOLDER, 'g'), '.');
      segments.push(formatDateTokens(restored, date));
    }
  }

  return segments.length > 0 ? path.join(...segments) : '';
}

/** Regex that matches {{N}} or {{N:00}} (any number of zero digits). */

function applyCounter(baseName: string, n: number): string {
  return baseName.replace(/\{\{(0*)N\}\}/g, (_, zeroPad: string) =>
    zeroPad ? String(n).padStart(zeroPad.length + 1, '0') : String(n),
  );
}

/**
 * Resolves a unique file path inside `dir`.
 *
 * Default behaviour (startFromOne = false — unified):
 *   - With {{N}} / {{00N}} : counter starts at 2  → `name_2`, `name_3` …
 *   - Without {{N}}         : first file = no suffix, conflict → `name_2`, `name_3` …
 *
 * When startFromOne = true:
 *   - With {{N}} / {{00N}} : counter starts at 1  → `name_1`, `name_2` …
 *   - Without {{N}}         : always appends suffix  → `name_1`, `name_2` …
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
