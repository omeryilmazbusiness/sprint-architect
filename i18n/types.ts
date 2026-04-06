// ─── Supported locales ────────────────────────────────────────────────────────

export type SupportedLocale = "en" | "ru";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  ru: "Русский",
};

export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  en: "🇬🇧",
  ru: "🇷🇺",
};

// ─── Per-section translation shapes ───────────────────────────────────────────

export interface AdminDashboardDict {
  pageTitle: string;
  sectionOverview: string;
  sectionQuickActions: string;
  sectionRecentInvoices: string;
  createClinic: string;
  createClinicSub: string;
  allClinics: string;
  allClinicsSub: string;
  allInvoices: string;
  allInvoicesSub: string;
  manageUsers: string;
  manageUsersSub: string;
  loadError: string;
  retry: string;
  // Banner slide titles & subtitles
  bannerBillingTitle: string;
  bannerBillingSubtitle: string;
  bannerClinicsTitle: string;
  bannerClinicsSubtitle: string;
  bannerPeriodSubtitle: string;
  // Banner CTA labels
  bannerViewUnpaid: string;
  bannerViewSuspended: string;
  bannerViewPeriod: string;
  // Launch state slide
  bannerLaunchTitle: string;
  bannerLaunchSubtitle: string;
  bannerLaunchCta: string;
  // Chip / status labels
  statusActive: string;
  statusSuspended: string;
  statusPending: string;
  statusUnpaid: string;
  statusPaid: string;
  statusBilled: string;
  statusClinics: string;
  statusInvoices: string;
  // KPI sub-labels
  kpiActiveClinics: string;
  kpiRunning: string;
  kpiClinics: string;
  kpiInvoices: string;
}

export interface AdminTabLabelsDict {
  dashboard: string;
  clinics: string;
  users: string;
  invoices: string;
  settings: string;
}

export interface AdminClinicsDict {
  pageTitle: string;
  searchPlaceholder: string;
  filterStatus: string;
  noManager: string;
  emptyTitle: string;
  emptySubFilter: string;
  emptySubCreate: string;
  filterByStatus: string;
  allStatuses: string;
  loadingClinics: string;
  countOne: string;
  countMany: string;
  // create screen
  createTitle: string;
  clinicInfoSection: string;
  contactSection: string;
  servicesSection: string;
  billingSection: string;
  notesSection: string;
  clinicNameLabel: string;
  clinicNamePlaceholder: string;
  addressLabel: string;
  addressPlaceholder: string;
  phoneLabel: string;
  contactEmailLabel: string;
  websiteLabel: string;
  billingEmailLabel: string;
  billingEmailPlaceholder: string;
  unitPriceLabel: string;
  unitPricePlaceholder: string;
  currencyLabel: string;
  notesPlaceholder: string;
  createClinicBtn: string;
  servicesHint: string;
  nameRequired: string;
  nameMinLength: string;
  invalidEmail: string;
  invalidBillingEmail: string;
  servicesRequired: string;
  priceMustBeNumber: string;
  invalidUrl: string;
  // detail screen
  clinicDetailTitle: string;
  loadingClinic: string;
  since: string;
  suspendedBanner: string;
  billingEmailLabel2: string;
  billingDay: string;
  billingDayValue: string;
  nextInvoice: string;
  thisPeriod: string;
  noInvoice: string;
  editClinicTitle: string;
  editNameLabel: string;
  editCurrencyLabel: string;
  editUnitPriceLabel: string;
  editAnchorDayLabel: string;
  statusLabel: string;
  servicesLabel: string;
  saveChanges: string;
  deleteClinicTitle: string;
  deleteClinicConfirm: string;
  nameRequiredAlert: string;
  createManager: string;
  viewInvoices: string;
  billingSummarySection: string;
  managersSection: string;
  invoiceHistorySection: string;
  actionsSection: string;
  patientsLabel: string;
}

