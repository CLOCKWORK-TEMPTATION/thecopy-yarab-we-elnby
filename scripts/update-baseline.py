#!/usr/bin/env python3
"""scripts/update-baseline.py — تحديث tech-debt-baseline.json (ratchet)."""
from __future__ import annotations
import json, os, re, subprocess, sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BASELINE = ROOT / "tech-debt-baseline.json"
SKIP_DIRS = {"node_modules", ".next", ".turbo", "dist", "build", "coverage",
             ".git", ".cache", ".pnpm-store", "out", ".nuxt", "__pycache__"}


def run_cmd(cmd):
    try:
        r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True, check=False)
        return r.stdout if r.returncode == 0 else ""
    except Exception:
        return ""


def walk_safe(base):
    for root, dirs, files in os.walk(str(base), followlinks=False):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fn in files:
            yield Path(root) / fn


def grep_count(pattern, paths, extensions, excludes=None):
    total, rx = 0, re.compile(pattern)
    excludes = excludes or []
    ext_set = set(extensions)
    for base in paths:
        bp = ROOT / base
        if not bp.exists():
            continue
        for f in walk_safe(bp):
            if f.suffix not in ext_set:
                continue
            fs = str(f)
            if any(ex in fs for ex in excludes):
                continue
            try:
                text = f.read_text(encoding="utf-8", errors="ignore")
            except OSError:
                continue
            total += len(rx.findall(text))
    return total


def files_over(threshold, paths, extensions):
    n = 0
    ext_set = set(extensions)
    for base in paths:
        bp = ROOT / base
        if not bp.exists():
            continue
        for f in walk_safe(bp):
            if f.suffix not in ext_set:
                continue
            try:
                with f.open("rb") as fh:
                    lines = sum(1 for _ in fh)
            except OSError:
                continue
            if lines > threshold:
                n += 1
    return n


def measure_live():
    return {
        "console_calls_web_src": grep_count(
            r"console\.(log|info|warn|error|debug)",
            ["apps/web/src"], [".ts", ".tsx"], excludes=[".test.", ".spec."]),
        "console_calls_backend_src": grep_count(
            r"console\.(log|info|warn|error|debug)",
            ["apps/backend/src"], [".ts"], excludes=[".test.", ".spec."]),
        "any_type_web_src": grep_count(
            r":\s*any\b", ["apps/web/src"], [".ts", ".tsx"], excludes=[".test."]),
        "any_type_backend_src": grep_count(
            r":\s*any\b", ["apps/backend/src"], [".ts"], excludes=[".test."]),
        "ts_ignore_total": grep_count(
            r"@ts-ignore", ["apps/web/src", "apps/backend/src"], [".ts", ".tsx"]),
        "todo_fixme_hack_total": grep_count(
            r"(TODO|FIXME|HACK)",
            ["apps/web/src", "apps/backend/src", "packages"], [".ts", ".tsx"]),
        "files_over_1000_lines": files_over(
            1000, ["apps/web/src", "apps/backend/src", "packages"], [".ts", ".tsx"]),
        "files_over_500_lines": files_over(
            500, ["apps/web/src", "apps/backend/src", "packages"], [".ts", ".tsx"]),
    }


def main():
    dry_run = "--dry-run" in sys.argv
    if not BASELINE.exists():
        sys.stderr.write("[FAIL] tech-debt-baseline.json missing\n")
        return 2
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    live = measure_live()
    changes, violations = [], []
    for key, current in live.items():
        node = baseline.get("static_metrics", {}).get(key, {})
        old = node.get("value")
        if old is None:
            continue
        if current < old:
            changes.append((key, old, current))
        elif current > old:
            violations.append((key, old, current))
    if violations:
        sys.stderr.write("[REJECTED] قيم زادت:\n")
        for k, o, n in violations:
            sys.stderr.write("  " + k + ": " + str(o) + " -> " + str(n) + "\n")
        return 1
    if not changes:
        print("[INFO] لا تحسينات لتحديثها.")
        return 0
    print("[INFO] " + str(len(changes)) + " metric محسَّن:")
    for k, o, n in changes:
        print("  " + k + ": " + str(o) + " -> " + str(n))
    if dry_run:
        print("[DRY-RUN] لم يُكتب أي تغيير.")
        return 0
    sha = run_cmd(["git", "rev-parse", "HEAD"]).strip() or "unknown"
    branch = run_cmd(["git", "branch", "--show-current"]).strip() or "unknown"
    today_iso = date.today().isoformat()
    for k, _o, n in changes:
        baseline["static_metrics"][k]["value"] = n
    baseline["frozen_at"]["commit"] = sha
    baseline["frozen_at"]["branch"] = branch
    baseline["frozen_at"]["date"] = today_iso
    BASELINE.write_text(json.dumps(baseline, ensure_ascii=False, indent=2) + "\n",
                        encoding="utf-8")
    print("[OK] baseline محدَّث.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
