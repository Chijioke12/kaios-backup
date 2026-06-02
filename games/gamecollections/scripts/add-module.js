import fs from 'fs/promises';
import { globSync } from 'glob';
import * as cheerio from 'cheerio';

const files = globSync('games/*/index.html');
for (const file of files) {
  const content = await fs.readFile(file, 'utf-8');
  const $ = cheerio.load(content);
  $('script').each((i, el) => {
    if (!$(el).attr('type')) {
      $(el).attr('type', 'module');
    }
  });
  await fs.writeFile(file, $.html(), 'utf-8');
  console.log(`Updated ${file}`);
}
