const DATA_CHANGED_EVENT = "appDataChanged";
const AUTH_TOKEN_REFRESHED_EVENT = "authTokenRefreshed";
const AUTH_LOGGED_OUT_EVENT = "authLoggedOut";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const DATA_ENDPOINT = /\/(products|sales|entries|expenses|transfers|transfer-receptions|cars|car-trips|customers|exchange-rates)(?:\/|$)/;
// Auth endpoints legitimately return 401 for wrong credentials — that must
// surface as a login-form error, not trigger a global forced logout.
const AUTH_ENDPOINT = /\/auth\//;
// Every endpoint that is branch-dependent — used both to decide whether to attach
// X-Branch-Id and to track in-flight requests for the branch-switch completion signal.
const BRANCH_SCOPED_ENDPOINT = /\/(api\/)?(products|sales|entries|expenses|transfers|transfer-receptions|cars|car-trips|customers|stock-movements|company-report|loan|users|exchange-rates)(?:\/|\?|$)/;

type ChangeDetail = {
  method: string;
  url: string;
  source: string;
};

const source = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
let channel: BroadcastChannel | null = null;

// Tracks how many branch-scoped requests are currently in flight, so the
// branch-switch overlay can wait for real readiness instead of a pure timer.
let pendingBranchRequests = 0;
let idleWaiters: Array<() => void> = [];

function beginBranchRequest() {
  pendingBranchRequests++;
}

function endBranchRequest() {
  pendingBranchRequests = Math.max(0, pendingBranchRequests - 1);
  if (pendingBranchRequests === 0 && idleWaiters.length > 0) {
    const waiters = idleWaiters;
    idleWaiters = [];
    waiters.forEach((resolve) => resolve());
  }
}

/**
 * Resolves once every branch-scoped request that is in flight *right now*
 * has settled. Callers should give listeners a tick to actually call fetch()
 * after triggering a refresh before awaiting this, otherwise it can resolve
 * immediately against zero in-flight requests.
 */
export function waitForPendingBranchRequests(): Promise<void> {
  if (pendingBranchRequests === 0) return Promise.resolve();
  return new Promise((resolve) => idleWaiters.push(resolve));
}

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
    const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const token = localStorage.getItem("token");
    const branchId = localStorage.getItem("activeBranchId");
    const isBranchScoped = Boolean(token && branchId && BRANCH_SCOPED_ENDPOINT.test(url));
    const headers = new Headers(init?.headers || (input instanceof Request ? input.headers : undefined));
    if (isBranchScoped) headers.set("X-Branch-Id", branchId as string);

    if (isBranchScoped) beginBranchRequest();
    try {
      const response = await nativeFetch(input, { ...init, headers });

      // The server hands back a renewed JWT on any request made while the
      // current one is nearing expiry (server/middleware/auth.js). Every
      // fetch in the app funnels through here, so this is the one place that
      // needs to notice it and keep localStorage + AuthContext in sync —
      // otherwise an active user's session would still die at the hard 1-day
      // mark despite the server willingly extending it.
      const refreshedToken = response.headers.get("X-New-Token");
      if (refreshedToken && refreshedToken !== token) {
        localStorage.setItem("token", refreshedToken);
        window.dispatchEvent(
          new CustomEvent(AUTH_TOKEN_REFRESHED_EVENT, { detail: { token: refreshedToken } })
        );
      }

      if (response.status === 401 && token && !AUTH_ENDPOINT.test(url)) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.dispatchEvent(new CustomEvent(AUTH_LOGGED_OUT_EVENT));
      }

      if (response.ok && MUTATING_METHODS.has(method) && DATA_ENDPOINT.test(url)) {
        notify({ method, url });
      }
      return response;
    } finally {
      if (isBranchScoped) endBranchRequest();
    }
  };
}

/**
 * The branch active right now, per localStorage (the single source of truth
 * shared by AuthProvider, the fetch header injector above, and every page).
 * Pages use this to discard a response that resolved after the user already
 * switched branches, instead of overwriting the new branch's state with stale data.
 */
export function getActiveBranchId(): string | null {
  return localStorage.getItem("activeBranchId");
}

export { DATA_CHANGED_EVENT, AUTH_TOKEN_REFRESHED_EVENT, AUTH_LOGGED_OUT_EVENT };
