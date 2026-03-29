def get_priority(expiry_hours, quantity):
    """
    AI-based priority scoring logic.
    Lower expiry time and higher quantity get higher priority.
    """

    if quantity <= 0:
        return "out"

    if expiry_hours <= 0:
        return 0  # already expired
    
    if expiry_hours <= 3:
        return "HIGH"
    elif expiry_hours <= 6:
        return "MEDIUM"
    else:
        return "LOW"

    expiry_score = (1 / expiry_hours) * 100
    quantity_score = quantity * 0.5

    priority_score = expiry_score + quantity_score

    return round(priority_score, 2)

