import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import * as vscode from 'vscode';
import { getAutoCommitMessage, getNotePath } from '../config';
import { formatDateTokens } from '../utils/date-format';

const execFileAsync = promisify(execFile);

async function runJj(
  args: string[],
  cwd: string,
): Promise<{ stdout: string; stderr: string }> {
  try {
    return await execFileAsync('jj', args, { cwd });
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
