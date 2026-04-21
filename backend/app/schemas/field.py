from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.schemas._base import InputModel, OutputModel
from app.schemas._fields import Title

# --- Field type (stored in `fields.type`) ---


class FieldType(StrEnum):
    SHORT_TEXT = "short_text"
    LONG_TEXT = "long_text"
    EMAIL = "email"
    PHONE_NUMBER = "phone_number"
    CHECKBOX = "checkbox"
    YES_NO = "yes_no"
    ADDRESS = "address"
    DATE_OF_BIRTH = "date_of_birth"


# --- Per-type config (stored in `fields.config`) ---


class ShortTextConfig(BaseModel):
    model_config = ConfigDict(extra="allow")

    placeholder: str | None = None
    max_length: int | None = Field(default=None, ge=1, le=100)


class LongTextConfig(BaseModel):
    model_config = ConfigDict(extra="allow")

    placeholder: str | None = None
    rows: int | None = Field(default=None, ge=1, le=5)
    max_length: int | None = Field(default=None, ge=1, le=500)


class EmailConfig(BaseModel):
    model_config = ConfigDict(extra="allow")

    placeholder: str | None = None


class PhoneNumberConfig(BaseModel):
    model_config = ConfigDict(extra="allow")

    placeholder: str | None = None


class CheckboxConfig(BaseModel):
    model_config = ConfigDict(extra="allow")

    checkbox_label: str | None = None


class YesNoConfig(BaseModel):
    model_config = ConfigDict(extra="allow")

    options: list[str] = Field(default_factory=lambda: ["yes", "no"])


class AddressConfig(BaseModel):
    model_config = ConfigDict(extra="allow")

    fields: list[str] = Field(
        default_factory=lambda: [
            "line1",
            "line2",
            "city",
            "state",
            "postal_code",
            "country",
        ],
    )


class DateOfBirthConfig(BaseModel):
    """Field collects the respondent's date of birth as day-month-year (DD-MM-YYYY)."""

    model_config = ConfigDict(extra="allow")

    date_format: Literal["DD-MM-YYYY"] = "DD-MM-YYYY"
    placeholder: str | None = Field(
        default=None,
        max_length=64,
        description="Optional hint shown in the input (e.g. 15-04-1990).",
    )


# --- Create / read variants (discriminated by `type`) ---


class ShortTextFieldCreate(InputModel):
    type: Literal[FieldType.SHORT_TEXT] = FieldType.SHORT_TEXT
    id: uuid.UUID | None = None
    label: Title
    required: bool = False
    order: int = Field(ge=0)
    config: ShortTextConfig = Field(default_factory=ShortTextConfig)


class LongTextFieldCreate(InputModel):
    type: Literal[FieldType.LONG_TEXT] = FieldType.LONG_TEXT
    id: uuid.UUID | None = None
    label: Title
    required: bool = False
    order: int = Field(ge=0)
    config: LongTextConfig = Field(default_factory=LongTextConfig)


class EmailFieldCreate(InputModel):
    type: Literal[FieldType.EMAIL] = FieldType.EMAIL
    id: uuid.UUID | None = None
    label: Title
    required: bool = False
    order: int = Field(ge=0)
    config: EmailConfig = Field(default_factory=EmailConfig)


class PhoneNumberFieldCreate(InputModel):
    type: Literal[FieldType.PHONE_NUMBER] = FieldType.PHONE_NUMBER
    id: uuid.UUID | None = None
    label: Title
    required: bool = False
    order: int = Field(ge=0)
    config: PhoneNumberConfig = Field(default_factory=PhoneNumberConfig)


class CheckboxFieldCreate(InputModel):
    type: Literal[FieldType.CHECKBOX] = FieldType.CHECKBOX
    id: uuid.UUID | None = None
    label: Title
    required: bool = False
    order: int = Field(ge=0)
    config: CheckboxConfig = Field(default_factory=CheckboxConfig)


