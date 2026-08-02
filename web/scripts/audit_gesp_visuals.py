#!/usr/bin/env python3
"""Export GESP PDF crops and website card screenshots for visual QA."""

from __future__ import annotations

import argparse
import difflib
import json
import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

import pdfplumber
import pypdfium2 as pdfium
from PIL import Image


REPO = Path(__file__).resolve().parents[2]
WEB = Path(__file__).resolve().parents[1]
PDF_ROOT = Path(r"C:\Users\sunsh\WorkBuddy\20260412143556")
DEFAULT_OUT = REPO / "exports" / "gesp-visual-audit"
PY_LEVELS = [f"GESP-{level}" for level in range(2, 9)]


@dataclass(frozen=True)
class Start:
    section: str
    number: int
    page_index: int
    top: float
    x0: float


def run(command: list[str], cwd: Path) -> str:
    result = subprocess.run(command, cwd=str(cwd), text=True, encoding="utf-8", capture_output=True, check=True)
    return result.stdout


def load_records(level: str | None) -> list[dict]:
    code = r"""
import('./src/data/gespPapers.js').then(({gespPapers}) => {
  const rows = [];
  for (const [levelKey, papers] of Object.entries(gespPapers)) {
    for (const [session, paper] of Object.entries(papers)) {
      for (const type of ['choice', 'judgment']) {
        for (const question of paper.sections?.[type]?.questions || []) {
          rows.push({
            id: question.id,
            levelKey,
            level: paper.level,
            session,
            type,
            number: question.number,
            question: question.question,
            options: question.options || {},
            answer: question.answer,
            tags: question.tags || [],
            sourceFile: paper.sourceFile
          });
        }
      }
    }
  }
  console.log(JSON.stringify(rows));
});
"""
    records = json.loads(run(["node", "-e", code], WEB))
    if level:
        records = [row for row in records if row["levelKey"] == level]
    return sorted(records, key=lambda row: (row["level"], row["session"], row["type"], row["number"]))


def pdf_index() -> dict[tuple[int, str], Path]:
    result: dict[tuple[int, str], Path] = {}
    pattern = re.compile(r"GESP_(\d{4})\u5e74(\d{1,2})\u6708_C\+\+(\d)\u7ea7\u8bd5\u9898\.pdf$")
    for pdf in PDF_ROOT.rglob("*.pdf"):
        match = pattern.match(pdf.name)
        if not match:
            continue
        year, month, level = int(match.group(1)), int(match.group(2)), int(match.group(3))
        result[(level, f"{year:04d}-{month:02d}")] = pdf
    return result


