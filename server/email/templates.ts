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
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Healory Billing</h1>
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
          <p style="margin:0;color:#999;font-size:12px;text-align:center;">This is an automated billing email from Healory. Please contact support if you have questions.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function invoiceEmailText(d: InvoiceEmailData): string {
  const due = d.dueAt.toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  return `Healory — Monthly Invoice (${d.period})

Hello ${d.clinicName},

Your monthly invoice for ${d.period} has been generated.

Period:       ${d.period}
Patients:     ${d.patientCount}
Unit Price:   ${d.currency} ${d.unitPrice.toFixed(2)}
TOTAL DUE:    ${d.currency} ${d.total.toFixed(2)}
Due By:       ${due}

If payment is not received by the due date, access to the platform will be suspended.

Healory Billing`;
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
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Healory — Monthly Report</h1>
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
              <th style="padding:10px 12px;text-align:left;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.5px;">Institution</th>
              <th style="padding:10px 12px;text-align:center;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.5px;">Invoice</th>
              <th style="padding:10px 12px;text-align:center;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.5px;">Status</th>
              <th style="padding:10px 12px;text-align:right;font-size:13px;color:#666;text-transform:uppercase;letter-spacing:.5px;">Amount</th>
            </tr>
            ${rows}
          </table>
        </td></tr>
        <tr><td style="padding:20px 36px;background:#F4F6F9;border-top:1px solid #E8EDF2;">
          <p style="margin:0;color:#999;font-size:12px;text-align:center;">Healory automated monthly report. Generated at ${new Date().toISOString()}.</p>
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
  return `Healory — Monthly Report (${d.period})

SUMMARY
=======
Total Invoices:    ${d.totalInvoices}
Paid:              ${d.paid}
Unpaid:            ${d.unpaid}
Pending:           ${d.pending}
Suspended Institutions: ${d.suspendedClinics}

INSTITUTION BREAKDOWN
=====================
${"Institution".padEnd(30)} ${"Invoice".padEnd(10)} ${"Status".padEnd(10)} Amount
${"-".repeat(70)}
${lines.join("\n")}

Generated: ${new Date().toISOString()}`;
}

export interface ManagerPasswordResetData {
  managerEmail: string;
  tempPassword: string;
  clinicName?: string;
}

