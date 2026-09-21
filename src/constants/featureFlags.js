/**
 * Central UI feature toggles. Set to true to restore a hidden control.
 *
 * Web search toggle: Olivia modal (Book Editor) and Simone/Olivia agent chat page.
 */
import { hasOliviaAccess, isPrivilegedRole } from "../utils";

export const SHOW_WEB_SEARCH_TOGGLE = false;

/** Temporary: allow pasting/sending more than 1,000 words in Olivia Studio chat. */
export const OLIVIA_TEMP_DISABLE_WORD_LIMIT = true;

/** Temporary: show paperclip file attach in Olivia Studio chat composer. */
export const OLIVIA_TEMP_ENABLE_FILE_ATTACH = true;

/** Book Editor sidebar — opens finalize draft confirmation. */
export const SHOW_SAVE_CONTINUE_BUTTON = false;

/**
 * Set to true once OliviaAI is ready for new purchases and public CTAs without an active sub.
 * When true: Builder checkout is allowed for all eligible users.
 */
export const OLIVIA_ENABLED = true;

/** Set to true once EllisAI (Studio) is ready to go live. Builder (Olivia) can be on while this stays off. */
export const ELLIS_ENABLED = true;

/** Subscription page: block new Builder purchases when Olivia is not publicly available (admins bypass). */
export const isOliviaPurchaseGated = () => {
  if (OLIVIA_ENABLED) return false;
  if (isPrivilegedRole()) return false;
  return true;
};



/**
 * Product CTAs (dashboard, Simone handoff): gate unless Olivia is globally on, user is admin,
 * or the user has active Olivia entitlement from GET /api/stripe/v2/agent-access.
 */
export const isOliviaFeatureGated = (accessData) => {
  if (OLIVIA_ENABLED) return false;
  if (isPrivilegedRole()) return false;
  if (hasOliviaAccess(accessData)) return false;
  return true;
};

/**
 * When Olivia is on for new users, still require Builder/Studio (or superadmin).
 * When Olivia public signup is off, same rules as isOliviaFeatureGated.
 */
export const isOliviaOutlineCtaBlocked = (accessData) => {
  if (OLIVIA_ENABLED) {
    if (isPrivilegedRole()) return false;
    return !hasOliviaAccess(accessData);
  }
  return isOliviaFeatureGated(accessData);
};

/** Returns true when EllisAI / Studio tier should be gated (non-privileged users while flag is off). */
export const isEllisGated = () => {
  if (ELLIS_ENABLED) return false;
  return !isPrivilegedRole();
};
