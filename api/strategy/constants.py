"""策略规则解析使用的常量映射。"""

# 中文展示文案到前端规则值的映射，保持和页面表单字段一致。
BUY_ACTION_LABELS = {"建仓": "open", "加仓": "add"}
SELL_ACTION_LABELS = {"减仓": "reduce", "清仓": "clear"}
VOLUME_LABELS = {"爆量": "surge", "放量": "increase", "平量": "flat", "缩量": "shrink"}
PRICE_PATTERN_LABELS = {"突破": "breakout", "回踩": "pullback"}
MOVING_AVERAGE_LABELS = {
    "MA5": "ma5",
    "MA10": "ma10",
    "MA20": "ma20",
    "MA30": "ma30",
    "MA60": "ma60",
    "MA120": "ma120",
}
SELL_BREAKDOWN_LABELS = {"跌破 MA5": "ma5", "跌破 MA10": "ma10"}

# 缺省偏离区间用于兼容旧数据里没有写入结构化规则的策略。
DEFAULT_BREAKOUT_MIN_BIAS = 0.0
DEFAULT_BREAKOUT_MAX_BIAS = 5.0
DEFAULT_PULLBACK_MIN_BIAS = -1.0
DEFAULT_PULLBACK_MAX_BIAS = 1.0
DEFAULT_BREAKDOWN_MIN_BIAS = 0.0
DEFAULT_BREAKDOWN_MAX_BIAS = 5.0

# 有效值集合用于清洗前端传入的结构化规则，避免脏值落库后继续扩散。
VALID_VOLUME_VALUES = set(VOLUME_LABELS.values())
VALID_PRICE_PATTERN_VALUES = set(PRICE_PATTERN_LABELS.values())
VALID_MOVING_AVERAGE_VALUES = set(MOVING_AVERAGE_LABELS.values())
VALID_BUY_ACTION_VALUES = set(BUY_ACTION_LABELS.values())
VALID_SELL_ACTION_VALUES = set(SELL_ACTION_LABELS.values())
VALID_SELL_BREAKDOWN_VALUES = set(SELL_BREAKDOWN_LABELS.values())
