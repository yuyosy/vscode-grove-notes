import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import type * as vscode from 'vscode';
import { getNotePath } from '../config';
import { getJjPath, isJjAvailable } from './jj-resolver';

/**
 * Content provider for the `grove-notes-jj-parent` URI scheme.
 * Returns the content of a file at the parent revision (`@-`) via `jj file show`.
 *
 * URI format: same path as `vscode.Uri.file(absolutePath)`, scheme replaced with
 * `grove-notes-jj-parent`.  e.g.  grove-notes-jj-parent:///z%3A/Notes/foo.md
 */
export class JjParentContentProvider
  implements vscode.TextDocumentContentProvider
{
  provideTextDocumentContent(uri: vscode.Uri): string {
    if (!isJjAvailable()) return '';

    const notePath = getNotePath();
    if (!notePath) return '';

    // fsPath reconstructs the platform-specific absolute path from the URI.
    const filePath = uri.fsPath;
    const relPath = path.relative(notePath, filePath).replace(/\\/g, '/');

    try {
      const jjPath = getJjPath();
      return execFileSync(jjPath, ['file', 'show', '-r', '@-', relPath], {
        cwd: notePath,
        encoding: 'utf8',
        windowsHide: true,
      });
    } catch {
      // New file with no parent version — show empty content
      return '';
    }
  }
}

export const JJ_PARENT_SCHEME = 'grove-notes-jj-parent';
