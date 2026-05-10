"""旧版策略条件文案到结构化规则的推断。"""

import re
from typing import Any

from ..constants import (
    BUY_ACTION_LABELS,
    DEFAULT_BREAKDOWN_MAX_BIAS,
    DEFAULT_BREAKDOWN_MIN_BIAS,
    DEFAULT_BREAKOUT_MAX_BIAS,
    DEFAULT_BREAKOUT_MIN_BIAS,
    DEFAULT_PULLBACK_MAX_BIAS,
    DEFAULT_PULLBACK_MIN_BIAS,
    MOVING_AVERAGE_LABELS,
    PRICE_PATTERN_LABELS,
    SELL_ACTION_LABELS,
    SELL_BREAKDOWN_LABELS,
    VOLUME_LABELS,
)
from .parsers import (
    find_condition,
    parse_action_values,
    parse_labeled_values,
    parse_percent_range_value,
    parse_percent_value,
)


def infer_buy_rule(conditions: list[str], action: str) -> dict[str, Any] | None:
    """从旧版条件文案推断买入规则结构。"""
    # 旧数据只保存中文展示文案，这里把各段文案映射回前端使用的枚举值。
    volume = parse_labeled_values(conditions, "量（或）", VOLUME_LABELS)
    price_pattern = parse_labeled_values(conditions, "形态", PRICE_PATTERN_LABELS)
    moving_averages = parse_labeled_values(conditions, "均线（或）", MOVING_AVERAGE_LABELS)
    actions = parse_action_values(action, BUY_ACTION_LABELS)
    breakout_range = parse_percent_range_value(find_condition(conditions, "突破区间"))
    pullback_range = parse_percent_range_value(find_condition(conditions, "回踩区间"))

    if not volume or not price_pattern or not moving_averages or not actions:
        return None

    breakout_min_bias, breakout_max_bias = breakout_range or (
        DEFAULT_BREAKOUT_MIN_BIAS,
        DEFAULT_BREAKOUT_MAX_BIAS,
    )
    pullback_min_bias, pullback_max_bias = pullback_range or (
        DEFAULT_PULLBACK_MIN_BIAS,
        DEFAULT_PULLBACK_MAX_BIAS,
    )

    return {
        "kind": "buy",
        "volume": volume,
        "pricePattern": price_pattern[0],
        "movingAverages": moving_averages,
        "breakoutMinBias": breakout_min_bias,
        "breakoutMaxBias": breakout_max_bias,
        "pullbackMinBias": pullback_min_bias,
        "pullbackMaxBias": pullback_max_bias,
        "actions": actions,
    }


def infer_sell_rule(conditions: list[str], action: str) -> dict[str, Any] | None:
    """从旧版条件文案推断卖出规则结构。"""
    # 卖出规则旧文案中没有完整 JSON 时，使用默认跌破阈值补齐结构。
    volume = parse_labeled_values(conditions, "量（或）", VOLUME_LABELS)
    breakdown_periods = parse_labeled_values(conditions, "跌破（或）", SELL_BREAKDOWN_LABELS)
    actions = parse_action_values(action, SELL_ACTION_LABELS)
    breakdown_range = parse_percent_range_value(find_condition(conditions, "跌破幅度"))

    if not volume or not breakdown_periods or not actions:
        return None

    breakdown_min_bias, breakdown_max_bias = breakdown_range or (
        DEFAULT_BREAKDOWN_MIN_BIAS,
        DEFAULT_BREAKDOWN_MAX_BIAS,
    )

    return {
        "kind": "sell",
        "volume": volume,
        "breakdownPeriods": breakdown_periods,
        "breakdownMinBias": breakdown_min_bias,
        "breakdownMaxBias": breakdown_max_bias,
        "actions": actions,
    }


def infer_convergence_rule(conditions: list[str]) -> dict[str, Any] | None:
    """从均线粘合条件文案推断结构化规则。"""
    moving_averages: list[str] = []
    max_spread_ratio: float | None = None
    near_price_ratio: float | None = None

    # 均线粘合旧文案不是固定枚举格式，直接从文本中提取 MA 周期和百分比。
    for condition in conditions:
        if condition.startswith("参与均线"):
            matched_periods = re.findall(r"MA\d+", condition.upper())
            moving_averages = [period.lower() for period in matched_periods]
        elif condition.startswith("区间比例"):
            max_spread_ratio = parse_percent_value(condition)
        elif condition.startswith("附近阈值"):
            near_price_ratio = parse_percent_value(condition)

    if not moving_averages:
        moving_averages = ["ma20", "ma60", "ma120"]
    if max_spread_ratio is None:
        return None
    if near_price_ratio is None:
        near_price_ratio = 1.0

    return {
        "kind": "ma_convergence",
        "movingAverages": moving_averages,
        "maxSpreadRatio": max_spread_ratio,
        "nearPriceRatio": near_price_ratio,
    }
