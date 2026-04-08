import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { getIgnorePatterns, getNotePath } from '../config';
import type { TagIndex } from '../types';
import { walkDir } from '../utils/file-utils';
import { parseFrontMatter } from '../utils/front-matter';

export async function listTags(): Promise<void> {
  const notePath = getNotePath();
  if (!notePath) {
    vscode.window.showWarningMessage('Notes folder is not configured.');
    return;
  }

  const tagIndex = buildTagIndex(notePath, getIgnorePatterns());
  const tags = Object.keys(tagIndex).sort();

  if (tags.length === 0) {
    vscode.window.showInformationMessage(
      'No tags found. Add tags: [foo, bar] to note front matter.',
    );
    return;
  }

  const tagSelection = await vscode.window.showQuickPick(
    tags.map((t) => ({
      label: t,
      description: `${tagIndex[t].length} note(s)`,
    })),
    { placeHolder: 'Select a tag' },
  );
  if (!tagSelection) return;

  const filesForTag = tagIndex[tagSelection.label];
  const fileItems: vscode.QuickPickItem[] = filesForTag.map((f) => ({
    label: path.relative(notePath, f),
    description: f,
  }));

  const fileSelection = await vscode.window.showQuickPick(fileItems, {
    placeHolder: `Notes tagged "${tagSelection.label}"`,
  });
  if (!fileSelection?.description) return;

  const doc = await vscode.workspace.openTextDocument(
    fileSelection.description,
  );
  await vscode.window.showTextDocument(doc);
}

export function buildTagIndex(
  notePath: string,
  ignorePatterns: string[],
): TagIndex {
  const files = walkDir(notePath, ignorePatterns).filter((f) =>
    f.endsWith('.md'),
  );
  const index: TagIndex = {};

  for (const file of files) {
    let text: string;
    try {
      text = fs.readFileSync(file, 'utf8');
    } catch {
      continue;
    }
    const fm = parseFrontMatter(text);
    if (!fm || fm.tags.length === 0) continue;
    for (const tag of fm.tags) {
      if (!index[tag]) index[tag] = [];
      index[tag].push(file);
    }
  }

  return index;
}
