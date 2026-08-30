// One place for every backend call. All screens import from here instead
// of calling fetch() directly — keeps the URL and error handling in sync.

// IMPORTANT: "localhost" only works in an iOS Simulator. On a real phone
// (Expo Go) or Android Emulator, replace this with your Mac's LAN IP,
// e.g. "http://192.168.1.20:5000". Find it with `ipconfig getifaddr en0`
// on Mac, then keep the backend running with `python3 app.py`.
const BASE_URL = "http://localhost:5000/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `Request to ${path} failed`);
  }
  return data;
}

export const api = {
  getWeather: (lat, lon) => request(`/weather?lat=${lat}&lon=${lon}`),

  routePower: (payload) =>
    request("/power/route", { method: "POST", body: JSON.stringify(payload) }),

  checkAlert: (payload) =>
    request("/power/alert-check", { method: "POST", body: JSON.stringify(payload) }),

  listAppliances: () => request("/appliances"),

  safeToRun: (payload) =>
    request("/appliances/safe-to-run", { method: "POST", body: JSON.stringify(payload) }),

  estimateBill: (payload) =>
    request("/bill/estimate", { method: "POST", body: JSON.stringify(payload) }),

  translateBill: (payload) =>
    request("/bill/translate", { method: "POST", body: JSON.stringify(payload) }),

  optimizeBudget: (payload) =>
    request("/bill/budget-optimizer", { method: "POST", body: JSON.stringify(payload) }),
};
