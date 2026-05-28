/**
 * Institution name → URL-safe slug for guest access keys.
 * Example: "Demo Institution" → "demo-institution"
 */
export function slugifyInstitutionName(name: string): string {
  const slug = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return slug.slice(0, 48) || "institution";
}
