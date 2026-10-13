import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Ambient request context shared with every service invocation running inside
 * a request. Populated by the audit-context middleware (request metadata) and
 * enriched by the authenticate middleware (acting user). Used by the audit
 * service to attribute records without threading the Express request through
 * the service layer.
 */
export interface RequestContext {
  requestId?: string;
  userId?: string;
  role?: string;
  ipAddress?: string;
  userAgent?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

/**
 * Runs `callback` with the given context available to `getRequestContext()`
 * for its entire (async) duration.
 */
export function runRequestContext<T>(context: RequestContext, callback: () => T): T {
  return storage.run(context, callback);
}

/** Returns the context of the current request, or undefined outside a request. */
export function getRequestContext(): RequestContext | undefined {
  return storage.getStore();
}

/**
 * Merges additional fields into the current request's context store.
 * Used by authenticate() to add the acting user once the token is verified.
 */
export function enrichRequestContext(patch: Partial<RequestContext>): void {
  const store = storage.getStore();
  if (store) {
    Object.assign(store, patch);
  }
}
