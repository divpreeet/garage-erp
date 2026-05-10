import React, { useEffect, useState, useCallback } from "react";
import {
  fetchInvoices, getInvoice, createInvoice, updateInvoice, deleteInvoice,
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
import { downloadInvoicePdf } from "../lib/pdf";
import {
  Receipt, Plus, Trash2, Pencil, X, FileDown, Send, RotateCcw,
} from "lucide-react";

const emptyForm = () => {
  const today = new Date().toISOString().split("T")[0];
  const due = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];
  return {
    customer_id: "", vehicle_id: "", notes: "",
    tax_rate: String(DEFAULT_VAT_RATE), status: "draft",
    date_issued: today, due_date: due,
    line_items: [{ description: "", quantity: "1", unit_price: "0", item_type: "labor" }],
  };
};

const statusVariant = (s) => {
  const map = {
    draft: "secondary", sent: "default", unpaid: "destructive",
    paid: "outline", cancelled: "secondary", refunded: "outline",
  };
  return map[s] || "secondary";
};

const statusActions = {
  draft: [{ label: "Mark Sent", status: "sent", variant: "default" }],
  sent: [
    { label: "Mark Unpaid", status: "unpaid", variant: "destructive" },
    { label: "Mark Paid", status: "paid", variant: "default" },
  ],
  unpaid: [
    { label: "Mark Paid", status: "paid", variant: "default" },
  ],
  paid: [{ label: "Refund", status: "refunded", variant: "outline" }],
};

