#!/usr/bin/env python3
"""Embed the Latin Modern faces (Knuth's Computer Modern, via GUST) as data-URI FontFaces."""
import base64, os
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LM = "/usr/share/texmf/fonts/opentype/public/lm/"
faces = [("LMRoman", "lmroman10-regular.otf", "normal"), ("LMRoman", "lmroman10-italic.otf", "italic"), ("LMMono", "lmmono10-regular.otf", "normal")]
with open(os.path.join(ROOT, "src", "fonts.js"), "w") as f:
    f.write("// Latin Modern (GUST Font License) embedded as data URIs — the typeface of TeX and of The Art of Computer Programming\n")
    f.write("window.FONTS_READY = Promise.all([\n")
    for fam, fn, style in faces:
        b = base64.b64encode(open(LM + fn, "rb").read()).decode()
        f.write(f'  new FontFace("{fam}", "url(data:font/otf;base64,{b})", {{ style: "{style}" }}),\n')
    f.write("].map((ff) => ff.load().then((x) => { document.fonts.add(x); return x; }).catch(() => null)));\n")
print(os.path.getsize(os.path.join(ROOT, "src", "fonts.js")) // 1024, "KB")
