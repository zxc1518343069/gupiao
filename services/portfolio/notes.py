"""Portfolio notes and tag parsing."""

import json


def normalize_tags(tags: list[str] | None) -> list[str]:
    """清洗标签值，去重并保留用户输入顺序。"""
    if not tags:
        return []

    normalized_tags: list[str] = []
    seen_tags: set[str] = set()
    for tag in tags:
        cleaned_tag = str(tag or "").strip()
        if not cleaned_tag or cleaned_tag in seen_tags:
            continue
        seen_tags.add(cleaned_tag)
        normalized_tags.append(cleaned_tag)

    return normalized_tags


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
    """从股票 notes JSON 中提取结构化标签列表。"""
    parsed_notes = parse_stock_notes(notes)
    raw_tags = parsed_notes.get("tags")
    if not isinstance(raw_tags, list):
        return []

    return normalize_tags([tag for tag in raw_tags if isinstance(tag, str)])

