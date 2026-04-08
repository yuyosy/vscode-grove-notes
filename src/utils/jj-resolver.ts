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
 * Returns the platform sub-directory name for bundled binaries.
 *   win32   → 'win32'
 *   darwin  → 'darwin'
 *   linux   → 'linux'
 */
function platformDir(): string {
  switch (process.platform) {
    case 'win32':
      return 'win32';
    case 'darwin':
      return 'darwin';
    default:
      return 'linux';
  }
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
 *   2. Bundled binary: <extensionPath>/resources/bin/<platform>/jj[.exe]
 *
 * Throws if neither is found (so the user gets a clear error at startup
 * rather than a cryptic ENOENT when running a command).
 */
export function initJjPath(extensionPath: string): void {
  // 1. Try PATH
  const fromPath = findJjInPath();
  if (fromPath) {
    resolvedJjPath = fromPath;
    return;
  }

  // 2. Bundled binary
  const bundled = path.join(
    extensionPath,
    'resources',
    'bin',
    platformDir(),
    jjBinaryName(),
  );
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
      'jj binary not found. Install jj (https://www.jj-vcs.dev/latest/) or place a bundled binary at resources/bin/<platform>/jj[.exe].',
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
