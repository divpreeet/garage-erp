from sqlalchemy.orm import Session
from sqlalchemy import func
from . import models, schemas


# --- Admin Users ---

def get_admin_by_username(db: Session, username: str):
    return db.query(models.AdminUser).filter(models.AdminUser.username == username).first()

def create_admin_user(db: Session, user: schemas.AdminUserCreate, hashed_pw: str):
    db_user = models.AdminUser(username=user.username, hashed_password=hashed_pw)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# --- Customers ---

def create_customer(db: Session, customer: schemas.CustomerCreate):
    db_customer = models.Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

def get_customers(db: Session):
    return db.query(models.Customer).all()

def get_customer(db: Session, customer_id: int):
    return db.query(models.Customer).filter(models.Customer.id == customer_id).first()

def update_customer(db: Session, customer_id: int, data: dict):
    db.query(models.Customer).filter(models.Customer.id == customer_id).update(data)
    db.commit()
    return get_customer(db, customer_id)

def delete_customer(db: Session, customer_id: int):
    db.query(models.Customer).filter(models.Customer.id == customer_id).delete()
    db.commit()


# --- Vehicles ---

def create_vehicle(db: Session, vehicle: schemas.VehicleCreate):
    db_vehicle = models.Vehicle(**vehicle.dict())
    db.add(db_vehicle)
    db.commit()
    db.refresh(db_vehicle)
    return db_vehicle

def get_vehicles(db: Session):
    return db.query(models.Vehicle).all()

def get_vehicle(db: Session, vehicle_id: int):
    return db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).first()

def get_vehicles_by_customer(db: Session, customer_id: int):
    return db.query(models.Vehicle).filter(models.Vehicle.customer_id == customer_id).all()

def update_vehicle(db: Session, vehicle_id: int, data: dict):
    db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).update(data)
    db.commit()
    return get_vehicle(db, vehicle_id)

def delete_vehicle(db: Session, vehicle_id: int):
    db.query(models.Vehicle).filter(models.Vehicle.id == vehicle_id).delete()
    db.commit()


# --- Line Items ---

def _recalc_line_item(li: models.LineItem):
    li.total = round(li.quantity * li.unit_price, 2)

def _recalc_totals(subtotal: float, tax_rate: float):
    tax_amount = round(subtotal * tax_rate / 100, 2) if tax_rate else 0
    total = round(subtotal + tax_amount, 2)
    return subtotal, tax_amount, total


# --- Estimates ---

def _next_estimate_number(db: Session):
    max_id = db.query(func.max(models.Estimate.id)).scalar() or 0
    return f"EST-{max_id + 1:06d}"

def create_estimate(db: Session, est: schemas.EstimateCreate):
    db_est = models.Estimate(
        estimate_number=_next_estimate_number(db),
        customer_id=est.customer_id,
        vehicle_id=est.vehicle_id,
        title=est.title or "",
        notes=est.notes or "",
        tax_rate=est.tax_rate,
        status=est.status,
        issue_date=est.issue_date,
        expiry_date=est.expiry_date,
    )
    subtotal = 0
    for li_data in est.line_items:
        li = models.LineItem(
            description=li_data.description,
            quantity=li_data.quantity,
            unit_price=li_data.unit_price,
            item_type=li_data.item_type,
        )
        _recalc_line_item(li)
        subtotal += li.total
        db_est.line_items.append(li)
    db_est.subtotal, db_est.tax_amount, db_est.total = _recalc_totals(subtotal, db_est.tax_rate)
    db.add(db_est)
    db.commit()
    db.refresh(db_est)
    return db_est

def get_estimates(db: Session):
    return db.query(models.Estimate).order_by(models.Estimate.created_at.desc()).all()

def get_estimate(db: Session, estimate_id: int):
    return db.query(models.Estimate).filter(models.Estimate.id == estimate_id).first()

