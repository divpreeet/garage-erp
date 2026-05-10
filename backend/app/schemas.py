from pydantic import BaseModel, validator
from datetime import date, datetime
from typing import Optional, List


class CustomerBase(BaseModel):
    name: str
    phone: Optional[str] = ""
    email: Optional[str] = ""

class CustomerCreate(CustomerBase):
    pass

class Customer(CustomerBase):
    id: int
    class Config:
        from_attributes = True


class VehicleBase(BaseModel):
    registration: str
    model: Optional[str] = ""
    year: Optional[int] = None

class VehicleCreate(VehicleBase):
    customer_id: int

class Vehicle(VehicleBase):
    id: int
    customer_id: int
    class Config:
        from_attributes = True


class LineItemBase(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float = 0
    item_type: str = "labor"

class LineItemCreate(LineItemBase):
    pass

class LineItem(LineItemBase):
    id: int
    total: float
    estimate_id: Optional[int] = None
    invoice_id: Optional[int] = None
    class Config:
        from_attributes = True


class EstimateBase(BaseModel):
    customer_id: int
    vehicle_id: int
    title: Optional[str] = ""
    notes: Optional[str] = ""
    tax_rate: float = 0
    status: str = "draft"
    issue_date: date
    expiry_date: Optional[date] = None

class EstimateCreate(EstimateBase):
    line_items: List[LineItemCreate] = []

class EstimateUpdate(BaseModel):
    customer_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    title: Optional[str] = None
    notes: Optional[str] = None
    tax_rate: Optional[float] = None
    status: Optional[str] = None
    issue_date: Optional[date] = None
    expiry_date: Optional[date] = None
    line_items: Optional[List[LineItemCreate]] = None

class Estimate(BaseModel):
    id: int
    estimate_number: str
    customer_id: int
    vehicle_id: int
    title: Optional[str]
    notes: Optional[str]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    status: str
    issue_date: date
    expiry_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    line_items: List[LineItem] = []
    class Config:
        from_attributes = True


class InvoiceBase(BaseModel):
    customer_id: int
    vehicle_id: int
    notes: Optional[str] = ""
    tax_rate: float = 0
    status: str = "draft"
    date_issued: date
    due_date: Optional[date] = None

class InvoiceCreate(InvoiceBase):
    line_items: List[LineItemCreate] = []

class InvoiceUpdate(BaseModel):
    customer_id: Optional[int] = None
    vehicle_id: Optional[int] = None
    notes: Optional[str] = None
    tax_rate: Optional[float] = None
    status: Optional[str] = None
    date_issued: Optional[date] = None
    due_date: Optional[date] = None
    line_items: Optional[List[LineItemCreate]] = None

class Invoice(BaseModel):
    id: int
    invoice_number: str
    customer_id: int
    vehicle_id: int
    estimate_id: Optional[int] = None
    notes: Optional[str]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    status: str
    date_issued: date
    due_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    line_items: List[LineItem] = []
    class Config:
        from_attributes = True


class AdminUserCreate(BaseModel):
    username: str
    password: str

    @validator("password")
    def password_max_length(cls, v):
        if len(v) > 72:
            raise ValueError("password cannot exceed 72 characters")
        return v

class AdminUserOut(BaseModel):
    id: int
    username: str
    is_active: bool
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
