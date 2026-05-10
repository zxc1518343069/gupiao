import os
import struct
from datetime import date, datetime
import pandas as pd
from config import TDX_VIPDOC_PATH
from services.stock_metadata import get_price_precision, get_price_scale_divisor

MA_CONFIGS = (
    {"key": "MA5", "window": 5, "slope_shift": 2, "bias_key": "Bias5"},
    {"key": "MA10", "window": 10, "slope_shift": 3, "bias_key": "Bias10"},
    {"key": "MA20", "window": 20, "slope_shift": 5, "bias_key": "Bias20"},
    {"key": "MA60", "window": 60, "slope_shift": 10, "bias_key": "Bias60"},
    {"key": "MA120", "window": 120, "slope_shift": 20, "bias_key": "Bias120"},
)

def read_tdx_to_dataframe(stock_code: str) -> pd.DataFrame:
    """
    读取通达信 .day 文件并转换为 pandas DataFrame
    """
    market = stock_code[:2].lower()
    code = stock_code[2:]
    file_path = os.path.join(TDX_VIPDOC_PATH, market, "lday", f"{market}{code}.day")
    price_scale_divisor = get_price_scale_divisor(stock_code)
    
    if not os.path.exists(file_path):
        return pd.DataFrame()
        
    data = []
    record_format = 'iiiiifii'
    record_size = struct.calcsize(record_format)
    
    try:
        with open(file_path, 'rb') as f:
            while True:
                buf = f.read(record_size)
                if len(buf) < record_size:
                    break
                raw_data = struct.unpack(record_format, buf)
                data.append({
                    "date": str(raw_data[0]),
                    "open": raw_data[1] / price_scale_divisor,
                    "high": raw_data[2] / price_scale_divisor,
                    "low": raw_data[3] / price_scale_divisor,
                    "close": raw_data[4] / price_scale_divisor,
                    "amount": raw_data[5],
                    "volume": raw_data[6]
                })
    except Exception as e:
        print(f"Error reading {file_path}: {e}")
        return pd.DataFrame()
        
    df = pd.DataFrame(data)
    return df

def calculate_indicators(df: pd.DataFrame) -> pd.DataFrame:
    """
    计算股票的技术指标：均线、均线斜率、乖离率、量比
    """
    if df.empty:
        return df
        
    df = df.sort_values('date').reset_index(drop=True)

    # 1. 计算均线、斜率和乖离率
    for config in MA_CONFIGS:
        ma_key = config["key"]
        slope_key = f"{ma_key}_slope"
        bias_key = config["bias_key"]
        window = config["window"]
        slope_shift = config["slope_shift"]

        df[ma_key] = df['close'].rolling(window=window).mean()
        df[slope_key] = (df[ma_key] - df[ma_key].shift(slope_shift)) / df[ma_key].shift(slope_shift) * 100
        df[bias_key] = (df['close'] - df[ma_key]) / df[ma_key] * 100

    # 2. 计算量比 (当日成交量 / 前5日平均成交量)
    df['vol_ma5'] = df['volume'].shift(1).rolling(window=5).mean()
    df['vol_ratio'] = df['volume'] / df['vol_ma5']

    return df

def safe_round(value, precision: int = 2) -> float | None:
    if pd.isna(value):
        return None
    return round(float(value), precision)


def format_indicator_lines(values: list[tuple[str, float | None]]) -> str | None:
    if not values:
        return None

    return "<br>".join(
        f"{value if value is not None else 'N/A'}%({label})"
        for label, value in values
    )


def get_trend_meta(slope: float | None) -> dict[str, str]:
    if slope is None:
        return {"code": "na", "label": "N/A"}
    if slope > 0.2:
        return {"code": "up", "label": "向上"}
    if slope < -0.2:
        return {"code": "down", "label": "向下"}
    return {"code": "flat", "label": "走平"}


def format_trend_lines(values: list[tuple[str, float | None]]) -> str | None:
    if not values:
        return None

    return "<br>".join(
        f"{get_trend_meta(value)['label']}({label})"
        for label, value in values
    )


def get_volume_meta(vol_ratio: float | None) -> dict[str, str | float | None]:
    if vol_ratio is None:
        return {
            "ratio": None,
            "status_code": "na",
            "status_label": None,
            "status_detail": None,
        }
    if vol_ratio >= 1.5:
        return {
            "ratio": vol_ratio,
            "status_code": "surge",
            "status_label": "爆量",
            "status_detail": "≥1.5倍",
        }
    if vol_ratio >= 1.2:
        return {
            "ratio": vol_ratio,
            "status_code": "expanded",
            "status_label": "放量",
            "status_detail": "1.2-1.5倍",
        }
    if vol_ratio >= 0.8:
        return {
            "ratio": vol_ratio,
            "status_code": "normal",
            "status_label": "平量",
            "status_detail": "0.8-1.2倍",
        }
    return {
        "ratio": vol_ratio,
        "status_code": "shrink",
        "status_label": "缩量",
        "status_detail": "<0.8倍",
    }


