import fs from 'fs';
import { load } from 'cheerio';
import path from 'path';

/**
 * Separates inline JavaScript from an HTML file
 * @param {string} inputHtmlPath - Path to the original HTML file
 * @param {string} outputHtmlPath - Path where the cleaned HTML will be saved
 */
export function separateJsFromHtml(inputHtmlPath, outputHtmlPath) {
    try {
        // 1. Read the input HTML file
        if (!fs.existsSync(inputHtmlPath)) {
            console.error(`❌ Error: Input file does not exist: ${inputHtmlPath}`);
            return;
        }
        console.log(`Reading file: ${inputHtmlPath}...`);
        const htmlContent = fs.readFileSync(inputHtmlPath, 'utf8');

        // 2. Load the HTML into Cheerio for easy manipulation
        const $ = load(htmlContent);

        // 3. Find all script tags WITHOUT a 'src' attribute (inline scripts)
        $('script:not([src])').each((index, element) => {
            const scriptContent = $(element).html().trim();
            if (!scriptContent) return;

            const jsFileName = `inline-script-${index}.js`;
            const absoluteJsPath = path.join(path.dirname(outputHtmlPath), jsFileName);
            
            // Write the extracted JS to its own file
            fs.writeFileSync(absoluteJsPath, scriptContent, 'utf8');
            console.log(`  - Extracted script ${index} to ${jsFileName}`);

            // 4. Update the script tag: remove content and add src
            $(element).empty();
            $(element).attr('src', jsFileName);
        });

        // 5. Get the modified HTML string
        const cleanedHTML = $.html();

        // 6. Write the output HTML file
        fs.writeFileSync(outputHtmlPath, cleanedHTML, 'utf8');

        console.log('✅ Success!');
        console.log(`📄 Cleaned HTML saved to: ${outputHtmlPath}`);

    } catch (error) {
        console.error('❌ Error processing files:', error.message);
    }
}

// ==========================================
// Execution (when run directly)
// ==========================================
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
if (process.argv[1] === __filename) {
    // Default paths for this project
    const distIndex = path.resolve('./dist/index.html');
    
    if (fs.existsSync(distIndex)) {
        separateJsFromHtml(distIndex, distIndex);
    } else {
        console.log('Dist index.html not found. Creating dummy input file for testing.');
        const testInputFile = 'input.html';
        fs.writeFileSync(testInputFile, `<!DOCTYPE html>
<html>
<head>
    <title>Test Page</title>
</head>
<body>
    <h1>Hello World</h1>
    <script>
        console.log("This is the first script");
        alert("Hello!");
    </script>
    <p>Some content</p>
    <script>
        function doSomething() {
            return true;
        }
    </script>
</body>
</html>`);
        separateJsFromHtml(testInputFile, 'index_cleaned.html');
    }
}
