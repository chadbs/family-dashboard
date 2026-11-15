"""Kids' church worksheet generator (one black-and-white letter page).

Usage: python3 make_sheet.py sheets/<name>.json out_dir/
Writes out_dir/<name>.pdf and out_dir/<name>.png (preview). See sheets/2026-10-18-pm.json
for the full JSON shape and ../.claude/skills/church-worksheet/SKILL.md for the workflow.
"""
import json, os, random, subprocess, sys
from html import escape

CHROME = os.environ.get("CHROME", "/opt/pw-browsers/chromium")

# ---------------- Icons (24x24 line art); a sheet can add more under "icons" ----------------
ICONS = {
    "GOD": '<path d="M3 19 L4 7 L8.5 12 L12 4 L15.5 12 L20 7 L21 19 Z"/><path d="M3 21.5 h18"/><circle cx="12" cy="14.5" r="1.4" fill="#000"/>',
    "FISH": '<path d="M2 12 C6 5 15 5 18 12 C15 19 6 19 2 12 Z"/><path d="M18 12 L23 7 L23 17 Z"/><circle cx="6.5" cy="11" r="1.2" fill="#000"/>',
    "PERSON": '<circle cx="12" cy="6" r="3.6"/><path d="M8 11 h8 l2.5 11 h-13 Z"/>',
    "PRAY": '<path d="M12 2 C8.5 7 8 13 8.5 21 L15.5 21 C16 13 15.5 7 12 2 Z"/><path d="M12 4 V21"/><path d="M7 21 h10"/>',
    "SEA": '<path d="M1 9 q2.75 -4 5.5 0 t5.5 0 t5.5 0 t5.5 0"/><path d="M1 15 q2.75 -4 5.5 0 t5.5 0 t5.5 0 t5.5 0"/><path d="M1 21 q2.75 -4 5.5 0 t5.5 0 t5.5 0 t5.5 0"/>',
    "LAND": '<circle cx="18" cy="6" r="3"/><path d="M1 21 Q7 9 13 15 Q17 11 23 21 Z"/>',
    "BIBLE": '<path d="M4 3 h13 a2 2 0 0 1 2 2 v16 h-13 a2 2 0 0 1 -2 -2 Z"/><path d="M11.5 7 v8 M8.5 10 h6"/>',
    "CROSS": '<path d="M10 2 h4 v6 h6 v4 h-6 v10 h-4 v-10 h-6 v-4 h6 Z"/>',
    "HEART": '<path d="M12 21 C4 14 2 10 2 7 a5 5 0 0 1 10 -1 a5 5 0 0 1 10 1 c0 3 -2 7 -10 14 Z"/>',
    "KEY": '<circle cx="7" cy="12" r="4.5"/><path d="M11.5 12 H22 M18 12 v4 M21 12 v3"/>',
    "SHEEP": '<path d="M5 14 a4 4 0 0 1 2 -7 a4 4 0 0 1 7 -1 a4 4 0 0 1 6 4 a3 3 0 0 1 -2 5 Z"/><path d="M8 15 v5 M15 15 v5"/><circle cx="4" cy="11" r="2.4"/>',
    "CHURCH": '<path d="M12 1 v5 M10 3 h4"/><path d="M6 11 L12 6 L18 11 V22 H6 Z"/><path d="M10 22 v-5 h4 v5"/>',
    "SUN": '<circle cx="12" cy="12" r="5"/><path d="M12 1v3 M12 20v3 M1 12h3 M20 12h3 M4 4l2 2 M18 18l2 2 M4 20l2 -2 M18 6l2 -2"/>',
    "CROWN": '<path d="M3 19 L4 7 L8.5 12 L12 4 L15.5 12 L20 7 L21 19 Z"/><path d="M3 21.5 h18"/>',
    "BREAD": '<path d="M3 12 a9 6 0 0 1 18 0 v8 H3 Z"/><path d="M8 10 l2 3 M12 9 l2 3 M16 10 l1.5 2.5"/>',
    "CUP": '<path d="M6 3 h12 c0 7 -3 9 -6 9 c-3 0 -6 -2 -6 -9 Z"/><path d="M12 12 v7 M8 21 h8"/>',
}
def icon(name, icons, size=22):
    return (f'<svg viewBox="0 0 24 24" width="{size}" height="{size}" fill="none" stroke="#000" '
            f'stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">{icons[name]}</svg>')