export interface AdminInvoicesDict {
  pageTitle: string;
  periodPlaceholder: string;
  periodHint: string;
  filterClinic: string;
  filterStatus: string;
  allClinics: string;
  allStatuses: string;
  filterByClinic: string;
  filterByStatus: string;
  loadingInvoices: string;
  emptyTitle: string;
  emptySubFilter: string;
  emptySubAuto: string;
  countOne: string;
  countMany: string;
  unknownClinic: string;
  // detail
  invoiceLabel: string;
  loadingInvoice: string;
  totalDue: string;
  unpaidAlert: string;
  pendingAlert: string;
  paidAlert: string;
  billingDetailsSection: string;
  timelineSection: string;
  clinicLabel: string;
  patientsLabel: string;
  unitPriceLabel: string;
  totalLabel: string;
  createdLabel: string;
  dueByLabel: string;
  paidAtLabel: string;
  markAsPaid: string;
  confirmPaymentTitle: string;
  confirmPaymentSub: string;
  impactReactivateClinic: string;
  impactRestoreManagers: string;
  impactRestorePatients: string;
  confirmPaid: string;
  cancel: string;
  errorMarkPaid: string;
}

export interface AdminUsersDict {
  pageTitle: string;
  selectUsers: string;
  searchPlaceholder: string;
  filterClinic: string;
  filterType: string;
  filterStatus: string;
  allClinics: string;
  allTypes: string;
  allStatuses: string;
  filterByClinic: string;
  filterByType: string;
  filterByStatus: string;
  emptyTitle: string;
  emptySubFilter: string;
  emptySubNoUsers: string;
  clearFilters: string;
  countOne: string;
  countMany: string;
  allLabel: string;
  noneLabel: string;
  // user detail
  userDetailTitle: string;
  loadingUser: string;
  contactSection: string;
  clinicSection: string;
  accountSection: string;
  actionsSection: string;
  emailLabel: string;
  phoneLabel: string;
  memberSince: string;
  lastLogin: string;
  never: string;
  resetPassword: string;
  deactivateUser: string;
  deactivateTitle: string;
  deactivateBody: string;
  deactivateNote: string;
  deactivate: string;
  resetPasswordTitle: string;
  resetPasswordBody: string;
  reset: string;
  passwordResetTitle: string;
  passwordResetBody: string;
  passwordCopyNote: string;
  mustChangePassword: string;
  openClinic: string;
  done: string;
  cancel: string;
}

export interface AdminNotificationsDict {
  pageTitle: string;
  tabActions: string;
  tabEvents: string;
  pending: string;
  all: string;
  markAllRead: string;
  noRequestsPending: string;
  noRequestsAll: string;
  noEvents: string;
  noEventsSubtext: string;
  loadingFailed: string;
  eventLoadingFailed: string;
  credentialShownOnce: string;
  copy: string;
  done: string;
  copyWarning: string;
  copied: string;
  generateAndSend: string;
  reject: string;
  cancel: string;
  confirm: string;
  sentTo: string;
  confirmGenerateText: string;
  confirmRejectText: string;
  passwordResetLabel: string;
  newAccessKeyLabel: string;
  tempPasswordLabel: string;
  newAccessKeyDisplayLabel: string;
}

export interface AdminSettingsDict {
  pageTitle: string;
  lastLogin: string;
  notRecorded: string;
  securitySection: string;
  changePassword: string;
  changePasswordSub: string;
  twoFactor: string;
  twoFactorSub: string;
  comingSoon: string;
  logoutAllDevices: string;
  logoutAllDevicesSub: string;
  signOut: string;
  signOutSub: string;
  administrationSection: string;
  manageClinics: string;
  manageClinicsSubtitle: string;
  manageUsers: string;
  manageUsersSub: string;
  manageInvoices: string;
  manageInvoicesSub: string;
  diagnosticsSection: string;
  apiConnectivity: string;
  dbConnectivity: string;
  environment: string;
  versionLabel: string;
  runDiagnostics: string;
  copyDiagnostics: string;
  copied: string;
  refreshing: string;
  refresh: string;
  billingPolicySection: string;
  openInvoices: string;
  supportSection: string;
  reportIssue: string;
  reportIssueSub: string;
  copySupportCode: string;
  copySupportCodeSub: string;
  dataManagementSection: string;
  auditLogRetention: string;
  auditLogRetentionSub: string;
  patientRecords: string;
  patientRecordsSub: string;
  openExports: string;
  logoutTitle: string;
  logoutBody: string;
  logoutAllTitle: string;
  logoutAllBody: string;
  cancel: string;
  confirmSignOut: string;
  confirmLogoutAll: string;
  couldNotLoadDiagnostics: string;
  billingRuleInvoiceCreation: string;
  billingRuleInvoiceCreationSub: string;
  billingRulePendingToUnpaid: string;
  billingRulePendingToUnpaidSub: string;
  billingRuleUnpaidToSuspension: string;
  billingRuleUnpaidToSuspensionSub: string;
  billingRulePaidToReactivation: string;
  billingRulePaidToReactivationSub: string;
}

