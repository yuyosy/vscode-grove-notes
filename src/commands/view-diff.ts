import * as path from 'node:path';
import * as vscode from 'vscode';
import { JJ_PARENT_SCHEME } from '../utils/jj-content-provider';

export async function viewDiff(filePath: string): Promise<void> {
  if (!filePath) return;

  const currentUri = vscode.Uri.file(filePath);
  // Reuse the same URI path/authority but with the parent-content scheme
  const parentUri = currentUri.with({ scheme: JJ_PARENT_SCHEME });
  const title = `${path.basename(filePath)} (parent ↔ working copy)`;

  await vscode.commands.executeCommand(
    'vscode.diff',
    parentUri,
    currentUri,
    title,
  );
}
