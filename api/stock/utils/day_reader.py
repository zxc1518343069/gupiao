"""通达信 `.day` 日线文件读取逻辑。"""

import os
import struct

from config import TDX_VIPDOC_PATH
from services.stock_metadata import get_price_scale_divisor

TDX_DAY_RECORD_FORMAT = "iiiiifii"
TDX_DAY_RECORD_SIZE = struct.calcsize(TDX_DAY_RECORD_FORMAT)


def build_tdx_day_file_path(stock_code: str) -> str:
    """根据带市场前缀的股票代码构造通达信日线文件路径。"""
    market = stock_code[:2].lower()
    code = stock_code[2:]
    return os.path.join(TDX_VIPDOC_PATH, market, "lday", f"{market}{code}.day")


def serialize_day_record(raw_data: tuple, price_scale_divisor: float) -> dict:
    """把通达信二进制记录转换为前端需要的行情字段。"""
    return {
        "date": str(raw_data[0]),
        "open": raw_data[1] / price_scale_divisor,
        "high": raw_data[2] / price_scale_divisor,
        "low": raw_data[3] / price_scale_divisor,
        "close": raw_data[4] / price_scale_divisor,
        "amount": raw_data[5],
        "volume": raw_data[6],
    }


def read_tdx_day_records(stock_code: str, limit: int = 100) -> list[dict]:
    """读取指定股票最近 N 条日线数据。"""
    file_path = build_tdx_day_file_path(stock_code)
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Stock data not found at {file_path}")

    price_scale_divisor = get_price_scale_divisor(stock_code)
    data: list[dict] = []

    with open(file_path, "rb") as file:
        # 先定位到文件尾部，只读取最后 limit 条记录，避免全量扫描。
        file.seek(0, os.SEEK_END)
        file_size = file.tell()
        total_records = file_size // TDX_DAY_RECORD_SIZE
        records_to_read = min(limit, total_records)
        start_pos = (total_records - records_to_read) * TDX_DAY_RECORD_SIZE

        file.seek(start_pos, os.SEEK_SET)

        while True:
            buffer = file.read(TDX_DAY_RECORD_SIZE)
            if len(buffer) < TDX_DAY_RECORD_SIZE:
                break

            raw_data = struct.unpack(TDX_DAY_RECORD_FORMAT, buffer)
            data.append(serialize_day_record(raw_data, price_scale_divisor))

    return data
