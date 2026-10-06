import * as vscode from 'vscode';
import {
  getNotePath,
  getPathSeparatorOption,
  getUseGitignore,
} from '../config';
import {
  getRelativeDisplayPath,
  SYSTEM_IGNORE_PATTERNS,
} from '../utils/file-utils';
import { buildTagIndex } from '../utils/tag-index';

type NoteQuickPickItem = vscode.QuickPickItem & { filePath: string };

export async function listTags(): Promise<void> {
  const notePath = getNotePath();
  if (!notePath) {
    vscode.window.showWarningMessage('Notes folder is not configured.');
    return;
  }

  const tagIndex = buildTagIndex(
    notePath,
    [...SYSTEM_IGNORE_PATTERNS],
    getUseGitignore(),
  );
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
  const separatorOption = getPathSeparatorOption();
  const fileItems: NoteQuickPickItem[] = filesForTag.map((f) => ({
    label: getRelativeDisplayPath(notePath, f, separatorOption),
    description: f,
    filePath: f,
  }));

  const fileSelection = await vscode.window.showQuickPick(fileItems, {
    placeHolder: `Notes tagged "${tagSelection.label}"`,
  });
  if (!fileSelection) return;

  const doc = await vscode.workspace.openTextDocument(fileSelection.filePath);
  await vscode.window.showTextDocument(doc);
}