class YesNoFieldCreate(InputModel):
    type: Literal[FieldType.YES_NO] = FieldType.YES_NO
    id: uuid.UUID | None = None
    label: Title
    required: bool = False
    order: int = Field(ge=0)
    config: YesNoConfig = Field(default_factory=YesNoConfig)


class AddressFieldCreate(InputModel):
    type: Literal[FieldType.ADDRESS] = FieldType.ADDRESS
    id: uuid.UUID | None = None
    label: Title
    required: bool = False
    order: int = Field(ge=0)
    config: AddressConfig = Field(default_factory=AddressConfig)


class DateOfBirthFieldCreate(InputModel):
    type: Literal[FieldType.DATE_OF_BIRTH] = FieldType.DATE_OF_BIRTH
    id: uuid.UUID | None = None
    label: Title
    required: bool = False
    order: int = Field(ge=0)
    config: DateOfBirthConfig = Field(default_factory=DateOfBirthConfig)


FieldCreate = Annotated[
    ShortTextFieldCreate
    | LongTextFieldCreate
    | EmailFieldCreate
    | PhoneNumberFieldCreate
    | CheckboxFieldCreate
    | YesNoFieldCreate
    | AddressFieldCreate
    | DateOfBirthFieldCreate,
    Field(discriminator="type"),
]


class ShortTextFieldRead(OutputModel):
    id: uuid.UUID
    form_id: uuid.UUID
    type: Literal[FieldType.SHORT_TEXT] = FieldType.SHORT_TEXT
    label: Title
    required: bool
    order: int
    config: ShortTextConfig
    created_at: datetime


class LongTextFieldRead(OutputModel):
    id: uuid.UUID
    form_id: uuid.UUID
    type: Literal[FieldType.LONG_TEXT] = FieldType.LONG_TEXT
    label: Title
    required: bool
    order: int
    config: LongTextConfig
    created_at: datetime


class EmailFieldRead(OutputModel):
    id: uuid.UUID
    form_id: uuid.UUID
    type: Literal[FieldType.EMAIL] = FieldType.EMAIL
    label: Title
    required: bool
    order: int
    config: EmailConfig
    created_at: datetime


class PhoneNumberFieldRead(OutputModel):
    id: uuid.UUID
    form_id: uuid.UUID
    type: Literal[FieldType.PHONE_NUMBER] = FieldType.PHONE_NUMBER
    label: Title
    required: bool
    order: int
    config: PhoneNumberConfig
    created_at: datetime


class CheckboxFieldRead(OutputModel):
    id: uuid.UUID
    form_id: uuid.UUID
    type: Literal[FieldType.CHECKBOX] = FieldType.CHECKBOX
    label: Title
    required: bool
    order: int
    config: CheckboxConfig
    created_at: datetime


class YesNoFieldRead(OutputModel):
    id: uuid.UUID
    form_id: uuid.UUID
    type: Literal[FieldType.YES_NO] = FieldType.YES_NO
    label: Title
    required: bool
    order: int
    config: YesNoConfig
    created_at: datetime


class AddressFieldRead(OutputModel):
    id: uuid.UUID
    form_id: uuid.UUID
    type: Literal[FieldType.ADDRESS] = FieldType.ADDRESS
    label: Title
    required: bool
    order: int
    config: AddressConfig
    created_at: datetime


class DateOfBirthFieldRead(OutputModel):
    id: uuid.UUID
    form_id: uuid.UUID
    type: Literal[FieldType.DATE_OF_BIRTH] = FieldType.DATE_OF_BIRTH
    label: Title
    required: bool
    order: int
    config: DateOfBirthConfig
    created_at: datetime


FieldRead = Annotated[
    ShortTextFieldRead
    | LongTextFieldRead
    | EmailFieldRead
    | PhoneNumberFieldRead
    | CheckboxFieldRead
    | YesNoFieldRead
    | AddressFieldRead
    | DateOfBirthFieldRead,
    Field(discriminator="type"),
]
