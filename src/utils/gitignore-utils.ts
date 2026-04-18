import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Reads the `.gitignore` file in `folderPath` and returns the list of patterns,
 * with the following lines stripped out:
 *  - blank lines
 *  - comment lines (starting with `#`)
 *  - negation patterns (starting with `!`) — not supported by the extension's scanner
 */
export function readGitignorePatterns(folderPath: string): string[] {
  const gitignorePath = path.join(folderPath, '.gitignore');
  let text: string;
  try {
    text = fs.readFileSync(gitignorePath, 'utf8');
  } catch {
    return [];
  }

  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 && !line.startsWith('#') && !line.startsWith('!'),
    );
}
