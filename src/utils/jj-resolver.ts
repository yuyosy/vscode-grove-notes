import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Resolved jj binary path, set once on extension activation. */
let resolvedJjPath: string | null = null;

/**
 * Returns the jj binary name for the current platform.
 *   Windows  → 'jj.exe'
 *   others   → 'jj'
 */
function jjBinaryName(): string {
  return process.platform === 'win32' ? 'jj.exe' : 'jj';
}

/**
 * Tries to find `jj` on the user's PATH using `where` (Windows) or `which` (Unix).
 * Returns the absolute path, or null if not found.
 */
function findJjInPath(): string | null {
  const cmd = process.platform === 'win32' ? 'where' : 'which';
  try {
    const result = execFileSync(cmd, [jjBinaryName()], {
      encoding: 'utf8',
      windowsHide: true,
    }).trim();
    // `where` may return multiple lines; take the first
    const first = result.split(/\r?\n/)[0].trim();
    return first || null;
  } catch {
    return null;
  }
}

/**
 * Initialises the jj binary path. Call once from `activate()`.
 *
 * Resolution order:
 *   1. User's PATH (`jj` / `jj.exe`)
 *   2. Bundled binary: <extensionPath>/resources/bin/jj[.exe]
 *
 * The bundled binary is downloaded during build time for the target platform.
 */
export function initJjPath(extensionPath: string): void {
  // 1. Try PATH
  const fromPath = findJjInPath();
  if (fromPath) {
    resolvedJjPath = fromPath;
    return;
  }

  // 2. Bundled binary (platform-specific, downloaded at build time)
  const bundled = path.join(extensionPath, 'resources', 'bin', jjBinaryName());
  if (fs.existsSync(bundled)) {
    resolvedJjPath = bundled;
    return;
  }

  // Neither found — set null and let callers surface the error lazily
  resolvedJjPath = null;
}

/**
 * Returns the resolved jj binary path.
 * Throws a user-friendly error if `initJjPath` was not called or jj was not found.
 */
export function getJjPath(): string {
  if (!resolvedJjPath) {
    throw new Error(
      'jj binary not found. Please install jj from (https://www.jj-vcs.dev/latest/)  or reinstall this extension.',
    );
  }
  return resolvedJjPath;
}

/** Returns true when a jj binary has been resolved. */
export function isJjAvailable(): boolean {
  return resolvedJjPath !== null;
}

/** Returns 'system' | 'bundled' | 'none' for diagnostic display. */
export function jjSource(extensionPath: string): 'system' | 'bundled' | 'none' {
  if (!resolvedJjPath) return 'none';
  const bundled = path.join(extensionPath, 'resources', 'bin');
  return resolvedJjPath.startsWith(bundled) ? 'bundled' : 'system';
}
