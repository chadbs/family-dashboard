---
name: church-worksheet
description: Make the kids' one-page black-and-white church worksheets (morning and evening) from the Byron Center PRC bulletin email, and email them as printable PDFs. Use when asked for a church worksheet, Sunday worksheet, or kids' sermon sheet.
---

# Kids' church worksheets

One printable letter page per service, black and white, for kids who **can't read yet**.
The layout is fixed by `church-worksheet/make_sheet.py`; each week you only write a JSON file of
content per service. `church-worksheet/sheets/2026-10-18-pm.json` is the approved example — copy its shape.

## What the family wants (don't change without being asked)

- One page per service. **No answer key.**
- Listening game: 4 words with little pictures, kids color a circle each time they hear one. Always include GOD.
- "Check off the Psalters we sing" boxes, using the exact Psalter numbers from the bulletin.
- Maze is 15x10 (built in). Don't make it bigger or harder.
- Word search: 6 short words (each 8 letters or fewer), each with a picture clue. Right/down only (built in).
- Two coloring pictures, a connect-the-dots picture, and 5 "Can You Answer?" questions a parent reads aloud.
- Memory verse to trace: 1-2 short lines (13 characters or fewer per line looks best).
- Reformed (Protestant Reformed Churches). Quote KJV only. **Never draw God or Jesus** (second commandment):
  use symbols like a crown, cross, Bible, or light. People in the passage (Jonah, David, sailors) are fine.
  Teach sovereign grace in simple words: God saves; we can't save ourselves.

## Steps

1. **Find the bulletin.** Gmail search `from:church-news@byronprc.org bulletin newer_than:4d`. It arrives
   Friday or Saturday. Read the thread. The plain-text body has "Here (<link>) is the bulletin for Sunday, ...".
   Download that link into a new empty directory: `curl -sSL -o bulletin.pdf "<link>"`, then
   `pdftotext -layout bulletin.pdf -`.
2. **Read both services** from the bulletin's top section: morning (9:30 AM) and evening (5:00 PM). Each has
   the preacher, sermon title, points (I, II, III), Scripture reading, text, and Psalter numbers. The morning
   is often a Heidelberg Catechism Lord's Day: use the Scripture reading for the pictures and stories, and
   explain the Lord's Day idea in kid words. Read the Bible passages (KJV) so the questions and captions are accurate.
3. **Write two JSON files** in `church-worksheet/sheets/`: `YYYY-MM-DD-am.json` and `YYYY-MM-DD-pm.json`.
   - `seed`: the date as a number (e.g. 20261025), plus 1 for the evening one, so the mazes differ.
   - `service`: e.g. "Morning Worship · Sunday, October 25, 2026". `passage`: the text.
   - `title`: short and kid-friendly, based on the sermon theme.
   - Icons: built-ins are GOD, FISH, PERSON, PRAY, SEA, LAND, BIBLE, CROSS, HEART, KEY, SHEEP, CHURCH, SUN,
     CROWN, BREAD, CUP. Add new ones under `"icons": {"NAME": "<svg inner markup, 24x24 viewBox, line art>"}`.
   - `color1` / `color2`: draw **new** line-art SVG for this passage (inner markup only; viewBox is 300x200,
     stroke black, no fill). Keep shapes big and simple with large areas to color, and avoid tiny detail.
   - `dots.points`: 14-22 points in a 210x125 box tracing a simple outline (an animal, an ark, a crown, a lamp).
     `extras_svg` can pre-draw small details (like an eye) in the same coordinates.
   - `questions`: 5 questions. Mix fill-in blanks with picture-free checkbox choices (`&#9744;`).
     Simple HTML like `<b>` is allowed.
4. **Render and check:** `python3 church-worksheet/make_sheet.py church-worksheet/sheets/<file>.json <out_dir>`.
   It must print `pages=1`. Open the PNG preview and look at it. Fix overlaps, clipped text, or ugly art, then render again.
5. **Deliver.** Email both PDFs to chadsolanyk@gmail.com with the Gmail send tool (base64 the PDFs into
   `attachments`, mimeType application/pdf). Subject: "Kids' church worksheets – Sunday, <Month D>". Put the two
   sermon titles in the body. If this is an interactive session, also show the PDFs to the user.

If no bulletin email is found, email chadsolanyk@gmail.com a one-line note saying so, and don't guess the sermons.
