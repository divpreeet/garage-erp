import React, { useEffect, useState, useCallback } from "react";
import {
  fetchEstimates, getEstimate, createEstimate, updateEstimate, deleteEstimate, convertEstimate,
  fetchCustomers, fetchVehiclesByCustomer,
} from "../api/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "../components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { formatAED, DEFAULT_VAT_RATE } from "../lib/currency";
import {
  FileText, Plus, Trash2, Pencil, ArrowRightCircle, X,
} from "lucide-react";

const emptyForm = () => {
  const today = new Date().toISOString().split("T")[0];
  const expiry = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  return {
    customer_id: "", vehicle_id: "", title: "", notes: "",
    tax_rate: String(DEFAULT_VAT_RATE), status: "draft",
    issue_date: today, expiry_date: expiry,
    line_items: [{ description: "", quantity: "1", unit_price: "0", item_type: "labor" }],
  };
};

const statusVariant = (s) => {
  const map = {
    draft: "secondary", sent: "default", accepted: "outline",
    rejected: "destructive", converted: "secondary",
  };
  return map[s] || "secondary";
};

export default function Estimates({ token }) {
  const [estimates, setEstimates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const loadEstimates = useCallback(async () => {
    setLoading(true); setError("");
    try { setEstimates(await fetchEstimates(token)); } catch { setError("Could not load estimates"); }
    setLoading(false);
  }, [token]);

  const loadCustomers = useCallback(async () => {
    try { setCustomers(await fetchCustomers(token)); } catch {}
  }, [token]);

  useEffect(() => { loadEstimates(); loadCustomers(); }, [loadEstimates, loadCustomers]);

  const loadVehicles = async (cid) => {
    if (!cid) { setVehicles([]); return; }
    try { setVehicles(await fetchVehiclesByCustomer(token, cid)); } catch {}
  };

  const handleFormField = (field) => (value) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleLiChange = (idx, field, value) => {
    setForm((f) => {
      const items = [...f.line_items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...f, line_items: items };
    });
  };

  const addLineItem = () =>
    setForm((f) => ({ ...f, line_items: [...f.line_items, { description: "", quantity: "1", unit_price: "0", item_type: "labor" }] }));

  const removeLineItem = (idx) =>
    setForm((f) => ({ ...f, line_items: f.line_items.filter((_, i) => i !== idx) }));

  const calcSubtotal = () =>
    form.line_items.reduce((s, li) => s + (parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0), 0);
  const calcTax = () => calcSubtotal() * (parseFloat(form.tax_rate) || 0) / 100;
  const calcTotal = () => calcSubtotal() + calcTax();

  const buildPayload = () => ({
    customer_id: parseInt(form.customer_id),
    vehicle_id: parseInt(form.vehicle_id),
    title: form.title, notes: form.notes,
    tax_rate: parseFloat(form.tax_rate) || 0,
    status: form.status,
    issue_date: form.issue_date,
    expiry_date: form.expiry_date || null,
    line_items: form.line_items.map((li) => ({
      description: li.description,
      quantity: parseFloat(li.quantity) || 1,
      unit_price: parseFloat(li.unit_price) || 0,
      item_type: li.item_type,
    })),
  });

  const validate = () => {
    if (!form.customer_id) return "Select a customer";
    if (!form.vehicle_id) return "Select a vehicle";
    if (!form.line_items.length || !form.line_items[0].description) return "Add at least one line item";
    return null;
  };

  const resetForm = () => { setForm(emptyForm()); setEditingId(null); setError(""); };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const err = validate();
    if (err) { setError(err); return; }
    try {
      if (editingId && editingId !== "new") {
        await updateEstimate(token, editingId, buildPayload());
        setSuccess("Estimate updated");
      } else {
        await createEstimate(token, buildPayload());
        setSuccess("Estimate created");
      }
      resetForm();
      loadEstimates();
    } catch (e) { setError(e.message || "Save failed"); }
  };

  const handleEdit = async (id) => {
    try {
      const est = await getEstimate(token, id);
      await loadVehicles(est.customer_id);
      setEditingId(est.id);
      setForm({
        customer_id: String(est.customer_id), vehicle_id: String(est.vehicle_id),
        title: est.title || "", notes: est.notes || "",
        tax_rate: String(est.tax_rate), status: est.status,
        issue_date: est.issue_date, expiry_date: est.expiry_date || "",
        line_items: est.line_items.length > 0
          ? est.line_items.map((li) => ({
              description: li.description, quantity: String(li.quantity),
              unit_price: String(li.unit_price), item_type: li.item_type,
            }))
          : [{ description: "", quantity: "1", unit_price: "0", item_type: "labor" }],
      });
    } catch { setError("Could not load estimate"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this estimate?")) return;
    try { await deleteEstimate(token, id); loadEstimates(); } catch { setError("Could not delete"); }
  };

  const handleConvert = async (id) => {
    if (!window.confirm("Convert this estimate to an invoice?")) return;
    setError(""); setSuccess("");
    try { const inv = await convertEstimate(token, id); setSuccess(`Converted → ${inv.invoice_number}`); loadEstimates(); }
    catch (e) { setError(e.message || "Conversion failed"); }
  };

  const getCustomerName = (id) => customers.find((c) => c.id === id)?.name || `#${id}`;
  const getVehicleLabel = (id) => {
    const v = vehicles.find((v) => v.id === parseInt(id));
    return v ? `${v.registration}${v.model ? ` — ${v.model}` : ""}` : "";
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-sky-600" />
          <h1 className="text-2xl font-bold tracking-tight">Estimates / Quotes</h1>
        </div>
        {!editingId && (
          <Button onClick={() => { setEditingId("new"); setForm(emptyForm()); }} className="gap-1">
            <Plus className="h-4 w-4" />New Estimate
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
      {success && <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md">{success}</p>}

      {/* ── Form ── */}
      {editingId && (
        <Card key={editingId} className="border-sky-200">
          <CardHeader className="bg-sky-50/50 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pencil className="h-4 w-4 text-sky-600" />
              {editingId === "new" ? "New Estimate / Quote" : `Edit ${estimates.find((e) => e.id === editingId)?.estimate_number || ""}`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-6">
            <form onSubmit={handleSave} id="estimate-form">
              {/* Customer & Vehicle */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Customer</label>
                  <Select value={form.customer_id} onValueChange={(v) => { setForm((f) => ({ ...f, customer_id: v, vehicle_id: "" })); loadVehicles(v); }}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vehicle</label>
                  <Select value={form.vehicle_id} onValueChange={handleFormField("vehicle_id")} disabled={!form.customer_id}>
                    <SelectTrigger>
                      <SelectValue placeholder={!form.customer_id ? "Select customer first" : vehicles.length === 0 ? "Loading vehicles..." : "Select vehicle"} />
                    </SelectTrigger>
                    <SelectContent>
                      {form.vehicle_id && !vehicles.find((v) => String(v.id) === form.vehicle_id) && (
                        <SelectItem value={form.vehicle_id} disabled>
                          Loading...
                        </SelectItem>
                      )}
                      {vehicles.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.registration}{v.model ? ` — ${v.model}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title</label>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Brake Service" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Status</label>
                  <Select value={form.status} onValueChange={handleFormField("status")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="sent">Sent</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Issue Date</label>
                  <Input type="date" value={form.issue_date} onChange={(e) => setForm((f) => ({ ...f, issue_date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Valid Until</label>
                  <Input type="date" value={form.expiry_date} onChange={(e) => setForm((f) => ({ ...f, expiry_date: e.target.value }))} />
                </div>
              </div>

              <div className="space-y-2 mt-4">
                <label className="text-sm font-medium">Notes (internal)</label>
                <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any notes about this estimate..." />
              </div>

              <Separator className="my-6" />

              {/* Line Items */}
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Line Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-3 w-3 mr-1" />Add Row
                </Button>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[220px]">Description</TableHead>
                      <TableHead className="w-32">Type</TableHead>
                      <TableHead className="w-24 text-right">Qty</TableHead>
                      <TableHead className="w-32 text-right">Unit Price</TableHead>
                      <TableHead className="w-32 text-right">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {form.line_items.map((li, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Input value={li.description} onChange={(e) => handleLiChange(i, "description", e.target.value)}
                            placeholder="Description" required={i === 0} className="h-8 text-sm" />
                        </TableCell>
                        <TableCell>
                          <select value={li.item_type} onChange={(e) => handleLiChange(i, "item_type", e.target.value)}
                            className="flex h-8 w-28 shrink-0 rounded-md border border-input bg-transparent px-2 text-sm">
                            <option value="labor">Labor</option>
                            <option value="part">Part</option>
                            <option value="other">Other</option>
                          </select>
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="any" value={li.quantity} onChange={(e) => handleLiChange(i, "quantity", e.target.value)}
                            min="0" className="h-8 text-sm text-right" />
                        </TableCell>
                        <TableCell>
                          <Input type="number" step="0.01" value={li.unit_price} onChange={(e) => handleLiChange(i, "unit_price", e.target.value)}
                            min="0" className="h-8 text-sm text-right" />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatAED((parseFloat(li.quantity) || 0) * (parseFloat(li.unit_price) || 0))}
                        </TableCell>
                        <TableCell>
                          {form.line_items.length > 1 && (
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeLineItem(i)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="flex flex-col items-end gap-1.5 mt-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground">VAT Rate (%)</label>
                  <Input type="number" step="0.1" value={form.tax_rate}
                    onChange={(e) => setForm((f) => ({ ...f, tax_rate: e.target.value }))}
                    className="w-20 h-8 text-sm text-right" />
                </div>
                <Separator className="w-64" />
                <div className="flex justify-between w-64 text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">{formatAED(calcSubtotal())}</span>
                </div>
                <div className="flex justify-between w-64 text-sm">
                  <span className="text-muted-foreground">VAT ({form.tax_rate || 0}%)</span>
                  <span className="font-medium">{formatAED(calcTax())}</span>
                </div>
                <Separator className="w-64" />
                <div className="flex justify-between w-64 text-base font-bold text-sky-700">
                  <span>Total</span>
                  <span>{formatAED(calcTotal())}</span>
                </div>
              </div>
            </form>

            <div className="flex gap-2 justify-end pt-2 border-t">
              <Button variant="outline" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>
                <X className="h-4 w-4 mr-1" />Cancel
              </Button>
              <Button type="submit" form="estimate-form">
                <FileText className="h-4 w-4 mr-1" />
                {editingId === "new" ? "Create Estimate" : "Update Estimate"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── List ── */}
      {!editingId && (
        <Card>
          {loading ? (
            <CardContent className="py-10 text-center text-muted-foreground">Loading...</CardContent>
          ) : estimates.length === 0 ? (
            <CardContent className="py-10 text-center text-muted-foreground">
              No estimates yet. <Button variant="link" className="p-0" onClick={() => { setEditingId("new"); setForm(emptyForm()); }}>Create one</Button>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Valid Until</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-52"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {estimates.map((est) => (
                  <TableRow key={est.id}>
                    <TableCell className="font-mono text-xs font-medium">{est.estimate_number}</TableCell>
                    <TableCell className="font-medium">{getCustomerName(est.customer_id)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[160px] truncate">{est.title || "-"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{est.issue_date}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{est.expiry_date || "-"}</TableCell>
                    <TableCell><Badge variant={statusVariant(est.status)} className="capitalize">{est.status}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{formatAED(est.total)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {est.status !== "converted" && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(est.id)} title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600" onClick={() => handleConvert(est.id)} title="Convert to Invoice">
                              <ArrowRightCircle className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(est.id)} title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {est.status === "converted" && (
                          <span className="text-xs text-muted-foreground italic">Converted</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      )}
    </div>
  );
}
