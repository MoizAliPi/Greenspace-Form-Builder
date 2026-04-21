from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    """Base class for service-layer errors that map to a uniform JSON response shape.

    Subclasses set `status_code` and `code` so routers can raise semantic errors
    (`NotFoundError`, `ForbiddenError`, ...) without knowing about HTTP. The registered
    exception handler converts every `AppError` to `{"error": {"code", "message"}}`, which the
    frontend parses in `lib/api.ts::extractMessage`.
    """

    status_code: int = 400
    code: str = "bad_request"

    def __init__(self, message: str = "") -> None:
        self.message = message
        super().__init__(message)


class NotFoundError(AppError):
    status_code = 404
    code = "not_found"


class ForbiddenError(AppError):
    status_code = 403
    code = "forbidden"


class UnauthorizedError(AppError):
    status_code = 401
    code = "unauthorized"


class ValidationError(AppError):
    status_code = 422
    code = "validation_error"


def register_exception_handlers(app: FastAPI) -> None:
    """Install the single `AppError` → JSON response mapping on the FastAPI app.

    Kept separate from `create_app` so tests that build a minimal app can opt in.
    """

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            {"error": {"code": exc.code, "message": exc.message or exc.code}},
            status_code=exc.status_code,
        )
