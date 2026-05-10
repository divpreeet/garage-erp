import React, { useEffect, useState } from "react";
import { fetchVehicles, addVehicle, fetchCustomers, deleteVehicle } from "../api/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import { Plus, Trash2, CarFront } from "lucide-react";

export default function Vehicles({ token }) {
  const [vehicles, setVehicles] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ registration: "", model: "", year: "", customer_id: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [v, c] = await Promise.all([fetchVehicles(token), fetchCustomers(token)]);
      setVehicles(v); setCustomers(c);
    } catch { setError("Could not load data"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [token]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.customer_id) { setError("Select a customer"); return; }
    setError("");
    try {
      await addVehicle(token, { ...form, year: form.year ? parseInt(form.year) : null, customer_id: parseInt(form.customer_id) });
      setForm({ registration: "", model: "", year: "", customer_id: "" });
      load();
    } catch { setError("Registration may already exist"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vehicle?")) return;
    try { await deleteVehicle(token, id); load(); } catch { setError("Could not delete"); }
  };

  const getCustomerName = (id) => customers.find((c) => c.id === id)?.name || `#${id}`;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <CarFront className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Vehicles</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Add Vehicle</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Registration *</label>
              <Input name="registration" placeholder="ABC 1234" value={form.registration} onChange={handleChange} required className="w-36" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Model</label>
              <Input name="model" placeholder="Toyota Camry" value={form.model} onChange={handleChange} className="w-44" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Year</label>
              <Input type="number" name="year" placeholder="2024" value={form.year} onChange={handleChange} className="w-24" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Customer</label>
              <select name="customer_id" value={form.customer_id} onChange={handleChange} required
                className="flex h-9 w-44 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                <option value="">Select customer</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Button type="submit" size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
          </form>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        {loading ? (
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        ) : vehicles.length === 0 ? (
          <CardContent className="py-8 text-center text-muted-foreground">No vehicles yet.</CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Registration</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vehicles.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium">{v.registration}</TableCell>
                  <TableCell className="text-muted-foreground">{v.model || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{v.year || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{getCustomerName(v.customer_id)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(v.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
