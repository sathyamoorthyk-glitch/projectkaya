import json
import time
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from catalog.sync import sync_catalog


class Command(BaseCommand):
    help = "Load frontend/src/data/ProductData.json into the database. Use --watch to re-sync on every save."

    def add_arguments(self, parser):
        parser.add_argument("path", nargs="?", default=str(settings.CATALOG_JSON))
        parser.add_argument("--prune", action="store_true", help="Hide items that are not in the file")
        parser.add_argument("--watch", action="store_true", help="Keep running and sync whenever the file changes")

    def run_once(self, path, prune):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            stats = sync_catalog(data, prune=prune)
        except (ValueError, OSError) as exc:  # includes bad JSON
            self.stderr.write(self.style.ERROR(f"Sync failed (nothing was changed): {exc}"))
            return False
        self.stdout.write(self.style.SUCCESS(f"Synced: {stats}"))
        return True

    def handle(self, *args, **opts):
        path = Path(opts["path"])
        if not path.exists():
            raise CommandError(f"File not found: {path}")
        ok = self.run_once(path, opts["prune"])
        if not opts["watch"]:
            if not ok:
                raise CommandError("Sync failed.")
            return
        self.stdout.write(f"Watching {path} ... press Ctrl+C to stop")
        last = path.stat().st_mtime
        try:
            while True:
                time.sleep(2)
                mtime = path.stat().st_mtime
                if mtime != last:
                    last = mtime
                    self.run_once(path, opts["prune"])
        except KeyboardInterrupt:
            self.stdout.write("Stopped.")
