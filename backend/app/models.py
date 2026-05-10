from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from .database import Base
from datetime import datetime


class AdminUser(Base):
    __tablename__ = "admin_users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    is_active = Column(Boolean, default=True)


class Customer(Base):
    __tablename__ = "customers"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, index=True)
    email = Column(String, index=True)
    vehicles = relationship("Vehicle", back_populates="owner")
    estimates = relationship("Estimate", back_populates="customer")
    invoices = relationship("Invoice", back_populates="customer")


class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    registration = Column(String, unique=True, index=True)
    model = Column(String)
    year = Column(Integer)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    owner = relationship("Customer", back_populates="vehicles")
    estimates = relationship("Estimate", back_populates="vehicle")
    invoices = relationship("Invoice", back_populates="vehicle")


class LineItem(Base):
    __tablename__ = "line_items"
    id = Column(Integer, primary_key=True, index=True)
    estimate_id = Column(Integer, ForeignKey("estimates.id"), nullable=True)
    invoice_id = Column(Integer, ForeignKey("invoices.id"), nullable=True)
    description = Column(String)
    quantity = Column(Float, default=1)
    unit_price = Column(Float, default=0)
    total = Column(Float, default=0)
    item_type = Column(String, default="labor")

    estimate = relationship("Estimate", back_populates="line_items", foreign_keys=[estimate_id])
    invoice = relationship("Invoice", back_populates="line_items", foreign_keys=[invoice_id])


class Estimate(Base):
    __tablename__ = "estimates"
    id = Column(Integer, primary_key=True, index=True)
    estimate_number = Column(String, unique=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    title = Column(String)
    notes = Column(Text)
    subtotal = Column(Float, default=0)
    tax_rate = Column(Float, default=0)
    tax_amount = Column(Float, default=0)
    total = Column(Float, default=0)
    status = Column(String, default="draft")
    issue_date = Column(Date)
    expiry_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="estimates")
    vehicle = relationship("Vehicle", back_populates="estimates")
    invoice = relationship("Invoice", back_populates="estimate", uselist=False)
    line_items = relationship(
        "LineItem", back_populates="estimate",
        cascade="all, delete-orphan",
        foreign_keys=[LineItem.estimate_id],
    )


class Invoice(Base):
    __tablename__ = "invoices"
    id = Column(Integer, primary_key=True, index=True)
    invoice_number = Column(String, unique=True, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"))
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"))
    estimate_id = Column(Integer, ForeignKey("estimates.id"), nullable=True)
    notes = Column(Text)
    subtotal = Column(Float, default=0)
    tax_rate = Column(Float, default=0)
    tax_amount = Column(Float, default=0)
    total = Column(Float, default=0)
    status = Column(String, default="draft")
    date_issued = Column(Date)
    due_date = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    customer = relationship("Customer", back_populates="invoices")
    vehicle = relationship("Vehicle", back_populates="invoices")
    estimate = relationship("Estimate", back_populates="invoice", uselist=False)
    line_items = relationship(
        "LineItem", back_populates="invoice",
        cascade="all, delete-orphan",
        foreign_keys=[LineItem.invoice_id],
    )
