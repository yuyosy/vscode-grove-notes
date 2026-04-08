import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import {
  getDefaultExtension,
  getDefaultNoteTitle,
  getNotePath,
  getTemplatePath,
} from '../config';
import { ensureFile } from '../utils/file-utils';
import {
  buildFileName,
  loadTemplates,
  processTemplate,
} from '../utils/template';

export async function newNote(): Promise<void> {
  const notePath = getNotePath();
  if (!notePath) {
    const choice = await vscode.window.showWarningMessage(
      'Notes folder is not configured. Run "Notes: Setup Notes Folder" first.',
      'Setup Now',
    );
    if (choice === 'Setup Now') {
      await vscode.commands.executeCommand('notes.setup');
    }
    return;
  }

  const now = new Date();

  // 1. Select template (optional)
  const templateDir = getTemplatePath();
  const templates = loadTemplates(templateDir);

  let templateFilePath: string | undefined;

  if (templates.length > 0) {
    const items: vscode.QuickPickItem[] = [
      { label: '$(file-add) No template', description: 'Create an empty note' },
      ...templates.map((t) => ({ label: t.name, description: t.filePath })),
    ];
    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a template (or press Escape to cancel)',
    });
    if (selection === undefined) return;
    if (
      selection.description &&
      selection.description !== 'Create an empty note'
    ) {
      templateFilePath = selection.description;
    }
  }

  // 2. Input note title
  const titleInput = await vscode.window.showInputBox({
    prompt: 'Note title',
    placeHolder: 'My note title',
    validateInput: (v) => (v.trim() ? null : 'Title cannot be empty'),
  });
  if (titleInput === undefined) return;
  const title = titleInput.trim();

  // 3. Build file name and path
  const format = getDefaultNoteTitle();
  const ext = getDefaultExtension();
  const fileName = buildFileName(format, title, ext, now);

  // Support sub-folder via "/" in title
  const subFolder = path.dirname(fileName);
  const baseFileName = path.basename(fileName);
  const targetDir =
    subFolder === '.' ? notePath : path.join(notePath, subFolder);
  const filePath = path.join(targetDir, baseFileName);

  // 4. Create file with template content
  ensureFile(filePath);

  const content = templateFilePath
    ? processTemplate(templateFilePath, title, now)
    : '';

  if (content) {
    fs.writeFileSync(filePath, content, 'utf8');
  }

  // 5. Open the file
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);

  // Move cursor to end of file
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const lastLine = doc.lineCount - 1;
    const pos = new vscode.Position(lastLine, doc.lineAt(lastLine).text.length);
    editor.selection = new vscode.Selection(pos, pos);
  }

  // Refresh tree view
  vscode.commands.executeCommand('notes.refresh');
}
