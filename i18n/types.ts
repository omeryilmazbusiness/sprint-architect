// ─── Supported locales ────────────────────────────────────────────────────────

export type SupportedLocale = "en" | "ru" | "tr" | "es";

export const LOCALE_LABELS: Record<SupportedLocale, string> = {
  en: "English",
  ru: "Русский",
  tr: "Türkçe",
  es: "Español",
};

export const LOCALE_FLAGS: Record<SupportedLocale, string> = {
  en: "🇬🇧",
  ru: "🇷🇺",
  tr: "🇹🇷",
  es: "🇪🇸",
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
  // GuestListCard
  noTravelDates: string;
  arrivingDate: string;
  keyPrefix: string;
  tagDocsPending: string;
  tagTodayAppt: string;
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
  severityWarning: string;
  severityCritical: string;
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
  toastApproved: string;
  toastApprovalFailed: string;
  toastResetDevice: string;
  toastResetDeviceFailed: string;
  toastStepFailed: string;
  toastTransportAssigned: string;
  toastTransportFailed: string;
  toastHotelAssigned: string;
  toastHotelFailed: string;
  toastDocAssigned: string;
  toastDocAssignFailed: string;
  toastDocStatusUpdated: string;
  toastDocStatusFailed: string;
  toastApptCancelled: string;
  toastApptCancelFailed: string;
  toastPreparingDoc: string;
  toastPdfError: string;
  toastApptCreated: string;
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
  // DoctorListCard
  generalPractice: string;
  yrsExp: string;
  diplomaVerified: string;
  confirmRemoveDoctor: string;
  btnRemove: string;
}

