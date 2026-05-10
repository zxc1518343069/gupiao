"""标签与备注字段相关工具。"""

import json
import re
from collections import Counter, defaultdict

from fastapi import HTTPException
from sqlalchemy.orm import Session

from database import PortfolioTagDefinition, SelfSelectedStock
from services.portfolio.constants import DEFAULT_TAG_DEFINITIONS
from services.portfolio.notes import (
    get_stock_tags,
    normalize_tags,
    parse_stock_notes,
)
from services.stock_metadata import get_stock_name


def normalize_tag_name(tag: str | None) -> str:
    """清洗标签名称，统一去掉首尾空白。"""
    if tag is None:
        return ""
    return str(tag).strip()


def normalize_tag_color(color: str | None) -> str:
    """校验标签颜色，当前只接受标准 6 位十六进制颜色。"""
    cleaned_color = str(color or "").strip()
    if not re.fullmatch(r"#[0-9a-fA-F]{6}", cleaned_color):
        raise HTTPException(status_code=400, detail="Invalid tag color")
    return cleaned_color.lower()


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
    """读取标签定义，并在首次使用时初始化默认标签。"""
    ensure_default_tag_definitions(db)
    return db.query(PortfolioTagDefinition).order_by(PortfolioTagDefinition.id.asc()).all()


def serialize_tag_definition(
    definition: PortfolioTagDefinition,
    usage_count: int = 0,
) -> dict:
    """把标签定义模型转换为前端展示结构。"""
    return {
        "id": definition.id,
        "name": definition.name,
        "color": definition.color,
        "usage_count": usage_count,
        "created_at": definition.created_at,
    }


def serialize_stock_notes(notes: str | None, tags: list[str]) -> str | None:
    """把原备注文本和标签列表重新序列化为 notes JSON。"""
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
    """统计标签使用次数，并为每个标签保留最多 5 只股票作为预览。"""
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
    """标签定义改名后，同步所有股票 notes 中的同名标签。"""
    if old_name == new_name:
        return

    for stock in db.query(SelfSelectedStock).all():
        current_tags = get_stock_tags(stock.notes)
        if old_name not in current_tags:
            continue

        next_tags = [new_name if tag == old_name else tag for tag in current_tags]
        stock.notes = serialize_stock_notes(stock.notes, next_tags)
