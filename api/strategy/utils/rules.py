"""策略结构化规则选择器。"""

import json
from typing import Any

from database import StrategyConfig

from .inference import infer_buy_rule, infer_convergence_rule, infer_sell_rule
from .normalizers import normalize_buy_rule, normalize_sell_rule
from .parsers import normalize_action_display


def parse_strategy_rule(strategy: StrategyConfig, conditions: list[str]) -> dict[str, Any] | None:
    """优先读取结构化规则，失败时回退到旧条件文案推断。"""
    if strategy.rule_json:
        try:
            rule = json.loads(strategy.rule_json)
        except json.JSONDecodeError:
            rule = None

        if isinstance(rule, dict):
            # 买入/卖出规则需要做枚举清洗；均线粘合和交易规则直接透传结构。
            if strategy.category == "买入":
                normalized_buy_rule = normalize_buy_rule(rule)
                if normalized_buy_rule:
                    return normalized_buy_rule
            elif strategy.category == "卖出":
                normalized_sell_rule = normalize_sell_rule(rule)
                if normalized_sell_rule:
                    return normalized_sell_rule
            else:
                return rule

    # 兼容早期只保存 conditions_json/action 的策略配置。
    if strategy.category == "买入":
        return infer_buy_rule(conditions, strategy.action)

    if strategy.category == "卖出":
        return infer_sell_rule(conditions, strategy.action)

    if strategy.category == "均线粘合":
        return infer_convergence_rule(conditions)

    return None
