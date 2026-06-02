import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { separateJsFromHtml } from './separate-js.js';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const appName = pkg.name;
const version = pkg.version;
const buildDir = 'dist-vite';
const outputDir = 'dist-omnisd';
const finalZipName = `${appName}-${version}-omnisd.zip`;

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

console.log('Building app...');
try {
  execSync('npm run build', { stdio: 'inherit' });
} catch (e) {
  console.error('Build failed, but continuing anyway (maybe it was already built)');
}

console.log('Post-build: Separating inline JS from HTML...');
const distIndex = path.join(buildDir, 'index.html');
separateJsFromHtml(distIndex, distIndex);

// Copy icons and manifest to dist-vite if they aren't there
console.log('Ensuring icons and manifest are in build directory...');
if (fs.existsSync('public/icons')) {
    execSync(`cp -r public/icons ${buildDir}/`);
}
if (fs.existsSync('public/manifest.webapp')) {
    execSync(`cp public/manifest.webapp ${buildDir}/`);
}

console.log('Creating application.zip...');
const appZipPath = path.join(outputDir, 'application.zip');
if (fs.existsSync(appZipPath)) fs.unlinkSync(appZipPath);
execSync(`cd ${buildDir} && zip -r ../${appZipPath} .`, { stdio: 'inherit' });

console.log('Creating metadata.json...');
const metadata = {
  version: 1,
  manifestURL: 'app://kaitube.kaios/manifest.webapp'
};
fs.writeFileSync(path.join(outputDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

console.log('Creating update.webapp...');
fs.writeFileSync(path.join(outputDir, 'update.webapp'), '');

console.log('Creating final OmniSD package...');
const finalPath = path.join('.', finalZipName);
if (fs.existsSync(finalPath)) fs.unlinkSync(finalPath);
execSync(`cd ${outputDir} && zip -r ../${finalZipName} application.zip metadata.json update.webapp`, { stdio: 'inherit' });

console.log(`Successfully created ${finalZipName}`);
