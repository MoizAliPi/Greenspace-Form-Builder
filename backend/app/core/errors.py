from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
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
    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            {"error": {"code": exc.code, "message": exc.message or exc.code}},
            status_code=exc.status_code,
        )
