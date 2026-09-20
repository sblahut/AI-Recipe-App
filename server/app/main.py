from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import init_db
from app.routers import health, inventory, meal_plan, meta, products, recipes, shopping


@asynccontextmanager
async def lifespan(_app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="AI Recipe App API",
    description="Local family pantry, barcode, and recipe generation",
    version="0.2.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(meta.router)
app.include_router(inventory.router)
app.include_router(products.router)
app.include_router(recipes.router)
app.include_router(meal_plan.router)
app.include_router(shopping.router)
