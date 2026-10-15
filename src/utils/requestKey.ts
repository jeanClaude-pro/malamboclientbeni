// One Idempotency-Key per user operation (POS sale, cash entry, expense,
// stock adjustment). The same key is re-sent if the request is retried, so
// the server records the operation once even after a double click or a
// network failure; a new key is created only after a confirmed success.

export function newRequestKey(prefix = "op") {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

/** Holds the key of the operation in progress until it succeeds. */
export function createRequestKeyHolder(prefix = "op") {
  let current: string | null = null;
  return {
    get() {
      if (!current) current = newRequestKey(prefix);
      return current;
    },
    /** Call after the server confirmed the operation. */
    reset() {
      current = null;
    },
  };
}
