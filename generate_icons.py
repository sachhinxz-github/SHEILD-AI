"""
Generate simple shield icons for the browser extension
"""
from PIL import Image, ImageDraw

sizes = [16, 32, 48, 128]

for size in sizes:
    # Create a new image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Draw a shield shape
    margin = size // 8
    top = margin
    bottom = size - margin
    left = margin
    right = size - margin
    center_x = size // 2
    center_y = size // 2
    
    # Shield color (purple/blue gradient-like)
    fill_color = (102, 126, 234, 255)  # Purple-blue
    stroke_color = (80, 100, 200, 255)  # Darker purple-blue
    
    # Draw shield as a polygon
    shield_points = [
        (center_x, top + 5),           # Top center
        (right - 5, top + 15),         # Top right
        (right - 8, bottom - 15),      # Bottom right
        (center_x, bottom - 5),        # Bottom center
        (left + 8, bottom - 15),       # Bottom left
        (left + 5, top + 15),          # Top left
    ]
    
    draw.polygon(shield_points, fill=fill_color, outline=stroke_color)
    
    # Draw a checkmark or shield detail
    if size >= 32:
        # Draw a simple "S" or shield detail
        check_color = (255, 255, 255, 255)
        line_width = max(1, size // 16)
        
        # Draw a simple line pattern
        if size >= 48:
            draw.line([
                (center_x - size//6, center_y),
                (center_x - size//12, center_y + size//8),
                (center_x + size//6, center_y - size//8)
            ], fill=check_color, width=line_width)
    
    # Save the image
    img.save(f'extension/icons/icon{size}.png', 'PNG')
    print(f'Created icon{size}.png')

print('All icons created successfully!')