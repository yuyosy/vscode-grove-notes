import * as path from 'path';
import * as vscode from 'vscode';

const SECTION = 'notes';

export function getConfig() {
  return vscode.workspace.getConfiguration(SECTION);
}

export function getNotePath(): string {
  return getConfig().get<string>('notePath', '');
}

export function getTemplatePath(): string {
  const explicit = getConfig().get<string>('templatePath', '');
  if (explicit) return explicit;
  const notePath = getNotePath();
  return notePath ? path.join(notePath, '.templates') : '';
}

export function getDefaultNoteTitle(): string {
  return getConfig().get<string>(
    'defaultNoteTitle',
    '{{YYYY-MM-DD}}_{{title}}',
  );
}

export function getDefaultExtension(): string {
  return getConfig().get<string>('defaultExtension', 'md');
}

export function getIgnorePatterns(): string[] {
  return getConfig().get<string[]>('ignorePatterns', [
    '.git',
    '.jj',
    '.DS_Store',
    'node_modules',
  ]);
}

export function getAutoCommitInterval(): number {
  return getConfig().get<number>('autoCommitInterval', 0);
}

export function getAutoCommitMessage(): string {
  return getConfig().get<string>(
    'autoCommitMessage',
    'auto: {{YYYY-MM-DD HH:mm}}',
  );
}

export async function setNotePath(notePath: string): Promise<void> {
  await getConfig().update(
    'notePath',
    notePath,
    vscode.ConfigurationTarget.Global,
  );
}
