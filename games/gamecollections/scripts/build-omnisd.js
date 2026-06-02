import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';
import AdmZip from 'adm-zip';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function zipDirectory(sourceDir, outPath) {
  const zip = new AdmZip();
  zip.addLocalFolder(sourceDir);
  await zip.writeZipPromise(outPath);
}

function processHTML(htmlContent) {
  const $ = cheerio.load(htmlContent);

  // Remove controller area
  $('#controller-area').remove();

  // Unwrap console wrapper and device container
  const deviceContainer = $('#device-container');
  if (deviceContainer.length) {
    const gameContent = deviceContainer.html();
    $('#console-wrapper').replaceWith(gameContent);
  }

  // Replace styles with KaiOS tailored styles
  $('style').html(`
    * { margin: 0; padding: 0; box-sizing: border-box; user-select: none; }
    body { 
        background-color: #000; 
        color: #fff;
        font-family: Arial, sans-serif;
        overflow: hidden;
        width: 100vw;
        height: 100vh;
    }
    #gameCanvas {
        display: block;
        background: #050510;
        width: 100vw;
        height: calc(100vh - 25px);
    }
    
    /* UI Overlays */
    .screen {
        position: absolute;
        top: 0; left: 0; right: 0; bottom: 25px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background: rgba(5, 5, 16, 0.9);
        z-index: 10;
    }
    .hidden { display: none !important; }
    
    .title { font-size: 20px; font-weight: bold; color: #fff; margin-bottom: 5px; text-align: center; letter-spacing: 1px; }
    .title span:nth-child(1) { color: #00FFFF; text-shadow: 0 0 5px #00FFFF; }
    .title span:nth-child(2) { color: #FF00FF; text-shadow: 0 0 5px #FF00FF; }
    
    .menu-item { font-size: 16px; margin: 4px 0; color: #888; transition: 0.1s; }
    .menu-item.active { color: #fff; font-weight: bold; text-shadow: 0 0 5px #fff; transform: scale(1.1); }
    
    .hud-display, .score-display {
        position: absolute;
        top: 5px; left: 5px; right: 5px;
        display: flex;
        justify-content: space-between;
        font-size: 14px; font-weight: bold; color: #fff;
        text-shadow: 1px 1px 2px #000;
        z-index: 5;
    }
    #energy-bar-container {
        width: 80px; height: 10px;
        background: #222; border: 1px solid #444;
        border-radius: 5px; overflow: hidden;
        margin-top: 2px;
    }
    #energy-bar-fill {
        height: 100%; width: 0%;
        background: #FFFF00;
        transition: width 0.1s;
    }
    .energy-full { background: #00FFFF !important; box-shadow: 0 0 5px #00FFFF; }

    /* KaiOS Softkey Bar */
    #softkey-bar {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 25px;
        background: #111a24;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0 5px;
        font-size: 12px;
        font-weight: bold;
        color: #ccc;
        border-top: 1px solid #333;
        z-index: 20;
    }
    .sk-btn { flex: 1; text-align: center; overflow: hidden; white-space: nowrap; cursor: pointer; padding: 4px 0;}
    #sk-left { text-align: left; padding-left: 4px; }
    #sk-right { text-align: right; padding-right: 4px; }
    #sk-center { color: #fff; font-weight: 900; text-transform: uppercase; }
  `);

  return $.html();
}

function processJS(jsContent) {
  let newContent = jsContent;
  // Replace const GAME_WIDTH = 240; with let GAME_WIDTH = window.innerWidth;
  newContent = newContent.replace(/const\s+GAME_WIDTH\s*=\s*\d+;/, 'let GAME_WIDTH = window.innerWidth;');
  // Replace const GAME_HEIGHT = 295; with let GAME_HEIGHT = window.innerHeight - 25;
  newContent = newContent.replace(/const\s+GAME_HEIGHT\s*=\s*\d+;(\s*\/\/[^\n]*)?/, 'let GAME_HEIGHT = window.innerHeight - 25;');
  
  // Replace references to standard canvas setup width
  newContent = newContent.replace(/canvas\.style\.width\s*=\s*GAME_WIDTH\s*\+\s*'px';/, 'canvas.style.width = "100%";');
  newContent = newContent.replace(/canvas\.style\.height\s*=\s*GAME_HEIGHT\s*\+\s*'px';/, 'canvas.style.height = "100%";');

  // Canvas performance adjustments for KaiOS (disabling alpha channel on canvas element for speed & removing smoothing)
  newContent = newContent.replace(/canvas\.getContext\('2d'\)/g, "canvas.getContext('2d', { alpha: false, desynchronized: true })");
  newContent = newContent.replace(/(const|let|var)\s+ctx\s*=\s*canvas\.getContext\([^)]*\);/, "$&\nif(ctx) ctx.imageSmoothingEnabled = false;");

  return newContent;
}

