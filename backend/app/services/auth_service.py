import re
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models import Property, User
from app.repositories.user_repository import UserRepository


class AuthService:
    def __init__(self, session: AsyncSession):
        self.repository = UserRepository(session)

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

    def get_password_hash(self, password: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

    def _validate_password(self, password: str) -> None:
        if len(password) < 8:
            raise ValueError("Password must be at least 8 characters")
        if not re.search(r"[A-Z]", password):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", password):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", password):
            raise ValueError("Password must contain at least one digit")

    def _validate_email_format(self, email: str) -> None:
        if not re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", email):
            raise ValueError("Invalid email format")

    async def register_user(
        self,
        email: str,
        password: str,
        full_name: str,
        phone_number: str | None = None,
        telegram_handle: str | None = None,
    ):
        self._validate_password(password)
        self._validate_email_format(email)

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

    async def authenticate_user(self, email: str, password: str) -> User | None:
        user = await self.repository.get_by_email(email)
        if not user or not self.verify_password(password, user.hashed_password):
            return None

        return user

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None):
        to_encode = data.copy()
        if "sub" not in to_encode and "id" in to_encode:
            to_encode["sub"] = to_encode["id"]
        expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=60 * 24))
        to_encode.update({"exp": expire})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    async def get_current_user(self, token):
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            user_id: str = payload.get("sub") or payload.get("id")
            if user_id is None:
                return None
        except jwt.PyJWTError:
            return None

        return await self.repository.get_by_id(user_id)

    async def update_user(self, user_id: str, user_data: dict):
        user = await self.repository.get_by_id(user_id)
        if not user:
            return None

        phone = user_data.get("phone_number", user.phone_number)
        telegram = user_data.get("telegram_handle", user.telegram_handle)

        if not phone and not telegram:
            result = await self.repository.session.execute(
                select(func.count(Property.id)).where(Property.user_id == user_id)
            )
            if result.scalar() > 0:
                raise ValueError(
                    "Cannot remove all contact details while having active property listings"
                )

        return await self.repository.update(user_id, user_data)
