"""
Auto-scanning watcher for MCP Registry
Watches a network folder and automatically indexes new MCP servers
"""

import os
import json
import time
import shutil
from pathlib import Path
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from datetime import datetime

# Configuration
WATCH_PATH = Path(os.getenv('WATCH_PATH', '/watch'))
STORAGE_PATH = Path(os.getenv('STORAGE_PATH', '/storage/mcp-servers'))

class MCPServerWatcher(FileSystemEventHandler):
    """Watch for new MCP server folders and auto-index them"""

    def __init__(self):
        super().__init__()
        self.processing = set()  # Track what we're currently processing

    def on_created(self, event):
        """Handle new files/folders"""
        if event.is_directory:
            # Give filesystem time to finish copying
            time.sleep(2)
            self.process_server_folder(event.src_path)

    def process_server_folder(self, folder_path):
        """Process a new server folder"""
        folder = Path(folder_path)

        # Avoid processing the same folder multiple times
        if str(folder) in self.processing:
            return

        self.processing.add(str(folder))

        try:
            # Look for manifest or package files
            manifest_file = folder / 'mcp-manifest.json'
            package_files = list(folder.glob('*.zip')) + list(folder.glob('*.tar.gz'))

            if not manifest_file.exists() and not package_files:
                print(f"⏭️  Skipping {folder.name} - no manifest or package found")
                return

            # Read manifest
            if manifest_file.exists():
                with open(manifest_file) as f:
                    manifest = json.load(f)

                name = manifest.get('name', folder.name)
                version = manifest.get('version', '1.0.0')
            else:
                # Infer from folder structure: server-name/v1.0.0/
                parts = folder.parts
                if len(parts) >= 2:
                    name = parts[-2]
                    version = parts[-1].replace('v', '')
                else:
                    name = folder.name
                    version = '1.0.0'

                manifest = {
                    'name': name,
                    'version': version,
                    'description': f'Auto-indexed from {folder}',
                    'author': 'Auto-indexed',
                    'tags': [],
                    'repository': ''
                }

            # Find package file
            if package_files:
                package_file = package_files[0]
            else:
                # Create a zip of the folder
                package_file = folder / f'{name}.zip'
                shutil.make_archive(
                    str(folder / name),
                    'zip',
                    folder
                )

            # Copy to storage
            dest_dir = STORAGE_PATH / name / version
            dest_dir.mkdir(parents=True, exist_ok=True)

            # Copy package
            dest_package = dest_dir / package_file.name
            if not dest_package.exists():
                shutil.copy2(package_file, dest_package)

            # Create/update metadata
            metadata = {
                'name': name,
                'version': version,
                'description': manifest.get('description', ''),
                'author': manifest.get('author', ''),
                'repository': manifest.get('repository', ''),
                'filename': package_file.name,
                'tags': manifest.get('tags', []),
                'downloads': 0,
                'created_at': datetime.now().isoformat(),
                'updated_at': datetime.now().isoformat(),
                'path': str(dest_dir),
                'auto_indexed': True,
                'source_path': str(folder)
            }

            # Save metadata
            with open(dest_dir / 'metadata.json', 'w') as f:
                json.dump(metadata, f, indent=2)

            print(f"✅ Indexed: {name} v{version}")
            print(f"   Package: {package_file.name}")
            print(f"   Location: {dest_dir}")

        except Exception as e:
            print(f"❌ Error processing {folder}: {e}")

        finally:
            self.processing.remove(str(folder))

    def scan_existing(self):
        """Scan existing folders on startup"""
        if not WATCH_PATH.exists():
            print(f"⚠️  Watch path {WATCH_PATH} does not exist")
            return

        print(f"📂 Scanning {WATCH_PATH} for existing servers...")

        for item in WATCH_PATH.iterdir():
            if item.is_dir():
                # Check if it's a server folder
                self.process_server_folder(item)

                # Also check subfolders (for version folders)
                for subitem in item.iterdir():
                    if subitem.is_dir():
                        self.process_server_folder(subitem)

        print("✅ Finished scanning existing folders")


def main():
    """Main watcher loop"""
    print("=" * 60)
    print("🔍 MCP Registry Auto-Scanner")
    print("=" * 60)
    print(f"📂 Watching: {WATCH_PATH}")
    print(f"💾 Storage: {STORAGE_PATH}")
    print()

    # Create directories if they don't exist
    WATCH_PATH.mkdir(parents=True, exist_ok=True)
    STORAGE_PATH.mkdir(parents=True, exist_ok=True)

    # Create event handler
    event_handler = MCPServerWatcher()

    # Scan existing folders first
    event_handler.scan_existing()

    # Set up observer
    observer = Observer()
    observer.schedule(event_handler, str(WATCH_PATH), recursive=True)
    observer.start()

    print()
    print("👀 Watching for new servers... (Press Ctrl+C to stop)")
    print()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n⏹️  Stopping watcher...")
        observer.stop()

    observer.join()
    print("✅ Watcher stopped")


if __name__ == "__main__":
    main()