def clean_line(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def cjk_count(text: str) -> int:
    return sum(1 for char in text if "\u4e00" <= char <= "\u9fff")


def question_marker(text: str) -> tuple[int, bool] | None:
    stripped = text.strip()
    match = re.match(r"^(?:\u7b2c\s*)?([1-9]\d?)\s*(?:[.．、]|\u9898)", stripped)
    if match:
        return int(match.group(1)), True
    match = re.match(r"^([1-9]\d?)\s+(.+)$", stripped)
    if match and cjk_count(match.group(2)) >= 4:
        # PDF code listings are commonly line-numbered as ``9 int ...`` or
        # ``10 cout ...``. CJK comments can make them look like question headings.
        remainder = match.group(2).strip()
        code_line = (
            "//" in remainder
            or ";" in remainder
            or "->" in remainder
            or any(remainder.startswith(prefix) for prefix in (
                "#include", "#define", "using ", "int ", "long ", "double ",
                "float ", "char ", "bool ", "void ", "string ", "vector",
                "class ", "struct ", "for ", "while ", "if ", "else ",
                "return ", "cout", "cin", "printf", "scanf", "switch",
            ))
        )
        if code_line:
            return None
        return int(match.group(1)), False
    return None


def locate_starts(pdf_path: Path) -> list[Start]:
    starts: list[Start] = []
    expected = {"choice": 1, "judgment": 1}
    section: str | None = None
    with pdfplumber.open(str(pdf_path)) as pdf:
        for page_index, page in enumerate(pdf.pages):
            lines = page.extract_text_lines(layout=True, return_chars=False) or []
            lines.sort(key=lambda item: (item.get("top", 0), item.get("x0", 0)))
            for line in lines:
                text = clean_line(line.get("text", ""))
                compact = text.replace(" ", "")
                if "\u5355\u9009" in compact or "\u9009\u62e9\u9898" in compact:
                    section = "choice"
                if "\u5224\u65ad\u9898" in compact:
                    section = "judgment"
                if section == "judgment" and (
                    compact.startswith("\u4e09\u3001")
                    or compact.startswith("\u4e09.")
                    or compact.startswith("\u7f16\u7a0b\u9898")
                ):
                    starts.append(Start("end", 0, page_index, float(line.get("top", 0)), float(line.get("x0", 0))))
                    section = None
                if not section:
                    continue
                marker = question_marker(text)
                if not marker:
                    continue
                number, strong = marker
                if number != expected[section]:
                    continue
                if not strong and float(line.get("x0", 999)) > 120:
                    continue
                starts.append(Start(section, number, page_index, float(line.get("top", 0)), float(line.get("x0", 0))))
                expected[section] += 1
    return starts


def render_page(pdf_doc: pdfium.PdfDocument, page_index: int, scale: float) -> Image.Image:
    return pdf_doc[page_index].render(scale=scale).to_pil().convert("RGB")


def crop_region(image: Image.Image, page_width: float, page_height: float, top: float, bottom: float) -> Image.Image:
    scale_x = image.width / page_width
    scale_y = image.height / page_height
    y0 = max(0, int((top - 3) * scale_y))
    y1 = min(image.height, int((bottom + 3) * scale_y))
    return image.crop((0, y0, image.width, max(y0 + 1, y1)))


def pdf_text_for_region(pdf_pages, start: Start, end: Start | None) -> str:
    parts: list[str] = []
    for page_index in range(start.page_index, (end.page_index if end else start.page_index) + 1):
        page = pdf_pages[page_index]
        top = start.top if page_index == start.page_index else 0
        bottom = end.top if end and page_index == end.page_index else page.height
        try:
            text = page.crop((0, max(0, top - 3), page.width, min(page.height, bottom + 3))).extract_text() or ""
        except Exception:
            text = ""
        if text:
            parts.append(text)
    return "\n".join(parts)


def crop_pdf_questions(records: list[dict], pdfs: dict[tuple[int, str], Path], out_dir: Path) -> dict[str, dict]:
    out_dir.mkdir(parents=True, exist_ok=True)
    by_pdf: dict[Path, list[dict]] = {}
    for record in records:
        pdf = pdfs.get((int(record["level"]), record["session"]))
        if pdf:
            by_pdf.setdefault(pdf, []).append(record)

    results: dict[str, dict] = {}
    done = 0
    total = len(records)
    for pdf_path, group in sorted(by_pdf.items(), key=lambda item: str(item[0])):
        starts = locate_starts(pdf_path)
        start_map = {(start.section, start.number): index for index, start in enumerate(starts)}
        with pdfplumber.open(str(pdf_path)) as plumber_pdf:
            pdf_doc = pdfium.PdfDocument(str(pdf_path))
            page_images: dict[int, Image.Image] = {}
            for record in group:
                key = (record["type"], int(record["number"]))
                index = start_map.get(key)
                file_path = out_dir / f"{record['id']}.jpg"
                if index is None:
                    results[record["id"]] = {"pdfCrop": None, "pdfText": "", "flags": ["pdf_start_not_found"]}
                    done += 1
                    continue
                start = starts[index]
                end = starts[index + 1] if index + 1 < len(starts) else None
                pieces: list[Image.Image] = []
                for page_index in range(start.page_index, (end.page_index if end else start.page_index) + 1):
                    page = plumber_pdf.pages[page_index]
                    if page_index not in page_images:
                        page_images[page_index] = render_page(pdf_doc, page_index, 2.0)
                    top = start.top if page_index == start.page_index else 0
                    bottom = end.top if end and page_index == end.page_index else page.height
                    pieces.append(crop_region(page_images[page_index], page.width, page.height, top, bottom))
                height = sum(piece.height for piece in pieces)
                width = max(piece.width for piece in pieces)
                combined = Image.new("RGB", (width, height), "white")
                y = 0
                for piece in pieces:
                    combined.paste(piece, (0, y))
                    y += piece.height
                combined.save(file_path, quality=86, optimize=True)
                results[record["id"]] = {
                    "pdfCrop": str(file_path),
                    "pdfText": pdf_text_for_region(plumber_pdf.pages, start, end),
                    "flags": [],
                }
                done += 1
                if done % 50 == 0 or done == total:
                    print(f"PDF {done}/{total}", flush=True)
    return results


def strip_markdown(text: str) -> str:
    text = re.sub(r"!\[[^\]]*]\([^)]+\)", " ", text or "")
    text = re.sub(r"```[a-zA-Z0-9_-]*\n?", " ", text)
    text = text.replace("`", " ")
    return re.sub(r"\s+", " ", text).strip()


def normalized(text: str) -> str:
    text = strip_markdown(text)
    text = re.sub(r"\s+", "", text)
    text = re.sub(r"[，。；：、（）()【】\[\]{}<>《》\"'“”‘’`~!！?？.．,;:+\-*/=|_]", "", text)
    return text.lower()


def record_site_text(record: dict) -> str:
    option_text = "\n".join(f"{key}. {value}" for key, value in sorted((record.get("options") or {}).items()))
    return f"{record.get('question', '')}\n{option_text}"


def code_fence_count(text: str) -> int:
    return text.count("```")


def data_flags(record: dict, pdf_text: str, similarity: float) -> list[str]:
    site = record_site_text(record)
    flags: list[str] = []
    if "\u0050\u0044\u0046 \u4e2d\u7684\u56fe\u793a\u6216\u4ee3\u7801\u672a\u63d0\u53d6" in site:
        flags.append("placeholder")
    if re.search(r"\u7b2c\s*\d+\s*\u9875\s*/\s*\u5171|\u9898\u53f7\s*1\s*2\s*3|\u7b54\u6848\s*$", site):
        flags.append("page_noise")
    if re.search(r"[»]|(^|\s)(rold|roid|bo0l|l1st|1stA|1stB|mrt|mr)(\s|$)", site, re.I):
        flags.append("ocr_suspect_token")
    if "L\n" in site or re.search(r"(^|\n)\s*L\s*(\n|$)", site):
        flags.append("brace_as_L")
    if record["level"] <= 3 and any(tag in {"\u56fe\u8bba", "\u52a8\u6001\u89c4\u5212"} for tag in record.get("tags", [])):
        flags.append("low_level_tag_suspect")
    option_fences = sum(code_fence_count(value) for value in (record.get("options") or {}).values())
    question_fences = code_fence_count(record.get("question", ""))
    if option_fences and not question_fences and cjk_count(site) > 10:
        flags.append("option_code_block_review")
    if similarity < 0.38:
        flags.append("low_pdf_text_similarity")
    if not pdf_text.strip():
        flags.append("empty_pdf_text")
    return flags


def build_report(records: list[dict], pdf_results: dict[str, dict], web_dir: Path, out_dir: Path, level: str) -> None:
    rows = []
    for record in records:
        pdf_result = pdf_results.get(record["id"], {"pdfCrop": None, "pdfText": "", "flags": ["pdf_missing"]})
        pdf_text = pdf_result.get("pdfText", "")
        site_text = record_site_text(record)
        lhs, rhs = normalized(pdf_text), normalized(site_text)
        similarity = difflib.SequenceMatcher(None, lhs[:3000], rhs[:3000]).ratio() if lhs and rhs else 0.0
        flags = list(pdf_result.get("flags", [])) + data_flags(record, pdf_text, similarity)
        web_path = web_dir / f"{record['id']}.jpg"
        if not web_path.exists():
            flags.append("webshot_missing")
        rows.append({
            "id": record["id"],
            "level": record["levelKey"],
            "session": record["session"],
            "type": record["type"],
            "number": record["number"],
            "flags": sorted(set(flags)),
            "similarity": round(similarity, 3),
            "pdfCrop": pdf_result.get("pdfCrop"),
            "webshot": str(web_path) if web_path.exists() else None,
            "tags": record.get("tags", []),
        })

    json_path = out_dir / f"report-{level}.json"
    md_path = out_dir / f"report-{level}.md"
    json_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")

    flagged = [row for row in rows if row["flags"]]
    lines = [
        f"# GESP visual audit {level}",
        "",
        f"- Questions checked: {len(rows)}",
        f"- Flagged for review: {len(flagged)}",
        "",
        "## Flagged questions",
        "",
    ]
    if not flagged:
        lines.append("No machine-detected visual/text risks.")
    else:
        lines.append("| ID | Flags | Similarity | PDF | Website |")
        lines.append("|---|---|---:|---|---|")
        for row in flagged:
            pdf_link = Path(row["pdfCrop"]).as_posix() if row["pdfCrop"] else ""
            web_link = Path(row["webshot"]).as_posix() if row["webshot"] else ""
            lines.append(
                f"| {row['id']} | {', '.join(row['flags'])} | {row['similarity']} | "
                f"[PDF]({pdf_link}) | [Web]({web_link}) |"
            )
    lines.extend(["", "## Full index", "", "| ID | Similarity | PDF | Website |", "|---|---:|---|---|"])
    for row in rows:
        pdf_link = Path(row["pdfCrop"]).as_posix() if row["pdfCrop"] else ""
        web_link = Path(row["webshot"]).as_posix() if row["webshot"] else ""
        lines.append(f"| {row['id']} | {row['similarity']} | [PDF]({pdf_link}) | [Web]({web_link}) |")
    md_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"REPORT {level} total={len(rows)} flagged={len(flagged)} {md_path}", flush=True)


