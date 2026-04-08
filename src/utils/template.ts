import * as fs from 'fs';
import * as path from 'path';
import { formatDateTokens } from './date-format';

export interface Template {
  name: string;
  filePath: string;
}

/** Lists all .md template files in the given directory. */
export function loadTemplates(templateDir: string): Template[] {
  if (!fs.existsSync(templateDir)) return [];
  try {
    return fs
      .readdirSync(templateDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => ({
        name: path.basename(f, '.md'),
        filePath: path.join(templateDir, f),
      }));
  } catch {
    return [];
  }
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
 * Generates a note file name from a format string.
 * e.g. '{{YYYY-MM-DD}}_{{title}}' → '2026-04-08_my-note'
 */
export function buildFileName(
  format: string,
  title: string,
  ext: string,
  date: Date = new Date(),
): string {
  let name = formatDateTokens(format, date);
  name = name.replace(/\{\{title\}\}/g, title);
  // Sanitize only characters that are truly unsafe on all OSes
  const safeName = name.replace(/[<>:"|?*\0]/g, '_');
  return `${safeName}.${ext}`;
}
