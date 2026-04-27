from fastapi import FastAPI
from app.api.endpoints import properties, auth

app = FastAPI(title="nestAI API")

app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(properties.router, prefix="/api/properties", tags=["Properties"])

@app.get("/")
async def root():
    return {"message": "Welcome to nestAI API"}
