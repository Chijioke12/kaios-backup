#!/usr/bin/env python3
import argparse
import json
import os
import tempfile
import zipfile
from pathlib import Path
 
 
APP_FILES = [
    "manifest.webapp",
    "index.html",
    "style.css",
    "app.js",
    "apps.json",
]
 
 
def read_manifest_url(app_dir: Path) -> str:
    manifest_path = app_dir / "manifest.webapp"
    with manifest_path.open("r", encoding="utf-8") as f:
        manifest = json.load(f)
    origin = manifest.get("origin", "")
    if origin.startswith("app://"):
        origin = origin[len("app://") :]
    return f"app://{origin}/manifest.webapp"
 
 
def build_application_zip(app_dir: Path, out_path: Path) -> None:
    missing = []
    for rel in APP_FILES:
        if not (app_dir / rel).is_file():
            missing.append(rel)
    icons_dir = app_dir / "icons"
    if not icons_dir.is_dir():
        missing.append("icons/")
 
    if missing:
        raise FileNotFoundError(f"Missing required app files: {', '.join(missing)}")
 
    with zipfile.ZipFile(out_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for rel in APP_FILES:
            z.write(app_dir / rel, arcname=rel)
        for p in icons_dir.rglob("*"):
            if p.is_file():
                z.write(p, arcname=str(p.relative_to(app_dir)))
 
 
def build_omnisd(app_dir: Path, out_zip: Path) -> None:
    if not app_dir.is_dir():
        raise FileNotFoundError(f"App dir not found: {app_dir}")
    if not (app_dir / "manifest.webapp").is_file():
        raise FileNotFoundError(f"Missing {app_dir / 'manifest.webapp'}")
 
    out_zip.parent.mkdir(parents=True, exist_ok=True)
    if out_zip.exists():
        out_zip.unlink()
 
    with tempfile.TemporaryDirectory(prefix="omnisd_pkg_") as tmp:
        tmp_dir = Path(tmp)
 
        application_zip = tmp_dir / "application.zip"
        build_application_zip(app_dir, application_zip)
 
        # OmniSD wrapper files.
        (tmp_dir / "update.webapp").write_text("", encoding="utf-8")
 
        metadata = {
            "version": 1,
            "manifestURL": read_manifest_url(app_dir),
        }
        (tmp_dir / "metadata.json").write_text(
            json.dumps(metadata) + "\n", encoding="utf-8"
        )
 
        with zipfile.ZipFile(out_zip, "w", compression=zipfile.ZIP_DEFLATED) as z:
            z.write(application_zip, arcname="application.zip")
            z.write(tmp_dir / "update.webapp", arcname="update.webapp")
            z.write(tmp_dir / "metadata.json", arcname="metadata.json")
 
 
def main() -> int:
    parser = argparse.ArgumentParser(
        description="Build an OmniSD ZIP for a packaged KaiOS app."
    )
    parser.add_argument(
        "app_dir",
        nargs="?",
        default="open-kaistore",
        help="App directory containing manifest.webapp (default: open-kaistore)",
    )
    parser.add_argument(
        "out_zip",
        nargs="?",
        default="open-kaistore-omnisd.zip",
        help="Output zip path (default: open-kaistore-omnisd.zip)",
    )
    args = parser.parse_args()
 
    app_dir = Path(args.app_dir).resolve()
    out_zip = Path(args.out_zip)
    if not out_zip.is_absolute():
        out_zip = (Path.cwd() / out_zip).resolve()
 
    build_omnisd(app_dir, out_zip)
    print(f"ok: wrote {out_zip}")
    return 0
 
 
if __name__ == "__main__":
    raise SystemExit(main())

