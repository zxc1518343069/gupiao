"""结构化策略规则清洗逻辑。"""

from typing import Any

from ..constants import (
    DEFAULT_BREAKDOWN_MAX_BIAS,
    DEFAULT_BREAKDOWN_MIN_BIAS,
    DEFAULT_BREAKOUT_MAX_BIAS,
    DEFAULT_BREAKOUT_MIN_BIAS,
    DEFAULT_PULLBACK_MAX_BIAS,
    DEFAULT_PULLBACK_MIN_BIAS,
    VALID_BUY_ACTION_VALUES,
    VALID_MOVING_AVERAGE_VALUES,
    VALID_PRICE_PATTERN_VALUES,
    VALID_SELL_ACTION_VALUES,
    VALID_SELL_BREAKDOWN_VALUES,
    VALID_VOLUME_VALUES,
)


def coerce_number(value: Any, default: float) -> float:
    """把前端传入值转成数字，失败时回退到默认阈值。"""
    try:
        parsed_value = float(value)
    except (TypeError, ValueError):
        return default

    return parsed_value


def normalize_buy_rule(rule: dict[str, Any]) -> dict[str, Any] | None:
    """清洗买入结构化规则，缺少核心字段时视为不可用。"""
    volume = [value for value in rule.get("volume", []) if value in VALID_VOLUME_VALUES]
    price_pattern = rule.get("pricePattern")
    moving_averages = [
        value for value in rule.get("movingAverages", []) if value in VALID_MOVING_AVERAGE_VALUES
    ]
    actions = [value for value in rule.get("actions", []) if value in VALID_BUY_ACTION_VALUES]

    if (
        not volume
        or price_pattern not in VALID_PRICE_PATTERN_VALUES
        or not moving_averages
        or not actions
    ):
        return None

    return {
        "kind": "buy",
        "volume": list(dict.fromkeys(volume)),
        "pricePattern": price_pattern,
        "movingAverages": list(dict.fromkeys(moving_averages)),
        "breakoutMinBias": coerce_number(
            rule.get("breakoutMinBias"),
            DEFAULT_BREAKOUT_MIN_BIAS,
        ),
        "breakoutMaxBias": coerce_number(
            rule.get("breakoutMaxBias"),
            DEFAULT_BREAKOUT_MAX_BIAS,
        ),
        "pullbackMinBias": coerce_number(
            rule.get("pullbackMinBias"),
            DEFAULT_PULLBACK_MIN_BIAS,
        ),
        "pullbackMaxBias": coerce_number(
            rule.get("pullbackMaxBias"),
            DEFAULT_PULLBACK_MAX_BIAS,
        ),
        "actions": list(dict.fromkeys(actions)),
    }


def normalize_sell_rule(rule: dict[str, Any]) -> dict[str, Any] | None:
    """清洗卖出结构化规则，保留合法量能、跌破周期和动作。"""
    volume = [value for value in rule.get("volume", []) if value in VALID_VOLUME_VALUES]
    breakdown_periods = [
        value for value in rule.get("breakdownPeriods", []) if value in VALID_SELL_BREAKDOWN_VALUES
    ]
    actions = [value for value in rule.get("actions", []) if value in VALID_SELL_ACTION_VALUES]

    if not volume or not breakdown_periods or not actions:
        return None

    return {
        "kind": "sell",
        "volume": list(dict.fromkeys(volume)),
        "breakdownPeriods": list(dict.fromkeys(breakdown_periods)),
        "breakdownMinBias": coerce_number(
            rule.get("breakdownMinBias"),
            DEFAULT_BREAKDOWN_MIN_BIAS,
        ),
        "breakdownMaxBias": coerce_number(
            rule.get("breakdownMaxBias"),
            DEFAULT_BREAKDOWN_MAX_BIAS,
        ),
        "actions": list(dict.fromkeys(actions)),
    }