# ---------------- Maze: 15x10 recursive backtracker (the size/difficulty the kids like) ----------------
MW, MH, CS = 15, 10, 17
D = {"N": (0, -1, "S"), "S": (0, 1, "N"), "E": (1, 0, "W"), "W": (-1, 0, "E")}
def make_maze(rng, MW=MW, MH=MH):
    walls = {(x, y): {"N", "S", "E", "W"} for x in range(MW) for y in range(MH)}
    stack, seen = [(0, 0)], {(0, 0)}
    while stack:
        x, y = stack[-1]
        opts = [(k, x + dx, y + dy, o) for k, (dx, dy, o) in D.items()
                if 0 <= x + dx < MW and 0 <= y + dy < MH and (x + dx, y + dy) not in seen]
        if not opts:
            stack.pop(); continue
        k, nx, ny, o = rng.choice(opts)
        walls[(x, y)].discard(k); walls[(nx, ny)].discard(o)
        seen.add((nx, ny)); stack.append((nx, ny))
    walls[(0, 0)].discard("W"); walls[(MW - 1, MH - 1)].discard("E")
    return walls

def maze_svg(walls, MW=MW, MH=MH, cls="maze"):
    seg = []
    for (x, y), ws in walls.items():
        X, Y = 2 + x * CS, 2 + y * CS
        if "N" in ws: seg.append(f"M{X} {Y}h{CS}")
        if "W" in ws: seg.append(f"M{X} {Y}v{CS}")
        if y == MH - 1 and "S" in ws: seg.append(f"M{X} {Y+CS}h{CS}")
        if x == MW - 1 and "E" in ws: seg.append(f"M{X+CS} {Y}v{CS}")
    return (f'<svg viewBox="0 0 {MW*CS+4} {MH*CS+4}" class="{cls}"><path d="{" ".join(seg)}" '
            f'stroke="#000" stroke-width="2.2" stroke-linecap="square" fill="none"/></svg>')

# ---------------- Word search: 8x8, right/down only ----------------
N = 8
def make_search(rng, words, N=N):
    for _ in range(2000):
        g = [[None] * N for _ in range(N)]
        ok = True
        for w in sorted(words, key=len, reverse=True):
            for _ in range(300):
                dx, dy = rng.choice([(1, 0), (0, 1)])
                x, y = rng.randrange(N - (len(w) - 1) * dx), rng.randrange(N - (len(w) - 1) * dy)
                cells = [(x + i * dx, y + i * dy) for i in range(len(w))]
                if all(g[cy][cx] is None for cx, cy in cells):
                    for i, (cx, cy) in enumerate(cells): g[cy][cx] = w[i]
                    break
            else:
                ok = False; break
        if ok:
            for r in g:
                for i, c in enumerate(r):
                    if c is None: r[i] = rng.choice("BCEKMQRTUVWXZ")
            return g
    raise SystemExit("word search: could not place words (use <=6 words, each <=8 letters)")

def search_table(g):
    return '<table class="ws">' + "".join(
        "<tr>" + "".join(f"<td>{c}</td>" for c in row) + "</tr>" for row in g) + "</table>"

# ---------------- Dot to dot: points in a 210x125 box ----------------
def dots_svg(pts, extras="", sc=1.3):
    P = [(x * sc + 10, y * sc + 14) for x, y in pts]
    s = f'<svg viewBox="0 0 {int(210*sc)+20} {int(125*sc)+26}" class="dots">'
    s += f'<g transform="translate(10 14) scale({sc})" fill="none" stroke="#000" stroke-width="1.2">{extras}</g>'
    for i, (x, y) in enumerate(P, 1):
        s += f'<circle cx="{x}" cy="{y}" r="3"/>'
        ty = y + 13 if y > 100 * sc else y - 5
        s += f'<text x="{x+4}" y="{ty}" font-size="12" font-weight="700">{i}</text>'
    return s + "</svg>"

def trace_svg(lines):
    ys = [36, 78][:len(lines)]
    longest = max(len(l) for l in lines)
    fs = min(34, int(224 / (longest * 0.7)))  # bold DejaVu is about 0.7em per letter
    w = int(min(240, max(110, longest * fs * 0.7 + 16)))  # short lines get a narrower box, so bigger letters
    t = "".join(f'<text x="{w // 2}" y="{y}">{escape(l)}</text>' for l, y in zip(lines, ys))
    return (f'<svg viewBox="0 0 {w} {ys[-1]+6}" class="trace" font-size="{fs}" font-weight="800" '
            f'font-family="DejaVu Sans, sans-serif" fill="none" stroke="#666" stroke-width="1.3" '
            f'stroke-dasharray="2.5 2" text-anchor="middle">{t}</svg>')

