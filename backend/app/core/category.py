def compute_category(property_type: str, rooms: int) -> str:
    """
    Compute property category based on property_type and rooms count.

    Logic:
    - Special types (Studio, Penthouse, Loft, Duplex) return the type itself.
    - For other types, rooms 1-5 return "{rooms}-bedroom".
    - rooms >= 6 return "5+ bedroom".
    """
    special_types = {"Studio", "Penthouse", "Loft", "Duplex"}
    if property_type in special_types:
        return property_type
    if rooms <= 5:
        return f"{rooms}-bedroom"
    return "5+ bedroom"