export interface ManagerHotelsDict {
  title: string;
  searchPlaceholder: string;
  emptyText: string;
  emptySearchText: string;
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
  deleteTitle: string;
  deleteMsg: string;
  deleteConfirm: string;
  toastAdded: string;
  toastUpdated: string;
  toastRemoved: string;
  toastError: string;
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
  // TransportFormSheet
  sectionDriver: string;
  sectionVehicle: string;
  fieldFullName: string;
  fieldPhone: string;
  fieldBrand: string;
  fieldModel: string;
  fieldLicensePlate: string;
  editTitle: string;
  addTitle: string;
  errDriverRequired: string;
  errPhoneRequired: string;
  errBrandRequired: string;
  errModelRequired: string;
  errPlateRequired: string;
  btnSaveChanges: string;
  btnCancel: string;
  // TransportListCard
  unknownDriver: string;
  deleteTransportTitle: string;
  deleteTransportConfirm: string;
  btnDelete: string;
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

// ─── Shared guest-detail component dictionaries ───────────────────────────────

export interface GuestDetailDict {
  // Shared action labels
  change: string;
  assign: string;
  add: string;
  cancel: string;
  approve: string;
  reject: string;
  // GuestHeroCard
  approving: string;
  approveGuest: string;
  // GuestInfoCard
  infoSectionTitle: string;
  labelPassport: string;
  labelDOB: string;
  labelPhone: string;
  labelEmail: string;
  labelTravelDates: string;
  labelServicesRequested: string;
  labelNotes: string;
  labelCompanion: string;
  // GuestTrackingStepper
  journeyTitle: string;
  updating: string;
  stepCurrent: string;
  tapToSet: string;
  stepPreArrival: string;
  stepArrivalTransfer: string;
  stepHotelCheckin: string;
  stepTreatment: string;
  stepFollowup: string;
  stepDeparture: string;
  // TransportAssignmentCard
  transportTitle: string;
  transportEmpty: string;
  transportEmptyHint: string;
  // HotelAssignmentCard
  hotelTitle: string;
  hotelEmpty: string;
  hotelEmptyHint: string;
  // DocumentsAssignmentCard
  docsTitle: string;
  docsPendingCount: string;
  docsUploadedCount: string;
  docsAssignedCount: string;
  docsEmpty: string;
  docsEmptyHint: string;
  docUploadedDate: string;
  approveDocTitle: string;
  approveDocConfirm: string;
  rejectDocTitle: string;
  rejectDocSub: string;
  rejectDocPlaceholder: string;
  // AssignTransportSheet
  assignTransportTitle: string;
  noTransportsAvailable: string;
  // AssignHotelSheet
  assignHotelTitle: string;
  noHotelsAvailable: string;
  // AssignDocTypeSheet
  selectDocTypeTitle: string;
  noDocTypesDefined: string;
  noDocTypesHint: string;
  instructionLabel: string;
  instructionPlaceholder: string;
  assignDocumentBtn: string;
  // CreateAppointmentSheet
  newApptTitle: string;
  labelDate: string;
  labelTime: string;
  labelDoctor: string;
  labelProcedureTitle: string;
  apptSummaryLabel: string;
  searchDoctorPlaceholder: string;
  noDoctorsMatch: string;
  noDoctorsAvailable: string;
  errSelectDate: string;
  errSelectTime: string;
  errSelectDoctor: string;
  errTitleTooShort: string;
  errTitleTooLong: string;
  moreDoctors: string;
  createApptError: string;
  createApptBtn: string;
  apptTitlePlaceholder: string;
}

export interface CreateGuestDict {
  // NationalityPickerModal
  nationalityTitle: string;
  searchCountryPlaceholder: string;
  // ServicesPickerModal
  servicesTitle: string;
  confirmSelectAtLeast: string;
  confirmServices: string;
  serviceLabels: Record<string, string>;
  // Form header
  headerTitle: string;
  successHeaderTitle: string;
  // Section headers
  sectionIdentity: string;
  sectionContact: string;
  sectionTravelService: string;
  sectionNotes: string;
  // Field labels
  fieldFullName: string;
  fieldFullNamePlaceholder: string;
  fieldDOB: string;
  fieldDOBPlaceholder: string;
  fieldGender: string;
  fieldNationality: string;
  fieldNationalityPlaceholder: string;
  fieldPassport: string;
  fieldPassportPlaceholder: string;
  fieldPhone: string;
  fieldEmail: string;
  fieldEmailPlaceholder: string;
  fieldServices: string;
  fieldServicesPlaceholder: string;
  fieldServicesSelected: string;
  fieldArrivalDate: string;
  fieldArrivalPlaceholder: string;
  fieldDepartureDate: string;
  fieldDeparturePlaceholder: string;
  fieldArrivalAirport: string;
  fieldArrivalAirportPlaceholder: string;
  fieldFlightNo: string;
  fieldFlightNoPlaceholder: string;
  fieldInternalNotes: string;
  fieldNotesPlaceholder: string;
  // Companion section
  companionToggleAdd: string;
  companionToggleOpen: string;
  companionName: string;
  companionNamePlaceholder: string;
  companionPhone: string;
  companionRelation: string;
  // Gender chips
  genderMale: string;
  genderFemale: string;
  genderOther: string;
  // Companion relation chips
  relationSpouse: string;
  relationFamily: string;
  relationFriend: string;
  relationCaregiver: string;
  relationOther: string;
  // Validation errors
  errFullNameRequired: string;
  errNationalityRequired: string;
  errPhoneRequired: string;
  errArrivalRequired: string;
  errDepartureRequired: string;
  errDepartureBefore: string;
  errServicesRequired: string;
  errInvalidEmail: string;
  // Submit
  submitBtn: string;
  // Success state
  successAddedTo: string;
  keyLabel: string;
  keyHint: string;
  copy: string;
  copied: string;
  openGuestProfile: string;
  done: string;
}

export interface FilterSheetDict {
  title: string;
  sectionGuestStatus: string;
  pendingDocsLabel: string;
  pendingDocsSub: string;
  todayApptLabel: string;
  todayApptSub: string;
  clearAll: string;
  apply: string;
  applyWithCount: string;
  statusAll: string;
  statusWaitingApproval: string;
  statusPending: string;
  statusApproved: string;
  statusActive: string;
  statusEnded: string;
}

// ─── Guest side ───────────────────────────────────────────────────────────────

export interface LanguageSwitcherDict {
  title: string;
  english: string;
  russian: string;
}

export interface GuestTabLabelsDict {
  myJourney: string;
  track: string;
  schedule: string;
  explore: string;
  profile: string;
}

export interface GuestDashboardDict {
  // Dashboard header greeting
  greetHello: string;
  greetWelcome: string;
  // Section labels
  sectionOverview: string;
  sectionSchedule: string;
  sectionYourDoctor: string;
  // SupportCard
  supportTitle: string;
  supportSub: string;
  // AgendaTabs
  agendaTabToday: string;
  agendaTabUpcoming: string;
  agendaTabCompleted: string;
  agendaStatusScheduled: string;
  agendaStatusDone: string;
  agendaStatusCancelled: string;
  agendaEmptyToday: string;
  agendaEmptyUpcoming: string;
  agendaEmptyCompleted: string;
  // TodayAppointmentCard
  todayCardLabel: string;
  todayCardEmpty: string;
  todayStatusScheduled: string;
  todayStatusDone: string;
  todayStatusCancelled: string;
  // GuestBannerCarousel
  banner0Title: string;
  banner0Sub: string;
  banner1Title: string;
  banner1Sub: string;
  banner2Title: string;
  banner2Sub: string;
  // OverviewTileCarousel — Transport
  tileTransport: string;
  tileTransportEmpty: string;
  tileTransportEmptySub: string;
  tileDriver: string;
  tileCallDriver: string;
  // OverviewTileCarousel — Hotel
  tileHotel: string;
  tileHotelEmpty: string;
  tileHotelEmptySub: string;
  tileHotelRoom: string;
  tileHotelCheckIn: string;
  tileHotelCheckOut: string;
  tileHotelNights: string;
  // OverviewTileCarousel — Documents
  tileDocs: string;
  tileDocsPendingBadge: string;
  tileDocsAllDone: string;
  tileDocsEmpty: string;
  tileDocsEmptySub: string;
  tileDocsPending: string;
  tileDocsReviewing: string;
  tileDocsApproved: string;
  tileDocsTotal: string;
  tileDocsManage: string;
  // GuestDoctorCard
  doctorChip: string;
  doctorYourAppt: string;
  doctorCertified: string;
  doctorExpLabel: string;
  doctorEduLabel: string;
  doctorLangLabel: string;
  doctorLangSpoken: string;
  doctorExpYrs: string;
  doctorEmpty: string;
  doctorEmptySub: string;
  // Phone / call alerts
  noPhone: string;
  noPhoneSub: string;
  cannotCall: string;
  cannotCallSub: string;
  // Dr. prefix
  drPrefix: string;
}

export interface GuestScheduleDict {
  pageTitle: string;
  loadingText: string;
  errTitle: string;
  tryAgain: string;
  // Status labels
  statusScheduled: string;
  statusCompleted: string;
  statusCancelled: string;
  statusMissed: string;
  // Filter options
  filterAll: string;
  filterUpcoming: string;
  filterToday: string;
  filterCompleted: string;
  filterMissed: string;
  filterCancelled: string;
  // Range options
  rangeAll: string;
  rangeThisWeek: string;
  rangeThisMonth: string;
  // Summary
  nextApptLabel: string;
  noUpcoming: string;
  kpiUpcoming: string;
  kpiCompleted: string;
  kpiMissed: string;
  // Filter bar
  searchPlaceholder: string;
  filterByStatus: string;
  filterByRange: string;
  clearFilters: string;
  // Date labels
  dateToday: string;
  dateTomorrow: string;
  // Empty states
  emptyFiltered: string;
  emptyFilteredSub: string;
  emptyClean: string;
  emptyCleanSub: string;
  drPrefix: string;
}

export interface GuestTrackDict {
  pageTitle: string;
  tabJourney: string;
  tabDocuments: string;
  // Journey steps
  step1Label: string;
  step1Sub: string;
  step2Label: string;
  step2Sub: string;
  step3Label: string;
  step3Sub: string;
  step4Label: string;
  step4Sub: string;
  step5Label: string;
  step5Sub: string;
  step6Label: string;
  step6Sub: string;
  // Journey state
  journeyEmpty: string;
  journeyEmptySub: string;
  nowBadge: string;
  // Clinic support
  clinicSupportFallback: string;
  clinicSupportSuffix: string;
  // NextAction card
  docActionSingular: string;
  docActionPlural: string;
  docActionSub: string;
  docActionCta: string;
  apptTodayTitle: string;
  viewSchedule: string;
  drPrefix: string;
  // Document status
  docStatusPending: string;
  docStatusUnderReview: string;
  docStatusApproved: string;
  docStatusRejected: string;
  // Document summary bar
  docSumPending: string;
  docSumUploaded: string;
  docSumTotal: string;
  // Document search / empty
  docSearch: string;
  docNoResult: string;
  // Document actions
  btnUploadPdf: string;
  btnReupload: string;
  btnOpenPdf: string;
  btnRemove: string;
  // Document alerts
  alertRemoveTitle: string;
  alertRemoveBody: string;
  alertCancel: string;
  alertRemove: string;
  alertUploadFailed: string;
  alertOpenFailed: string;
  alertRemoveFailed: string;
  alertTryAgain: string;
  alertUnexpected: string;
  // Show more/less
  showMore: string;
  showLess: string;
  // Doc loading/error/empty states
  docLoading: string;
  docError: string;
  docTryAgain: string;
  docEmpty: string;
  docEmptySub: string;
}

export interface GuestNotificationsDict {
  pageTitle: string;
  markAllRead: string;
  emptyTitle: string;
  emptySub: string;
  severityWarning: string;
  severityCritical: string;
}

export interface GuestProfileDict {
  pageTitle: string;
  // Status labels
  statusPendingApproval: string;
  statusActive: string;
  statusApproved: string;
  statusDischarged: string;
  statusCancelled: string;
  // Section headers
  sectionPersonInfo: string;
  sectionClinicInfo: string;
  sectionManager: string;
  // Info labels
  labelEmail: string;
  labelPhone: string;
  labelArrival: string;
  labelDeparture: string;
  labelClinic: string;
  labelAddress: string;
  labelWebsite: string;
  labelManager: string;
  // Copy badge
  copy: string;
  copied: string;
  // Sign out
  signOut: string;
  signOutTitle: string;
  signOutBody: string;
  signOutCancel: string;
  signOutWebMsg: string;
  // Error
  errorTitle: string;
  tryAgain: string;
}

export interface GuestExploreDict {
  comingSoon: string;
  heroTitle: string;
  heroTagline: string;
  whatsComingLabel: string;
  footerNote: string;
  feature1Label: string;
  feature1Desc: string;
  feature2Label: string;
  feature2Desc: string;
  feature3Label: string;
  feature3Desc: string;
  feature4Label: string;
  feature4Desc: string;
  feature5Label: string;
  feature5Desc: string;
  feature6Label: string;
  feature6Desc: string;
}

export interface LoginScreenDict {
  // Brand header
  brandSub: string;
  // Tabs
  tabGuest: string;
  tabManagement: string;
  // Guest form
  guestKeyLabel: string;
  guestKeyPlaceholder: string;
  guestKeyHelp: string;
  btnContinue: string;
  btnRequestNewKey: string;
  // Management form
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  btnLogin: string;
  btnForgotPassword: string;
  // Demo section
  demoSectionLabel: string;
  demoAdmin: string;
  demoManager: string;
  demoGuest: string;
  // Footer
  footer: string;
  // Forgot password modal
  forgotTitle: string;
  forgotDesc: string;
  forgotFieldLabel: string;
  forgotFieldPlaceholder: string;
  // Request key modal
  reqKeyTitle: string;
  reqKeyDesc: string;
  reqKeyFieldLabel: string;
  reqKeyFieldPlaceholder: string;
  // Shared modal actions
  modalSubmitBtn: string;
  modalSuccessTitle: string;
  modalSuccessMsg: string;
  modalDone: string;
  // Language selector
  langSelectorTitle: string;
  // Inline validation
  errEnterKey: string;
  errEnterEmailPassword: string;
  errGeneric: string;
  // Auth error codes → friendly text
  errAuthInvalid: string;
  errAuthRequired: string;
  errNoPermission: string;
  errSessionExpired: string;
  errClinicSuspended: string;
  errGuestKeyInvalid: string;
  errDeviceBound: string;
  errTooManyAttempts: string;
  errAccountInactive: string;
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
  // Shared components
  guestDetail: GuestDetailDict;
  createGuest: CreateGuestDict;
  filterSheet: FilterSheetDict;
  // Guest / patient side
  languageSwitcher: LanguageSwitcherDict;
  guestTabLabels: GuestTabLabelsDict;
  guestDashboard: GuestDashboardDict;
  guestSchedule: GuestScheduleDict;
  guestTrack: GuestTrackDict;
  guestNotifications: GuestNotificationsDict;
  guestProfile: GuestProfileDict;
  guestExplore: GuestExploreDict;
  loginScreen: LoginScreenDict;
}