def count_svg(rng, names, icons):
    """'Count It!' box: icons scattered on a grid, then a row of 'icon = [ ]' answer boxes."""
    counts = rng.sample(range(2, 7), len(names))
    cells = rng.sample([(c, r) for c in range(8) for r in range(3)], sum(counts))
    items = [n for n, k in zip(names, counts) for _ in range(k)]
    s = ('<svg viewBox="0 0 300 200" class="color" fill="none" stroke="#000" stroke-width="1.8" '
         'stroke-linejoin="round" stroke-linecap="round">')
    for n, (c, r) in zip(items, cells):
        x, y = 4 + c * 37 + rng.uniform(-3, 3), 4 + r * 41 + rng.uniform(-3, 3)
        s += f'<svg x="{x:.1f}" y="{y:.1f}" width="31" height="31" viewBox="0 0 24 24">{icons[n]}</svg>'
    s += '<path d="M0 134 H300" stroke-dasharray="4 4" stroke-width="1"/>'
    w = 300 / len(names)
    for i, n in enumerate(names):
        x = i * w + w / 2 - 33
        s += (f'<svg x="{x:.1f}" y="150" width="26" height="26" viewBox="0 0 24 24">{icons[n]}</svg>'
              f'<text x="{x+29:.1f}" y="170" font-size="16" font-weight="800" fill="#000" stroke="none">=</text>'
              f'<rect x="{x+41:.1f}" y="145" width="26" height="34" rx="4"/>')
    return s + "</svg>"

def color_svg(inner):
    return (f'<svg viewBox="0 0 300 200" class="color" fill="none" stroke="#000" stroke-width="2" '
            f'stroke-linejoin="round" stroke-linecap="round">{inner}</svg>')

CSS = """
@page { size: letter; margin: 0.35in; }
* { box-sizing: border-box; }
body { margin: 0; font-family: 'DejaVu Sans', sans-serif; color: #000; background: #fff; font-size: 11px; }
.page { width: 7.8in; height: 10.25in; display: flex; flex-direction: column; gap: 6px; overflow: hidden; }
header { border: 3px solid #000; border-radius: 10px; padding: 5px 12px; display: flex; justify-content: space-between; align-items: center; }
header h1 { margin: 0; font-size: 22px; letter-spacing: .5px; }
header .sub { font-size: 10.5px; margin-top: 1px; }
header .name { font-size: 14px; white-space: nowrap; }
.row { display: flex; gap: 6px; }
.box { border: 2px solid #000; border-radius: 8px; padding: 5px 8px; flex: 1; display: flex; flex-direction: column; min-width: 0; }
.box h2 { margin: 0 0 4px; font-size: 13px; text-transform: uppercase; letter-spacing: .6px; border-bottom: 1.5px solid #000; padding-bottom: 2px; }
.hint { font-size: 10px; margin: 0 0 3px; }
.listen { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 14px; }
.li { display: flex; align-items: center; gap: 6px; }
.li .w { font-size: 13px; font-weight: 800; width: 68px; }
.li .c { display: flex; gap: 3px; }
.li .c span { width: 17px; height: 17px; border: 1.6px solid #000; border-radius: 50%; }
.psalters { display: flex; gap: 6px; margin-top: 7px; font-size: 13px; align-items: center; flex-wrap: wrap; }
.psalters span { border: 1.6px solid #000; border-radius: 4px; padding: 1px 7px; font-weight: 700; }
.psalters span::before { content: "\\2610  "; font-weight: 400; }
.verse { text-align: center; }
.trace { width: 100%; height: auto; max-height: 84px; }
.mazewrap { display: flex; align-items: stretch; justify-content: center; gap: 4px; }
.maze { height: 178px; width: auto; }
.ml { display: flex; flex-direction: column; align-items: center; font-size: 10px; font-weight: 800; text-align: center; width: 40px; }
.ml.s { justify-content: flex-start; }
.ml.e { justify-content: flex-end; }
table.ws { border-collapse: collapse; margin: 2px auto; }
table.ws td { width: 25px; height: 22px; text-align: center; font-size: 17px; font-weight: 800; font-family: 'DejaVu Sans Mono', monospace; padding: 0; border: 1px solid #bbb; }
.words { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px 6px; margin-top: 4px; }
.words div { display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 800; }
.color { width: 100%; height: 182px; }
.cap { text-align: center; font-size: 10px; font-style: italic; margin-top: 2px; }
.dots { width: 100%; height: 165px; }
.q { font-size: 12px; line-height: 2.1; margin: 0; padding-left: 16px; }
"""

