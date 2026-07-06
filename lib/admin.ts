/** Single site administrator — CMS access */
export const SITE_ADMIN_EMAIL = "fkyian@gmail.com";

export function isSiteAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === SITE_ADMIN_EMAIL.toLowerCase();
}
