import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from .repositories.user_repository import UserRepository
from sqlalchemy.ext.asyncio import AsyncSession

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-nestai-key-for-dev")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 # 1 day for dev

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self, session: AsyncSession):
        self.repository = UserRepository(session)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)

    async def register_user(self, email: str, password: str, full_name: str):
        existing_user = await self.repository.get_by_email(email)
        if existing_user:
            raise ValueError("User with this email already exists")
        
        hashed_password = self.get_password_hash(password)
        return await self.repository.create({
            "email": email,
            "hashed_password": hashed_password,
            "full_name": full_name
        })

    async def authenticate_user(self, email: str, password: str) -> Optional[dict]:
        user = await self.repository.get_by_email(email)
        if not user or not self.verify_password(password, user.hashed_password):
            return None
        
        return {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name
        }

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

    async def get_current_user(self, token: str):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: str = payload.get("id")
            if user_id is None:
                return None
        except JWTError:
            return None
        
        return await self.repository.get_by_id(user_id)