def build(s):
    rng = random.Random(s.get("seed", 1))
    icons = {**ICONS, **s.get("icons", {})}
    walls = make_maze(rng)
    g = make_search(rng, [w["word"] for w in s["search"]])
    listen = "".join(
        f'<div class="li">{icon(w["icon"], icons, 26)}<span class="w">{escape(w["label"])}</span>'
        f'<span class="c">{"<span></span>" * 8}</span></div>' for w in s["listen"])
    words = "".join(f'<div>{icon(w["icon"], icons, 20)}{escape(w["word"])}</div>' for w in s["search"])
    psalters = "".join(f"<span>{escape(p)}</span>" for p in s["psalters"])
    qs = "".join(f"<li>{q}</li>" for q in s["questions"])
    m, c1, d = s["maze"], s["color1"], s["dots"]
    if "count" in s:
        ct = s["count"]
        second = (f'<h2>{escape(ct.get("title", "Count It!"))}</h2>'
                  f'<div class="hint">Count each picture. Write how many in the box!</div>'
                  f'{count_svg(rng, ct["icons"], icons)}')
    else:
        c2 = s["color2"]
        second = f'<h2>{escape(c2["title"])}</h2>{color_svg(c2["svg"])}<div class="cap">{escape(c2["caption"])}</div>'

    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{escape(s["title"])}</title>
<style>{CSS}</style></head><body><div class="page">
<header>
  <div><h1>{escape(s["title"])}</h1><div class="sub"><b>{escape(s["service"])}</b> &middot; {escape(s["passage"])}</div></div>
  <div class="name">Name: ________________</div>
</header>
<div class="row">
  <div class="box" style="flex:0 0 auto">
    <h2>Listening Game</h2>
    <div class="hint">Every time you hear the word, color in one circle! Which one wins?</div>
    <div class="listen">{listen}</div>
    <div class="psalters"><b>Check off the Psalters we sing:</b>{psalters}</div>
  </div>
  <div class="box verse">
    <h2>{escape(s["verse"]["ref"])}</h2>
    <div class="hint">Trace the letters!</div>
    {trace_svg(s["verse"]["lines"])}
  </div>
</div>
<div class="row">
  <div class="box">
    <h2>{escape(m["title"])}</h2>
    <div class="mazewrap">
      <div class="ml s">{icon(m["start_icon"], icons, 28)}{escape(m["start_label"])}<br>&rarr;</div>
      {maze_svg(walls)}
      <div class="ml e">&rarr;<br>{icon(m["end_icon"], icons, 28)}{escape(m["end_label"])}</div>
    </div>
    <div class="cap">{escape(m["caption"])}</div>
  </div>
  <div class="box">
    <h2>Find the Words</h2>
    {search_table(g)}
    <div class="words">{words}</div>
  </div>
</div>
<div class="row">
  <div class="box"><h2>{escape(c1["title"])}</h2>{color_svg(c1["svg"])}<div class="cap">{escape(c1["caption"])}</div></div>
  <div class="box">{second}</div>
</div>
<div class="row" style="flex:1">
  <div class="box">
    <h2>Connect the Dots 1&ndash;{len(d["points"])}</h2>
    {dots_svg(d["points"], d.get("extras_svg", ""))}
    <div class="cap">{escape(d["caption"])}</div>
  </div>
  <div class="box"><h2>Can You Answer?</h2><ol class="q">{qs}</ol></div>
