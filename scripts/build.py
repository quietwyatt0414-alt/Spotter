"""Build the website into public/ (what Firebase Hosting serves).

  public/index.html        the app with Google sign-in   = app/index.html + firebase/host.html
  public/demo/index.html   the demo with 5 months of data = app/index.html + app/demo-data.html
  public/stats/index.html  owner-only analytics + feedback page = firebase/stats.html
  public/config.js, sw.js, manifest.webmanifest, icons/   copied from firebase/
  public/privacy/, public/terms/, public/legal.css         copied from legal/
  public/about/            the landing page (what Spotter is, pricing, FAQ) = landing/

app/index.html is the single source for the app; it's also the exact file published on Claude.
Run:  python3 scripts/build.py
"""
import pathlib, shutil, sys

root = pathlib.Path(__file__).resolve().parent.parent
app = (root / "app" / "index.html").read_text()
marker = "<script>\n(() => {"
if app.count(marker) != 1:
    sys.exit("app/index.html: couldn't find the app script marker")

def inject(block_path, title=None):
    html = app.replace(marker, (root / block_path).read_text() + marker, 1)
    if title:
        html = html.replace("<title>Spotter — Workout Tracker</title>", f"<title>{title}</title>", 1)
    return html

pub = root / "public"
if pub.exists():
    shutil.rmtree(pub)
(pub / "demo").mkdir(parents=True)
(pub / "stats").mkdir()
(pub / "index.html").write_text(inject("firebase/host.html"))
(pub / "demo" / "index.html").write_text(inject("app/demo-data.html", "Spotter — Demo Data"))
shutil.copy(root / "firebase" / "stats.html", pub / "stats" / "index.html")
for f in ["config.js", "sw.js", "manifest.webmanifest"]:
    shutil.copy(root / "firebase" / f, pub / f)
shutil.copytree(root / "firebase" / "icons", pub / "icons")
for page in ["privacy", "terms"]:
    src = (root / "legal" / f"{page}.html").read_text()
    guesses = src.count('class="review"')
    if guesses:
        print(f"note: legal/{page}.html still has {guesses} highlighted guesses to review")
    (pub / page).mkdir()
    (pub / page / "index.html").write_text(src)
shutil.copy(root / "legal" / "legal.css", pub / "legal.css")
shutil.copytree(root / "landing", pub / "about")

cfg = (root / "firebase" / "config.js").read_text()
if "PASTE_" in cfg or "YOUR_PROJECT_ID" in cfg:
    print("note: firebase/config.js still has placeholders, so sign-in shows a setup message until it's filled in")
print("built", ", ".join(str(p.relative_to(root)) for p in sorted(pub.rglob("*.html"))))
