import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { separateJsFromHtml } from './separate-js.mjs';

const buildDir = path.resolve('./dist');
const omnisdDir = path.resolve('./omnisd');
const appZipPath = path.resolve(omnisdDir, 'application.zip');
const finalZipPath = path.resolve('./kaios-2048-omnisd.zip');

if (!fs.existsSync(omnisdDir)) {
  fs.mkdirSync(omnisdDir, { recursive: true });
}

async function createArchive(sourceDir, destPath, insideFolder = false) {
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(destPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => resolve());
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    if (insideFolder) {
      archive.directory(sourceDir, insideFolder);
    } else {
      archive.directory(sourceDir, false);
    }
    archive.finalize();
  });
}

async function buildOmniSD() {
  console.log('Extracting inline JS from index.html...');
  const distIndex = path.resolve(buildDir, 'index.html');
  if (fs.existsSync(distIndex)) {
    separateJsFromHtml(distIndex, distIndex);
  } else {
    console.warn('Warning: dist/index.html not found, skipping JS extraction.');
  }

  console.log('Zipping application.zip...');
  await createArchive(buildDir, appZipPath, false);

  console.log('Writing metadata.json for OmniSD...');
  const metadata = {
    version: 1,
    manifestURL: "app://kaios-2048.localhost/manifest.webapp"
  };
  fs.writeFileSync(path.resolve(omnisdDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  console.log('Creating final OmniSD package...');
  return new Promise((resolve, reject) => {
    const output = fs.createWriteStream(finalZipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    output.on('close', () => {
      console.log(`Successfully created ${finalZipPath} (${archive.pointer()} total bytes)`);
      resolve();
    });
    archive.on('error', (err) => reject(err));

    archive.pipe(output);
    // Add application.zip
    archive.file(appZipPath, { name: 'application.zip' });
    // Add metadata.json
    archive.file(path.resolve(omnisdDir, 'metadata.json'), { name: 'metadata.json' });
    archive.finalize();
  });
}

buildOmniSD().catch(console.error);