export interface AdminChangePasswordDict {
  pageTitle: string;
  policyTitle: string;
  policyItem1: string;
  policyItem2: string;
  policyItem3: string;
  policyItem4: string;
  policyItem5: string;
  policyItem6: string;
  currentPasswordLabel: string;
  currentPasswordPlaceholder: string;
  newPasswordLabel: string;
  newPasswordPlaceholder: string;
  confirmPasswordLabel: string;
  confirmPasswordPlaceholder: string;
  warningText: string;
  updatePassword: string;
  strengthWeak: string;
  strengthFair: string;
  strengthGood: string;
  strengthStrong: string;
  currentRequired: string;
  newRequired: string;
  minLength: string;
  mustUppercase: string;
  mustLowercase: string;
  mustNumber: string;
  mustSpecial: string;
  passwordMismatch: string;
  confirmRequired: string;
  passwordChangedTitle: string;
  passwordChangedBody: string;
  signIn: string;
  tooManyAttemptsTitle: string;
  tooManyAttemptsBody: string;
  currentPasswordIncorrect: string;
}

export interface AdminProfileMenuDict {
  settings: string;
  signOut: string;
  logoutAllDevices: string;
  close: string;
  signOutConfirmTitle: string;
  signOutConfirmSub: string;
  logoutAllConfirmTitle: string;
  logoutAllConfirmSub: string;
  cancel: string;
  confirm: string;
}

export interface AdminCreateUserDict {
  sheetTitle: string;
  roleSection: string;
  identitySection: string;
  clinicSection: string;
  fullNameLabel: string;
  fullNamePlaceholder: string;
  emailLabel: string;
  emailPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  clinicRequiredHint: string;
  selectClinicPlaceholder: string;
  setPrimaryLabel: string;
  setPrimarySub: string;
  adminInfoBanner: string;
  createUserBtn: string;
  userCreatedTitle: string;
  userCreatedSub: string;
  copyLabel: string;
  copied: string;
  otpNote: string;
  done: string;
  selectClinicTitle: string;
  noActiveClinics: string;
}

// ─── Manager dictionaries ─────────────────────────────────────────────────────

export interface ManagerTabLabelsDict {
  dashboard: string;
  users: string;
  services: string;
  invoices: string;
  settings: string;
}

export interface ManagerDashboardDict {
  title: string;
  sectionOverview: string;
  sectionQuickActions: string;
  sectionPendingDocs: string;
  sectionSchedule: string;
  pendingDocsTotal: string;
  // KPI card labels
  kpiActiveGuests: string;
  kpiApptToday: string;
  kpiUpcoming7: string;
  kpiPendingDocs: string;
  // KPI subtitles
  kpiSubActiveGuests: string;
  kpiSubApptToday: string;
  kpiSubUpcoming7: string;
  kpiSubPendingDocs: string;
  kpiView: string;
  // Quick actions
  qaNewGuest: string;
  qaDocTypes: string;
  qaAllGuests: string;
  qaServices: string;
  qaInvoices: string;
  // Pending docs section
  pendingAllClear: string;
  pendingAllClearSub: string;
  pendingViewGuest: string;
  pendingSummaryPending: string;
  pendingSummaryUploaded: string;
}

export interface ManagerBannerDict {
  slide0Context: string;
  slide1Context: string;
  slide1Title: string;
  slide1Subtitle: string;
  slide2Title: string;
  slide2Subtitle: string;
  statApptToday: string;
  statActiveGuests: string;
  statNext7Days: string;
  statMissingPlans: string;
  statPendingDocs: string;
  statArriving: string;
  statAppts: string;
  greetingMorning: string;
  greetingAfternoon: string;
  greetingEvening: string;
}

