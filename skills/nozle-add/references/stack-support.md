# Stack support: say which Nozle path applies

Run `nozle-check env <application folder>` (as one plain command: `nozle-check env <absolute application folder>`, or `node <skill folder>/scripts/nozle-check.mjs env <folder>`; never chain it with `cd`; the target folder in a monorepo) and read its backend and frontend paths. It reads manifests only. Confirm the SDK list against the docs MCP `/sdks` pages at run time: the table below is the list when this was written, and a framework the docs now cover beats it. Never claim an SDK exists that the docs do not list.

## First-response statement (required, before the menu)

Say, in your own words, all of this:

- **Stack:** language, framework, runtime, package manager, in one line.
- **Backend path:** `@nozle-js/node`, `nozle-sdk`, or the REST API, and why.
- **Frontend path:** `@nozle-js/react`, native components, or none, and why.
- **When there is no SDK:** "There is no Nozle SDK for <framework>. I will <what you will build instead>. You own <what stays with you>." Say it even when the fallback is easy.
- **Unknowns:** name each one from the `unknown` lines (for example the runtime behind `adapter-auto`) and what would change if it goes the other way.

## The rules

1. Secret-key calls (`sk_`) live on a server only. Server means Node, Python, or any language over REST. A browser, a static site, or a mobile app never holds a secret key.
2. Backend: use `@nozle-js/node` on Node (>= 18; the package ships both ESM and CommonJS, so `import` and `require` both work), `nozle-sdk` on Python (>= 3.9, synchronous) and `github.com/nozle-dev/nozle-go` on Go (>= 1.22). On Workers or other edge runtimes, and in Ruby, Java, PHP or any language without an SDK, use the REST API with the same contract. Read the endpoint pages from the docs MCP.
3. Frontend: `@nozle-js/react` only for React (>= 18, with its Stripe peer packages). For Svelte, Vue, Nuxt, Angular, Solid, Astro, plain HTML or anything else, build small native components in the app's own framework. They read plans from a backend route (or the public catalog with a publishable `pk_` key) and call backend routes for checkout, gates and balances. The customer always comes from the authenticated session, never from the browser.
4. Astro with a React integration can use a React island with `@nozle-js/react`. Offer that as one option next to native components, with the trade-off (a React runtime in an otherwise React-free site).
5. No server code at all (static site, SPA): say so. Secret-key work needs a backend. Offer the choices (an SSR adapter or server route, a separate backend, or a managed backend) and do only the public-catalog display until the user decides.
6. Environment problems are findings, not silent fixes: no dependency manifest, an out-of-sync lockfile, Node < 18, Python < 3.9, React < 18, an SDK version already installed. Say what you found and what it changes. Creating a missing manifest is an edit that needs the approved scope.
7. Native components are application code. List them in the scope, keep them accessible, and note that Nozle ships no styling for them.

## Framework notes

| Stack | Backend | Frontend | Watch for |
|---|---|---|---|
| Next.js, Remix | Node SDK in route handlers or loaders | React SDK | Keep `sk_` out of client components |
| SvelteKit | Node SDK in `+server.ts` and server `load`; read keys from `$env/dynamic/private` (or `$env/static/private`), not `process.env`, which SvelteKit does not fill from `.env` | Native Svelte | The adapter decides the runtime: `adapter-node` is Node, `adapter-cloudflare` is edge (REST), `adapter-auto` is unknown |
| Astro | Node SDK only with an SSR adapter (`@astrojs/node`); static builds have no server | Native Astro or a React island | Static output cannot hold secrets |
| Vue, Nuxt | Nuxt server routes use the Node SDK; plain Vue needs a backend | Native Vue | Nuxt on edge presets: REST |
| Angular | Needs a separate backend | Native Angular | Same as any SPA |
| Express, Fastify, Hono, Nest | Node SDK | Whatever the frontend is | Hono on Workers: REST |
| FastAPI, Django, Flask | Python SDK | Whatever the frontend is | Wrap synchronous calls under async handlers |
| Go | Go SDK (`nozle-go`) | Native | Go >= 1.22 |
| Ruby, PHP, Java | REST from the backend | Native | No SDK |
| Mobile apps | REST through the merchant backend | Native UI | The app never holds a secret |

## A new project with no stack chosen

Do not scan or edit anything. Say which stacks have first-class Nozle SDKs (Node with Next.js, SvelteKit on the Node adapter, Express or Hono; Python with FastAPI or Django; React on the frontend) and which would use REST, give one line of trade-off for each, and then follow the user's choice. Never insist on a stack. Whatever they pick, the same first-response statement applies once code exists.

## End to end needs both halves

Most billing choices need a backend (secret-key calls, webhooks, usage events, entitlement checks) and a frontend (pricing, checkout, billing screens). A choice is only complete when each half it needs exists. Name the missing half before the user picks, and offer: add it in this project, use a separate service the user owns, or leave the choice out. Do not hide a choice because a half is missing.
