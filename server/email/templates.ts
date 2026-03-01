export interface InvoiceEmailData {
  clinicName: string;
  period: string;
  patientCount: number;
  unitPrice: number;
  total: number;
  currency: string;
  dueAt: Date;
}

export function invoiceEmailHtml(d: InvoiceEmailData): string {
  const due = d.dueAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "full", timeStyle: "short" });
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Invoice</title></head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#0A3D62;padding:28px 36px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">HealthTour Billing</h1>
          <p style="margin:6px 0 0;color:#90CAF9;font-size:14px;">Monthly Invoice</p>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <h2 style="margin:0 0 8px;color:#0A3D62;font-size:20px;">Hello, ${d.clinicName}</h2>
          <p style="margin:0 0 28px;color:#555;font-size:15px;line-height:1.6;">Your monthly invoice for <strong>${d.period}</strong> has been generated. Please review the details below.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E8EDF2;border-radius:8px;overflow:hidden;">
            <tr style="background:#F4F6F9;">
              <td style="padding:12px 16px;font-weight:600;color:#666;font-size:13px;text-transform:uppercase;letter-spacing:.5px;">Item</td>
              <td style="padding:12px 16px;font-weight:600;color:#666;font-size:13px;text-transform:uppercase;letter-spacing:.5px;text-align:right;">Value</td>
            </tr>
            <tr><td style="padding:14px 16px;border-top:1px solid #E8EDF2;color:#333;font-size:15px;">Billing Period</td><td style="padding:14px 16px;border-top:1px solid #E8EDF2;text-align:right;font-weight:600;color:#333;">${d.period}</td></tr>
            <tr style="background:#FAFBFC;"><td style="padding:14px 16px;border-top:1px solid #E8EDF2;color:#333;font-size:15px;">Patients</td><td style="padding:14px 16px;border-top:1px solid #E8EDF2;text-align:right;font-weight:600;color:#333;">${d.patientCount}</td></tr>
            <tr><td style="padding:14px 16px;border-top:1px solid #E8EDF2;color:#333;font-size:15px;">Unit Price</td><td style="padding:14px 16px;border-top:1px solid #E8EDF2;text-align:right;font-weight:600;color:#333;">${d.currency} ${d.unitPrice.toFixed(2)}</td></tr>
            <tr style="background:#0A3D62;"><td style="padding:16px;color:#fff;font-size:16px;font-weight:700;">Total Due</td><td style="padding:16px;text-align:right;color:#fff;font-size:20px;font-weight:700;">${d.currency} ${d.total.toFixed(2)}</td></tr>
          </table>
          <div style="margin-top:24px;padding:16px;background:#FFF8E1;border-left:4px solid #F9A825;border-radius:4px;">
            <p style="margin:0;color:#795548;font-size:14px;"><strong>Payment due by:</strong> ${due}</p>
            <p style="margin:8px 0 0;color:#795548;font-size:13px;">If payment is not received by the due date, access to the platform will be suspended.</p>
          </div>
        </td></tr>
        <tr><td style="padding:20px 36px;background:#F4F6F9;border-top:1px solid #E8EDF2;">
          <p style="margin:0;color:#999;font-size:12px;text-align:center;">This is an automated billing email from HealthTour. Please contact support if you have questions.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function invoiceEmailText(d: InvoiceEmailData): string {
  const due = d.dueAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  return `HealthTour — Monthly Invoice (${d.period})

Hello ${d.clinicName},

Your monthly invoice for ${d.period} has been generated.

Period:       ${d.period}
Patients:     ${d.patientCount}
Unit Price:   ${d.currency} ${d.unitPrice.toFixed(2)}
TOTAL DUE:    ${d.currency} ${d.total.toFixed(2)}
Due By:       ${due}

If payment is not received by the due date, access to the platform will be suspended.

HealthTour Billing`;
}

export interface MonthlyReportData {
  period: string;
  totalInvoices: number;
  paid: number;
  unpaid: number;
  pending: number;
  suspendedClinics: number;
  rows: Array<{
    clinicName: string;
    invoiceStatus: string;
    clinicStatus: string;
    total: number;
    currency: string;
  }>;
}

