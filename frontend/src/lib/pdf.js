import { jsPDF } from "jspdf";
import { formatAED } from "./currency";

export function generateInvoicePdf(invoice, customerName) {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  const m = 20;
  const lx = m;
  const rx = pw - m;
  const mid = 110;
  const nr = 7; // nominal row height

  const y = (row) => m + row * nr;

  // ── Header ──
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", lx, y(2));
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`# ${invoice.invoice_number}`, lx, y(3.5));

  doc.setFontSize(9);
  doc.text("GARAGE ERP", rx, y(2), { align: "right" });
  doc.text("Dubai, United Arab Emirates", rx, y(3), { align: "right" });
  doc.text("VAT Reg: 100123456700003", rx, y(4), { align: "right" });

  // ── Separator ──
  doc.setDrawColor(200);
  doc.line(lx, y(5.5), rx, y(5.5));

  // ── Bill To / Dates ──
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", lx, y(7));
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(customerName, lx, y(8.5));

  doc.setFont("helvetica", "bold");
  doc.text("Issue Date:", mid, y(7));
  doc.setFont("helvetica", "normal");
  doc.text(invoice.date_issued, mid + 30, y(7));

  doc.setFont("helvetica", "bold");
  doc.text("Due Date:", mid, y(8.5));
  doc.setFont("helvetica", "normal");
  doc.text(invoice.due_date || "N/A", mid + 30, y(8.5));

  // ── Table header row ──
  const tHeadTop = 10.5;
  const tHeadH = 8;
  doc.setDrawColor(210);
  doc.setFillColor(248, 248, 250);
  doc.rect(lx, y(tHeadTop), rx - lx, tHeadH, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Description", lx + 3, y(tHeadTop) + 5.5);
  doc.text("Qty", lx + 110, y(tHeadTop) + 5.5);
  doc.text("Unit Price", lx + 130, y(tHeadTop) + 5.5);
  doc.text("Total", rx - 3, y(tHeadTop) + 5.5, { align: "right" });

  // ── Line items ──
  const descX = lx + 3;
  const qtyX = lx + 115;
  const upX = lx + 145;
  const totalX = rx - 3;
  let row = tHeadTop + 1.6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  invoice.line_items.forEach((li, i) => {
    const rowY = y(row);
    // faint alternating bg
    if (i % 2 === 0) {
      doc.setFillColor(252, 252, 253);
      doc.rect(lx, rowY - 4, rx - lx, nr - 1, "F");
    }
    doc.text(li.description.substring(0, 45), descX, rowY);
    doc.text(String(li.quantity), qtyX, rowY, { align: "right" });
    doc.text(formatAED(li.unit_price), upX, rowY, { align: "right" });
    doc.text(formatAED(li.total), totalX, rowY, { align: "right" });
    row += 1.2;
  });

  // ── Totals section ──
  row += 1.2;
  const totalsTop = y(row);

  // thin separator above subtotal
  doc.setDrawColor(220);
  doc.setLineWidth(0.3);
  doc.line(lx + 60, totalsTop - 4, rx, totalsTop - 4);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Subtotal", lx + 100, totalsTop);
  doc.text(formatAED(invoice.subtotal), rx, totalsTop, { align: "right" });
  row += 1.4;

  doc.text(`VAT (${invoice.tax_rate}%)`, lx + 100, y(row));
  doc.text(formatAED(invoice.tax_amount), rx, y(row), { align: "right" });
  row += 1.2;

  // thicker separator before total
  doc.setDrawColor(180);
  doc.setLineWidth(0.6);
  doc.line(lx + 60, y(row) - 3, rx, y(row) - 3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Total:", lx + 100, y(row) + 1);
  doc.text(formatAED(invoice.total), rx, y(row) + 1, { align: "right" });

  // ── Footer ──
  const footerY = doc.internal.pageSize.getHeight() - 18;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(140);
  doc.text("Thank you for your business.", lx, footerY);
  doc.text("Payment due within 30 days.", lx, footerY + 4.5);

  return doc;
}

export function downloadInvoicePdf(invoice, customerName) {
  const doc = generateInvoicePdf(invoice, customerName);
  doc.save(`invoice-${invoice.invoice_number}.pdf`);
}

export function openInvoicePdf(invoice, customerName) {
  const doc = generateInvoicePdf(invoice, customerName);
  return doc.output("datauristring");
}
