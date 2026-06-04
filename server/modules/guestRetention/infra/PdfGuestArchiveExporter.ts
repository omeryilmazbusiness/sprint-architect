import PDFDocument from "pdfkit";
import type { GuestArchiveBundle } from "../domain/GuestArchiveBundle";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", { timeZone: "UTC", dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export async function exportGuestArchivePdf(bundle: GuestArchiveBundle): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(18).text("Member operational archive", { align: "center" });
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#555").text(bundle.institutionName, { align: "center" });
    doc.fillColor("#000");
    doc.moveDown(1.2);

    const line = (label: string, value: string) => {
      doc.fontSize(10).font("Helvetica-Bold").text(`${label}: `, { continued: true });
      doc.font("Helvetica").text(value || "—");
    };

    doc.fontSize(12).font("Helvetica-Bold").text("Member");
    doc.moveDown(0.3);
    line("Name", bundle.fullName);
    line("Access key", bundle.guestKey);
    line("Email", bundle.email ?? "—");
    line("Phone", bundle.phone ?? "—");
    line("Nationality", bundle.nationality ?? "—");
    line("Arrival", bundle.arrivalDate ?? "—");
    line("Departure", bundle.departureDate ?? "—");
    line("Status", bundle.status);
    line("Scheduled removal", bundle.scheduledPurgeAt.toISOString());
    if (bundle.notes) line("Notes", bundle.notes);

    doc.moveDown(0.8);
    doc.fontSize(12).font("Helvetica-Bold").text("Assigned documents");
    doc.moveDown(0.3);
    if (bundle.documents.length === 0) {
      doc.fontSize(10).font("Helvetica").text("None");
    } else {
      for (const d of bundle.documents) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .text(
            `• ${d.typeName} — ${d.status}${d.fileName ? ` (${d.fileName})` : ""}${d.uploadedAt ? ` — ${fmtDate(d.uploadedAt)}` : ""}`
          );
      }
    }

    doc.moveDown(0.8);
    doc.fontSize(12).font("Helvetica-Bold").text("Visits");
    doc.moveDown(0.3);
    if (bundle.visits.length === 0) {
      doc.fontSize(10).font("Helvetica").text("None");
    } else {
      for (const v of bundle.visits) {
        doc
          .fontSize(10)
          .font("Helvetica")
          .text(`• ${v.title} — ${fmtDate(v.startAt)} — ${v.status}${v.providerName ? ` (${v.providerName})` : ""}`);
      }
    }

    doc.moveDown(1);
    doc.fontSize(8).fillColor("#888").text(
      "Internal operations export. Contains guest operational data scheduled for removal from the platform.",
      { align: "center" }
    );

    doc.end();
  });
}
