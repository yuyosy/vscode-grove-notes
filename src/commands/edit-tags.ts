import * as fs from 'node:fs';
import * as vscode from 'vscode';
import {
  getIgnorePatterns,
  getNotePath,
  getPredefinedTags,
  getScanWorkspaceTags,
} from '../config';
import { parseFrontMatter, writeTags } from '../utils/front-matter';
import { buildTagIndex } from './list-tags';

/**
 * Opens a multi-select QuickPick to edit the tags of a Markdown note.
 *
 * Tag candidates are merged from two (or three) sources:
 * 1. Tags already set in this file's front matter — always shown and pre-selected
 * 2. `notes.tags.predefined` setting entries
 * 3. Tags used anywhere in the workspace (only when `notes.tags.scanWorkspace` is enabled)
 *
 * Typing a name that is not in the list and pressing Enter adds it as a new tag.
 */
export async function editTags(filePath: string): Promise<void> {
  if (!filePath) return;

  // Current tags in this file
  let currentTags: string[] = [];
  try {
    const text = fs.readFileSync(filePath, 'utf8');
    currentTags = parseFrontMatter(text)?.tags ?? [];
  } catch {
    // File unreadable — start with empty
  }

  // Predefined tags from settings
  const predefined = getPredefinedTags();

  // Tags used in the workspace (optional — can be slow for large vaults)
  let workspaceTags: string[] = [];
  if (getScanWorkspaceTags()) {
    const notePath = getNotePath();
    if (notePath) {
      workspaceTags = Object.keys(buildTagIndex(notePath, getIgnorePatterns()));
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

  writeTags(filePath, chosen);
  // writeTags writes directly to disk; VS Code's file watcher will auto-reload
  // any open editor that has no unsaved changes.

  vscode.window.showInformationMessage(
    chosen.length === 0 ? 'Tags cleared.' : `Tags saved: ${chosen.join(', ')}`,
  );
}
