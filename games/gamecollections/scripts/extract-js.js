import fs from 'fs/promises';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function processHtmlFile(filePath) {
  try {
    const htmlContent = await fs.readFile(filePath, 'utf-8');
    const $ = cheerio.load(htmlContent);
    const fileNameWithoutExt = path.basename(filePath, '.html');
    const dir = path.dirname(filePath);
    
    let inlineScriptCount = 0;
    
    $('script').each((index, element) => {
      const el = $(element);
      const src = el.attr('src');
      const type = el.attr('type');
      
      // Only process inline scripts (no src) and those not marked as module/json if not needed
      if (!src && (!type || type === 'text/javascript' || type === 'application/javascript' || type === 'module')) {
        const scriptContent = el.html();
        if (scriptContent && scriptContent.trim()) {
          inlineScriptCount++;
          const jsFileName = `${fileNameWithoutExt}-inline-${inlineScriptCount}.js`;
          const jsFilePath = path.join(dir, jsFileName);
          
          // Write JS to file
          fs.writeFile(jsFilePath, scriptContent, 'utf-8');
          
          // Update HTML to point to the new file
          el.empty();
          el.attr('src', `./${jsFileName}`);
          el.attr('type', 'module');
          if (type === 'module') {
             el.attr('type', 'module');
          }
          console.log(`Extracted script to ${jsFilePath}`);
        }
      }
    });
    
    if (inlineScriptCount > 0) {
      await fs.writeFile(filePath, $.html(), 'utf-8');
      console.log(`Updated HTML file: ${filePath}`);
    } else {
      console.log(`No inline scripts found in ${filePath}`);
    }

  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

async function scanDirectory(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.git') {
        await scanDirectory(fullPath);
      } else if (entry.isFile() && fullPath.endsWith('.html')) {
        // Skip index.html of the root if desired, but we process everything in games/
        await processHtmlFile(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning ${dirPath}:`, error);
  }
}

const targetDir = process.argv[2] || path.join(__dirname, '../games');

console.log(`Scanning for HTML files in: ${targetDir}`);
scanDirectory(targetDir);
