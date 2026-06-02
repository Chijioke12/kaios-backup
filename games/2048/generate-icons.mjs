import { execSync } from 'child_process';
import fs from 'fs';

if (!fs.existsSync('./public')) {
  fs.mkdirSync('./public');
}

function createIcon(size) {
  const radius = size * 0.2;
  const fontSize = Math.floor(size * 0.35);
  const outputPath = `./public/icon-${size}.png`;

  console.log(`Generating icon-${size}.png...`);
  try {
    // ImageMagick command to create a rounded rectangle with text
    // Using xc:none for transparency, then drawing the rounded rect and text
    const command = `magick -size ${size}x${size} xc:none \
      -fill "#edc22e" -draw "roundrectangle 0,0 ${size-1},${size-1} ${radius},${radius}" \
      -fill "#f9f6f2" -font "DejaVu-Sans-Bold" -pointsize ${fontSize} -gravity center -draw "text 0,0 '2048'" \
      "${outputPath}"`;
    
    execSync(command);
    console.log(`Created ${outputPath}`);
  } catch (error) {
    console.error(`Failed to create icon-${size}.png:`, error.message);
    
    // Fallback if font is missing
    try {
        console.log(`Retrying without specific font...`);
        const fallbackCommand = `magick -size ${size}x${size} xc:none \
          -fill "#edc22e" -draw "roundrectangle 0,0 ${size-1},${size-1} ${radius},${radius}" \
          -fill "#f9f6f2" -pointsize ${fontSize} -gravity center -draw "text 0,0 '2048'" \
          "${outputPath}"`;
        execSync(fallbackCommand);
        console.log(`Created ${outputPath} (fallback)`);
    } catch (fallbackError) {
        console.error(`Fallback also failed:`, fallbackError.message);
    }
  }
}

[56, 112, 128].forEach(createIcon);
