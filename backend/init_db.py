import asyncio
from app.core.db import engine, Base
from app.models import models

async def init_db():
    async with engine.begin() as conn:
        # Import models to ensure they are registered with Base
        await conn.run_sync(Base.metadata.create_all)
    print("Database tables created successfully.")

if __name__ == "__main__":
    asyncio.run(init_db())
