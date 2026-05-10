"""策略条件文本的基础解析工具。"""

import re


def parse_percent_value(condition: str) -> float | None:
    """从条件文本中提取单个百分比数值。"""
    matched = re.search(r"([0-9]+(?:\.[0-9]+)?)\s*%", condition)
    if not matched:
        return None

    try:
        return float(matched.group(1))
    except ValueError:
        return None


def find_condition(conditions: list[str], prefix: str) -> str:
    """按中文前缀查找策略条件。"""
    return next((condition for condition in conditions if condition.startswith(prefix)), "")


def parse_percent_range_value(condition: str) -> tuple[float, float] | None:
    """解析形如 -1%~5% 的阈值区间。"""
    matched = re.search(
        r"(-?[0-9]+(?:\.[0-9]+)?)\s*%\s*[~～]\s*(-?[0-9]+(?:\.[0-9]+)?)\s*%",
        condition,
    )
    if not matched:
        return None

    try:
        return float(matched.group(1)), float(matched.group(2))
    except ValueError:
        return None


def parse_labeled_values(
    conditions: list[str],
    prefix: str,
    mapping: dict[str, str],
) -> list[str]:
    """把条件文本中的中文枚举值翻译为规则枚举值。"""
    matched_condition = find_condition(conditions, prefix)
    if not matched_condition:
        return []

    separator_index = matched_condition.find("：")
    if separator_index < 0:
        return []

    content = matched_condition[separator_index + 1 :].strip()
    labels = [item.strip() for item in content.split("、")]
    values = [mapping[label] for label in labels if label in mapping]
    return list(dict.fromkeys(values))


def parse_action_values(action: str, mapping: dict[str, str]) -> list[str]:
    """解析操作字段，兼容带“操作：”前缀的旧展示文本。"""
    normalized_action = normalize_action_display(action)
    labels = [item.strip() for item in normalized_action.split("、")]
    values = [mapping[label] for label in labels if label in mapping]
    return list(dict.fromkeys(values))


def normalize_action_display(action: str) -> str:
    """去掉展示文本里的中文前缀，只保留操作内容。"""
    return action.split("：", 1)[1].strip() if "：" in action else action.strip()
