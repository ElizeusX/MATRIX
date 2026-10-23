#!/usr/bin/env python3
"""Read-only, cautious public-page inspection. No images or copy are downloaded."""
import argparse
import html.parser
import json
import urllib.parse
import urllib.request
import urllib.robotparser
from datetime import datetime, timezone

ROOT = "https://matrix-mebli.com"
PATHS = ["/", "/furnitures/"]
AGENT = "MatrixCatalogAudit/1.0 (metadata-only; contact site owner before asset use)"

class Extractor(html.parser.HTMLParser):
    def __init__(self):
        super().__init__()
        self.links = set()
        self.headings = []
        self.capture = False
    def handle_starttag(self, tag, attrs):
        data = dict(attrs)
        if tag == "a" and data.get("href"):
            self.links.add(urllib.parse.urljoin(ROOT, data["href"]))
        if tag in ("h1", "h2", "h3", "h4"):
            self.capture = True
    def handle_endtag(self, tag):
        if tag in ("h1", "h2", "h3", "h4"):
            self.capture = False
    def handle_data(self, data):
        if self.capture and data.strip():
            self.headings.append(data.strip())

def audit():
    robots = urllib.robotparser.RobotFileParser()
    robots.set_url(ROOT + "/robots.txt")
    try:
        robots.read()
    except Exception as exc:
        return {"error": f"Unable to verify robots policy: {exc}", "pages": []}
    report = {"source": ROOT, "timestamp_utc": datetime.now(timezone.utc).isoformat(), "pages": []}
    for path in PATHS:
        url = ROOT + path
        if not robots.can_fetch(AGENT, url):
            report["pages"].append({"url": url, "error": "robots denied"})
            continue
        try:
            request = urllib.request.Request(url, headers={"User-Agent": AGENT})
            with urllib.request.urlopen(request, timeout=12) as response:
                if "html" not in response.headers.get_content_type():
                    raise ValueError("Expected HTML response")
                raw = response.read(2_000_000).decode("utf-8", "replace")
            parser = Extractor()
            parser.feed(raw)
            report["pages"].append({"url": url, "headings": parser.headings,
                                    "links": sorted(x for x in parser.links if x.startswith(ROOT))})
        except Exception as exc:
            report["pages"].append({"url": url, "error": str(exc)})
    return report

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--output", default="source-audit.json")
    args = p.parse_args()
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(audit(), f, ensure_ascii=False, indent=2)
    print(f"Saved {args.output}")