export function managerPasswordResetEmailHtml(d: ManagerPasswordResetData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Temporary Password</title></head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#0A3D62;padding:28px 36px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Healory</h1>
          <p style="margin:6px 0 0;color:#90CAF9;font-size:13px;">Credential Reset</p>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <h2 style="margin:0 0 12px;color:#0A3D62;font-size:19px;">Your New Temporary Password</h2>
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
            Your password reset request has been approved${d.clinicName ? ` for <strong>${d.clinicName}</strong>` : ""}. Use the temporary password below to log in.
          </p>
          <div style="background:#F4F6F9;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Temporary Password</p>
            <p style="margin:0;font-family:monospace;font-size:22px;font-weight:700;color:#0A3D62;letter-spacing:2px;">${d.tempPassword}</p>
          </div>
          <div style="background:#FFF8E1;border-left:4px solid #F9A825;border-radius:4px;padding:14px 16px;margin-bottom:24px;">
            <p style="margin:0;color:#795548;font-size:13px;line-height:1.5;">
              <strong>Security note:</strong> This password is temporary. You will be prompted to change it on your next login. Do not share this password with anyone.
            </p>
          </div>
          <p style="margin:0;color:#555;font-size:14px;">Log in to the Healory portal and change your password immediately.</p>
        </td></tr>
        <tr><td style="padding:16px 36px;background:#F4F6F9;border-top:1px solid #E8EDF2;">
          <p style="margin:0;color:#999;font-size:12px;text-align:center;">Healory secure credential system. If you did not request this reset, contact your administrator immediately.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function managerPasswordResetEmailText(d: ManagerPasswordResetData): string {
  return `Healory — New Temporary Password

Hello,

Your password reset request has been approved${d.clinicName ? ` for ${d.clinicName}` : ""}. 

TEMPORARY PASSWORD: ${d.tempPassword}

Use this password to log in, then change it immediately from Settings.

SECURITY: Do not share this password. If you did not request this reset, contact your administrator right away.`;
}

export interface GuestAccessKeyData {
  patientName?: string;
  accessKey: string;
  clinicName?: string;
}

export function guestAccessKeyEmailHtml(d: GuestAccessKeyData): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>New Guest Access Key</title></head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:32px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
        <tr><td style="background:#0369A1;padding:28px 36px;">
          <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:700;">Healory</h1>
          <p style="margin:6px 0 0;color:#BAE6FD;font-size:13px;">Guest Access Key</p>
        </td></tr>
        <tr><td style="padding:32px 36px;">
          <h2 style="margin:0 0 12px;color:#0369A1;font-size:19px;">Your New Guest Access Key</h2>
          <p style="margin:0 0 24px;color:#555;font-size:15px;line-height:1.6;">
            ${d.patientName ? `Hello <strong>${d.patientName}</strong>, a` : "A"} new guest access key has been generated${d.clinicName ? ` by <strong>${d.clinicName}</strong>` : ""}. Use the key below to access your patient portal.
          </p>
          <div style="background:#F0F9FF;border-radius:10px;padding:20px;text-align:center;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:1px;">Your Access Key</p>
            <p style="margin:0;font-family:monospace;font-size:22px;font-weight:700;color:#0369A1;letter-spacing:2px;">${d.accessKey}</p>
          </div>
          <div style="background:#F0FDF4;border-left:4px solid #22C55E;border-radius:4px;padding:14px 16px;margin-bottom:24px;">
            <p style="margin:0;color:#166534;font-size:13px;line-height:1.5;">
              <strong>How to use:</strong> Open the Healory app, select "Access Key Login", and enter this key. Your previous key and device binding have been reset.
            </p>
          </div>
          <div style="background:#FFF8E1;border-left:4px solid #F9A825;border-radius:4px;padding:14px 16px;">
            <p style="margin:0;color:#795548;font-size:13px;">
              <strong>Security:</strong> Keep this key confidential. Do not share it with anyone other than your clinic.
            </p>
          </div>
        </td></tr>
        <tr><td style="padding:16px 36px;background:#F4F6F9;border-top:1px solid #E8EDF2;">
          <p style="margin:0;color:#999;font-size:12px;text-align:center;">Healory secure access system. Contact your administrator if you did not request this.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function guestAccessKeyEmailText(d: GuestAccessKeyData): string {
  return `Healory — New Access Key

${d.patientName ? `Hello ${d.patientName},` : "Hello,"}

A new guest access key has been generated${d.clinicName ? ` by ${d.clinicName}` : ""}.

YOUR ACCESS KEY: ${d.accessKey}

Open the Healory app → Access Key Login → enter this key.
Your previous key and device binding have been reset.

SECURITY: Keep this key confidential.`;
}

export interface GuestRetentionArchiveEmailData {
  institutionName: string;
  guestName: string;
  guestKey: string;
  departureDate: string | null;
  scheduledPurgeAt: Date;
  documentCount: number;
  visitCount: number;
}

export function guestRetentionArchiveEmailHtml(d: GuestRetentionArchiveEmailData): string {
  const purgeAt = d.scheduledPurgeAt.toLocaleString("en-GB", {
    timeZone: "Europe/Istanbul",
    dateStyle: "full",
    timeStyle: "short",
  });
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Guest archive</title></head>
<body style="margin:0;padding:0;background:#F4F6F9;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#0A3D62;padding:24px 32px;">
          <h1 style="margin:0;color:#fff;font-size:20px;">Healory — Guest data archive</h1>
          <p style="margin:8px 0 0;color:#90CAF9;font-size:13px;">${d.institutionName}</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;color:#333;font-size:15px;line-height:1.6;">
            Operational data for guest <strong>${d.guestName}</strong> (${d.guestKey}) is scheduled for removal from the platform.
          </p>
          <table width="100%" style="border:1px solid #E8EDF2;border-radius:8px;">
            <tr><td style="padding:12px 16px;color:#666;font-size:13px;">Departure</td>
              <td style="padding:12px 16px;text-align:right;font-weight:600;">${d.departureDate ?? "—"}</td></tr>
            <tr style="background:#FAFBFC;"><td style="padding:12px 16px;color:#666;font-size:13px;">Scheduled removal</td>
              <td style="padding:12px 16px;text-align:right;font-weight:600;">${purgeAt}</td></tr>
            <tr><td style="padding:12px 16px;color:#666;font-size:13px;">Documents in export</td>
              <td style="padding:12px 16px;text-align:right;font-weight:600;">${d.documentCount}</td></tr>
            <tr style="background:#FAFBFC;"><td style="padding:12px 16px;color:#666;font-size:13px;">Visits in summary</td>
              <td style="padding:12px 16px;text-align:right;font-weight:600;">${d.visitCount}</td></tr>
          </table>
          <p style="margin:20px 0 0;color:#555;font-size:14px;line-height:1.6;">
            Attached: PDF summary and ZIP of uploaded PDFs (if any). This email is for your records before platform data removal.
          </p>
        </td></tr>
        <tr><td style="padding:16px 32px;background:#F4F6F9;border-top:1px solid #E8EDF2;">
          <p style="margin:0;color:#999;font-size:12px;text-align:center;">Internal operations notification — Healory</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function guestRetentionArchiveEmailText(d: GuestRetentionArchiveEmailData): string {
  const purgeAt = d.scheduledPurgeAt.toISOString();
  return `Healory — Guest data archive (${d.institutionName})

Guest: ${d.guestName} (${d.guestKey})
Departure: ${d.departureDate ?? "—"}
Scheduled removal: ${purgeAt}
Documents: ${d.documentCount}
Visits: ${d.visitCount}

PDF summary and uploaded PDFs (ZIP) are attached for your records before platform data removal.`;
}
