"""API 层的公共依赖。"""

from database import SessionLocal


def get_db():
    """为每个请求提供独立的数据库会话。"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
