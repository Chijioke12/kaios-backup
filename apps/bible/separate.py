import re
import os

def separate_files(source_path, html_dest, js_dest):
    if not os.path.exists(source_path):
        print(f"Source file {source_path} not found.")
        return

    with open(source_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract all <script> contents (excluding those with src)
    script_pattern = re.compile(r'<script\b[^>]*>(.*?)</script>', re.DOTALL)
    scripts = script_pattern.findall(content)
    
    js_content = "\n\n".join(scripts).strip()
    
    # Remove script tags from HTML
    html_content = script_pattern.sub('', content)
    
    # Inject the link to main.js before </body>
    if '</body>' in html_content:
        html_content = html_content.replace('</body>', '    <script type="module" src="./src/main.js"></script>\n</body>')
    else:
        html_content += '\n<script type="module" src="./src/main.js"></script>'

    # Ensure directory exists for JS
    os.makedirs(os.path.dirname(js_dest), exist_ok=True)

    with open(html_dest, 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    with open(js_dest, 'w', encoding='utf-8') as f:
        f.write(js_content)

    print(f"Separated {source_path} into {html_dest} and {js_dest}")

if __name__ == "__main__":
    separate_files('Update/update.html', 'index.html', 'src/main.js')
