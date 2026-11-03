"""tools/bundle.py — build one self-contained HTML file (CSS, JS and JSON inlined).

Why: the normal game fetches JSON, which needs a web server. The bundle lets the game
be shared as a single page. Run: python3 tools/bundle.py <output.html>
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def main(out_path):
    index_html = (ROOT / "index.html").read_text(encoding="utf8")

    # Every JSON file under data/, keyed by the same relative path the game fetches.
    data = {p.relative_to(ROOT).as_posix(): json.loads(p.read_text(encoding="utf8"))
            for p in sorted((ROOT / "data").rglob("*.json"))}
    data_js = "window.UR_DATA = " + json.dumps(data, ensure_ascii=False).replace("</", "<\\/") + ";"

    scripts = re.findall(r'<script src="([^"]+)"></script>', index_html)
    js = "\n".join((ROOT / s).read_text(encoding="utf8") for s in scripts)
    css = (ROOT / "css/style.css").read_text(encoding="utf8")
    fonts = re.search(r'<link rel="stylesheet" href="(https://fonts[^"]+)">', index_html).group(1)

    page = f"""<title>Until Rooted</title>
<link rel="stylesheet" href="{fonts}">
<style>
{css}
</style>
<main id="app"><p>Loading Until Rooted…</p></main>
<script>
{data_js}
</script>
<script>
{js}
</script>
"""
    pathlib.Path(out_path).write_text(page, encoding="utf8")
    print("wrote", out_path, len(page), "bytes")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "until-rooted.html")
