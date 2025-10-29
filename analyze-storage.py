import os
from pathlib import Path

def get_size(path):
    """Get size of file or directory in MB"""
    if os.path.isfile(path):
        return os.path.getsize(path) / (1024 * 1024)
    elif os.path.isdir(path):
        total = 0
        try:
            for dirpath, dirnames, filenames in os.walk(path):
                for filename in filenames:
                    filepath = os.path.join(dirpath, filename)
                    try:
                        total += os.path.getsize(filepath)
                    except (OSError, PermissionError):
                        pass
        except (OSError, PermissionError):
            pass
        return total / (1024 * 1024)
    return 0

# Analyze the current directory
base_dir = Path('.')
large_items = []

print("=== STORAGE ANALYSIS ===\n")

# Check functions/node_modules
functions_node_modules = base_dir / 'functions' / 'node_modules'
if functions_node_modules.exists():
    size_mb = get_size(functions_node_modules)
    size_gb = size_mb / 1024
    large_items.append(('functions/node_modules', size_mb, size_gb))
    print(f"📁 functions/node_modules: {size_mb:.2f} MB ({size_gb:.2f} GB)")

# Check for video files
video_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
for ext in video_extensions:
    for video_file in base_dir.glob(f'*{ext}'):
        if video_file.is_file():
            size_mb = get_size(video_file)
            size_gb = size_mb / 1024
            large_items.append((video_file.name, size_mb, size_gb))
            print(f"🎬 {video_file.name}: {size_mb:.2f} MB ({size_gb:.2f} GB)")

# Check uploads directory
uploads_dir = base_dir / 'uploads'
if uploads_dir.exists():
    size_mb = get_size(uploads_dir)
    if size_mb > 1:
        size_gb = size_mb / 1024
        large_items.append(('uploads/', size_mb, size_gb))
        print(f"📁 uploads/: {size_mb:.2f} MB ({size_gb:.2f} GB)")

# Check all top-level files > 10MB
print("\n=== LARGE FILES (>10MB) ===")
for item in base_dir.iterdir():
    if item.is_file():
        size_mb = get_size(item)
        if size_mb > 10:
            size_gb = size_mb / 1024
            large_items.append((item.name, size_mb, size_gb))
            print(f"📄 {item.name}: {size_mb:.2f} MB ({size_gb:.2f} GB)")

# Total
total_size_mb = sum(item[1] for item in large_items)
total_size_gb = total_size_mb / 1024

print(f"\n=== SUMMARY ===")
print(f"Total Large Items: {len(large_items)}")
print(f"Total Size: {total_size_mb:.2f} MB ({total_size_gb:.2f} GB)")

# Sort by size
large_items.sort(key=lambda x: x[1], reverse=True)
print(f"\n=== TOP 10 LARGEST ITEMS ===")
for i, (name, mb, gb) in enumerate(large_items[:10], 1):
    print(f"{i}. {name}: {mb:.2f} MB ({gb:.2f} GB)")

