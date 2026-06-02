import { execSync } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const games = [
  { id: 'chromajump', initials: 'CJ', color: '#ff0055' },
  { id: 'neon-core-defender', initials: 'CD', color: '#00aa00' },
  { id: 'neon-echo-jumper', initials: 'EJ', color: '#00bbff' },
  { id: 'neon-quantum-shift', initials: 'QS', color: '#8800ff' },
  { id: 'neonoverdrive', initials: 'NO', color: '#ff0000' },
  { id: 'pulsejumper', initials: 'PJ', color: '#ffaa00' }
];

async function generateIcon(game) {
  const iconPath = path.join(__dirname, '../games', game.id, 'icon-128.png');
  
  // ImageMagick commands configuration
  // xc:none creates a transparent canvas
  // -draw "circle 64,64 64,2" draws a circle with center (64,64) and edge point (64,2) (so radius is 62)
  const fallbackCmd = `convert -size 128x128 xc:none -fill "${game.color}" -draw "circle 64,64 64,2" -fill white -gravity center -pointsize 48 -annotate +0+0 "${game.initials}" "${iconPath}"`;
  const primaryCmd = `magick -size 128x128 xc:none -fill "${game.color}" -draw "circle 64,64 64,2" -fill white -gravity center -pointsize 48 -annotate +0+0 "${game.initials}" "${iconPath}"`;

  try {
    execSync(primaryCmd, { stdio: 'pipe' });
    console.log(`✅ Generated icon for ${game.id} (magick)`);
  } catch (e) {
    try {
      execSync(fallbackCmd, { stdio: 'pipe' });
      console.log(`✅ Generated icon for ${game.id} (convert)`);
    } catch(e2) {
      console.error(`❌ Failed to generate icon for ${game.id}. Ensure ImageMagick is installed.`);
      console.error(e2.message);
    }
  }
}

async function main() {
  for (const game of games) {
    await generateIcon(game);
  }
}

main();
