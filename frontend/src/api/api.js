const API_URL = "http://localhost:8000";

async function authFetch(token, path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      ...(options.body && !(options.body instanceof URLSearchParams)
        ? { "Content-Type": "application/json" }
        : {}),
    },
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "Request failed");
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return await res.json();
}

// --- Auth ---
export async function login(username, password) {
  const res = await fetch(`${API_URL}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }).toString(),
  });
  if (!res.ok) throw new Error("Login failed");
  return await res.json();
}

// --- Customers ---
export async function fetchCustomers(token) {
  return authFetch(token, "/customers/");
}

export async function addCustomer(token, customer) {
  return authFetch(token, "/customers/", {
    method: "POST",
    body: JSON.stringify(customer),
  });
}

export async function updateCustomer(token, id, data) {
  return authFetch(token, `/customers/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteCustomer(token, id) {
  return authFetch(token, `/customers/${id}`, { method: "DELETE" });
}

// --- Vehicles ---
export async function fetchVehicles(token) {
  return authFetch(token, "/vehicles/");
}

export async function addVehicle(token, vehicle) {
  return authFetch(token, "/vehicles/", {
    method: "POST",
    body: JSON.stringify(vehicle),
  });
}

export async function fetchVehiclesByCustomer(token, customerId) {
  return authFetch(token, `/vehicles/by-customer/${customerId}`);
}

export async function updateVehicle(token, id, data) {
  return authFetch(token, `/vehicles/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteVehicle(token, id) {
  return authFetch(token, `/vehicles/${id}`, { method: "DELETE" });
}

// --- Estimates ---
export async function fetchEstimates(token) {
  return authFetch(token, "/estimates/");
}

export async function getEstimate(token, id) {
  return authFetch(token, `/estimates/${id}`);
}

export async function createEstimate(token, data) {
  return authFetch(token, "/estimates/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateEstimate(token, id, data) {
  return authFetch(token, `/estimates/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteEstimate(token, id) {
  return authFetch(token, `/estimates/${id}`, { method: "DELETE" });
}

export async function convertEstimate(token, id) {
  return authFetch(token, `/estimates/${id}/convert`, { method: "POST" });
}

// --- Invoices ---
export async function fetchInvoices(token) {
  return authFetch(token, "/invoices/");
}

export async function getInvoice(token, id) {
  return authFetch(token, `/invoices/${id}`);
}

export async function createInvoice(token, data) {
  return authFetch(token, "/invoices/", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateInvoice(token, id, data) {
  return authFetch(token, `/invoices/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteInvoice(token, id) {
  return authFetch(token, `/invoices/${id}`, { method: "DELETE" });
}
