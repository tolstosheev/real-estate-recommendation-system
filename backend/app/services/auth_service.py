import asyncio
import logging
import re
from datetime import UTC, datetime, timedelta

import bcrypt
import jwt
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.redis import RedisClient
from app.models import User
from app.repositories.user_repository import UserRepository
from app.services.property_service import PropertyService

logger = logging.getLogger(__name__)


class AuthService:
    def __init__(self, session: AsyncSession):
        self.repository = UserRepository(session)

    async def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return await asyncio.to_thread(
            bcrypt.checkpw, plain_password.encode("utf-8"), hashed_password.encode("utf-8")
        )

    async def get_password_hash(self, password: str) -> str:
        salt = await asyncio.to_thread(bcrypt.gensalt)
        hashed = await asyncio.to_thread(bcrypt.hashpw, password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

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

        hashed_password = await self.get_password_hash(password)
        try:
            return await self.repository.create(
                {
                    "email": email,
                    "hashed_password": hashed_password,
                    "full_name": full_name,
                    "phone_number": phone_number,
                    "telegram_handle": telegram_handle,
                }
            )
        except IntegrityError as e:
            raise ValueError("User with this email already exists") from e

    async def authenticate_user(self, email: str, password: str) -> User | None:
        user = await self.repository.get_by_email(email)
        if not user:
            return None
        if not await self.verify_password(password, str(user.hashed_password)):
            return None

        return user

    async def create_access_token(self, data: dict, expires_delta: timedelta | None = None):
        to_encode = data.copy()
        if "sub" not in to_encode and "id" in to_encode:
            to_encode["sub"] = to_encode["id"]
        expire = datetime.now(UTC) + (expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))
        to_encode.update({"exp": expire})
        return await asyncio.to_thread(
            jwt.encode, to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM
        )

    async def get_current_user(self, token):
        try:
            payload = await asyncio.to_thread(
                jwt.decode, token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
            )
            user_id: str = payload.get("sub") or payload.get("id")
            if user_id is None:
                return None
        except jwt.PyJWTError:
            logger.warning("Failed to decode token in get_current_user")
            return None

        return await self.repository.get_by_id(user_id)

    async def refresh_token(self, token: str) -> str | None:
        try:
            payload = await asyncio.to_thread(
                jwt.decode, token, settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
                options={"verify_exp": False},
            )
            exp = payload.get("exp")
            if exp and datetime.fromtimestamp(exp, tz=UTC) < datetime.now(UTC) - timedelta(minutes=5):
                logger.warning("Refresh denied: token expired too long ago")
                return None
            user_id: str = str(payload.get("sub") or payload.get("id") or "")
            if not user_id:
                logger.warning("Refresh denied: no user id in token payload")
                return None
            user = await self.repository.get_by_id(user_id)
            if not user:
                logger.warning("Refresh denied: user not found for id %s", user_id)
                return None
            return await self.create_access_token(data={"sub": str(user.id), "id": str(user.id)})
        except jwt.PyJWTError:
            logger.warning("Failed to decode token in refresh_token")
            return None

    async def update_user(self, user_id: str, user_data: dict):
        user = await self.repository.get_by_id(user_id)
        if not user:
            return None

        phone = user_data.get("phone_number", user.phone_number)
        telegram = user_data.get("telegram_handle", user.telegram_handle)

        if not phone and not telegram:
            prop_service = PropertyService(self.repository.session)
            count = await prop_service.count_by_user_id(user_id)
            if count > 0:
                raise ValueError(
                    "Cannot remove all contact details while having active property listings"
                )

        return await self.repository.update(user_id, user_data)

    async def update_user_profile(self, user_id: str, user_data: dict):
        updated = await self.update_user(user_id, user_data)
        if updated:
            prop_service = PropertyService(self.repository.session)
            prop_ids = await prop_service.get_ids_by_user_id(user_id)
            await RedisClient.clear_property_cache(prop_ids)
        return updated
