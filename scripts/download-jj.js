/**
 * Download jj binary for the current platform during build time.
 * This script is called by `vscode:prepublish` in package.json.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read JJ version from environment variable, package.json, or fallback to default
const getJjVersion = () => {
  // 1. Check environment variable
  if (process.env.JJ_VERSION) {
    return process.env.JJ_VERSION;
  }

  // 2. Check package.json
  try {
    const packageJsonPath = path.join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.jjVersion) {
      return `v${packageJson.jjVersion}`;
    }
  } catch (err) {
    console.warn('Failed to read version from package.json:', err.message);
  }
  return null;
};

const JJ_VERSION = getJjVersion();
const JJ_PLATFORM_MAP = {
  'win32-x64': 'x86_64-pc-windows-msvc',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin',
  'linux-x64': 'x86_64-unknown-linux-musl',
  'linux-arm64': 'aarch64-unknown-linux-musl',
};
const BIN_DIR = path.join(__dirname, '..', 'resources', 'bin');
const VERSION_FILE = path.join(BIN_DIR, 'jj.version');

const getPlatformInfo = () => {
  // Use TARGET_PLATFORM environment variable if set, otherwise auto-detect
  const targetPlatform = process.env.TARGET_PLATFORM;

  let platform, arch;
  if (targetPlatform) {
    // Parse target platform (e.g., "win32-x64" -> platform: "win32", arch: "x64")
    const parts = targetPlatform.split('-');
    if (parts.length !== 2) {
      throw new Error(
        `Invalid TARGET_PLATFORM format: ${targetPlatform}. Expected format: <platform>-<arch>`,
      );
    }
    [platform, arch] = parts;
    console.log(`Using target platform from environment: ${platform}-${arch}`);
  } else {
    // Auto-detect from current environment
    platform = process.platform;
    arch = process.arch;
    console.log(`Auto-detected platform: ${platform}-${arch}`);
  }

  const target = JJ_PLATFORM_MAP[`${platform}-${arch}`];
  if (!target) {
    throw new Error(`Unsupported platform/architecture: ${platform}-${arch}`);
  }

  const url = `https://github.com/jj-vcs/jj/releases/download/${JJ_VERSION}/jj-${JJ_VERSION}-${target}.zip`;
  const binaryName = platform === 'win32' ? 'jj.exe' : 'jj';

  return { url, binaryName };
};

const downloadFile = (url, dest) => {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url}...`);
    const file = fs.createWriteStream(dest);

    https
      .get(url, (response) => {
        // Handle redirects
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          console.log(`Redirecting to ${redirectUrl}...`);
          file.close();
          fs.unlinkSync(dest);
          return downloadFile(redirectUrl, dest).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`));
          return;
        }

        response.pipe(file);
        file.on('finish', () => {
          file.close();
          console.log('Download complete.');
          resolve();
        });
      })
      .on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
};

const extractBinary = (archivePath, binaryName, outputPath) => {
  console.log(`Extracting ${binaryName}...`);

  const tempDir = path.join(BIN_DIR, 'temp');
  fs.mkdirSync(tempDir, { recursive: true });

  try {
    if (archivePath.endsWith('.zip')) {
      // Extract ZIP file using platform-appropriate command
      if (process.platform === 'win32') {
        // Windows: use PowerShell
        const archivePathEscaped = archivePath.replace(/'/g, "''");
        const tempDirEscaped = tempDir.replace(/'/g, "''");
        execSync(
          `powershell -Command "Expand-Archive -Path '${archivePathEscaped}' -DestinationPath '${tempDirEscaped}' -Force"`,
          { stdio: 'inherit' },
        );
      } else {
        // Unix: use unzip command
        execSync(`unzip -o "${archivePath}" -d "${tempDir}"`, {
          stdio: 'inherit',
        });
      }
    } else if (archivePath.endsWith('.tar.gz')) {
      // Unix: use tar
      execSync(`tar -xzf "${archivePath}" -C "${tempDir}"`, {
        stdio: 'inherit',
      });
    }

    // Move the binary to the destination
    const extractedBinary = path.join(tempDir, binaryName);
    if (!fs.existsSync(extractedBinary)) {
      throw new Error(`Extracted binary not found: ${extractedBinary}`);
    }

    fs.renameSync(extractedBinary, outputPath);

    // Set executable permissions on Unix
    if (process.platform !== 'win32') {
      fs.chmodSync(outputPath, 0o755);
    }

    console.log(`Binary installed to ${outputPath}`);
  } finally {
    // Clean up temp directory only (keep archive for cache)
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`Archive cached at ${archivePath}`);
  }
};

const getCachedVersion = () => {
  try {
    if (fs.existsSync(VERSION_FILE)) {
      return fs.readFileSync(VERSION_FILE, 'utf8').trim();
    }
  } catch (err) {
    console.warn('Failed to read version file:', err.message);
  }
  return null;
};

const saveCachedVersion = () => {
  try {
    fs.writeFileSync(VERSION_FILE, JJ_VERSION, 'utf8');
    console.log(`Version ${JJ_VERSION} cached.`);
  } catch (err) {
    console.warn('Failed to save version file:', err.message);
  }
};

const main = async () => {
  if (!JJ_VERSION) {
    console.error(
      'JJ version not specified. Set JJ_VERSION environment variable or jjVersion in package.json.',
    );
    process.exit(1);
  }

  console.log('=== Downloading jj binary ===');
  console.log(`Platform: ${process.platform}`);
  console.log(`Architecture: ${process.arch}`);
  console.log(`Version: ${JJ_VERSION}`);

  const { url, binaryName } = getPlatformInfo();
  const outputPath = path.join(BIN_DIR, binaryName);

  // Check if binary already exists with the same version
  const cachedVersion = getCachedVersion();
  if (fs.existsSync(outputPath) && cachedVersion === JJ_VERSION) {
    console.log(
      `Binary already exists at ${outputPath} (version: ${cachedVersion})`,
    );
    console.log('Skipping download. Run clean-jj to force re-download.');
    return;
  }

  if (cachedVersion && cachedVersion !== JJ_VERSION) {
    console.log(`Version mismatch: cached ${cachedVersion} != ${JJ_VERSION}`);
    console.log('Re-downloading binary...');
  }

  // Ensure bin directory exists
  fs.mkdirSync(BIN_DIR, { recursive: true });

  // Download the archive
  const archiveName = path.basename(url);
  const archivePath = path.join(BIN_DIR, archiveName);

  try {
    // Check if archive already exists (cached from previous download)
    if (fs.existsSync(archivePath)) {
      console.log(`Using cached archive: ${archivePath}`);
    } else {
      await downloadFile(url, archivePath);
    }

    extractBinary(archivePath, binaryName, outputPath);
    saveCachedVersion();
    console.log('Completed extracting jj binary.');
  } catch (error) {
    console.error('Failed to process jj binary:', error.message);
    process.exit(1);
  }
};

main();
