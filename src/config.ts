import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  Configurations as Conf,
  EXTENSION_ID,
} from './contributions/configurations';
import type { PathSeparatorOption } from './utils/file-utils';

export function getConfig() {
  return vscode.workspace.getConfiguration(EXTENSION_ID);
}

export function getNotePath(): string {
  return getConfig().get<string>(Conf.NotePath) ?? '';
}

export function getTemplatePath(): string {
  const explicit = getConfig().get<string>(Conf.TemplatePath) ?? '';
  if (explicit) return explicit;
  const notePath = getNotePath();
  return notePath ? path.join(notePath, '.templates') : '';
}

export function getDefaultNoteTitle(): string {
  return (
    getConfig().get<string>(Conf.DefaultNoteTitle) ?? '{{title}}_{{YYYY-MM-DD}}'
  );
}

export function getDefaultExtension(): string {
  return getConfig().get<string>(Conf.DefaultExtension) ?? 'md';
}

export function getPathSeparatorOption(): PathSeparatorOption {
  return getConfig().get<PathSeparatorOption>(Conf.PathSeparator) ?? 'auto';
}

/** Patterns hidden from the tree view only; still scanned for tags and recent notes. */
export function getViewHiddenPatterns(): string[] {
  return (
    getConfig().get<string[]>(Conf.ViewHiddenPatterns) ?? [
      '.gitignore',
      '.templates',
    ]
  );
}

/** When true, .gitignore patterns in the notes folder are applied to all scans. */
export function getUseGitignore(): boolean {
  return getConfig().get<boolean>(Conf.ViewUseGitignore) ?? true;
}

/** When true, file counters start at 1 ({{N}}→_1, no-token→_1). Default false (start at 2). */
export function getCounterStartsAtOne(): boolean {
  return getConfig().get<boolean>(Conf.CounterStartsAtOne) ?? false;
}

/** Predefined tag list available for quick selection when editing note tags. */
export function getPredefinedTags(): string[] {
  return getConfig().get<string[]>(Conf.TagsPredefined) ?? [];
}

/** When true, tags are shown in the tree view. When false, tags are hidden to reduce clutter. */
export function getEnableTagsInView(): boolean {
  return getConfig().get<boolean>(Conf.TagsEnableInView) ?? true;
}

/** When true, ignored files are hidden in the tags view. */
export function getHideIgnoreFilesInTagsView(): boolean {
  return getConfig().get<boolean>(Conf.HideIgnoreFilesInTagsView) ?? true;
}

/** When true, Edit Tags also scans all notes in the workspace for tag candidates. */
export function getScanWorkspaceTags(): boolean {
  return getConfig().get<boolean>(Conf.TagsScanWorkspace) ?? true;
}

/** When true, Markdown preview opens to the side; when false, opens in the current column. */
export function getPreviewOpenToSide(): boolean {
  return getConfig().get<boolean>(Conf.PreviewOpenToSide) ?? false;
}

/** When false, all Jujutsu/jj features are disabled. */
export function getUseJujutsu(): boolean {
  return getConfig().get<boolean>(Conf.VersionControlUseJujutsu) ?? true;
}

/** Optional absolute path to the jj executable. Empty means resolve from PATH. */
export function getJjPathSetting(): string {
  return (getConfig().get<string>(Conf.VersionControlJjPath) ?? '').trim();
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
  return (
    getConfig().get<JjInitMode>(Conf.VersionControlJjInitMode) ?? 'askIfGit'
  );
}

export function getAutoCommitInterval(): number {
  return getConfig().get<number>(Conf.VersionControlAutoCommitInterval) ?? 0;
}

export function getAutoCommitMessage(): string {
  return (
    getConfig().get<string>(Conf.VersionControlAutoCommitMessage) ??
    'auto: {{YYYY-MM-DD HH:mm}}'
  );
}

export async function setNotePath(notePath: string): Promise<void> {
  await getConfig().update(
    Conf.NotePath,
    notePath,
    vscode.ConfigurationTarget.Global,
  );
}
