const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const esbuild = require('esbuild');

const DIST = 'dist';      // Bundled app files
const PACKAGES = 'packages'; // ZIP files

// 1. Clean and Setup
[DIST, PACKAGES].forEach(dir => {
  if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true });
  fs.mkdirSync(dir);
});

// 2. JS Bundling and Transpilation with ESBuild
const jsFiles = [
  'js/state.js',
  'js/utils.js',
  'js/thumbnails.js',
  'js/ui.js',
  'js/volume.js',
  'js/player.js',
  'js/storage.js',
  'js/data.js',
  'js/input.js',
  'app.js'
];

console.log('Bundling & Transpiling JavaScript with esbuild...');

// We temporary combine them to ensure execution order is 1:1 with old project style
// ESBuild can also bundle via entry points, but for this specific "global var" architecture,
// concatenation followed by transpilation is the safest way to maintain state.
let jsSource = jsFiles.map(file => fs.readFileSync(file, 'utf8')).join('\n');

try {
  const result = esbuild.transformSync(jsSource, {
    target: 'firefox48', // KaiOS 2.5 uses Gecko 48
    loader: 'js',
    minify: false, // Set to true for production if you want
    format: 'iife'
  });
  
  fs.writeFileSync(path.join(DIST, 'app.js'), result.code);
} catch (e) {
  console.error('ESBuild Error:', e);
  process.exit(1);
}

// 3. CSS Bundling
console.log('Bundling CSS...');
const cssBundle = fs.readFileSync('style.css', 'utf8');
fs.writeFileSync(path.join(DIST, 'style.css'), cssBundle);

// 4. HTML Modification
console.log('Generating production index.html...');
let html = fs.readFileSync('index.html', 'utf8');
// Remove all existing script and link tags
html = html.replace(/<link rel="stylesheet" href="style.css">/, '');
html = html.replace(/<script defer src="js\/.*?"><\/script>/g, '');
html = html.replace(/<script defer src="app.js"><\/script>/, '');

// Insert the new single script/link before </head>
const newHeadTags = `  <link rel="stylesheet" href="style.css">\n  <script defer src="app.js"></script>\n</head>`;
html = html.replace(/<\/head>/, newHeadTags);

fs.writeFileSync(path.join(DIST, 'index.html'), html);

// 5. Copy Manifest & Icons
fs.copyFileSync('manifest.webapp', path.join(DIST, 'manifest.webapp'));
if (fs.existsSync('icons')) {
  execSync(`cp -r icons ${DIST}/`);
}

// 6. Packaging
console.log('Creating application.zip in packages/ ...');
execSync(`cd ${DIST} && zip -r ../${PACKAGES}/application.zip .`);

console.log('Creating kaivideo.zip in packages/ ...');
fs.copyFileSync('metadata.json', path.join(PACKAGES, 'metadata.json'));
execSync(`cd ${PACKAGES} && zip kaivideo.zip application.zip metadata.json`);

console.log('Build completed!');
console.log(`- Bundled files: ./${DIST}/`);
console.log(`- Deployment packages: ./${PACKAGES}/`);
