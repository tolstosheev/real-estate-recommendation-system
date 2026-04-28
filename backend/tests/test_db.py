import pytest
from sqlalchemy.future import select
from app.models.models import Property

@pytest.mark.asyncio
async def test_db_connection(db_session):
    result = await db_session.execute(select(1))
    assert result.scalar() == 1

@pytest.mark.asyncio
async def test_property_creation(db_session):
    new_property = Property(
        title="Test House",
        price=100000,
        rooms=3,
        area=75.5,
        property_type="Apartment",
        address="Test St, 1"
    )
    db_session.add(new_property)
    await db_session.commit()
    await db_session.refresh(new_property)
    
    assert new_property.id is not None
    assert new_property.title == "Test House"

@pytest.mark.asyncio
async def test_property_retrieval(db_session):
    prop = Property(title="Searchable House", price=200000, rooms=1, area=40.0, property_type="Apartment", address="Search St, 2")
    db_session.add(prop)
    await db_session.commit()
    
    result = await db_session.execute(select(Property).filter(Property.title == "Searchable House"))
    retrieved = result.scalar_one_or_none()
    
    assert retrieved is not None
    assert retrieved.price == 200000