def update_estimate(db: Session, estimate_id: int, est: schemas.EstimateUpdate):
    db_est = get_estimate(db, estimate_id)
    if not db_est:
        return None
    update_data = est.dict(exclude_unset=True)
    line_items_data = update_data.pop("line_items", None)
    for field, value in update_data.items():
        setattr(db_est, field, value)
    if line_items_data is not None:
        db.query(models.LineItem).filter(
            models.LineItem.estimate_id == estimate_id
        ).delete()
        subtotal = 0
        for li_data in line_items_data:
            li = models.LineItem(
                estimate_id=estimate_id,
                description=li_data["description"],
                quantity=li_data["quantity"],
                unit_price=li_data["unit_price"],
                item_type=li_data["item_type"],
            )
            _recalc_line_item(li)
            subtotal += li.total
            db.add(li)
        db_est.subtotal, db_est.tax_amount, db_est.total = _recalc_totals(subtotal, db_est.tax_rate)
    db.commit()
    db.refresh(db_est)
    return db_est

def delete_estimate(db: Session, estimate_id: int):
    db.query(models.Estimate).filter(models.Estimate.id == estimate_id).delete()
    db.commit()


# --- Invoices ---

def _next_invoice_number(db: Session):
    max_id = db.query(func.max(models.Invoice.id)).scalar() or 0
    return f"INV-{max_id + 1:06d}"

def create_invoice(db: Session, inv: schemas.InvoiceCreate):
    db_inv = models.Invoice(
        invoice_number=_next_invoice_number(db),
        customer_id=inv.customer_id,
        vehicle_id=inv.vehicle_id,
        notes=inv.notes or "",
        tax_rate=inv.tax_rate,
        status=inv.status,
        date_issued=inv.date_issued,
        due_date=inv.due_date,
    )
    subtotal = 0
    for li_data in inv.line_items:
        li = models.LineItem(
            description=li_data.description,
            quantity=li_data.quantity,
            unit_price=li_data.unit_price,
            item_type=li_data.item_type,
        )
        _recalc_line_item(li)
        subtotal += li.total
        db_inv.line_items.append(li)
    db_inv.subtotal, db_inv.tax_amount, db_inv.total = _recalc_totals(subtotal, db_inv.tax_rate)
    db.add(db_inv)
    db.commit()
    db.refresh(db_inv)
    return db_inv

def get_invoices(db: Session):
    return db.query(models.Invoice).order_by(models.Invoice.created_at.desc()).all()

def get_invoice(db: Session, invoice_id: int):
    return db.query(models.Invoice).filter(models.Invoice.id == invoice_id).first()

def update_invoice(db: Session, invoice_id: int, inv: schemas.InvoiceUpdate):
    db_inv = get_invoice(db, invoice_id)
    if not db_inv:
        return None
    update_data = inv.dict(exclude_unset=True)
    line_items_data = update_data.pop("line_items", None)
    for field, value in update_data.items():
        setattr(db_inv, field, value)
    if line_items_data is not None:
        db.query(models.LineItem).filter(
            models.LineItem.invoice_id == invoice_id
        ).delete()
        subtotal = 0
        for li_data in line_items_data:
            li = models.LineItem(
                invoice_id=invoice_id,
                description=li_data["description"],
                quantity=li_data["quantity"],
                unit_price=li_data["unit_price"],
                item_type=li_data["item_type"],
            )
            _recalc_line_item(li)
            subtotal += li.total
            db.add(li)
        db_inv.subtotal, db_inv.tax_amount, db_inv.total = _recalc_totals(subtotal, db_inv.tax_rate)
    db.commit()
    db.refresh(db_inv)
    return db_inv

def delete_invoice(db: Session, invoice_id: int):
    db.query(models.Invoice).filter(models.Invoice.id == invoice_id).delete()
    db.commit()


# --- Estimate → Invoice Conversion ---

def convert_estimate_to_invoice(db: Session, estimate_id: int):
    db_est = get_estimate(db, estimate_id)
    if not db_est:
        return None
    db_inv = models.Invoice(
        invoice_number=_next_invoice_number(db),
        customer_id=db_est.customer_id,
        vehicle_id=db_est.vehicle_id,
        estimate_id=estimate_id,
        notes=db_est.notes or "",
        tax_rate=db_est.tax_rate,
        subtotal=db_est.subtotal,
        tax_amount=db_est.tax_amount,
        total=db_est.total,
        status="unpaid",
        date_issued=db_est.issue_date,
    )
    for li in db_est.line_items:
        db_inv.line_items.append(models.LineItem(
            description=li.description,
            quantity=li.quantity,
            unit_price=li.unit_price,
            total=li.total,
            item_type=li.item_type,
        ))
    db.add(db_inv)
    db_est.status = "converted"
    db.commit()
    db.refresh(db_inv)
    return db_inv
