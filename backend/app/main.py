from fastapi import FastAPI
from app.api.endpoints import properties, auth, user, interactions, recommendations
 
app = FastAPI(title="nestAI API")
 
app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
app.include_router(properties.router, prefix="/api/properties", tags=["Properties"])
app.include_router(user.router, prefix="/user", tags=["User Profile"])
app.include_router(interactions.router, prefix="/api/interactions", tags=["Interactions"])
app.include_router(recommendations.router, prefix="/api/recommendations", tags=["Recommendations"])
 
@app.get("/")
async def root():
    return {"message": "Welcome to nestAI API"}

