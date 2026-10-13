# EMSB Implementation Rules

1. **Phase completion**: A phase is to be marked done in the EMSB-Checklist.md file checklist only when the phase is fully complete and properly tested. Do not check boxes prematurely.
2. **Test before marking done**: The Phase is not to be marked done until it is fully complete and verified by running lint, typecheck, and available tests.
3. **Follow EMSB.md religiously**: Do not create functionality or deviate from the EMSB.md specification. Do not invent endpoints, rules, or behavior beyond what is specified.
4. **Resolve uncertainty via EMSB.md or user**: If unsure about anything, refer to the EMSB.md document or ask the user directly. Never guess.
5. **Documentation discipline**: Log all implementation decisions into `Decisions.md` and all errors/technical debt into `Errors.md` within the EMSB folder as work progresses.
6. **Backend is authoritative**: Frontend permissions are UX-only; backend permissions are security. Never trust data from the browser.
7. **Work phase-by-phase**: Follow the implementation phases in EMSB.md (Phase 0 through Phase 18) in order. Keep the application runnable after each phase.
8. **Keep it runnable**: Do not create a large untested backend in one pass. Each phase must compile and be testable before moving on.
9. **DTO boundary**: Never return raw MongoDB documents. Use DTO mapping between persistence and API.
10. **Domain rules in services**: Domain logic belongs in service layer methods, not controllers. MongoDB queries belong in repositories. Validation belongs at the API boundary.
11. **Soft delete policy**: Do not physically delete employees, attendance, leave history, reviews, audit logs, compensation history, or documents with business significance. Use status/end dates.
12. **Explicit domain actions**: Prefer explicit domain action endpoints (e.g., `/activate`, `/approve`, `/reject`) over generic CRUD where business intent matters.
13. **Money policy**: Do not use floating-point arithmetic for monetary values. Store in minor units or use Decimal128. Currency must be explicit.
14. **Timestamps in UTC**: Store all timestamps in UTC. Use ISO timestamps in API responses. Handle date-only fields deliberately as calendar dates.
15. **No MongoDB coupling in frontend**: The frontend must never know MongoDB URI, collection names, query syntax, or internal IDs beyond API identifiers.
