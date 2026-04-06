import { notificationRepo } from "../repositories/notificationRepo";
import { pushService } from "./PushService";

export type NotificationSeverity = "INFO" | "WARNING" | "CRITICAL";

export type NotificationEventType =
  | "INVOICE_GENERATED"
  | "INVOICE_OVERDUE"
  | "CLINIC_SUSPENDED"
  | "BILLING_JOB_FAILED"
  | "GUEST_CREATED"
  | "GUEST_APPROVED"
  | "GUEST_STATUS_CHANGED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_APPROVED"
  | "DOCUMENT_REJECTED"
  | "DOCUMENT_ASSIGNED"
  | "APPOINTMENT_CREATED"
  | "APPOINTMENT_UPDATED"
  | "APPOINTMENT_CANCELLED"
  | "JOURNEY_UPDATED"
  | "HOTEL_ASSIGNED"
  | "TRANSPORT_ASSIGNED"
  | "DOCTOR_ASSIGNED"
  | "WELCOME"
  | "SCHEDULER_FAILED"
  | "EMAIL_SEND_FAILED";

export interface NotificationEvent {
  type: NotificationEventType;
  title: string;
  body: string;
  severity: NotificationSeverity;
  relatedId?: string;
  relatedType?: string;
  metadata?: Record<string, unknown>;
}

export const notificationService = {
  async emitAdminNotification(event: NotificationEvent): Promise<void> {
    try {
      const notification = await notificationRepo.create({
        clinicId: null,
        targetRole: "ADMIN",
        title: event.title,
        body: event.body,
        type: event.type,
        severity: event.severity,
        relatedId: event.relatedId,
        relatedType: event.relatedType,
        metadata: event.metadata,
      });

      pushService.sendToRole("ADMIN", {
        title: event.title,
        body: event.body,
        data: {
          type: event.type,
          notificationId: notification.id,
          relatedId: event.relatedId ?? null,
          relatedType: event.relatedType ?? null,
          severity: event.severity,
        },
      }).catch((err) => console.error("[NotificationService] admin push failed:", err));
    } catch (err) {
      console.error("[NotificationService] emitAdminNotification failed:", err);
    }
  },

  async emitManagerNotification(clinicId: string, event: NotificationEvent): Promise<void> {
    try {
      const notification = await notificationRepo.create({
        clinicId,
        targetRole: "MANAGER",
        title: event.title,
        body: event.body,
        type: event.type,
        severity: event.severity,
        relatedId: event.relatedId,
        relatedType: event.relatedType,
        metadata: event.metadata,
      });

      pushService.sendToClinicRole(clinicId, "MANAGER", {
        title: event.title,
        body: event.body,
        data: {
          type: event.type,
          notificationId: notification.id,
          relatedId: event.relatedId ?? null,
          relatedType: event.relatedType ?? null,
          severity: event.severity,
        },
      }).catch((err) => console.error("[NotificationService] manager push failed:", err));
    } catch (err) {
      console.error("[NotificationService] emitManagerNotification failed:", err);
    }
  },

  async emitGuestNotification(
    patientId: string,
    clinicId: string,
    event: NotificationEvent,
  ): Promise<void> {
    try {
      const notification = await notificationRepo.create({
        clinicId,
        targetRole: "PATIENT",
        targetPatientId: patientId,
        title: event.title,
        body: event.body,
        type: event.type,
        severity: event.severity,
        relatedId: event.relatedId,
        relatedType: event.relatedType,
        metadata: event.metadata,
      });

      pushService.sendToUser(patientId, {
        title: event.title,
        body: event.body,
        data: {
          type: event.type,
          notificationId: notification.id,
          relatedId: event.relatedId ?? null,
          relatedType: event.relatedType ?? null,
          severity: event.severity,
        },
      }).catch((err) => console.error("[NotificationService] guest push failed:", err));
    } catch (err) {
      console.error("[NotificationService] emitGuestNotification failed:", err);
    }
  },
};
