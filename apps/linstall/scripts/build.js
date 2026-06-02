const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const babel = require('@babel/core');

const SRC_DIR = path.join(__dirname, '../src');
const DIST_DIR = path.join(__dirname, '../dist');
const BUILD_DIR = path.join(__dirname, '../build_temp');
const PUBLIC_DIR = path.join(__dirname, '../public');
const CSS_DIR = path.join(__dirname, '../css');
const ROOT_DIR = path.join(__dirname, '..');

// Ensure directories exist
if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR);
if (fs.existsSync(BUILD_DIR)) fs.rmSync(BUILD_DIR, { recursive: true, force: true });
fs.mkdirSync(BUILD_DIR);
fs.mkdirSync(path.join(BUILD_DIR, 'js'));
fs.mkdirSync(path.join(BUILD_DIR, 'css'));

console.log('--- Starting Build Process ---');

// 1. Transpile JS files from src/ to build_temp/js/
console.log('Transpiling JS files...');
fs.readdirSync(SRC_DIR).forEach(file => {
    if (file.endsWith('.js')) {
        const inputPath = path.join(SRC_DIR, file);
        const outputPath = path.join(BUILD_DIR, 'js', file);
        const code = fs.readFileSync(inputPath, 'utf-8');
        const result = babel.transformSync(code, {
            presets: ['@babel/preset-env'],
            configFile: false
        });
        fs.writeFileSync(outputPath, result.code);
        console.log(`  - Transpiled: ${file}`);
    }
});

// 2. Copy CSS and HTML to build_temp/
console.log('Copying assets...');
fs.copyFileSync(path.join(PUBLIC_DIR, 'index.html'), path.join(BUILD_DIR, 'index.html'));
fs.copyFileSync(path.join(ROOT_DIR, 'manifest.webapp'), path.join(BUILD_DIR, 'manifest.webapp'));
fs.readdirSync(CSS_DIR).forEach(file => {
    fs.copyFileSync(path.join(CSS_DIR, file), path.join(BUILD_DIR, 'css', file));
});

// 3. Create application.zip
console.log('Creating application.zip...');
execSync(`cd ${BUILD_DIR} && zip -r ../dist/application.zip .`);

// 4. Create metadata.json and update.webapp
console.log('Creating OmniSD metadata...');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'manifest.webapp'), 'utf-8'));
const origin = manifest.origin || 'app://linstall.io';
const metadata = {
    version: 1,
    manifestURL: `${origin}/manifest.webapp`
};
fs.writeFileSync(path.join(DIST_DIR, 'metadata.json'), JSON.stringify(metadata, null, 2));
fs.writeFileSync(path.join(DIST_DIR, 'update.webapp'), '');

// 5. Final Package
console.log('Creating final OmniSD package...');
execSync(`cd ${DIST_DIR} && zip linstall-omnisd.zip application.zip metadata.json update.webapp`);

console.log('--- Build Complete: dist/linstall-omnisd.zip ---');
