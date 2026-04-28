import asyncio
from app.core.db import engine, Base
from app.models import models

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("Database initialized successfully")

if __name__ == "__main__":
    asyncio.run(init_db())
