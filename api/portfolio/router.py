"""组合持仓路由聚合入口。"""

from fastapi import APIRouter

from .routes.analysis import router as analysis_router
from .routes.groups import router as groups_router
from .routes.stocks import router as stocks_router
from .routes.tags import router as tags_router

router = APIRouter(prefix="/api/portfolio")

router.include_router(groups_router)
router.include_router(tags_router)
router.include_router(analysis_router)
router.include_router(stocks_router)
