from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from . import crud, schemas, database, auth
from typing import List

router = APIRouter()


# --- Auth ---

@router.post("/token", response_model=schemas.Token)
def login_for_access_token(
    form_data: auth.OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(database.get_db),
):
    user = auth.authenticate_admin(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    access_token = auth.create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/admin-users/", response_model=schemas.AdminUserOut)
def create_admin_user(
    user: schemas.AdminUserCreate,
    db: Session = Depends(database.get_db),
):
    if crud.get_admin_by_username(db, user.username):
        raise HTTPException(status_code=400, detail="Username already exists")
    hashed_pw = auth.get_password_hash(user.password)
    return crud.create_admin_user(db, user, hashed_pw)


# --- Customers ---

@router.post("/customers/", response_model=schemas.Customer)
def create_customer(
    customer: schemas.CustomerCreate,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    return crud.create_customer(db, customer)


@router.get("/customers/", response_model=List[schemas.Customer])
def get_customers(
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    return crud.get_customers(db)


@router.get("/customers/{customer_id}", response_model=schemas.Customer)
def get_customer(
    customer_id: int,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    c = crud.get_customer(db, customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return c


@router.put("/customers/{customer_id}", response_model=schemas.Customer)
def update_customer(
    customer_id: int,
    data: schemas.CustomerCreate,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    c = crud.get_customer(db, customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    return crud.update_customer(db, customer_id, data.dict())


@router.delete("/customers/{customer_id}", status_code=204)
def delete_customer(
    customer_id: int,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    crud.delete_customer(db, customer_id)


# --- Vehicles ---

@router.post("/vehicles/", response_model=schemas.Vehicle)
def create_vehicle(
    vehicle: schemas.VehicleCreate,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    return crud.create_vehicle(db, vehicle)


@router.get("/vehicles/", response_model=List[schemas.Vehicle])
def get_vehicles(
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    return crud.get_vehicles(db)


@router.get("/vehicles/by-customer/{customer_id}", response_model=List[schemas.Vehicle])
def get_vehicles_by_customer(
    customer_id: int,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    return crud.get_vehicles_by_customer(db, customer_id)


@router.get("/vehicles/{vehicle_id}", response_model=schemas.Vehicle)
def get_vehicle(
    vehicle_id: int,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    v = crud.get_vehicle(db, vehicle_id)
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return v


@router.put("/vehicles/{vehicle_id}", response_model=schemas.Vehicle)
def update_vehicle(
    vehicle_id: int,
    data: schemas.VehicleCreate,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    v = crud.get_vehicle(db, vehicle_id)
    if not v:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return crud.update_vehicle(db, vehicle_id, data.dict())


@router.delete("/vehicles/{vehicle_id}", status_code=204)
def delete_vehicle(
    vehicle_id: int,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    crud.delete_vehicle(db, vehicle_id)


# --- Estimates ---

@router.post("/estimates/", response_model=schemas.Estimate)
def create_estimate(
    estimate: schemas.EstimateCreate,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    return crud.create_estimate(db, estimate)


@router.get("/estimates/", response_model=List[schemas.Estimate])
def get_estimates(
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    return crud.get_estimates(db)


@router.get("/estimates/{estimate_id}", response_model=schemas.Estimate)
def get_estimate(
    estimate_id: int,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    est = crud.get_estimate(db, estimate_id)
    if not est:
        raise HTTPException(status_code=404, detail="Estimate not found")
    return est


@router.put("/estimates/{estimate_id}", response_model=schemas.Estimate)
def update_estimate(
    estimate_id: int,
    estimate: schemas.EstimateUpdate,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    est = crud.update_estimate(db, estimate_id, estimate)
    if not est:
        raise HTTPException(status_code=404, detail="Estimate not found")
    return est


@router.delete("/estimates/{estimate_id}", status_code=204)
def delete_estimate(
    estimate_id: int,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    crud.delete_estimate(db, estimate_id)


@router.post("/estimates/{estimate_id}/convert", response_model=schemas.Invoice)
def convert_estimate(
    estimate_id: int,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    est = crud.get_estimate(db, estimate_id)
    if not est:
        raise HTTPException(status_code=404, detail="Estimate not found")
    if est.status == "converted":
        raise HTTPException(status_code=400, detail="Estimate already converted")
    inv = crud.convert_estimate_to_invoice(db, estimate_id)
    return inv


# --- Invoices ---

@router.post("/invoices/", response_model=schemas.Invoice)
def create_invoice(
    invoice: schemas.InvoiceCreate,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    return crud.create_invoice(db, invoice)


@router.get("/invoices/", response_model=List[schemas.Invoice])
def get_invoices(
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    return crud.get_invoices(db)


@router.get("/invoices/{invoice_id}", response_model=schemas.Invoice)
def get_invoice(
    invoice_id: int,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    inv = crud.get_invoice(db, invoice_id)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@router.put("/invoices/{invoice_id}", response_model=schemas.Invoice)
def update_invoice(
    invoice_id: int,
    invoice: schemas.InvoiceUpdate,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    inv = crud.update_invoice(db, invoice_id, invoice)
    if not inv:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return inv


@router.delete("/invoices/{invoice_id}", status_code=204)
def delete_invoice(
    invoice_id: int,
    db: Session = Depends(database.get_db),
    admin=Depends(auth.get_current_admin),
):
    crud.delete_invoice(db, invoice_id)
