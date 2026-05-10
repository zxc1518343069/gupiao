# 股票量化辅助分析系统

一个本地运行的股票观察与量化辅助工具。后端使用 FastAPI、SQLAlchemy 和 Pandas，前端使用 React、TypeScript、Vite 和 Ant Design。系统直接读取本机通达信行情文件，提供自选股分组、行业分组、标签管理、策略配置、均线/乖离率/量比分析等能力。

## 核心功能

- 自选股、ETF、行业分组和标签管理。
- 读取通达信 `.day` 日线数据，计算 MA5、MA10、MA20、MA60、MA120。
- 计算均线斜率、乖离率、前 5 日均量量比、持仓区间收益等指标。
- 根据放量、均线趋势、收敛等条件生成观察信号和操作建议。
- 支持 FastAPI 接口和 React 管理界面。

## 数据来源与配置

本项目不内置行情数据库。数据库和行情数据是两部分：

- 本地数据库：默认使用 SQLite 文件 `data.db`。它主要保存自选股、分组、标签、策略配置和分析记录，不保存完整日线行情。该文件属于个人本地运行数据，已在 `.gitignore` 中忽略，不应提交到 GitHub。
- 数据库结构：后端启动时会调用 `database.py` 中的 `ensure_database_ready()`，只创建缺失的表并执行轻量兼容更新，不会清空、重建或覆盖已有数据。新环境也可以手动运行 `python scripts/init_db.py` 提前创建数据库。
- 股票行情：来自本机通达信安装目录下的 `vipdoc` 日线文件，例如 `sz/lday/sz000001.day`、`sh/lday/sh600000.day`。后端接口和分析服务会直接读取这些 `.day` 文件。
- 股票名称和行业信息：读取通达信 `T0002/hq_cache` 下的 `szs.tnf`、`shs.tnf`、`bjs.tnf`、`tdxhy.cfg`、`tdxzs*.cfg`、`specgpext.txt` 等本地缓存文件。

配置入口在根目录 [config.py](config.py)。首次使用时只需要把 `TDX_VIPDOC_PATH` 替换成自己通达信安装目录下的 `vipdoc` 路径即可：

```python
TDX_VIPDOC_PATH = r"E:\new_tdx\vipdoc"
TDX_ROOT_PATH = os.path.dirname(TDX_VIPDOC_PATH)
TDX_HQ_CACHE_PATH = os.path.join(TDX_ROOT_PATH, "T0002", "hq_cache")
```

通常只需要改第一行，例如替换为 `D:\通达信\vipdoc`。`TDX_HQ_CACHE_PATH` 会根据 `vipdoc` 的上级目录自动拼接；如果你的通达信目录结构比较特殊，再单独调整它。

数据库默认使用 `sqlite:///./data.db`。如需临时指定其他 SQLite 文件，可以在当前 PowerShell 窗口设置：

```powershell
$env:DATABASE_URL = "sqlite:///./data.db"
```

真实通达信数据、SQLite 数据库、CSV 导出结果都不建议提交到 GitHub。

## 本地启动

后端：

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt

# 可选：提前创建或检查本地 SQLite 数据库。跳过也可以，后端启动时会自动保障。
python scripts/init_db.py

uvicorn server:app --reload
```

前端：

```powershell
cd web
npm install
npm run dev
```

默认前端开发服务会通过 [web/vite.config.ts](web/vite.config.ts) 把 `/api` 代理到 `http://127.0.0.1:8000`。也可以在 Windows 下运行 `start.bat` 同时启动后端和前端。

生产构建：

```powershell
cd web
npm run build
cd ..
uvicorn server:app
```

构建后 `server.py` 会在存在 `web/dist` 时托管前端静态资源。

## 数据库管理约定

- `data.db` 是本地运行数据，不提交、不共享。换机器或重新 clone 后，让应用自动创建，或手动运行 `python scripts/init_db.py`。
- `scripts/init_db.py` 可以重复执行。它只保证数据库结构可用，不会删除已有表，不会清空数据，也不会导入个人自选股。
- 新增表或字段时，先更新 `database.py` 中的 SQLAlchemy 模型；如果需要兼容旧库，再补充 `ensure_database_schema()` 中的轻量迁移逻辑。
- 当前项目体量下暂不引入 Alembic。后续如果多人协作频繁改表，或出现复杂数据迁移，再切换到正式 migration 管理。

## 目录结构

- `server.py`：FastAPI 应用入口，注册接口路由并托管前端构建产物。
- `database.py`：SQLite/SQLAlchemy 数据模型、数据库就绪检查和轻量 schema 兼容逻辑。
- `scripts/init_db.py`：可选的本地数据库初始化/检查脚本，适合新环境首次运行前执行。
- `config.py`：通达信行情目录、数据库地址等本地配置。
- `api/`：后端接口分层，包含股票数据、自选股、策略、标签和分析接口。
- `services/`：行情读取、指标计算、股票元数据解析等服务逻辑。
- `web/`：React + TypeScript 前端应用。
- `convert_tdx.py`：可选的命令行通达信 `.day` 转 CSV 工具。

## 发布前说明

仓库已忽略 `node_modules`、`web/dist`、`__pycache__`、`.idea`、`.learnings`、`data.db`、行情数据和扫描结果目录。上传 GitHub 前请确认没有手动添加本地数据库、真实行情文件或个人 IDE 配置。