</div>
</div></body></html>"""

# ---------------- "Big maze" layout: full-width harder maze, big tracing words ----------------
def solution_len(walls, MW, MH):
    from collections import deque
    prev, q = {(0, 0)}, deque([((0, 0), 1)])
    while q:
        c, n = q.popleft()
        if c == (MW - 1, MH - 1):
            return n
        for k, (dx, dy, _) in D.items():
            nb = (c[0] + dx, c[1] + dy)
            if k not in walls[c] and nb in walls and nb not in prev:
                prev.add(nb); q.append((nb, n + 1))
    return 0

def trace_words_svg(words, icons):
    """Big dotted words to trace, one per line, each with its picture and a writing line."""
    rows = []
    for i, w in enumerate(words):
        y = i * 66
        rows.append(f'<svg x="0" y="{y+14}" width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#000" '
                    f'stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round">{icons[w["icon"]]}</svg>'
                    f'<path d="M44 {y+56} H356" stroke="#000" stroke-width="1.2"/>'
                    f'<path d="M44 {y+20} H356" stroke="#aaa" stroke-width="0.8" stroke-dasharray="4 4"/>'
                    f'<text x="48" y="{y+55}" font-size="50" font-weight="800" letter-spacing="6" '
                    f'font-family="DejaVu Sans, sans-serif" fill="none" stroke="#555" stroke-width="1.6" '
                    f'stroke-dasharray="3 2.5">{escape(w["word"])}</text>')
    return f'<svg viewBox="0 0 360 {len(words)*66}" class="tw">{"".join(rows)}</svg>'

CSS_BIG = """
.bigmaze { width: 100%; height: auto; display: block; }
.mazebig { display: flex; align-items: stretch; gap: 6px; }
.mazebig .ml { width: 46px; font-size: 11px; }
.tw { width: 100%; height: auto; max-height: 190px; }
table.ws9 td { width: 26px; height: 19px; font-size: 16px; }
.words4 { grid-template-columns: repeat(4, 1fr); }
.color.sm { height: 132px; }
"""

def build_bigmaze(s):
    rng = random.Random(s.get("seed", 1))
    icons = {**ICONS, **s.get("icons", {})}
    m = s["maze"]
    mw, mh = m.get("cols", 22), m.get("rows", 9)
    walls = max((make_maze(rng, mw, mh) for _ in range(30)), key=lambda w: solution_len(w, mw, mh))
    g = make_search(rng, [w["word"] for w in s["search"]], s.get("search_size", 9))
    listen = "".join(
        f'<div class="li">{icon(w["icon"], icons, 26)}<span class="w">{escape(w["label"])}</span>'
        f'<span class="c">{"<span></span>" * 8}</span></div>' for w in s["listen"])
    words = "".join(f'<div>{icon(w["icon"], icons, 20)}{escape(w["word"])}</div>' for w in s["search"])
    psalters = "".join(f"<span>{escape(p)}</span>" for p in s["psalters"])
    qs = "".join(f"<li>{q}</li>" for q in s["questions"])
    c1 = s["color1"]
    table = search_table(g).replace('class="ws"', 'class="ws ws9"')
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{escape(s["title"])}</title>
<style>{CSS}{CSS_BIG}</style></head><body><div class="page">
<header>
  <div><h1>{escape(s["title"])}</h1><div class="sub"><b>{escape(s["service"])}</b> &middot; {escape(s["passage"])}</div></div>
  <div class="name">Name: ________________</div>
</header>
<div class="row">
  <div class="box">
    <h2>Listening Game</h2>
    <div class="hint">Every time you hear the word, color in one circle! Which one wins?</div>
    <div class="listen">{listen}</div>
    <div class="psalters"><b>Check off the Psalters we sing:</b>{psalters}</div>
  </div>
</div>
<div class="row">
  <div class="box">
    <h2>{escape(m["title"])}</h2>
    <div class="mazebig">
      <div class="ml s">{icon(m["start_icon"], icons, 32)}{escape(m["start_label"])}<br>&rarr;</div>
      <div style="flex:1">{maze_svg(walls, mw, mh, "bigmaze")}</div>
      <div class="ml e">&rarr;<br>{icon(m["end_icon"], icons, 32)}{escape(m["end_label"])}</div>
    </div>
    <div class="cap">{escape(m["caption"])}</div>
  </div>
</div>
<div class="row">
  <div class="box"><h2>Trace the Big Words</h2>{trace_words_svg(s["trace_words"], icons)}</div>
  <div class="box"><h2>Find the Words</h2>{table}<div class="words words4">{words}</div></div>
</div>
<div class="row" style="flex:1">
  <div class="box"><h2>{escape(c1["title"])}</h2>{color_svg(c1["svg"]).replace('class="color"', 'class="color sm"')}<div class="cap">{escape(c1["caption"])}</div></div>
  <div class="box"><h2>Can You Answer?</h2><ol class="q">{qs}</ol></div>
</div>
</div></body></html>"""

