"""标签与备注字段相关工具。"""

import json
import re
from collections import Counter, defaultdict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from database import PortfolioTagDefinition, SelfSelectedStock
from services.stock_metadata import get_stock_name

from ..constants import DEFAULT_TAG_DEFINITIONS


def normalize_tag_name(tag: str | None) -> str:
    if tag is None:
        return ""
    return str(tag).strip()


def normalize_tag_color(color: str | None) -> str:
    cleaned_color = str(color or "").strip()
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", cleaned_color):
        raise HTTPException(status_code=400, detail="Invalid tag color")
    return cleaned_color.lower()


def normalize_tags(tags: list[str] | None) -> list[str]:
    """清洗标签值，去重并保留用户输入顺序。"""
    if not tags:
        return []

    normalized_tags: list[str] = []
    seen_tags: set[str] = set()

    for tag in tags:
        cleaned_tag = normalize_tag_name(tag)
        if not cleaned_tag or cleaned_tag in seen_tags:
            continue
        seen_tags.add(cleaned_tag)
        normalized_tags.append(cleaned_tag)

    return normalized_tags


def ensure_default_tag_definitions(db: Session) -> None:
    """首次启用标签功能时，自动灌入一组基础标签。"""
    if db.query(PortfolioTagDefinition).count() > 0:
        return

    for definition in DEFAULT_TAG_DEFINITIONS:
        db.add(
            PortfolioTagDefinition(
                name=definition["name"],
                color=definition["color"],
            )
        )
    db.commit()


def get_tag_definitions(db: Session) -> list[PortfolioTagDefinition]:
    ensure_default_tag_definitions(db)
    return db.query(PortfolioTagDefinition).order_by(PortfolioTagDefinition.id.asc()).all()


def serialize_tag_definition(
    definition: PortfolioTagDefinition,
    usage_count: int = 0,
) -> dict:
    return {
        "id": definition.id,
        "name": definition.name,
        "color": definition.color,
        "usage_count": usage_count,
        "created_at": definition.created_at,
    }


def parse_stock_notes(notes: str | None) -> dict:
    """兼容旧 notes 文本和新 JSON 结构。"""
    if not notes:
        return {}

    try:
        parsed = json.loads(notes)
    except json.JSONDecodeError:
        return {"text": notes.strip()}

    if isinstance(parsed, dict):
        return parsed

    if isinstance(parsed, list):
        return {"tags": [item for item in parsed if isinstance(item, str)]}

    return {}


def get_stock_tags(notes: str | None) -> list[str]:
    parsed_notes = parse_stock_notes(notes)
    raw_tags = parsed_notes.get("tags")
    if not isinstance(raw_tags, list):
        return []

    return normalize_tags([tag for tag in raw_tags if isinstance(tag, str)])


def serialize_stock_notes(notes: str | None, tags: list[str]) -> str | None:
    parsed_notes = parse_stock_notes(notes)
    payload: dict[str, object] = {}
    normalized_tags = normalize_tags(tags)

    legacy_text = parsed_notes.get("text")
    if isinstance(legacy_text, str) and legacy_text.strip():
        payload["text"] = legacy_text.strip()

    if normalized_tags:
        payload["tags"] = normalized_tags

    return json.dumps(payload, ensure_ascii=False) if payload else None


def collect_tag_usage(
    stocks: list[SelfSelectedStock],
) -> tuple[Counter[str], dict[str, list[dict[str, str]]]]:
    usage_counts: Counter[str] = Counter()
    stock_previews: dict[str, list[dict[str, str]]] = defaultdict(list)

    for stock in stocks:
        display_stock_name = get_stock_name(stock.stock_code, stock.stock_name)
        for tag in get_stock_tags(stock.notes):
            usage_counts[tag] += 1
            if len(stock_previews[tag]) >= 5:
                continue
            stock_previews[tag].append(
                {
                    "stock_code": stock.stock_code,
                    "stock_name": display_stock_name,
                }
            )

    return usage_counts, stock_previews


def rename_tag_across_portfolio(
    db: Session,
    old_name: str,
    new_name: str,
) -> None:
    if old_name == new_name:
        return

    for stock in db.query(SelfSelectedStock).all():
        current_tags = get_stock_tags(stock.notes)
        if old_name not in current_tags:
            continue

        next_tags = [new_name if tag == old_name else tag for tag in current_tags]
        stock.notes = serialize_stock_notes(stock.notes, next_tags)
