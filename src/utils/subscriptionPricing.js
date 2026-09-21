export const formatOptionPrice = (option) => {
  if (!option) return "N/A";
  const suffix = option.interval === "year" ? "annually" : "mo";
  return `$${option.amount}/${suffix}`;
};

export const formatFirstPaymentLabel = (option, membership) => {
  if (!option || !membership?.amount) return null;
  const total = Number(option.amount) + Number(membership.amount);
  const formattedTotal = Number.isInteger(total) ? total : total.toFixed(2);
  return `$${formattedTotal} due today, then ${formatOptionPrice(option)}`;
};

const normalizePriceOption = (price) => ({
  priceId: price.id,
  amount: Number((price.unit_amount || 0) / 100),
  interval: price.recurring?.interval || "month",
  nickname: price.nickname || "",
});

export const mapPriceListToTierOptions = (priceList = []) => {
  const grouped = {
    builder: { monthly: null, yearly: null },
    studio: { monthly: null, yearly: null },
  };

  for (const price of priceList) {
    if (price?.type !== "recurring" || price?.active === false) continue;
    const tier = (price.tier || "").toLowerCase();
    if (tier !== "builder" && tier !== "studio") continue;
    const slot = price.recurring?.interval === "year" ? "yearly" : "monthly";
    grouped[tier][slot] = normalizePriceOption(price);
  }

  return grouped;
};

export const getBuilderCheckoutOptions = (priceList = []) => {
  const { builder } = mapPriceListToTierOptions(priceList);
  const options = [];
  if (builder.monthly) options.push(builder.monthly);
  if (builder.yearly) options.push(builder.yearly);
  return options;
};

export const getStudioCheckoutOptions = (priceList = []) => {
  const { studio } = mapPriceListToTierOptions(priceList);
  const options = [];
  if (studio.monthly) options.push({ ...studio.monthly, tierKey: "studio" });
  if (studio.yearly) options.push({ ...studio.yearly, tierKey: "studio" });
  return options;
};

/** Parse GET /api/stripe/get response for active subscription metadata. */
export const getActiveSubscriptionSummary = (subscriptionResponse) => {
  const stripeSubscription = subscriptionResponse?.subscription;
  const firstItem = stripeSubscription?.items?.data?.[0];
  const price = firstItem?.price;

  return {
    subscriptionId: stripeSubscription?.id || null,
    priceId: price?.id || null,
    amount: Number((price?.unit_amount || 0) / 100),
    canManageSubscription:
      subscriptionResponse?.canManageSubscription === true,
    isPausePlan: subscriptionResponse?.isPausePlan === true,
  };
};

const isBuilderPriceId = (priceId, priceList = []) => {
  if (!priceId) return false;
  const { builder } = mapPriceListToTierOptions(priceList);
  return (
    priceId === builder.monthly?.priceId || priceId === builder.yearly?.priceId
  );
};

/**
 * Builder subscribers with an active manageable sub upgrade in-app; everyone
 * else (Simone-only, no sub) goes through Stripe Checkout.
 */
export const resolveStudioPurchaseMode = (subscriptionResponse, priceList = []) => {
  const active = getActiveSubscriptionSummary(subscriptionResponse);
  if (
    active.canManageSubscription &&
    active.subscriptionId &&
    active.priceId &&
    !active.isPausePlan &&
    isBuilderPriceId(active.priceId, priceList)
  ) {
    return { mode: "upgrade", subscriptionId: active.subscriptionId };
  }
  return { mode: "checkout", subscriptionId: null };
};
