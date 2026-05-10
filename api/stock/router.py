"""股票路由聚合入口。"""

from fastapi import APIRouter

from .routes.data import router as data_router
from .routes.lists import router as lists_router

router = APIRouter(prefix="/api/stock", tags=["stock"])

router.include_router(lists_router)
router.include_router(data_router)
