import os
from PIL import Image

def generate_icons():
    sizes = {
        'mdpi': 48,
        'hdpi': 72,
        'xhdpi': 96,
        'xxhdpi': 144,
        'xxxhdpi': 192,
    }
    
    input_path = r'c:\ClubMgmt\frontend\components\logo\google-developers-svgrepo-com.png'
    res_path = r'c:\ClubMgmt\app\android\app\src\main\res'
    
    try:
        with Image.open(input_path) as img:
            # Ensure image is in RGBA mode
            img = img.convert("RGBA")
            
            for density, size in sizes.items():
                dir_path = os.path.join(res_path, f'mipmap-{density}')
                os.makedirs(dir_path, exist_ok=True)
                
                # Resize using Lanczos resampling
                resized = img.resize((size, size), Image.Resampling.LANCZOS)
                
                out_file_1 = os.path.join(dir_path, 'ic_launcher.png')
                out_file_2 = os.path.join(dir_path, 'ic_launcher_round.png')
                
                resized.save(out_file_1, 'PNG')
                resized.save(out_file_2, 'PNG')
                
                print(f'Generated {density} - {size}x{size}')
                
        print("Successfully generated all Android icons!")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    generate_icons()
