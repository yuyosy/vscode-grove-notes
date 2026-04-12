import * as path from 'node:path';
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
    '{{title}}_{{YYYY-MM-DD}}',
  );
}

export function getDefaultExtension(): string {
  return getConfig().get<string>('defaultExtension', 'md');
}

/** Patterns hidden from the tree view only; still scanned for tags and recent notes. */
export function getViewHiddenPatterns(): string[] {
  return getConfig().get<string[]>('view.hiddenPatterns', ['.templates']);
}

/** When true, .gitignore patterns in the notes folder are applied to all scans. */
export function getUseGitignore(): boolean {
  return getConfig().get<boolean>('view.useGitignore', true);
}

/** When true, file counters start at 1 ({{N}}→_1, no-token→_1). Default false (start at 2). */
export function getCounterStartsAtOne(): boolean {
  return getConfig().get<boolean>('counterStartsAtOne', false);
}

/** Predefined tag list available for quick selection when editing note tags. */
export function getPredefinedTags(): string[] {
  return getConfig().get<string[]>('tags.predefined', []);
}

/** When true, Edit Tags also scans all notes in the workspace for tag candidates. */
export function getScanWorkspaceTags(): boolean {
  return getConfig().get<boolean>('tags.scanWorkspace', false);
}

/** When false, all Jujutsu/jj features are disabled. */
export function getUseJujutsu(): boolean {
  return getConfig().get<boolean>('versionControl.useJujutsu', true);
}

export type JjInitMode = 'never' | 'always' | 'ask' | 'askIfGit' | 'autoAsk';

/**
 * Controls automatic jj init behaviour when a notes folder is selected.
 *   never     – do nothing
 *   always    – init without asking (plain or colocated)
 *   ask       – always show a dialog
 *   askIfGit  – show dialog only when .git exists, otherwise skip
 *   autoAsk   – init automatically when no .git, ask when .git exists
 */
export function getJjInitMode(): JjInitMode {
  return getConfig().get<JjInitMode>('versionControl.jjInitMode', 'askIfGit');
}

export function getAutoCommitInterval(): number {
  return getConfig().get<number>('versionControl.autoCommitInterval', 0);
}

export function getAutoCommitMessage(): string {
  return getConfig().get<string>(
    'versionControl.autoCommitMessage',
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
