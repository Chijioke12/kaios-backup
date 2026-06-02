import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distDir = path.resolve(__dirname, '../dist');
const buildDir = path.resolve(__dirname, '../build');
const appZipPath = path.resolve(buildDir, 'application.zip');
const metadataPath = path.resolve(buildDir, 'metadata.json');

// Ensure dist exists
if (!fs.existsSync(distDir)) {
  console.error('Error: dist directory does not exist. Run npm run build first.');
  process.exit(1);
}

// Get app name from manifest
let appName = 'omnisd-package';
const manifestPath = path.resolve(distDir, 'manifest.webapp');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    if (manifest.name) {
      appName = manifest.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
  } catch (e) {
    console.warn('Could not parse manifest.webapp, using default name.');
  }
}

const omnisdZipPath = path.resolve(buildDir, `${appName}.zip`);

// Ensure build directory exists
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}

console.log('Packaging for OmniSD...');

// 1. Create application.zip from dist/
const appZip = new AdmZip();
appZip.addLocalFolder(distDir);
appZip.writeZip(appZipPath);
console.log(`Created ${appZipPath}`);

// 2. Create metadata.json
const metadata = {
  version: 1,
  manifestURL: "app://archivesearch.kaios/manifest.webapp"
};
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
console.log(`Created ${metadataPath}`);

// 3. Create omnisd package containing application.zip and metadata.json
const omnisdZip = new AdmZip();
omnisdZip.addLocalFile(appZipPath);
omnisdZip.addLocalFile(metadataPath);
omnisdZip.writeZip(omnisdZipPath);
console.log(`Created ${omnisdZipPath}`);

console.log(`OmniSD packaging complete! You can sideload build/${appName}.zip`);
