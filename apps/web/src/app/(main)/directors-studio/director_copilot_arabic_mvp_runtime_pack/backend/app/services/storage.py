from __future__ import annotations

import hashlib
import html
import json
import mimetypes
from pathlib import Path
from uuid import uuid4

from docx import Document
from fastapi import UploadFile
from pypdf import PdfReader

from app.core.config import settings


def ensure_project_dir(project_id: str) -> Path:
    project_dir = settings.storage_dir / project_id
    project_dir.mkdir(parents=True, exist_ok=True)
    return project_dir


def guess_asset_media_type(filename: str, content_type: str | None = None) -> str:
    content_type = content_type or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    if content_type.startswith("image/"):
        return "image"
    if content_type.startswith("audio/"):
        return "audio"
    if content_type.startswith("video/"):
        return "video"
    if content_type in {"application/pdf", "text/plain", "application/json"}:
        return "document"
    if filename.lower().endswith((".docx", ".md", ".txt", ".pdf", ".json")):
        return "document"
    return "other"


async def save_upload_file(project_id: str, upload: UploadFile) -> dict[str, object]:
    project_dir = ensure_project_dir(project_id)
    suffix = Path(upload.filename or "uploaded.bin").suffix
    target = project_dir / f"{uuid4()}{suffix}"
    hasher = hashlib.sha256()
    size = 0

    with target.open("wb") as out:
        while True:
            chunk = await upload.read(1024 * 1024)
            if not chunk:
                break
            out.write(chunk)
            size += len(chunk)
            hasher.update(chunk)

    return {
        "storage_uri": str(target),
        "checksum_sha256": hasher.hexdigest(),
        "byte_size": size,
        "mime_type": upload.content_type or mimetypes.guess_type(upload.filename or "")[0] or "application/octet-stream",
        "asset_media_type": guess_asset_media_type(upload.filename or "uploaded.bin", upload.content_type),
        "filename": upload.filename or target.name,
    }


def read_text_from_path(path_str: str) -> str:
    path = Path(path_str)
    if not path.exists():
        raise FileNotFoundError(path_str)

    suffix = path.suffix.lower()
    if suffix == ".pdf":
        reader = PdfReader(str(path))
        return "\n".join(page.extract_text() or "" for page in reader.pages)
    if suffix == ".docx":
        doc = Document(str(path))
        return "\n".join(p.text for p in doc.paragraphs)
    if suffix == ".json":
        try:
            return json.dumps(json.loads(path.read_text(encoding="utf-8")), ensure_ascii=False, indent=2)
        except Exception:
            return path.read_text(encoding="utf-8", errors="ignore")
    return path.read_text(encoding="utf-8", errors="ignore")


def write_json_artifact(project_id: str, filename_prefix: str, payload: dict | list) -> str:
    project_dir = ensure_project_dir(project_id)
    target = project_dir / f"{filename_prefix}_{uuid4()}.json"
    target.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return str(target)


def write_text_artifact(project_id: str, filename_prefix: str, text: str, suffix: str = ".txt") -> str:
    project_dir = ensure_project_dir(project_id)
    target = project_dir / f"{filename_prefix}_{uuid4()}{suffix}"
    target.write_text(text, encoding="utf-8")
    return str(target)


SVG_TEMPLATE = """<svg xmlns='http://www.w3.org/2000/svg' width='1280' height='720'>
<rect width='100%' height='100%' fill='#111'/>
<rect x='40' y='40' width='1200' height='640' fill='none' stroke='#ddd' stroke-width='2'/>
<text x='80' y='120' fill='#fff' font-size='32' font-family='Arial'>Storyboard Placeholder</text>
<text x='80' y='190' fill='#ddd' font-size='28' font-family='Arial'>{title}</text>
<foreignObject x='80' y='240' width='1120' height='360'>
  <div xmlns='http://www.w3.org/1999/xhtml' style='color:#ccc;font-size:24px;font-family:Arial;line-height:1.5;'>
    {body}
  </div>
</foreignObject>
</svg>
"""


def write_storyboard_svg(project_id: str, title: str, body: str) -> str:
    project_dir = ensure_project_dir(project_id)
    safe_title = html.escape(title)
    safe_body = html.escape(body).replace("\n", "<br/>")
    svg = SVG_TEMPLATE.format(title=safe_title, body=safe_body)
    target = project_dir / f"storyboard_frame_{uuid4()}.svg"
    target.write_text(svg, encoding="utf-8")
    return str(target)
