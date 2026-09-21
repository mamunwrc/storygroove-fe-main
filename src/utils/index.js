import FileSaver from "file-saver";

export function setRedirectURL(url) {
  localStorage.setItem("redirectURL", url);
}

export function handleRedirect(navigate) {
  const redirectURL =
    localStorage.getItem("redirectURL") ?? "/dashboard/remove-background";
  navigate(redirectURL);
  localStorage.removeItem("redirectURL");
}

export async function handleImageDownload(imageURL) {
  if (imageURL) {
    const urlParts = imageURL?.split("/");
    const imageName = urlParts[urlParts.length - 1];
    try {
      FileSaver.saveAs(imageURL, imageName);
    } catch {
      throw new Error("Failed to Download Image");
    }
  } else {
    throw new Error("Invalid parameters");
  }
}

export function filterInfoForShopifyProduct(productList, property) {
  const uniqueSet = new Set();

  productList?.forEach((obj) => {
    if (obj?.[property]) {
      uniqueSet.add(obj?.[property]);
    }
  });

  return [...uniqueSet];
}

export function filterShopifyProducts(productList, newVariant, searchInput) {
  const filterArray = newVariant.filter((item) => item?.title);
  const productArray = searchInput
    ? searchTermFilter(productList, searchInput)
    : productList;
  return productArray?.filter((product) => {
    return filterArray?.every((filter) => {
      if (filter?.property === "tags") {
        return product?.tags?.includes(filter?.value);
      } else {
        return product?.[filter?.property] === filter?.value;
      }
    });
  });
}

export function searchTermFilter(productList, searchTerm) {
  return productList?.filter((product) =>
    product?.title.toLowerCase()?.includes(searchTerm?.toLowerCase())
  );
}

export const toDataURL = (url) =>
  fetch(url)
    .then((response) => response.blob())
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        })
    );

export const convertToBase64 = async (imageUrl) => {
  if (imageUrl) {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    let base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const imageStr = base64.split(",")[1];

    // Prepend the image header
    base64 = `data:image/png;base64,${imageStr}`;

    return base64;

    // fetch(imageUrl)
    //   .then(response => response.blob())
    //   .then(blob => {
    //     const reader = new FileReader();
    //     reader.onload = () => {
    //       const base64 = reader.result;
    //       return base64;
    //     };
    //     reader.readAsDataURL(blob);
    //   })
    //   .catch(error => console.error('Error fetching or converting image:', error));
  }
};

/**
 * Admin and superadmin bypass subscription gates (matches backend isSubscribedUser).
 */
export const isPrivilegedRole = () => {
  if (typeof localStorage === "undefined") return false;
  const role = localStorage.getItem("role");
  return role === "superadmin" || role === "admin";
};

export const isSuperAdminRole = () => {
  if (typeof localStorage === "undefined") return false;
  return localStorage.getItem("role") === "superadmin";
};

/**
 * Check if user has access to Simone (Builder/Studio, one-time kit, or privileged role).
 * Accepts the response from GET /api/stripe/v2/agent-access.
 */
export const hasSimoneAccess = (accessData) => {
  if (isPrivilegedRole()) return true;
  return accessData?.simone === true;
};

/**
 * Check if user has access to Olivia (requires Builder or Studio plan).
 * Accepts the response from GET /api/stripe/v2/agent-access.
 * Superadmin and admin always have access.
 */
export const hasOliviaAccess = (accessData) => {
  if (isPrivilegedRole()) return true;
  return accessData?.olivia === true;
};

/**
 * Check if user has access to Ellis (requires Studio plan).
 * Accepts the response from GET /api/stripe/v2/agent-access.
 * Superadmin and admin always have access.
 */
export const hasEllisAccess = (accessData) => {
  if (isPrivilegedRole()) return true;
  return accessData?.ellis === true;
};

/**
 * Is the user's Stripe subscription currently paused (Stripe pause_collection)?
 * Accepts the response from GET /api/stripe/v2/agent-access.
 * Privileged roles are never treated as paused so internal testing keeps working.
 *
 * When this returns true, the FE should:
 * - Lock the dashboard down the same way as a cancelled subscription (no past
 *   work, no agent sessions). Only My Account / subscription remains usable.
 */
export const isSubscriptionPaused = (accessData) => {
  if (isPrivilegedRole()) return false;
  return accessData?.subscriptionPaused === true;
};

/**
 * Has the user cancelled every subscription they ever had (no active sub left)?
 * Accepts the response from GET /api/stripe/v2/agent-access.
 * Privileged roles always return false so internal testing keeps working.
 *
 * When this returns true, the FE should:
 * - Lock the dashboard down (no past work, no new agent sessions, sidebar nav
 *   restricted to My Account).
 * - Redirect deep routes (book editor, agent chat, etc.) to the subscription
 *   tab so the user can re-subscribe.
 */
export const isSubscriptionCancelled = (accessData) => {
  if (isPrivilegedRole()) return false;
  return accessData?.subscriptionCancelled === true;
};

/**
 * Past work and agent sessions are locked (cancelled or paused subscription).
 */
export const isPastWorkLocked = (accessData) =>
  isSubscriptionCancelled(accessData) || isSubscriptionPaused(accessData);