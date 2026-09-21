let cacheVersion = "v3";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
  sendVersionToClients();
});

const sendVersionToClients = async () => {
  const allClients = await clients.matchAll({ includeUncontrolled: true });
  allClients.forEach((client) => {
    client.postMessage({ type: "VERSION", version: cacheVersion });
  });
};
