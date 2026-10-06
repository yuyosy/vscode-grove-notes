import * as vscode from 'vscode';
import {
  getNotePath,
  getPredefinedTags,
  getScanWorkspaceTags,
  getUseGitignore,
} from '../config';
import { SYSTEM_IGNORE_PATTERNS } from '../utils/file-utils';
import { parseFrontMatter, writeTags } from '../utils/front-matter';
import { readGitignorePatterns } from '../utils/gitignore-utils';
import { buildTagIndex } from './list-tags';

/**
 * Opens a multi-select QuickPick to edit the tags of a Markdown note.
 *
 * Tag candidates are merged from two (or three) sources:
 * 1. Tags already set in this file's front matter — always shown and pre-selected
 * 2. `tags.predefined` setting entries
 * 3. Tags used anywhere in the workspace (only when `tags.scanWorkspace` is enabled)
 *
 * Typing a name that is not in the list and pressing Enter adds it as a new tag.
 */
export async function editTags(filePath: string): Promise<void> {
  if (!filePath) return;

  // Read the editor buffer so unsaved changes are included.
  let document: vscode.TextDocument;
  try {
    document = await vscode.workspace.openTextDocument(
      vscode.Uri.file(filePath),
    );
  } catch (err: unknown) {
    vscode.window.showErrorMessage(
      `Cannot open note: ${(err as Error).message}`,
    );
    return;
  }
  const currentTags = parseFrontMatter(document.getText())?.tags ?? [];
  const version = document.version;

  // Predefined tags from settings
  const predefined = getPredefinedTags();

  // Tags used in the workspace (optional — can be slow for large vaults)
  let workspaceTags: string[] = [];
  if (getScanWorkspaceTags()) {
    const notePath = getNotePath();
    if (notePath) {
      const gitignorePatterns = getUseGitignore()
        ? readGitignorePatterns(notePath)
        : [];
      const scanPatterns = [
        ...new Set([...SYSTEM_IGNORE_PATTERNS, ...gitignorePatterns]),
      ];
      workspaceTags = Object.keys(buildTagIndex(notePath, scanPatterns));
    }
  }

  // Merge all sources; current file tags first so they appear at top when sorted
  const allTags = [
    ...new Set([...currentTags, ...predefined, ...workspaceTags]),
  ].sort();

  // Build picker
  const items: vscode.QuickPickItem[] = allTags.map((t) => ({
    label: t,
    picked: currentTags.includes(t),
  }));

  const pick = vscode.window.createQuickPick();
  pick.title = `Edit Tags — ${filePath.split(/[\\/]/).pop()}`;
  pick.placeholder =
    'Select tags or type a new tag name and press Enter to add';
  pick.canSelectMany = true;
  pick.items = items;
  pick.selectedItems = items.filter((i) => currentTags.includes(i.label));

  const chosen = await new Promise<string[] | undefined>((resolve) => {
    pick.onDidAccept(() => {
      const typed = pick.value.trim();
      const selected = pick.selectedItems.map((i) => i.label);
      // If user typed something not already in selected list, treat it as a new tag
      if (typed && !selected.includes(typed)) {
        resolve([...selected, typed]);
      } else {
        resolve(selected);
      }
      pick.hide();
    });
    pick.onDidHide(() => resolve(undefined));
    pick.show();
  });

  pick.dispose();

  if (chosen === undefined) return; // Esc → cancelled

  if (document.isClosed || document.version !== version) {
    vscode.window.showWarningMessage(
      'The note changed while editing tags. Please try again.',
    );
    return;
  }
  const text = document.getText();
  let updated: string;
  try {
    updated = writeTags(text, chosen);
  } catch (err: unknown) {
    vscode.window.showErrorMessage(
      `Cannot edit tags: ${(err as Error).message}`,
    );
    return;
  }
  const wasDirty = document.isDirty;
  const edit = new vscode.WorkspaceEdit();
  edit.replace(
    document.uri,
    new vscode.Range(document.positionAt(0), document.positionAt(text.length)),
    updated,
  );
  if (!(await vscode.workspace.applyEdit(edit))) {
    vscode.window.showErrorMessage('Could not apply tag changes.');
    return;
  }
  // Keep an already dirty buffer unsaved; save only previously clean documents.
  if (!wasDirty && !(await document.save())) {
    vscode.window.showWarningMessage(
      'Tags were updated in the editor but could not be saved.',
    );
    return;
  }

  vscode.window.showInformationMessage(
    chosen.length === 0
      ? 'Tags cleared.'
      : `Tags updated: ${chosen.join(', ')}`,
  );
}
