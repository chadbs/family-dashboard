#!/usr/bin/env python3
"""
Push a grocery checklist to Google Keep using the battle-tested `gkeepapi`
library (more reliable than the hand-rolled Node fallback).

The dashboard server runs this and pipes a JSON blob on stdin:
    {"email": "...", "masterToken": "aas_et/...", "title": "Groceries — Jul 1",
     "listTitle": "Groceries", "items": ["Milk (3 gallons)", "Eggs", ...]}
It prints a single JSON line on stdout:  {"ok": true, "count": N}  or  {"ok": false, "error": "..."}

Setup:  pip install gkeepapi     (get the master token via scripts/keep-token.js — see scripts/KEEP-SETUP.md)
"""
import sys
import json


def main():
    try:
        data = json.load(sys.stdin)
    except Exception as e:
        print(json.dumps({"ok": False, "error": "bad input: %s" % e}))
        return

    email = data.get("email")
    token = data.get("masterToken")
    items = data.get("items") or []
    title = data.get("title") or data.get("listTitle") or "Groceries"
    if not email or not token:
        print(json.dumps({"ok": False, "error": "missing email or masterToken"}))
        return
    if not items:
        print(json.dumps({"ok": False, "error": "empty list"}))
        return

    try:
        import gkeepapi
    except ImportError:
        print(json.dumps({"ok": False, "error": "gkeepapi not installed — run: pip install gkeepapi"}))
        return

    keep = gkeepapi.Keep()
    try:
        # Newer gkeepapi uses authenticate(email, master_token); older uses resume().
        if hasattr(keep, "authenticate"):
            keep.authenticate(email, token)
        else:
            keep.resume(email, token)
    except Exception as e:
        print(json.dumps({"ok": False, "error": "auth failed (is the master token still valid?): %s" % e}))
        return

    try:
        keep.createList(title, [(str(it), False) for it in items])
        keep.sync()
    except Exception as e:
        print(json.dumps({"ok": False, "error": "keep sync failed: %s" % e}))
        return

    print(json.dumps({"ok": True, "count": len(items)}))


if __name__ == "__main__":
    main()
