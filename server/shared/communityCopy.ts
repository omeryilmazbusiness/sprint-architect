/**
 * Server-side user-visible strings — community / events framing.
 * Internal DB columns and API field names unchanged.
 */

export const COMMUNITY_COPY = {
  communityNotFound: "Community not found.",
  memberNotFound: "Member not found.",
  hostNotFound: "Host not found.",
  noCommunityOnAccount: "No community associated with this account.",
  communitySuspended: "Community access is paused. Please contact your community host.",
  documentTypesNotFound: "One or more upload types were not found for this community.",
  communitySuspendedBillingTitle: "Community Paused",
  communitySuspendedBillingBody: (count: number) =>
    `A community has been paused due to ${count} unpaid invoice(s).`,
  memberArchiveTitle: "Member operational archive",
  memberLabel: "Member",
} as const;
