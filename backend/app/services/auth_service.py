from datetime import datetime, timedelta, UTC
from typing import Optional
import jwt
import bcrypt
from app.repositories.user_repository import UserRepository
from sqlalchemy.ext.asyncio import AsyncSession
from app.models import User
from app.core.config import settings

class AuthService:
    def __init__(self, session: AsyncSession):
        self.repository = UserRepository(session)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

    def get_password_hash(self, password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    async def register_user(
        self,
        email: str,
        password: str,
        full_name: str,
        phone_number: Optional[str] = None,
        telegram_handle: Optional[str] = None,
    ):
        if len(password) < 6:
            raise ValueError("Password must be at least 6 characters")

        existing_user = await self.repository.get_by_email(email)
        if existing_user:
            raise ValueError("User with this email already exists")

        hashed_password = self.get_password_hash(password)
        return await self.repository.create(
            {
                "email": email,
                "hashed_password": hashed_password,
                "full_name": full_name,
                "phone_number": phone_number,
                "telegram_handle": telegram_handle,
            }
        )

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        user = await self.repository.get_by_email(email)
        if not user or not self.verify_password(password, user.hashed_password):
            return None

        return user

    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=60 * 24))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    async def get_current_user(self, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id: str = payload.get("id")
            if user_id is None:
                return None
        except jwt.PyJWTError:
            return None

        return await self.repository.get_by_id(user_id)

    async def update_user(self, user_id: str, user_data: dict):
        return await self.repository.update(user_id, user_data)