async function buildOmniSD(gameDirName) {
  const gamePath = path.join(__dirname, '../games', gameDirName);
  
  // 1. Setup temporary directories
  const tempPreBuildDir = path.join(__dirname, '../temp', gameDirName, 'src');
  const tempAppDir = path.join(__dirname, '../temp', gameDirName, 'app');
  await fs.mkdir(tempPreBuildDir, { recursive: true });

  // 2. Read and process HTML, saving to pre-build
  const htmlPath = path.join(gamePath, 'index.html');
  const htmlContent = await fs.readFile(htmlPath, 'utf-8');
  const processedHTML = processHTML(htmlContent);
  await fs.writeFile(path.join(tempPreBuildDir, 'index.html'), processedHTML);

  // 3. Process the JS, saving to pre-build
  const jsPath = path.join(gamePath, 'index-inline-1.js');
  try {
    const jsContent = await fs.readFile(jsPath, 'utf-8');
    const processedJS = processJS(jsContent);
    await fs.writeFile(path.join(tempPreBuildDir, 'index-inline-1.js'), processedJS);
  } catch(e) {
    console.error('JS processing error for ' + gameDirName, e);
  }

  // 4. Run Vite build on the pre-build folder
  console.log(`Building Vite chunks for ${gameDirName}...`);
  const { execSync } = await import('child_process');
  execSync(`npx vite build ${tempPreBuildDir} -c vite.config.js --base ./ --outDir ${tempAppDir} --emptyOutDir`, { stdio: 'inherit' });

  // 5. Generate manifest.webapp in built app folder
  const manifest = {
    "name": gameDirName.replace(/-/g, ' ').toUpperCase(),
    "description": `${gameDirName} for KaiOS`,
    "launch_path": "/index.html",
    "type": "web",
    "icons": {
      "128": "/icon-128.png"
    },
    "developer": {
      "name": "KaiOS Game Dev",
      "url": "http://example.com"
    },
    "locales": {
      "en-US": {
        "name": gameDirName.replace(/-/g, ' ').toUpperCase(),
        "subtitle": "Retro Game"
      }
    },
    "default_locale": "en-US",
    "fullscreen": "true"
  };
  await fs.writeFile(path.join(tempAppDir, 'manifest.webapp'), JSON.stringify(manifest, null, 2));

  // Copy icon if it exists
  const iconSourcePath = path.join(gamePath, 'icon-128.png');
  try {
    await fs.copyFile(iconSourcePath, path.join(tempAppDir, 'icon-128.png'));
  } catch (e) {
    // Fallback if not found
    await fs.writeFile(path.join(tempAppDir, 'icon-128.png'), '');
  }

  // 6. Zip application.zip
  const omniSDBaseDir = path.join(__dirname, '../temp', gameDirName, 'omnisd');
  await fs.mkdir(omniSDBaseDir, { recursive: true });
  
  const applicationZipPath = path.join(omniSDBaseDir, 'application.zip');
  await zipDirectory(tempAppDir, applicationZipPath);

  // 7. Generate metadata.json for OmniSD
  const metadata = {
    "version": 1,
    "manifestURL": `app://${gameDirName.replace(/[^a-z0-9]/g, '')}.kaios.app/manifest.webapp`
  };
  await fs.writeFile(path.join(omniSDBaseDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  // 8. Zip the final OmniSD package
  const finalOutputDir = path.join(__dirname, '../builds');
  await fs.mkdir(finalOutputDir, { recursive: true });
  
  const finalZipPath = path.join(finalOutputDir, `${gameDirName}-OmniSD.zip`);
  await zipDirectory(omniSDBaseDir, finalZipPath);
  
  console.log(`✅ Built OmniSD for ${gameDirName} at builds/${gameDirName}-OmniSD.zip`);
}

async function buildAll() {
  const gamesDir = path.join(__dirname, '../games');
  const games = await fs.readdir(gamesDir);
  for (const game of games) {
    if (game !== '.git' && game !== 'node_modules' && game !== 'gameA') {
      try {
        await buildOmniSD(game);
      } catch (err) {
        console.error('Error building ' + game, err);
      }
    }
  }
}

buildAll();