def run_webshots(level: str, web_dir: Path, base: str) -> None:
    web_dir.mkdir(parents=True, exist_ok=True)
    run(["node", "scripts/gesp_visual_webshots.mjs", "--out", str(web_dir), "--base", base, "--level", level], WEB)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--level", choices=PY_LEVELS + ["all"], default="all")
    parser.add_argument("--out", default=str(DEFAULT_OUT))
    parser.add_argument("--base", default="http://localhost:5174")
    parser.add_argument("--skip-web", action="store_true")
    args = parser.parse_args()

    out_dir = Path(args.out)
    pdf_dir = out_dir / "pdf"
    web_dir = out_dir / "web"
    out_dir.mkdir(parents=True, exist_ok=True)

    levels = PY_LEVELS if args.level == "all" else [args.level]
    pdfs = pdf_index()
    for level in levels:
        records = load_records(level)
        print(f"START {level} questions={len(records)}", flush=True)
        level_pdf_dir = pdf_dir / level
        level_web_dir = web_dir / level
        pdf_results = crop_pdf_questions(records, pdfs, level_pdf_dir)
        if not args.skip_web:
            run_webshots(level, level_web_dir, args.base)
        build_report(records, pdf_results, level_web_dir, out_dir, level)


if __name__ == "__main__":
    main()
