import json
import os
from PIL import Image

def process_diego_sprites(image_path, json_path, output_path, target_w=20, target_h=32):
    try:
        # Load the image
        img = Image.open(image_path).convert("RGBA")
        
        # Load the JSON data
        with open(json_path, 'r', encoding='utf-8') as f:
            bbox_data = json.load(f)
        
        # Sort by frameIndex
        bbox_data.sort(key=lambda x: x['frameIndex'])
        
        num_frames = len(bbox_data)
        out_width = target_w * num_frames
        out_height = target_h
        
        # Create output image
        out_img = Image.new("RGBA", (out_width, out_height), (0, 0, 0, 0))
        
        for i, box in enumerate(bbox_data):
            # Coordinates and size from JSON
            sx, sy = box['x'], box['y']
            sw, sh = box['width'], box['height']
            
            # Extract frame
            frame = img.crop((sx, sy, sx + sw, sy + sh))
            
            # Calculate scale based on height
            scale = target_h / sh
            scaled_w = int(sw * scale)
            scaled_h = target_h # Should be exactly 32
            
            # Resize frame
            # Using NEAREST to preserve pixel art look if it's pixelated, 
            # but since these are AI high-res, LANCZOS might look better.
            # However, the extractor.html uses imageSmoothingEnabled = false (NEAREST look).
            resized_frame = frame.resize((scaled_w, scaled_h), Image.NEAREST)
            
            # Center horizontally and bottom align
            dx = (i * target_w) + (target_w // 2) - (scaled_w // 2)
            dy = target_h - scaled_h # This will be 0 since scaled_h == target_h
            
            # Paste into output strip
            out_img.paste(resized_frame, (dx, dy), resized_frame)
            
        # Save result
        out_img.save(output_path)
        print(f"Successfully processed {num_frames} frames.")
        print(f"Output saved to: {output_path}")
        print(f"Dimensions: {out_width}x{out_height}")
        
    except Exception as e:
        print(f"Error processing sprites: {e}")

if __name__ == "__main__":
    # Paths based on user's environment
    DESKTOP_DIR = r"c:\Users\manuel reca\Desktop\sprite sheets from AIGODMODE"
    IMAGE_FILE = os.path.join(DESKTOP_DIR, "diego_run.png")
    JSON_FILE = os.path.join(DESKTOP_DIR, "Run holding a gun_bounding_boxes.json")
    
    PROJECT_DIR = r"c:\Users\manuel reca\Desktop\Infinity-Vibe-Slug"
    OUTPUT_FILE = os.path.join(PROJECT_DIR, "public", "assets", "sprites", "player", "diego_run_high_res.png")
    
    # Ensure output directory exists
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    process_diego_sprites(IMAGE_FILE, JSON_FILE, OUTPUT_FILE)
