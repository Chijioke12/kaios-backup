import fs from 'fs';
import path from 'path';

const distDir = path.resolve('dist');
const indexPath = path.join(distDir, 'index.html');

if (fs.existsSync(indexPath)) {
  let html = fs.readFileSync(indexPath, 'utf-8');
  
  // 1. Remove the Device Wrapper opening tag
  html = html.replace(/<div id="device-wrapper">/i, '');
  
  // 2. Remove everything from the Virtual D-Pad comment to the end of the device wrapper
  // This handles the D-Pad HTML and the two closing divs (one for d-pad, one for device-wrapper)
  html = html.replace(/<!-- Virtual D-Pad -->[\s\S]*?<div id="d-pad">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/i, '</div>');
  
  // 3. Remove D-Pad CSS
  html = html.replace(/\/\* D-Pad for Web Preview \*\/[\s\S]*?@media \(max-height: 600px\) \{ #d-pad \{ display: none; \} \}/i, '');

  fs.writeFileSync(indexPath, html, 'utf-8');
  console.log('Stripped simulator UI for production build.');
} else {
  console.error('dist/index.html not found!');
}
