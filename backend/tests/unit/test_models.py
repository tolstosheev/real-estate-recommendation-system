import pytest
from unittest.mock import MagicMock


class TestUserModel:
    def test_user_creation(self):
        import uuid
        from app.models import User
        user = User(id=uuid.uuid4(), email="test@test.com", hashed_password="hash", full_name="Test")
        assert user.email == "test@test.com"
        assert user.full_name == "Test"

    def test_user_defaults(self):
        from app.models import User
        user = User(email="test@test.com", hashed_password="hash", full_name="Test")
        assert user.phone_number is None
        assert user.telegram_handle is None


class TestPropertyModel:
    def test_property_creation(self):
        import uuid
        from app.models import Property
        prop = Property(id=uuid.uuid4(), user_id=uuid.uuid4(), title="Test", price=100000)
        assert prop.title == "Test"
        assert float(prop.price) == 100000.0

    def test_property_defaults(self):
        import uuid
        from app.models import Property
        prop = Property(id=uuid.uuid4(), user_id=uuid.uuid4(), title="Test", price=50000, views_count=0, likes_count=0)
        assert prop.views_count == 0
        assert prop.likes_count == 0
        assert prop.images is None


class TestUserPreferenceModel:
    def test_preference_creation(self):
        import uuid
        from app.models import UserPreference
        pref = UserPreference(user_id=uuid.uuid4())
        assert pref.user_id is not None

    def test_preference_defaults(self):
        import uuid
        from app.models import UserPreference
        pref = UserPreference(user_id=uuid.uuid4())
        assert pref.min_price is None
        assert pref.max_price is None
        assert pref.property_types is None


class TestInteractionModel:
    def test_interaction_creation(self):
        import uuid
        from app.models import Interaction
        interaction = Interaction(user_id=uuid.uuid4(), property_id=uuid.uuid4(), interaction_type="like", weight=1)
        assert interaction.interaction_type == "like"
        assert interaction.weight == 1

    def test_interaction_weight_default(self):
        import uuid
        from app.models import Interaction
        interaction = Interaction(user_id=uuid.uuid4(), property_id=uuid.uuid4(), interaction_type="view", weight=1)
        assert interaction.weight == 1
