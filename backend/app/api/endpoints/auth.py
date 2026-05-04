from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.auth_service import AuthService
from app.schemas.auth import UserCreate, UserUpdate, Token, UserOut
from app.schemas.auth_login import UserLogin

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED,
             summary="User Registration", description="Creates a new user account in the system")
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    try:
        user = await service.register_user(
            user_in.email,
            user_in.password,
            user_in.full_name,
            user_in.phone_number,
            user_in.telegram_handle
        )
        return user
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/login", response_model=Token, summary="User Authentication",
             description="Authenticates user and returns a JWT access token")
async def login(login_data: UserLogin, db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.authenticate_user(login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = service.create_access_token(data={"id": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut, summary="Get Current User",
            description="Returns profile information of the currently authenticated user")
async def get_me(token: str = Depends(oauth2_scheme),
                 db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.get_current_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials")
    return user


@router.put("/me", response_model=UserOut, summary="Update Current User",
            description="Updates profile information of the currently authenticated user")
async def update_me(user_in: UserUpdate, token: str = Depends(
        oauth2_scheme), db: AsyncSession = Depends(get_db)):
    service = AuthService(db)
    user = await service.get_current_user(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials")
    updated_user = await service.update_user(str(user.id), user_in.model_dump(exclude_unset=True))
    return updated_user
