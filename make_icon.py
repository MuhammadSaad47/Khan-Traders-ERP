import sys
from PIL import Image, ImageDraw

def make_icon(input_path, output_path, bg_color="#0F172A"):
    try:
        # Load the original logo
        img = Image.open(input_path).convert("RGBA")
        
        # Calculate padding and new size (e.g. 512x512 standard icon size)
        base_size = 512
        padding = 80
        
        # Calculate aspect ratio to fit within (base_size - padding*2)
        target_w = base_size - (padding * 2)
        target_h = base_size - (padding * 2)
        
        w_ratio = target_w / img.width
        h_ratio = target_h / img.height
        ratio = min(w_ratio, h_ratio)
        
        new_w = int(img.width * ratio)
        new_h = int(img.height * ratio)
        
        img = img.resize((new_w, new_h), Image.Resampling.LANCZOS)
        
        # Create a new background image
        # Let's do a slight vertical gradient or just solid dark slate
        bg = Image.new("RGBA", (base_size, base_size), bg_color)
        
        # Optionally add a slight gradient
        draw = ImageDraw.Draw(bg)
        for y in range(base_size):
            r = int(15 - (y / base_size) * 10)
            g = int(23 - (y / base_size) * 15)
            b = int(42 - (y / base_size) * 20)
            draw.line([(0, y), (base_size, y)], fill=(r, g, b, 255))
            
        # Add a rounded rectangle "app icon" shape effect
        mask = Image.new('L', (base_size, base_size), 0)
        draw_mask = ImageDraw.Draw(mask)
        draw_mask.rounded_rectangle([(0, 0), (base_size, base_size)], radius=110, fill=255)
        
        icon = Image.new("RGBA", (base_size, base_size))
        icon.paste(bg, (0,0), mask=mask)
        
        # Paste the logo in the center
        offset_x = (base_size - new_w) // 2
        offset_y = (base_size - new_h) // 2
        
        # If the logo is dark, we could invert or apply brightness, but let's assume it has white or colored elements
        icon.paste(img, (offset_x, offset_y), mask=img)
        
        # Save
        icon.save(output_path, "PNG")
        print(f"Successfully saved {output_path}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    make_icon("../logo2.png", "resources/icon.png")
