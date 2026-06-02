import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

const distDir = path.resolve('dist');
const outDir = path.resolve('build');
const appZipPath = path.join(outDir, 'application.zip');
const omnisdZipPath = path.join(outDir, 'naija-whot-omnisd.zip');

// Ensure dist exists
if (!fs.existsSync(distDir)) {
  console.error('Error: dist/ directory not found. Run "npm run build" first.');
  process.exit(1);
}

// Ensure build dir exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

console.log('Packaging app for OmniSD...');

// 1. Create application.zip from dist/
const appZip = new AdmZip();
appZip.addLocalFolder(distDir);
appZip.writeZip(appZipPath);
console.log(`Created ${appZipPath}`);

// 2. Create metadata.json
const metadata = {
  version: 1,
  manifestURL: 'app://naija-whot.kaios/manifest.webapp'
};
const metadataPath = path.join(outDir, 'metadata.json');
fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
console.log(`Created ${metadataPath}`);

// 3. Create the final OmniSD zip
const omnisdZip = new AdmZip();
omnisdZip.addLocalFile(appZipPath);
omnisdZip.addLocalFile(metadataPath);
omnisdZip.writeZip(omnisdZipPath);
console.log(`Created OmniSD package: ${omnisdZipPath}`);

// Cleanup intermediate files
fs.unlinkSync(appZipPath);
fs.unlinkSync(metadataPath);

console.log(`Done! You can now install ${path.basename(omnisdZipPath)} via OmniSD or Wallace Toolbox.`);
