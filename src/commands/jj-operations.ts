import { execFile, execFileSync } from 'node:child_process';
import * as path from 'node:path';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { getAutoCommitMessage, getNotePath } from '../config';
import { formatDateTokens } from '../utils/date-format';
import { getJjPath, isJjAvailable } from '../utils/jj-resolver';

const execFileAsync = promisify(execFile);

async function runJj(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  const jjPath = getJjPath();
  try {
    return await execFileAsync(jjPath, args, { cwd });
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string };
    throw new Error(e.stderr || e.message || String(err));
  }
}

function requireNotePath(): string | null {
  const notePath = getNotePath();
  if (!notePath) {
    vscode.window.showWarningMessage('Notes folder is not configured.');
    return null;
  }
  return notePath;
}

export async function jjDescribe(): Promise<void> {
  const notePath = requireNotePath();
  if (!notePath) return;

  const msg = await vscode.window.showInputBox({
    prompt: 'Jujutsu: Enter commit description',
    placeHolder: 'Describe your changes...',
  });
  if (msg === undefined) return;

  try {
    await runJj(['describe', '--message', msg], notePath);
    vscode.window.showInformationMessage(`jj describe: "${msg}"`);
  } catch (err: unknown) {
    vscode.window.showErrorMessage(
      `jj describe failed: ${(err as Error).message}`,
    );
  }
}

export async function jjNew(): Promise<void> {
  const notePath = requireNotePath();
  if (!notePath) return;

  try {
    await runJj(['new'], notePath);
    vscode.window.showInformationMessage('jj new: new changeset created.');
  } catch (err: unknown) {
    vscode.window.showErrorMessage(`jj new failed: ${(err as Error).message}`);
  }
}

export async function jjPush(): Promise<void> {
  const notePath = requireNotePath();
  if (!notePath) return;

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'jj git push...',
      },
      async () => {
        await runJj(['git', 'push'], notePath);
      },
    );
    vscode.window.showInformationMessage('jj git push: done.');
  } catch (err: unknown) {
    vscode.window.showErrorMessage(
      `jj git push failed: ${(err as Error).message}`,
    );
  }
}

export async function jjFetch(): Promise<void> {
  const notePath = requireNotePath();
  if (!notePath) return;

  try {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'jj git fetch...',
      },
      async () => {
        await runJj(['git', 'fetch'], notePath);
      },
    );
    vscode.window.showInformationMessage('jj git fetch: done.');
  } catch (err: unknown) {
    vscode.window.showErrorMessage(
      `jj git fetch failed: ${(err as Error).message}`,
    );
  }
}

/**
 * Initialises a jj repository in the given folder.
 * Runs `jj git init --colocate` so it works side-by-side with a .git repo,
 * or plain `jj init` when no .git is present.
 */
export async function jjInit(folderPath: string): Promise<void> {
  try {
    // Prefer colocated init when a .git already exists
    const fs = await import('node:fs');
    const gitExists = fs.existsSync(
      require('node:path').join(folderPath, '.git'),
    );
    const args = gitExists ? ['git', 'init', '--colocate'] : ['git', 'init'];
    await runJj(args, folderPath);
    vscode.window.showInformationMessage(
      `jj git init: repository initialized in ${folderPath}`,
    );
  } catch (err: unknown) {
    vscode.window.showErrorMessage(`jj init failed: ${(err as Error).message}`);
  }
}

export async function jjUndo(): Promise<void> {
  const notePath = requireNotePath();
  if (!notePath) return;

  try {
    await runJj(['undo'], notePath);
    vscode.window.showInformationMessage('VCS: Last operation undone.');
  } catch (err: unknown) {
    vscode.window.showErrorMessage(`jj undo failed: ${(err as Error).message}`);
  }
}

export async function jjRedo(): Promise<void> {
  const notePath = requireNotePath();
  if (!notePath) return;

  try {
    await runJj(['op', 'redo'], notePath);
    vscode.window.showInformationMessage('VCS: Redo successful.');
  } catch (err: unknown) {
    vscode.window.showErrorMessage(
      `jj op redo failed: ${(err as Error).message}`,
    );
  }
}

/**
 * Synchronously returns the set of absolute file paths that have changes in
 * the current working copy (equivalent to `jj diff --name-only`).
 * Returns an empty set when jj is unavailable or the folder is not a jj repo.
 */
export function getJjModifiedFiles(notePath: string): Set<string> {
  if (!isJjAvailable()) return new Set();
  try {
    const output = execFileSync(getJjPath(), ['diff', '--name-only'], {
      cwd: notePath,
      encoding: 'utf8',
      windowsHide: true,
    });
    return new Set(
      output
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean)
        .map((rel) => path.join(notePath, rel)),
    );
  } catch {
    return new Set();
  }
}

/**
 * Starts an auto-commit timer that runs `jj describe && jj new` at the given interval.
 * Returns a Disposable that clears the timer.
 */
export function startAutoCommit(intervalMinutes: number): vscode.Disposable {
  const ms = intervalMinutes * 60 * 1000;
  const timer = setInterval(async () => {
    const notePath = getNotePath();
    if (!notePath) return;

    const message = formatDateTokens(getAutoCommitMessage());
    try {
      await runJj(['describe', '--message', message], notePath);
      await runJj(['new'], notePath);
    } catch {
      // Auto-commit failures are silent to avoid interrupting the user
    }
  }, ms);

  return new vscode.Disposable(() => clearInterval(timer));
}
