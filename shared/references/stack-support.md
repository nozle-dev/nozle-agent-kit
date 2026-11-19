# Stack support

Run `nozle-check env <absolute application folder>` (the target app in a monorepo) and read its backend and frontend paths. Confirm the SDK list, runtime minimums and coverage against `/sdks/<lang>/installation` and `/sdks/react/installation`: the docs beat the table below, and an SDK the docs do not list does not exist.

## First-response statement

Before the menu, say:

- **Stack:** language, framework, runtime, package manager.
- **Backend path:** `@nozle-js/node`, `nozle-sdk`, the Go SDK, or REST, and why.
- **Frontend path:** `@nozle-js/react`, native components, or none, and why.
- **No SDK:** "There is no Nozle SDK for <framework>. I will <build instead>. You own <what stays with you>." Never write that SDK support is unverified; the env check and docs give the verdict.
- **LLM capture:** per service with an LLM client, whether the capture page for this language (`/sdks/node/llm-auto-capture`, `/sdks/python/llm-auto-capture`, `/sdks/go/llm-usage`) covers it; when not, usage and cost are still reported from the backend (capability 7).
- **Unknowns:** each `unknown` line (for example the runtime behind `adapter-auto`) and what changes either way.

## Rules

1. Secret-key calls live on a server only (any language). A browser, static site or mobile app never holds one.
2. Backend: the Node, Python or Go SDK at a runtime its installation page supports. Edge runtimes, Ruby, Java, PHP or any language without an SDK use REST with the same contract.
3. Frontend: `@nozle-js/react` only for React, at the versions its installation page lists, its billing hooks served by the backend route the SDK pages describe. Other frameworks get small native components the user owns; they read plans from a backend route (or the public catalog with a `pk_` key) and call backend routes. Astro may use a React island; offer it with the trade-off.
4. No server code: secret-key work cannot happen here. Ask before any plan or record (integrate skill, step 1).
5. Environment problems (no manifest, a stale lockfile, a version below the minimum, an SDK already installed) are findings, not silent fixes.
6. A choice needs every half it uses: backend for secret-key calls, webhooks and usage events; frontend for pricing, checkout and billing screens. Show a choice with a missing half as a requirement (add it here, a separate service the user owns, or out of scope), never hide it.

## Framework traps

- SvelteKit: keys come from `$env/dynamic/private` or `$env/static/private`, not `process.env`; `adapter-node` is Node, `adapter-cloudflare` is edge (REST), `adapter-auto` is unknown.
- Astro: the Node SDK only with `@astrojs/node`; static output holds no secrets.
- Nuxt on edge presets and Hono on Workers: REST. Plain Vue, Angular and mobile apps need a backend.
- FastAPI, Django: the SDK's async client under async handlers when the installed version has one.

A new project with no stack: name the stacks with SDKs and those on REST, one trade-off each, and follow the user's choice.