export function monthlyReportHtml(d: MonthlyReportData): string {
  const statusColor = (s: string) =>
    s === "PAID" ? "#2E7D32" : s === "UNPAID" ? "#C62828" : "#F57F17";
  const clinicColor = (s: string) =>
    s === "ACTIVE" ? "#2E7D32" : s === "SUSPENDED" ? "#C62828" : "#666";

  const rows = d.rows
    .map(
      (r) =>
        `<tr><td style="padding:10px 12px;border-top:1px solid #eee;">${r.clinicName}</td>` +
        `<td style="padding:10px 12px;border-top:1px solid #eee;text-align:center;"><span style="color:${statusColor(r.invoiceStatus)};font-weight:600;">${r.invoiceStatus}</span></td>` +
        `<td style="padding:10px 12px;border-top:1px solid #eee;text-align:center;"><span style="color:${clinicColor(r.clinicStatus)};font-weight:600;">${r.clinicStatus}</span></td>` +
        `<td style="padding:10px 12px;border-top:1px solid #eee;text-align:right;">${r.currency} ${r.total.toFixed(2)}</td></tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Monthly Report ${d.period}</title></head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:32px 0;">
    <tr><td align="center">
      <table width="700" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#0A3D62;padding:28px 36px;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">HealthTour — Monthly Report</h1>
          <p style="margin:6px 0 0;color:#90CAF9;font-size:14px;">Period: ${d.period}</p>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td style="padding:16px;background:#E8F5E9;border-radius:8px;text-align:center;width:22%;">
                <div style="font-size:28px;font-weight:700;color:#2E7D32;">${d.paid}</div>
                <div style="font-size:13px;color:#555;margin-top:4px;">Paid</div>
              </td>
              <td width="3%"></td>
              <td style="padding:16px;background:#FFEBEE;border-radius:8px;text-align:center;width:22%;">
                <div style="font-size:28px;font-weight:700;color:#C62828;">${d.unpaid}</div>
                <div style="font-size:13px;color:#555;margin-top:4px;">Unpaid</div>
              </td>
              <td width="3%"></td>
              <td style="padding:16px;background:#FFF8E1;border-radius:8px;text-align:center;width:22%;">
                <div style="font-size:28px;font-weight:700;color:#F57F17;">${d.pending}</div>
                <div style="font-size:13px;color:#555;margin-top:4px;">Pending</div>
              </td>
              <td width="3%"></td>
              <td style="padding:16px;background:#F3E5F5;border-radius:8px;text-align:center;width:22%;">
                <div style="font-size:28px;font-weight:700;color:#7B1FA2;">${d.suspendedClinics}</div>
                <div style="font-size:13px;color:#555;margin-top:4px;">Suspended</div>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #eee;border-radius:8px;overflow:hidden;">
            <tr style="background:#F4F6F9;">
              <th style="padding:10px 12px;text-align:left;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.5px;">Clinic</th>
              <th style="padding:10px 12px;text-align:center;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.5px;">Invoice</th>
              <th style="padding:10px 12px;text-align:center;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.5px;">Status</th>
              <th style="padding:10px 12px;text-align:right;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.5px;">Amount</th>
            </tr>
            ${rows}
          </table>
        </td></tr>
        <tr><td style="padding:20px 36px;background:#F4F6F9;border-top:1px solid #E8EDF2;">
          <p style="margin:0;color:#999;font-size:12px;text-align:center;">HealthTour automated monthly report. Generated at ${new Date().toISOString()}.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function monthlyReportText(d: MonthlyReportData): string {
  const lines = d.rows.map(
    (r) => `  ${r.clinicName.padEnd(30)} ${r.invoiceStatus.padEnd(10)} ${r.clinicStatus.padEnd(10)} ${r.currency} ${r.total.toFixed(2)}`
  );
  return `HealthTour — Monthly Report (${d.period})

SUMMARY
=======
Total Invoices:    ${d.totalInvoices}
Paid:              ${d.paid}
Unpaid:            ${d.unpaid}
Pending:           ${d.pending}
Suspended Clinics: ${d.suspendedClinics}

CLINIC BREAKDOWN
================
${"Clinic".padEnd(30)} ${"Invoice".padEnd(10)} ${"Clinic".padEnd(10)} Amount
${"-".repeat(70)}
${lines.join("\n")}

Generated: ${new Date().toISOString()}`;
}
