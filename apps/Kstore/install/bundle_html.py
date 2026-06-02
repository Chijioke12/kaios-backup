import re
import os
import sys

def bundle(input_html, output_html):
    if not os.path.exists(input_html):
        print(f"Error: {input_html} not found")
        return

    with open(input_html, 'r', encoding='utf-8') as f:
        content = f.read()

    # Remove CSS links: <link rel="stylesheet" href="...">
    content = re.sub(r'<link[^>]+rel=["\']stylesheet["\'][^>]*>', '', content, flags=re.IGNORECASE)
    # Remove style tags: <style>...</style>
    content = re.sub(r'<style.*?>.*?</style>', '', content, flags=re.IGNORECASE | re.DOTALL)

    base_dir = os.path.dirname(os.path.abspath(input_html))

    def replace_script(match):
        attrs = match.group(1)
        src_match = re.search(r'src=["\'](.*?)["\']', attrs)
        if src_match:
            js_path = src_match.group(1)
            # Try to resolve relative path
            full_js_path = os.path.join(base_dir, js_path)
            if os.path.exists(full_js_path):
                with open(full_js_path, 'r', encoding='utf-8') as js_file:
                    js_content = js_file.read()
                return f'<script>\n{js_content}\n</script>'
            else:
                print(f"Warning: JS file {js_path} not found")
        return match.group(0)

    # Replace <script src="..."></script> with <script>...</script>
    content = re.sub(r'<script\b([^>]+)></script>', replace_script, content, flags=re.IGNORECASE)

    with open(output_html, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Bundled {input_html} into {output_html} (excluding CSS)")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python bundle_html.py <input.html> <output.html>")
    else:
        bundle(sys.argv[1], sys.argv[2])