export interface ManagerUsersDict {
  searchGuestsPlaceholder: string;
  searchDoctorsPlaceholder: string;
  searchDocsPlaceholder: string;
  tabGuests: string;
  tabDoctors: string;
  tabPendingDocs: string;
  guestsCountLabel: string;
  doctorsCountLabel: string;
  emptyGuestsTitle: string;
  emptyGuestsTitleNoData: string;
  emptyGuestsSub: string;
  emptyGuestsSubNoData: string;
  clearFilters: string;
  emptyDoctorsTitle: string;
  emptyDoctorsSub: string;
  emptyDoctorsSubNoSearch: string;
  addDoctor: string;
  docFilterAll: string;
  docFilterPending: string;
  docFilterUploaded: string;
  docFilterRejected: string;
  docBadgePending: string;
  docBadgeUploaded: string;
  docBadgeApproved: string;
  docBadgeRejected: string;
  docSuffixWithPending: string;
  docSuffixWithUploaded: string;
  docSuffixWithRejected: string;
  docSuffixAll: string;
  docEmptySearchTitle: string;
  docEmptySearchSub: string;
  docEmptyTitle: string;
  docEmptySub: string;
  guestSingular: string;
  guestPlural: string;
  apptSingular: string;
  apptPlural: string;
}

export interface ManagerServicesDict {
  pageTitle: string;
  intro: string;
  svcDoctorsLabel: string;
  svcDoctorsDesc: string;
  svcHotelsLabel: string;
  svcHotelsDesc: string;
  svcTransportsLabel: string;
  svcTransportsDesc: string;
  svcDocTypesLabel: string;
  svcDocTypesDesc: string;
}

export interface ManagerSettingsDict {
  pageTitle: string;
  clinicSection: string;
  accountSection: string;
  supportSection: string;
  sessionSection: string;
  suspendedNote: string;
  rowInvoices: string;
  rowInvoicesSub: string;
  rowGuests: string;
  rowGuestsSub: string;
  rowServices: string;
  rowServicesSub: string;
  rowHelpSupport: string;
  rowHelpSupportSub: string;
  rowPrivacy: string;
  rowPrivacySub: string;
  rowSignOut: string;
}

export interface ManagerInvoicesDict {
  pageTitle: string;
  suspendedBanner: string;
  filterAll: string;
  statusPending: string;
  statusOverdue: string;
  statusPaid: string;
  breakdownUnitPrice: string;
  breakdownGuests: string;
  breakdownTotal: string;
  emptyText: string;
  guestsSingular: string;
  guestsPlural: string;
}

export interface ManagerNotificationsDict {
  pageTitle: string;
  markAllRead: string;
  emptyTitle: string;
  emptySubtitle: string;
}

export interface ManagerPatientDict {
  loading: string;
  errorTitle: string;
  errorSub: string;
  tryAgain: string;
  nextAppt: string;
  noUpcomingAppts: string;
  schedule: string;
  sectionAssignments: string;
  sectionDeviceMgmt: string;
  resetDeviceBtn: string;
  resetDeviceHint: string;
  cancelApptTitle: string;
  cancelApptConfirm: string;
  cancelApptKeep: string;
  cancelApptAction: string;
  approveGuestTitle: string;
  approveGuestConfirm: string;
  approveGuestCancel: string;
  approveGuestAction: string;
}