def format_volume_status(vol_ratio: float | None) -> str | None:
    meta = get_volume_meta(vol_ratio)
    if meta["status_label"] is None:
        return None
    return f"{meta['status_label']} [{meta['status_detail']}]"


def normalize_trade_date(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, (datetime, date)):
        return value.strftime("%Y%m%d")

    text = str(value).strip()
    if not text:
        return None
    if text.isdigit() and len(text) >= 8:
        return text[:8]

    parsed = pd.to_datetime(text, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.strftime("%Y%m%d")


def get_close_on_or_before_date(
    df: pd.DataFrame,
    target_date,
    price_precision: int = 2,
) -> tuple[float | None, str | None]:
    trade_date = normalize_trade_date(target_date)
    if df.empty or trade_date is None:
        return None, None

    target_rows = df[df["date"] <= trade_date]
    if target_rows.empty:
        return None, None

    row = target_rows.iloc[-1]
    return safe_round(row.get("close"), price_precision), row.get("date")


def calculate_portfolio_return(added_price: float | None, latest_price: float | None) -> float | None:
    if added_price is None or latest_price is None or added_price == 0:
        return None
    return round((latest_price - added_price) / added_price * 100, 2)


def calculate_change_percent(previous_price: float | None, current_price: float | None) -> float | None:
    if previous_price is None or current_price is None or previous_price == 0:
        return None
    return round((current_price - previous_price) / previous_price * 100, 2)


def build_ma_metrics(latest: pd.Series, stock_code: str) -> list[dict]:
    metrics: list[dict] = []
    price_precision = get_price_precision(stock_code)

    for config in MA_CONFIGS:
        ma_key = config["key"]
        slope = safe_round(latest.get(f"{ma_key}_slope"))
        trend = get_trend_meta(slope)

        metrics.append(
            {
                "key": ma_key,
                "label": ma_key,
                "price": safe_round(latest.get(ma_key), price_precision),
                "price_precision": price_precision,
                "bias": safe_round(latest.get(config["bias_key"])),
                "slope": slope,
                "trend_code": trend["code"],
                "trend_label": trend["label"],
            }
        )

    return metrics


def build_stock_analysis_snapshot(df: pd.DataFrame, stock_code: str) -> dict:
    latest = df.iloc[-1]
    previous = df.iloc[-2] if len(df.index) > 1 else None
    price_precision = get_price_precision(stock_code)

    ma_metrics = build_ma_metrics(latest, stock_code)
    bias_values = [(metric["label"], metric["bias"]) for metric in ma_metrics]
    slope_values = [(metric["label"], metric["slope"]) for metric in ma_metrics]
    vol_ratio = safe_round(latest.get("vol_ratio"))
    volume_meta = get_volume_meta(vol_ratio)
    latest_close = safe_round(latest.get("close"), price_precision)
    previous_close = safe_round(previous.get("close"), price_precision) if previous is not None else None

    return {
        "date": latest.get("date"),
        "close": latest_close,
        "daily_change_pct": calculate_change_percent(previous_close, latest_close),
        "vol_ratio": vol_ratio,
        "volume_meta": volume_meta,
        "ma_metrics": ma_metrics,
        "bias_str": format_indicator_lines(bias_values),
        "slope_str": format_indicator_lines(slope_values),
        "vol_status": format_volume_status(vol_ratio),
        "trend_str": format_trend_lines(slope_values),
    }


def get_stock_analysis_snapshot(stock_code: str) -> dict:
    df = read_tdx_to_dataframe(stock_code)
    if df.empty:
        return {"error": "行情数据文件不存在或无可用数据"}

    df = calculate_indicators(df)
    return build_stock_analysis_snapshot(df, stock_code)


def get_stock_portfolio_snapshot(stock_code: str, added_at) -> dict:
    df = read_tdx_to_dataframe(stock_code)
    if df.empty:
        return {"error": "行情数据文件不存在或无可用数据"}

    df = calculate_indicators(df)
    price_precision = get_price_precision(stock_code)
    snapshot = build_stock_analysis_snapshot(df, stock_code)
    added_price, added_price_date = get_close_on_or_before_date(df, added_at, price_precision)
    latest_price = snapshot.get("close")

    return {
        **snapshot,
        "added_price": added_price,
        "added_price_date": added_price_date,
        "latest_price": latest_price,
        "latest_price_date": snapshot.get("date"),
        "portfolio_return": calculate_portfolio_return(added_price, latest_price),
    }

def analyze_stock(stock_code: str) -> dict:
    """
    分析单只股票，返回格式化的指标数据
    """
    snapshot = get_stock_analysis_snapshot(stock_code)
    if "error" in snapshot:
        return snapshot

    vol_ratio = snapshot.get("vol_ratio")
    if vol_ratio is None:
        return {
            **snapshot,
            "error": "行情数据不足，无法计算量比",
        }

    if vol_ratio < 1.2:
        return {
            **snapshot,
            "is_triggered": False,
            "reason": "未满足放量条件",
        }

    return {
        **snapshot,
        "is_triggered": True,
    }
