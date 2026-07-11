const DATA_CHANGED_EVENT = "appDataChanged";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DATA_ENDPOINT = /\/(products|sales|entries|expenses|transfers|transfer-receptions|cars|car-trips|customers|exchange-rates)(?:\/|$)/;

type ChangeDetail = {
  method: string;
  url: string;
  source: string;
};

const source = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
let channel: BroadcastChannel | null = null;

function notify(detail: Omit<ChangeDetail, "source">) {
  const change: ChangeDetail = { ...detail, source };
  window.dispatchEvent(new CustomEvent<ChangeDetail>(DATA_CHANGED_EVENT, { detail: change }));

  // Keep the existing page-level listeners working while all modules migrate to
  // the single event above.
  if (/\/products(?:\/|$)/.test(change.url)) window.dispatchEvent(new Event("productsUpdated"));
  if (/\/sales(?:\/|$)/.test(change.url)) {
    window.dispatchEvent(new Event("salesUpdated"));
    window.dispatchEvent(new Event("productsUpdated"));
  }
  if (/\/transfers(?:\/|$)/.test(change.url)) window.dispatchEvent(new Event("transferCreated"));
  if (/\/transfer-receptions(?:\/|$)/.test(change.url)) {
    window.dispatchEvent(new Event("transferReceptionUpdated"));
    window.dispatchEvent(new Event("transferCreated"));
    window.dispatchEvent(new Event("productsUpdated"));
  }
  if (/\/(cars|car-trips)(?:\/|$)/.test(change.url)) window.dispatchEvent(new Event("tripCreated"));

  channel?.postMessage(change);
}

/**
 * Notify every module after any successful write to a business-data endpoint.
 * This covers both apiFetch and legacy direct fetch calls, and also broadcasts
 * the update to other open tabs of the application.
 */
export function installDataSynchronization() {
  if (typeof window === "undefined" || (window as Window & { __dataSyncInstalled?: boolean }).__dataSyncInstalled) return;
  (window as Window & { __dataSyncInstalled?: boolean }).__dataSyncInstalled = true;

  if ("BroadcastChannel" in window) {
    channel = new BroadcastChannel("dookon-data-sync");
    channel.onmessage = (event: MessageEvent<ChangeDetail>) => {
      if (event.data?.source !== source) {
        window.dispatchEvent(new CustomEvent<ChangeDetail>(DATA_CHANGED_EVENT, { detail: event.data }));
      }
    };
  }

  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await nativeFetch(input, init);
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

    if (response.ok && MUTATING_METHODS.has(method) && DATA_ENDPOINT.test(url)) {
      notify({ method, url });
    }
    return response;
  };
}

export { DATA_CHANGED_EVENT };
