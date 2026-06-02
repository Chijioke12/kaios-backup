from PIL import Image, ImageDraw

def generate_icon():
    # Colors
    BG_COLOR = (10, 12, 26) # #0a0c1a
    
    # 1. Load the sprite sheet
    try:
        sprites = Image.open('public/snake_sprites.png')
    except Exception as e:
        print(f"Error loading sprites: {e}")
        return

    # 2. Crop the Tier 2 head (from snake_atlas.json: x: 4, y: 44, w: 16, h: 16)
    # Note: Using Tier 2 (Yellow Serpent) as it's more "evolved"
    head = sprites.crop((4, 44, 20, 60))
    
    # 3. Create a 112x112 background
    icon = Image.new('RGB', (112, 112), BG_COLOR)
    
    # 4. Scale the head (with NEAREST to keep it pixel-art style)
    # Scale from 16x16 to 80x80
    head_large = head.resize((80, 80), Image.NEAREST)
    
    # 5. Paste the head onto the icon (centered)
    # (112 - 80) // 2 = 16
    icon.paste(head_large, (16, 16), head_large if head_large.mode == 'RGBA' else None)
    
    # 6. Optional: Add a green border to make it pop
    draw = ImageDraw.Draw(icon)
    draw.rectangle([0, 0, 111, 111], outline=(0, 255, 0), width=2)

    # 7. Save
    icon.save('public/icon.png')
    print("Successfully generated public/icon.png")

if __name__ == "__main__":
    generate_icon()