# ---------------- "Puzzle" layout: bingo, shadows, round maze, color-by-number, spot the difference ----------------
import math

def round_maze_svg(rng, rings=8, w=14, r0=16):
    """Circular maze: start at the gap on the outside, finish in the middle."""
    counts = [8]
    for i in range(2, rings + 1):
        r_in = r0 + (i - 1) * w
        counts.append(counts[-1] * 2 if 2 * math.pi * r_in / counts[-1] > 1.9 * w else counts[-1])
    def nbrs(i, j):
        c = counts[i - 1]
        out = [(i, (j + 1) % c), (i, (j - 1) % c)]
        out.append((0, 0) if i == 1 else (i - 1, j * counts[i - 2] // c))
        if i < rings:
            nc = counts[i]
            out += [(i + 1, j * 2), (i + 1, j * 2 + 1)] if nc == 2 * c else [(i + 1, j)]
        return out
    start = (rings, 0)
    links, seen, stack = set(), {start}, [start]
    while stack:
        cur = stack[-1]
        opts = [n for n in (nbrs(*cur) if cur != (0, 0) else [(1, j) for j in range(counts[0])]) if n not in seen]
        if cur == (0, 0) or not opts:  # the centre is a dead end (the goal), never a branch point
            stack.pop(); continue
        n = rng.choice(opts)
        links.add(frozenset((cur, n))); seen.add(n); stack.append(n)
    R = r0 + rings * w
    cx = cy = R + 4
    pt = lambda r, a: (cx + r * math.sin(a), cy - r * math.cos(a))
    d = []
    for i in range(1, rings + 1):
        c = counts[i - 1]
        r_in, r_out = r0 + (i - 1) * w, r0 + i * w
        for j in range(c):
            a0, a1 = 2 * math.pi * j / c, 2 * math.pi * (j + 1) / c
            inner = (0, 0) if i == 1 else (i - 1, j * counts[i - 2] // c)
            if frozenset(((i, j), inner)) not in links:
                (x0, y0), (x1, y1) = pt(r_in, a0), pt(r_in, a1)
                d.append(f"M{x0:.1f} {y0:.1f}A{r_in} {r_in} 0 0 1 {x1:.1f} {y1:.1f}")
            if frozenset(((i, j), (i, (j + 1) % c))) not in links:
                (x0, y0), (x1, y1) = pt(r_in, a1), pt(r_out, a1)
                d.append(f"M{x0:.1f} {y0:.1f}L{x1:.1f} {y1:.1f}")
            if i == rings and j != 0:
                (x0, y0), (x1, y1) = pt(r_out, a0), pt(r_out, a1)
                d.append(f"M{x0:.1f} {y0:.1f}A{r_out} {r_out} 0 0 1 {x1:.1f} {y1:.1f}")
    size = 2 * (R + 4)
    return size, cx, cy, r0, f'<path d="{" ".join(d)}" stroke="#000" stroke-width="2" fill="none" stroke-linecap="round"/>'

CSS_PUZ = """
.bingo { border-collapse: collapse; margin: 0 auto; }
.bingo td { width: 60px; height: 50px; border: 2px solid #000; text-align: center; vertical-align: middle; }
.bingo td.free { font-size: 11px; font-weight: 800; }
.shadows { width: 100%; height: 196px; }
.rmaze { width: 100%; height: 318px; }
.cbn { width: 100%; height: 300px; }
.key { display: flex; gap: 10px; justify-content: center; font-size: 12px; font-weight: 700; flex-wrap: wrap; }
.key span { display: inline-flex; align-items: center; gap: 4px; }
.key b { display: inline-flex; width: 18px; height: 18px; border: 1.6px solid #000; border-radius: 50%; align-items: center; justify-content: center; font-size: 11px; }
.diff { display: flex; gap: 10px; }
.diff svg { flex: 1; height: 186px; border: 1.5px solid #000; border-radius: 6px; }
.psal { font-size: 11.5px; margin-top: 3px; }
.psal span { border: 1.5px solid #000; border-radius: 4px; padding: 0 5px; margin-left: 4px; font-weight: 700; }
.psal span::before { content: "\\2610 "; font-weight: 400; }
"""

def build_puzzle(s):
    rng = random.Random(s.get("seed", 1))
    icons = {**ICONS, **s.get("icons", {})}
    # bingo: 3x3 of icons with a free middle
    b = list(s["bingo"]); rng.shuffle(b)
    cells = b[:4] + ["FREE"] + b[4:8]
    bingo = "<table class='bingo'>" + "".join(
        "<tr>" + "".join(
            f"<td class='free'>&#10013;<br>FREE</td>" if n == "FREE" else f"<td>{icon(n, icons, 34)}</td>"
            for n in cells[r * 3:r * 3 + 3]) + "</tr>" for r in range(3)) + "</table>"
    # match the shadow
    names = s["shadows"]; shuffled = names[:]
    while shuffled == names: rng.shuffle(shuffled)
    sh = '<svg viewBox="0 0 220 200" class="shadows" stroke-linejoin="round" stroke-linecap="round">'
    for k, (a, bname) in enumerate(zip(names, shuffled)):
        y = 6 + k * 48
        sh += (f'<svg x="8" y="{y}" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="1.8">{icons[a]}</svg>'
               f'<circle cx="62" cy="{y+20}" r="3.5" fill="#000"/><circle cx="160" cy="{y+20}" r="3.5" fill="#000"/>'
               f'<svg x="172" y="{y}" width="40" height="40" viewBox="0 0 24 24" fill="#000" stroke="#000" stroke-width="2.4">{icons[bname]}</svg>')
    sh += "</svg>"
    m = s["round_maze"]
    size, cx, cy, r0, mz = round_maze_svg(rng, m.get("rings", 8))
    goal = icons[m["center_icon"]]
    rmaze = (f'<svg viewBox="-30 -18 {size+60} {size+22}" class="rmaze">{mz}'
             f'<svg x="{cx-r0+3}" y="{cy-r0+3}" width="{2*r0-6}" height="{2*r0-6}" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="2">{goal}</svg>'
             f'<text x="{cx}" y="-6" font-size="12" font-weight="800" text-anchor="middle">&darr; START</text></svg>')
    cb = s["color_by_number"]
    key = "".join(f'<span><b>{n}</b>{escape(c)}</span>' for n, c in cb["key"])
    df = s["differences"]
    pa = color_svg(df["scene"] + df["only_in_first"]).replace('class="color"', '')
    pb = color_svg(df["scene"]).replace('class="color"', '')
    psal = "".join(f"<span>{escape(p)}</span>" for p in s["psalters"])
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{escape(s["title"])}</title>
<style>{CSS}{CSS_PUZ}</style></head><body><div class="page">
<header>
  <div><h1>{escape(s["title"])}</h1><div class="sub"><b>{escape(s["service"])}</b> &middot; {escape(s["passage"])}</div>
  <div class="psal"><b>Check off the Psalters:</b>{psal}</div></div>
  <div class="name">Name: ________________</div>
</header>
<div class="row">
  <div class="box"><h2>Sermon Bingo</h2><div class="hint">Hear it? Put an X on the picture! Three in a row = BINGO!</div>{bingo}</div>
  <div class="box"><h2>Match the Shadow</h2><div class="hint">Draw a line from each picture to its shadow.</div>{sh}</div>
</div>
<div class="row">
  <div class="box"><h2>{escape(m["title"])}</h2>{rmaze}<div class="cap">{escape(m["caption"])}</div></div>
  <div class="box"><h2>Color by Number</h2><div class="key">{key}</div>{color_svg(cb["svg"]).replace('class="color"', 'class="cbn"')}<div class="cap">{escape(cb["caption"])}</div></div>
</div>
<div class="row" style="flex:1">
  <div class="box"><h2>Spot {df.get("count", 5)} Differences</h2><div class="hint">Circle the {df.get("count", 5)} things missing from the second picture!</div>
  <div class="diff">{pa}{pb}</div><div class="cap">{escape(df["caption"])}</div></div>
</div>
</div></body></html>"""

# ---------------- "Dots" layout: a page of connect-the-dots ----------------
def big_dots_svg(pts, extras="", h=200, bounds=None):
    """Connect-the-dots sized from its own points; numbers sit just outside the shape."""
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    cx, cy = sum(xs) / len(xs), sum(ys) / len(ys)
    x0, y0, x1, y1 = bounds or (min(xs) - 22, min(ys) - 20, max(xs) + 22, max(ys) + 20)
    out = []
    # put each number where it's farthest from the outline's lines and the other numbers
    segs = [(pts[i], pts[(i + 1) % len(pts)]) for i in range(len(pts))]
    def seg_dist(px, py, a, b):
        (ax, ay), (bx, by) = a, b
        L = (bx - ax) ** 2 + (by - ay) ** 2 or 1
        t = max(0, min(1, ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / L))
        return math.hypot(px - ax - t * (bx - ax), py - ay - t * (by - ay))
    area = sum(a[0] * b[1] - b[0] * a[1] for a, b in segs)
    sign = 1 if area > 0 else -1
    placed = []
    for i, (x, y) in enumerate(pts, 1):
        (px, py), (nx, ny) = pts[i - 2], pts[i % len(pts)]
        ox_, oy_ = (ny - py) * sign, -(nx - px) * sign  # outward normal
        on = math.hypot(ox_, oy_) or 1
        best = None
        for k in range(16):
            ang = 2 * math.pi * k / 16
            qx, qy = x + 13 * math.cos(ang), y + 13 * math.sin(ang)
            score = min([seg_dist(qx, qy, a, b) for a, b in segs] +
                        [math.hypot(qx - ox, qy - oy) - 4 for ox, oy in placed] + [99])
            score = min(score, 9) + 4 * (math.cos(ang) * ox_ + math.sin(ang) * oy_) / on
            if best is None or score > best[0]:
                best = (score, qx, qy)
        tx, ty = best[1], best[2] + 4
        placed.append((best[1], best[2]))
        out.append(f'<circle cx="{x}" cy="{y}" r="3.2"/>'
                   f'<text x="{tx:.1f}" y="{ty:.1f}" font-size="12" font-weight="800" text-anchor="middle">{i}</text>')
    return (f'<svg viewBox="{x0} {y0} {x1-x0} {y1-y0}" style="width:100%;height:{h}px">'
            f'<g fill="none" stroke="#000" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{extras}</g>'
            f'{"".join(out)}</svg>')

def build_dots(s):
    psal = "".join(f"<span>{escape(p)}</span>" for p in s["psalters"])
    rows = ""
    for row in s["rows"]:
        boxes = "".join(
            f'<div class="box"><h2>{escape(d["title"])} &middot; 1&ndash;{len(d["points"])}</h2>'
            f'{big_dots_svg(d["points"], d.get("extras_svg", ""), d.get("height", 200), d.get("bounds"))}'
            f'<div class="cap">{escape(d["caption"])}</div></div>' for d in row)
        rows += f'<div class="row" style="flex:1">{boxes}</div>'
    return f"""<!doctype html><html><head><meta charset="utf-8"><title>{escape(s["title"])}</title>
<style>{CSS}{CSS_PUZ}</style></head><body><div class="page">
<header>
  <div><h1>{escape(s["title"])}</h1><div class="sub"><b>{escape(s["service"])}</b> &middot; {escape(s["passage"])}</div>
  <div class="psal"><b>Check off the Psalters:</b>{psal}</div></div>
  <div class="name">Name: ________________</div>
</header>
<div class="hint" style="font-size:12px;text-align:center"><b>Connect the dots from 1 to the last number, then color your pictures!</b></div>
{rows}
</div></body></html>"""

def main():
    src, out_dir = sys.argv[1], sys.argv[2]
    s = json.load(open(src))
    name = os.path.splitext(os.path.basename(src))[0]
    os.makedirs(out_dir, exist_ok=True)
    html_path = os.path.abspath(os.path.join(out_dir, name + ".html"))
    pdf_path = os.path.join(out_dir, name + ".pdf")
    open(html_path, "w").write({"big-maze": build_bigmaze, "puzzle": build_puzzle, "dots": build_dots}.get(s.get("layout"), build)(s))
    subprocess.run([CHROME, "--headless", "--no-sandbox", "--disable-gpu", "--no-pdf-header-footer",
                    f"--print-to-pdf={pdf_path}", html_path], check=True, capture_output=True)
    pages = subprocess.run(["pdfinfo", pdf_path], capture_output=True, text=True).stdout
    subprocess.run(["pdftoppm", "-r", "90", "-png", "-singlefile", pdf_path,
                    os.path.join(out_dir, name)], check=True)
    n = next((l.split()[-1] for l in pages.splitlines() if l.startswith("Pages:")), "?")
    print(f"{pdf_path}  pages={n}  preview={os.path.join(out_dir, name)}.png")
    if n != "1":
        print("WARNING: sheet spills onto more than one page; shorten content", file=sys.stderr)

if __name__ == "__main__":
    main()
