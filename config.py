import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent

# 通达信行情数据根目录，目录下应包含 sz/lday、sh/lday、bj/lday 等子目录。
TDX_VIPDOC_PATH = os.getenv("TDX_VIPDOC_PATH", str(PROJECT_ROOT / "data" / "vipdoc"))
TDX_ROOT_PATH = os.path.dirname(TDX_VIPDOC_PATH)
TDX_HQ_CACHE_PATH = os.getenv(
    "TDX_HQ_CACHE_PATH",
    os.path.join(TDX_ROOT_PATH, "T0002", "hq_cache"),
)
