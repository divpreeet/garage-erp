import React, { useEffect, useState } from "react";
import { fetchCustomers, addCustomer, deleteCustomer } from "../api/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import { Plus, Trash2, Users } from "lucide-react";

export default function Customers({ token }) {
  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState({ name: "", phone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      try { setCustomers(await fetchCustomers(token)); } catch { setError("Could not load customers"); }
      setLoading(false);
    })();
  }, [token]);

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAdd = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await addCustomer(token, form);
      setForm({ name: "", phone: "", email: "" });
      setCustomers(await fetchCustomers(token));
    } catch { setError("Could not add customer"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this customer and all their data?")) return;
    try {
      await deleteCustomer(token, id);
      setCustomers(await fetchCustomers(token));
    } catch { setError("Could not delete customer"); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight">Customers</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Add Customer</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <Input name="name" placeholder="Full name" value={form.name} onChange={handleChange} required className="w-48" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <Input name="phone" placeholder="+971 50 123 4567" value={form.phone} onChange={handleChange} className="w-44" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input name="email" placeholder="email@example.com" value={form.email} onChange={handleChange} className="w-52" />
            </div>
            <Button type="submit" size="sm"><Plus className="h-4 w-4 mr-1" />Add</Button>
          </form>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        {loading ? (
          <CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent>
        ) : customers.length === 0 ? (
          <CardContent className="py-8 text-center text-muted-foreground">No customers yet.</CardContent>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell className="text-muted-foreground">{c.phone || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">{c.email || "-"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(c.id)}>
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
