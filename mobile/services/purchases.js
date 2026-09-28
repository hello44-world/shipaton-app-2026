// RevenueCat integration. This file is the ONLY place in the app that
// talks to react-native-purchases — every screen just calls isProUser()
// and never touches the SDK directly. That way the rest of the app never
// has to know or care how "pro" is actually granted.
import Purchases from "react-native-purchases";
import { useEffect, useState } from "react";

// TODO: paste your real RevenueCat public API key here before building.
// Dashboard -> Project settings -> API keys.
const REVENUECAT_API_KEY = "test_qbCKeqeWPNQYDUrhuNlUZpmFFuf";

// This must match the Entitlement identifier you create in the RevenueCat
// dashboard and attach to your 350 PKR/week + 1,000 PKR/month products.
const PRO_ENTITLEMENT_ID = "watt guard Pro";

let configured = false;

export function initPurchases() {
  if (configured) return;
  Purchases.configure({ apiKey: REVENUECAT_API_KEY });
  configured = true;
}

export async function isProUser() {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    return typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== "undefined";
  } catch (e) {
    console.warn("RevenueCat check failed:", e.message);
    return false;
  }
}

export async function getOfferings() {
  const offerings = await Purchases.getOfferings();
  return offerings.current; // has .availablePackages — weekly + monthly
}

export async function purchase(pkg) {
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== "undefined";
}

// Dev-only shortcut: while you're the developer testing, grant yourself
// pro manually inside the RevenueCat dashboard (Customers -> your user ID
// -> Grant entitlement) instead of hardcoding a bypass here — that way the
// real check path (above) stays exactly what ships to judges/users.

// Live-updates hook: call this from any screen so the UI reacts instantly
// when a judge finishes a purchase/trial in the paywall, without needing
// a manual re-check or screen reload.

export function useIsPro() {
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    isProUser().then(setIsPro);

    const listener = (customerInfo) => {
      setIsPro(typeof customerInfo.entitlements.active[PRO_ENTITLEMENT_ID] !== "undefined");
    };
    Purchases.addCustomerInfoUpdateListener(listener);
    return () => Purchases.removeCustomerInfoUpdateListener(listener);
  }, []);

  return isPro;
}
