"""Centralized domain exceptions for RAILNET-AI API."""


class NotFoundError(Exception):
    """Raised when a requested railway resource does not exist."""

    def __init__(self, detail: str = "Resource not found"):
        self.detail = detail
        super().__init__(detail)