export interface ManagerDoctorsDict {
  title: string;
  searchPlaceholder: string;
  countSingular: string;
  countPlural: string;
  countMatching: string;
  emptyTitle: string;
  emptyTitleSearch: string;
  emptyText: string;
  emptyTextSearch: string;
  formTitleAdd: string;
  formTitleEdit: string;
  formSubAdd: string;
  formSubEdit: string;
  sectionIdentity: string;
  sectionContact: string;
  sectionEducation: string;
  sectionBio: string;
  fieldFullName: string;
  fieldFullNamePlaceholder: string;
  fieldFullNameRequired: string;
  fieldSpecialty: string;
  fieldSpecialtyPlaceholder: string;
  fieldLanguages: string;
  fieldLanguagesPlaceholder: string;
  fieldPhone: string;
  fieldEmail: string;
  fieldUniversity: string;
  fieldUniversityPlaceholder: string;
  fieldGradYear: string;
  fieldExpYears: string;
  fieldCertifications: string;
  fieldCertificationsPlaceholder: string;
  fieldBioPlaceholder: string;
  btnCancel: string;
  btnSaveChanges: string;
  btnAddDoctor: string;
  toastDoctorUpdated: string;
  toastDoctorAdded: string;
  toastDoctorRemoved: string;
  toastHasAppointments: string;
  toastFailedDelete: string;
  toastFailedSave: string;
}

export interface ManagerHotelsDict {
  title: string;
  emptyText: string;
  formTitleAdd: string;
  formTitleEdit: string;
  fieldHotelName: string;
  fieldAddress: string;
  fieldPhone: string;
  fieldStars: string;
  fieldEmail: string;
  fieldWebsite: string;
  fieldNotes: string;
  fieldHotelNamePlaceholder: string;
  fieldAddressPlaceholder: string;
  fieldNotesPlaceholder: string;
  btnCancel: string;
  btnSaveChanges: string;
  btnAddHotel: string;
}

export interface ManagerTransportsDict {
  title: string;
  loading: string;
  emptyTitle: string;
  emptySubtitle: string;
  btnAddTransport: string;
  toastAdded: string;
  toastUpdated: string;
  toastRemoved: string;
  toastFailedSave: string;
  toastFailedUpdate: string;
  toastFailedDelete: string;
}

export interface ManagerDocTypesDict {
  title: string;
  searchPlaceholder: string;
  errorText: string;
  retry: string;
  emptySearchTitle: string;
  emptySearchSub: string;
  emptyTitle: string;
  emptySubtitle: string;
  btnAddDocType: string;
  noDescription: string;
  addedDate: string;
  formTitleAdd: string;
  formTitleEdit: string;
  labelName: string;
  labelDescription: string;
  labelDescriptionOptional: string;
  fieldNamePlaceholder: string;
  fieldDescPlaceholder: string;
  btnCancel: string;
  btnSave: string;
  btnUpdate: string;
  toastCreated: string;
  toastUpdated: string;
  toastRemoved: string;
  toastFailedDelete: string;
}

export interface AppointmentsTodayDict {
  sheetTitle: string;
  searchPlaceholder: string;
  errorTitle: string;
  errorBody: string;
  retry: string;
  emptySearch: string;
  emptyToday: string;
  emptyTodayBody: string;
  countSuffixToday: string;
  countSuffixFound: string;
  apptSingular: string;
  apptPlural: string;
}

// ─── Root dictionary shape ─────────────────────────────────────────────────────

export interface AppDict {
  adminDashboard: AdminDashboardDict;
  adminTabLabels: AdminTabLabelsDict;
  adminClinics: AdminClinicsDict;
  adminInvoices: AdminInvoicesDict;
  adminUsers: AdminUsersDict;
  adminNotifications: AdminNotificationsDict;
  adminSettings: AdminSettingsDict;
  adminChangePassword: AdminChangePasswordDict;
  adminProfileMenu: AdminProfileMenuDict;
  adminCreateUser: AdminCreateUserDict;
  // Manager
  managerTabLabels: ManagerTabLabelsDict;
  managerDashboard: ManagerDashboardDict;
  managerBanner: ManagerBannerDict;
  managerUsers: ManagerUsersDict;
  managerServices: ManagerServicesDict;
  managerSettings: ManagerSettingsDict;
  managerInvoices: ManagerInvoicesDict;
  managerNotifications: ManagerNotificationsDict;
  managerPatient: ManagerPatientDict;
  managerDoctors: ManagerDoctorsDict;
  managerHotels: ManagerHotelsDict;
  managerTransports: ManagerTransportsDict;
  managerDocTypes: ManagerDocTypesDict;
  appointmentsToday: AppointmentsTodayDict;
}
