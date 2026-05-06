import pytest
import uuid
from sqlalchemy.future import select
from app.models.models import Property, User


@pytest.mark.asyncio
async def test_db_connection(db_session):
    result = await db_session.execute(select(1))
    assert result.scalar() == 1


@pytest.mark.asyncio
async def test_property_creation(db_session):
    user = User(email="test@test.com", hashed_password="pass", full_name="Test")
    db_session.add(user)
    await db_session.commit()

    new_property = Property(
        user_id=user.id,
        title="Test House",
        price=100000,
        rooms=3,
        area=75.5,
        property_type="Apartment",
        address="Test St, 1",
    )
    db_session.add(new_property)
    await db_session.commit()
    await db_session.refresh(new_property)

    assert new_property.id is not None
    assert new_property.title == "Test House"


@pytest.mark.asyncio
async def test_property_retrieval(db_session):
    user = User(email="search@test.com", hashed_password="pass", full_name="Search")
    db_session.add(user)
    await db_session.commit()

    prop = Property(
        user_id=user.id,
        title="Searchable House",
        price=200000,
        rooms=1,
        area=40.0,
        property_type="Apartment",
        property_purpose="sale",
        category="1-к квартира",
        address="Search St, 2",
        district="Центр",
        metro="Пушкинская",
        sq_living=30.0,
        sq_kitchen=10.0,
        build_year=2010,
        material="кирпич",
        repair_type="евро",
        room_type="изолированные",
        is_new="вторичка",
        balcony="есть",
        parking="есть",
    )
    db_session.add(prop)
    await db_session.commit()

    result = await db_session.execute(select(Property).filter(Property.title == "Searchable House"))
    retrieved = result.scalar_one_or_none()

    assert retrieved is not None
    assert retrieved.price == 200000
