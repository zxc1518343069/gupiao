from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import os
from database import ensure_database_ready

# 导入分层的路由
from api import stock, indicator, strategy, portfolio

# Ensure the local database exists without resetting user data.
ensure_database_ready()

app = FastAPI()

# Allow CORS for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(stock.router)
app.include_router(indicator.router)
app.include_router(strategy.router)
app.include_router(portfolio.router)

@app.get("/api/ping")
def ping():
    return {"message": "pong"}

# Mount static files if dist exists
if os.path.exists("web/dist"):
    app.mount("/assets", StaticFiles(directory="web/dist/assets"), name="assets")

    @app.get("/{catchall:path}")
    def serve_react_app(catchall: str):
        file_path = os.path.join("web/dist", catchall)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse("web/dist/index.html")
