import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  getCounterStartsAtOne,
  getDefaultExtension,
  getDefaultNoteTitle,
  getNotePath,
  getTemplatePath,
} from '../config';
import { Commands as Cmd } from '../contributions/commands';
import {
  buildBaseFileName,
  loadTemplates,
  processTemplate,
  resolveTemplateSubDir,
  resolveUniqueFilePath,
} from '../utils/template';

export async function newNote(folderPath?: string): Promise<void> {
  const notePath = getNotePath();
  if (!notePath) {
    const choice = await vscode.window.showWarningMessage(
      'Notes folder is not configured. Run "Notes: Setup Notes Folder" first.',
      'Setup Now',
    );
    if (choice === 'Setup Now') {
      await vscode.commands.executeCommand(Cmd.Setup);
    }
    return;
  }

  const now = new Date();

  // 1. Select template (optional)
  const templateDir = getTemplatePath();
  const templates = loadTemplates(templateDir);

  let templateFilePath: string | undefined;
  // When a template is selected, its filename (without .md) becomes the
  // format string for the new note's file name.
  let templateNamePattern: string | undefined;
  let templateSubDirPattern: string | undefined; // raw pattern; {{title}} resolved after input

  if (templates.length > 0) {
    const items: vscode.QuickPickItem[] = [
      { label: '$(file-add) No template', description: 'Create an empty note' },
      ...templates.map((t) => ({
        label: t.name,
        description: t.subDir,
      })),
    ];
    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a template (or press Escape to cancel)',
    });
    if (selection === undefined) return;
    if (selection.label !== '$(file-add) No template') {
      const tpl = templates.find(
        (t) =>
          t.name === selection.label &&
          (t.subDir ?? undefined) === (selection.description ?? undefined),
      );
      if (tpl) {
        templateFilePath = tpl.filePath;
        templateNamePattern = tpl.name;
        templateSubDirPattern = tpl.subDir;
      }
    }
  }

  // 2. Input note title — skipped when neither the filename pattern, the
  //    template folder hierarchy, nor the template content uses {{title}}.
  const format = templateNamePattern ?? getDefaultNoteTitle();
  const formatNeedsTitle = format.includes('{{title}}');
  const subDirNeedsTitle = (templateSubDirPattern ?? '').includes('{{title}}');
  const contentNeedsTitle = (() => {
    if (!templateFilePath) return false;
    try {
      return fs.readFileSync(templateFilePath, 'utf8').includes('{{title}}');
    } catch {
      return false;
    }
  })();

  let title = 'untitled';
  if (formatNeedsTitle || subDirNeedsTitle || contentNeedsTitle) {
    const titleInput = await vscode.window.showInputBox({
      prompt: 'Note title (leave empty for "untitled")',
      placeHolder: 'My note title',
    });
    if (titleInput === undefined) return; // Escape pressed
    title = titleInput.trim() || 'untitled';
  }

  // Resolve template sub-directory now that we have the title
  const templateSubDir = templateSubDirPattern
    ? resolveTemplateSubDir(templateSubDirPattern, now).replace(
        /\{\{title\}\}/g,
        title,
      )
    : undefined;

  // 3. Build base file name
  //    Priority: template filename pattern > defaultNoteTitle config
  const ext = getDefaultExtension();
  const baseName = buildBaseFileName(format, title, now);

  // Support sub-folder via "/" in baseName (e.g. title = "projects/my-note")
  const subDir = path.dirname(baseName);
  const cleanBase = path.basename(baseName);
  // folderPath: target directory from "New Note in Folder" context menu
  // templateSubDir: hierarchy derived from template folder name (e.g. {{YYYY}}.{{MM}}.{{DD}})
  const baseDir = templateSubDir
    ? path.join(folderPath ?? notePath, templateSubDir)
    : (folderPath ?? notePath);
  const targetDir = subDir === '.' ? baseDir : path.join(baseDir, subDir);

  // 4. Resolve unique path
  //    - {{N}} / {{N:00}} in the pattern → replaced with counter
  //    - No {{N}} but collision → appends _N
  //    Counter start: 1 or 2 depending on counterStartsAtOne setting
  const filePath = resolveUniqueFilePath(
    targetDir,
    cleanBase,
    ext,
    getCounterStartsAtOne(),
  );

  // 5. Write file (template content or empty)
  const content = templateFilePath
    ? processTemplate(templateFilePath, title, now)
    : '';
  fs.writeFileSync(filePath, content, 'utf8');

  // 6. Open the file
  const doc = await vscode.workspace.openTextDocument(filePath);
  await vscode.window.showTextDocument(doc);

  // Move cursor to end
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const lastLine = doc.lineCount - 1;
    const pos = new vscode.Position(lastLine, doc.lineAt(lastLine).text.length);
    editor.selection = new vscode.Selection(pos, pos);
  }

  vscode.commands.executeCommand(Cmd.Refresh);
}
