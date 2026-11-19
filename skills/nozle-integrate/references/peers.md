# One product, several repositories

Each repository keeps its own records; the shared Nozle account and the `peers` and `interfaces` entries tie them together.

- Say in the first response which part this repository is: a server that can hold the secret key is a backend; no server code is frontend only.
- Ask once where the other part is (a folder here, a repository not available, or a folder added to this session) and record `peers: [{ role: backend|frontend, location: <path, repository or "unavailable">, record_seen: true|false }]` (`[]` when this repository is the whole product). `record_seen: false` means unverified; say so.
- A readable peer: read its `nozle.integration.yaml` and `nozle-study.yaml`, reuse its payer mapping, `decisions` and `interfaces`, say what you reused, and never ask again what it answers. A peer another session works on is read-only. With both folders in one session, keep a record in each and edit each only under its own approved scope.
- A backend publishes the routes the frontend needs: `interfaces: [{ id, provides: true, method, route, purpose, shape }]`. The customer comes from the backend session; keys exist only there.
- A frontend builds only against that contract: `{ id, consumes: true, method, route, status: provided }`. Without a backend record, each needed route is `consumes` with `status: unmatched`, only presentation and call sites are built, dependent tasks are `blocked`, and the user is told which backend work remains. Never invent a backend endpoint in a frontend repository.
- Each record covers its own repository: `selected_goals` lists goals built here, and a frontend with no server leaves `stack` out.
- Order does not matter: whichever session runs second reads what the first left.
