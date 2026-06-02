import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createPackage() {
  const output = fs.createWriteStream(path.join(__dirname, 'crusade-omnisd.zip'));
  const archive = archiver('zip', { zlib: { level: 9 } });

  output.on('close', function() {
    console.log('OmniSD Package created: crusade-omnisd.zip (' + archive.pointer() + ' total bytes)');
  });

  archive.on('error', function(err) { throw err; });
  archive.pipe(output);

  // 1. Create internal application.zip
  const appZipStream = fs.createWriteStream(path.join(__dirname, 'application.zip'));
  const appArchive = archiver('zip', { zlib: { level: 9 } });
  
  const appZipPromise = new Promise((resolve, reject) => {
    appZipStream.on('close', resolve);
    appArchive.on('error', reject);
  });

  appArchive.pipe(appZipStream);
  appArchive.directory('dist/', false);
  // Ensure manifest.webapp is in the root of application.zip
  appArchive.file('manifest.webapp', { name: 'manifest.webapp' });
  await appArchive.finalize();
  await appZipPromise;

  // 2. Add application.zip, metadata.json, and empty update.webapp to the final package
  archive.file('application.zip', { name: 'application.zip' });
  archive.file('metadata.json', { name: 'metadata.json' });
  
  // Create an empty update.webapp buffer
  archive.append('', { name: 'update.webapp' });

  await archive.finalize();

  // Cleanup intermediate application.zip
  fs.unlinkSync(path.join(__dirname, 'application.zip'));
}

createPackage();