export default function Invoices({ token }) {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [form, setForm] = useState(emptyForm());

  const loadInvoices = useCallback(async () => {
    setLoading(true); setError("");
    try { setInvoices(await fetchInvoices(token)); } catch { setError("Could not load invoices"); }
    setLoading(false);
  }, [token]);

  const loadCustomers = useCallback(async () => {
    try { setCustomers(await fetchCustomers(token)); } catch {}
  }, [token]);

  useEffect(() => { loadInvoices(); loadCustomers(); }, [loadInvoices, loadCustomers]);

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
    notes: form.notes,
    tax_rate: parseFloat(form.tax_rate) || 0,
    status: form.status,
    date_issued: form.date_issued,
    due_date: form.due_date || null,
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

  const resetForm = () => { setForm(emptyForm()); setEditingId(null); setViewDetail(null); setError(""); };

  const handleSave = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");
    const err = validate();
    if (err) { setError(err); return; }
    try {
      if (editingId && editingId !== "new") {
        await updateInvoice(token, editingId, buildPayload());
        setSuccess("Invoice updated");
      } else {
        await createInvoice(token, buildPayload());
        setSuccess("Invoice created");
      }
      resetForm();
      loadInvoices();
    } catch (e) { setError(e.message || "Save failed"); }
  };

  const handleEdit = async (id) => {
    try {
      const inv = await getInvoice(token, id);
      await loadVehicles(inv.customer_id);
      setEditingId(inv.id);
      setForm({
        customer_id: String(inv.customer_id), vehicle_id: String(inv.vehicle_id),
        notes: inv.notes || "",
        tax_rate: String(inv.tax_rate), status: inv.status,
        date_issued: inv.date_issued, due_date: inv.due_date || "",
        line_items: inv.line_items.length > 0
          ? inv.line_items.map((li) => ({
              description: li.description, quantity: String(li.quantity),
              unit_price: String(li.unit_price), item_type: li.item_type,
            }))
          : [{ description: "", quantity: "1", unit_price: "0", item_type: "labor" }],
      });
    } catch { setError("Could not load invoice"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this invoice?")) return;
    try { await deleteInvoice(token, id); loadInvoices(); } catch { setError("Could not delete"); }
  };

  const handleStatusChange = async (inv, newStatus) => {
    try {
      await updateInvoice(token, inv.id, { status: newStatus });
      setSuccess(`Status → "${newStatus}"`);
      loadInvoices();
    } catch { setError("Could not update status"); }
  };

  const getCustomerName = (id) => customers.find((c) => c.id === id)?.name || `#${id}`;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="h-6 w-6 text-amber-600" />
          <h1 className="text-2xl font-bold tracking-tight">Invoices</h1>
        </div>
        {!editingId && !viewDetail && (
          <Button onClick={() => { setEditingId("new"); setForm(emptyForm()); }} className="gap-1">
            <Plus className="h-4 w-4" />New Invoice
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{error}</p>}
      {success && <p className="text-sm text-emerald-600 bg-emerald-50 px-3 py-2 rounded-md">{success}</p>}

      {/* ── Form / Detail ── */}
      {(editingId || viewDetail) && (
        <Card key={editingId || "detail-" + (viewDetail?.id || "x")} className={viewDetail ? "border-amber-200" : "border-amber-300"}>
          <CardHeader className={viewDetail ? "bg-amber-50/50 border-b" : "bg-amber-100/50 border-b"}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {viewDetail ? (
                  <><Receipt className="h-4 w-4 text-amber-600" /> {viewDetail.invoice_number}</>
                ) : (
                  <><Pencil className="h-4 w-4 text-amber-600" />
                    {editingId === "new" ? "New Invoice" : `Edit ${invoices.find((i) => i.id === editingId)?.invoice_number || ""}`}</>
                )}
              </CardTitle>
              <div className="flex gap-2">
                {viewDetail && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => downloadInvoicePdf(viewDetail, getCustomerName(viewDetail.customer_id))}>
                      <FileDown className="h-3.5 w-3.5 mr-1" />PDF
                    </Button>
                    {statusActions[viewDetail.status]?.map((action) => (
                      <Button key={action.status} variant={action.variant} size="sm"
                        onClick={() => handleStatusChange(viewDetail, action.status)}
                        className="gap-1">
                        <RotateCcw className="h-3 w-3" />{action.label}
                      </Button>
                    ))}
                    {viewDetail.status !== "paid" && viewDetail.status !== "refunded" && (
                      <Button variant="ghost" size="sm"                         onClick={() => { setViewDetail(null); handleEdit(viewDetail.id); }}>
                        <Pencil className="h-3 w-3 mr-1" />Edit
                      </Button>
                    )}
                  </>
                )}
                {!viewDetail && (
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    <X className="h-3.5 w-3.5 mr-1" />Cancel
                  </Button>
                )}
                {(viewDetail || editingId) && (
                  <Button variant="outline" size="sm" onClick={resetForm}>
                    Back to List
                  </Button>
                )}
              </div>
            </div>
            {viewDetail && (
              <div className="flex gap-4 mt-2 text-sm">
                <span className="text-muted-foreground">Customer: <strong>{getCustomerName(viewDetail.customer_id)}</strong></span>
                <span className="text-muted-foreground">Issued: <strong>{viewDetail.date_issued}</strong></span>
                {viewDetail.due_date && <span className="text-muted-foreground">Due: <strong>{viewDetail.due_date}</strong></span>}
                {viewDetail.estimate_id && <span className="text-muted-foreground">From Estimate: <strong>#{viewDetail.estimate_id}</strong></span>}
              </div>
            )}
          </CardHeader>

          {viewDetail && (
            <CardContent className="pt-6">
              {/* Detail View */}
              <div className="space-y-4">
                {viewDetail.notes && (
                  <div className="text-sm bg-muted/30 p-3 rounded-md"><span className="font-medium">Notes:</span> {viewDetail.notes}</div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Unit Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewDetail.line_items.map((li) => (
                      <TableRow key={li.id}>
                        <TableCell>{li.description}</TableCell>
                        <TableCell className="capitalize">{li.item_type}</TableCell>
                        <TableCell className="text-right">{li.quantity}</TableCell>
                        <TableCell className="text-right">{formatAED(li.unit_price)}</TableCell>
                        <TableCell className="text-right font-medium">{formatAED(li.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex justify-between w-64 text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>{formatAED(viewDetail.subtotal)}</span>
                  </div>
                  <div className="flex justify-between w-64 text-sm">
                    <span className="text-muted-foreground">VAT ({viewDetail.tax_rate}%)</span>
                    <span>{formatAED(viewDetail.tax_amount)}</span>
                  </div>
                  <Separator className="w-64" />
                  <div className="flex justify-between w-64 text-base font-bold text-amber-700">
                    <span>Total</span>
                    <span>{formatAED(viewDetail.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          )}

          {editingId && !viewDetail && (
            <CardContent className="pt-6 space-y-6">
              <form onSubmit={handleSave} id="invoice-form">
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
                          <SelectItem value={form.vehicle_id} disabled>Loading...</SelectItem>
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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={form.status} onValueChange={handleFormField("status")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Issue Date</label>
                    <Input type="date" value={form.date_issued} onChange={(e) => setForm((f) => ({ ...f, date_issued: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Due Date</label>
                    <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <label className="text-sm font-medium">Notes</label>
                  <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Invoice notes..." />
                </div>

                <Separator className="my-6" />

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
                  <div className="flex justify-between w-64 text-base font-bold text-amber-700">
                    <span>Total</span>
                    <span>{formatAED(calcTotal())}</span>
                  </div>
                </div>
              </form>

              <div className="flex gap-2 justify-end pt-2 border-t">
                <Button variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-1" />Cancel
                </Button>
                <Button type="submit" form="invoice-form">
                  <Receipt className="h-4 w-4 mr-1" />
                  {editingId === "new" ? "Create Invoice" : "Update Invoice"}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* ── List ── */}
      {!editingId && !viewDetail && (
        <Card>
          {loading ? (
            <CardContent className="py-10 text-center text-muted-foreground">Loading...</CardContent>
          ) : invoices.length === 0 ? (
            <CardContent className="py-10 text-center text-muted-foreground">
              No invoices yet. <Button variant="link" className="p-0" onClick={() => { setEditingId("new"); setForm(emptyForm()); }}>Create one</Button>
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="w-52"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-medium">{inv.invoice_number}</TableCell>
                    <TableCell className="font-medium">{getCustomerName(inv.customer_id)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{inv.date_issued}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{inv.due_date || "-"}</TableCell>
                    <TableCell><Badge variant={statusVariant(inv.status)} className="capitalize">{inv.status}</Badge></TableCell>
                    <TableCell className="text-right font-semibold">{formatAED(inv.total)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => { setViewDetail(inv); setEditingId(null); }}>
                          View
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-amber-600" onClick={() => downloadInvoicePdf(inv, getCustomerName(inv.customer_id))} title="Download PDF">
                          <FileDown className="h-3.5 w-3.5" />
                        </Button>
                        {inv.status !== "paid" && inv.status !== "refunded" && (
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(inv.id)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(inv.id)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
