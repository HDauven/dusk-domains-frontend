"""Remote release operations, sent over stdin by deploy.sh. Requires Linux and Python 3."""
import ctypes
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import re
import shutil
import sys


def exchange(left, right):
    libc = ctypes.CDLL(None, use_errno=True)
    rename = libc.renameat2
    rename.argtypes = [ctypes.c_int, ctypes.c_char_p, ctypes.c_int, ctypes.c_char_p, ctypes.c_uint]
    rename.restype = ctypes.c_int
    # RENAME_EXCHANGE keeps the served path present throughout the swap.
    if rename(-100, os.fsencode(left), -100, os.fsencode(right), 2):
        error = ctypes.get_errno()
        raise OSError(error, os.strerror(error))


destination = Path(sys.argv[1])
action, token = sys.argv[2:]
staging = Path(f"{destination}.next")
lock = Path(f"{destination}.lock")


def acquire():
    lock.mkdir()
    (lock / "owner").write_text(token)


def require_lock():
    if (lock / "owner").read_text() != token:
        raise RuntimeError("Another deployment owns the lock")


def previous(kind="prev"):
    # Hand-deployed backups were named prev-YYYYMMDD-N; they sort before any scripted one.
    stamp = r"\d{8}T\d{6}\.\d{6}Z" + (r"|\d{8}-\d+" if kind == "prev" else "")
    return sorted((path for path in destination.parent.iterdir()
                   if re.fullmatch(re.escape(destination.name) + rf"\.{kind}-(?:{stamp})", path.name)
                   and path.is_dir() and not path.is_symlink()), reverse=True)


def backup_path(kind="prev"):
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S.%fZ")
    return Path(f"{destination}.{kind}-{stamp}")


def prune():
    # Only after a verified release, so failed attempts never remove the last good one.
    for kind in ("prev", "failed"):
        for path in previous(kind)[3:]:
            shutil.rmtree(path)


if destination.is_symlink() or staging.is_symlink():
    raise RuntimeError("Release paths must be directories, not symlinks")

if action == "prepare":
    acquire()
    try:
        staging.mkdir()
    except BaseException:
        shutil.rmtree(lock)
        raise
elif action == "activate":
    require_lock()
    # Parse the manifest before changing the served directory.
    json.loads((staging / "version.json").read_text())
    if destination.exists():
        backup = backup_path()
        # Marked before the exchange: once it may have happened, .next can hold the prior
        # release, so cleanup must keep it.
        (lock / "exchanged").touch()
        exchange(staging, destination)
        staging.rename(backup)
    else:
        staging.rename(destination)
    (lock / "activated").touch()
elif action == "rollback":
    acquire()
    try:
        if staging.exists():
            raise RuntimeError("An unfinished upload exists")
        releases = previous()
        if not releases:
            raise RuntimeError("No previous release exists")
        selected = releases[0]
        version = json.loads((selected / "version.json").read_text())
        if not version.get("frontendCommit"):
            raise RuntimeError("Previous release has no frontendCommit")
        # Hand-deployed backups predate siteUrl. Carry the live one over and keep it in the
        # restored manifest, so a later rollback into another old backup still knows the site.
        if not version.get("siteUrl"):
            version["siteUrl"] = json.loads((destination / "version.json").read_text())["siteUrl"]
            (selected / "version.json").write_text(json.dumps(version, indent=2) + "\n")
        exchange(selected, destination)
        # The release rolled back from is set aside, so another rollback goes further back.
        selected.rename(backup_path("failed"))
        (lock / "activated").touch()
        print(json.dumps(version))
    except BaseException:
        shutil.rmtree(lock)
        raise
elif action in ("abort", "finish"):
    require_lock()
    if action == "abort" and staging.exists() and not (lock / "exchanged").exists():
        shutil.rmtree(staging)
    if action == "finish":
        prune()
    shutil.rmtree(lock)
else:
    raise RuntimeError(f"Unknown release action: {action}")
