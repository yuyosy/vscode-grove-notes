import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const main = async () => {
  // Only delete binaries, keep cache (jj.version and .zip files)
  const filesToDelete = ['jj', 'jj.exe'];

  filesToDelete.forEach((f) => {
    const p = path.join(__dirname, '..', 'resources', 'bin', f);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
        console.log(`Deleted ${p}`);
      } catch (err) {
        console.error(`Failed to delete ${p}:`, err.message);
      }
    }
  });
};

main();
