# AgriMarket — React + Express + MySQL

A full-stack agriculture marketplace: React (JS/JSX) frontend, Express REST
API, MySQL database.

```
agri-market/
├── client/       React + Vite frontend
├── server/       Express API
└── database/     schema.sql
```

---

## Run it (pick ONE method)

### Option A: Docker — easiest, works the same on Windows/Mac/Linux

**Prerequisite:** [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.

```bash
docker-compose up
```

That's it. This single command starts MySQL, creates the database, and
starts both the backend and frontend. Wait about a minute for the first run
(it needs to download images and install dependencies), then open:

**http://localhost:5173**

To stop: press `Ctrl+C`. To start again later: `docker-compose up` (fast
the second time). To wipe the database and start fresh: `docker-compose down -v`.

### Option B: Manual — if you already have Node.js and MySQL installed

**Prerequisites:** Node.js 18+, and MySQL running locally.

```bash
# 1. Create the database
mysql -u root -p < database/schema.sql

# 2. Backend (in one terminal)
cd server
npm install
# Open .env and set DB_PASSWORD to your actual MySQL root password
npm run seed
npm run dev

# 3. Frontend (in a second terminal)
cd client
npm install
npm run dev
```

Open **http://localhost:5173**

---

## Test accounts

| Role   | Email                  | Password    |
|--------|------------------------|-------------|
| Admin  | admin@agrimarket.test  | Admin@123   |
| Farmer | farmer@agrimarket.test | Farmer@123  |
| Buyer  | buyer@agrimarket.test  | Buyer@123   |

(Docker seeds these automatically. With Option B, `npm run seed` creates them.)

---

## What's implemented

- Real signup/login/logout with bcrypt password hashing and JWTs.
  Sessions persist across page refresh (`GET /api/auth/me`).
- Role-based access (buyer / farmer / admin) enforced **server-side** — the
  frontend's role display is never trusted by the API.
- Products stored in MySQL with search, category/price filters, and pagination.
- **Real image uploads.** Farmers can upload JPEG/PNG/WEBP/GIF product photos
  (multer, 5MB limit), stored in `server/uploads/` and served at
  `http://localhost:5000/uploads/<file>`.
- A real database-backed cart (not localStorage) scoped to the logged-in buyer.
- **Bangladeshi mobile payment methods at checkout** — bKash, Rocket, and
  Nagad, alongside card, bank transfer, and cash on delivery. This is a demo
  integration (no real transaction is processed), but the choice is fully
  real: validated, stored on the order/payment record, and shown throughout
  the admin/farmer/buyer views.
- **Real promo codes**, validated and computed server-side, applied
  atomically inside the checkout transaction. Try `AGRI10`, `WELCOME50`, or
  `FARMFRESH20` at checkout. Admins can create/activate/deactivate/delete
  codes from Admin → Promo Codes.
- **Inventory change history** — every stock change (initial stock, sales,
  cancellation restocks, manual adjustments) is logged with a timestamp and
  reason, viewable on the farmer's Inventory → History tab.
- **AI chatbot** ("Krishi") on every page. Configure `AI_API_KEY`, `AI_BASE_URL`, and `AI_MODEL` in
  `server/.env` for OpenAI-compatible Chat Completions answers; without it, a built-in FAQ
  responder still handles orders, payments, promo codes, selling, etc.
- Checkout runs inside a single MySQL transaction: validates stock, applies
  the promo code, creates the order + order_items, decrements inventory
  (with an audit log entry per item), records a payment row, and empties
  the cart — all or nothing.
- Farmer product CRUD, inventory view + history, and order status updates.
- Admin user management, product approval, order management, payment
  tracking, promo code management, and analytics — all computed live from
  the database.
- Reviews are gated: a buyer can only review a product they've actually ordered.

## Known simplifications

- **Mobile payments (bKash/Rocket/Nagad) don't process a real transaction** —
  this is a demo checkout (real integration requires a signed merchant
  agreement with each provider).
- **Password reset has no email service.** `POST /api/auth/forgot-password`
  returns the reset token directly in the response, and the Forgot Password
  page shows the reset link on-screen. Wire this to an email provider for
  real deployment.
- **The AI chatbot needs your own API key for real AI answers** — without
  one, it still answers common questions via the built-in FAQ responder.
- **Admin Analytics' time-period selector doesn't change the query yet** —
  it currently returns all-time + last-7-days figures.
- A few secondary display fields (e.g. an order's item count in one admin
  dialog) aren't populated by the API and will show blank.

None of this affects the core path: register → browse products → add to
cart → checkout (with promo code + bKash/Rocket/Nagad) → view order →
farmer manages products/inventory/orders → admin manages
users/products/orders/promo codes.

## Project structure

```
server/
  config/db.js            MySQL connection pool (retries on startup if DB isn't ready yet)
  middleware/              auth (JWT), role checks, error handler, upload (multer)
  controllers/             one file per resource (incl. promo, inventory, chatbot, upload)
  routes/                  one file per resource
  uploads/                 uploaded product images (served at /uploads/*)
  seed.js                  creates test accounts + sample products
  server.js                entry point

client/
  src/services/            one file per API resource (fetch wrappers)
  src/contexts/            AuthContext, CartContext (real backend-backed)
  src/components/chatbot/  floating AI chatbot widget
  src/pages/               buyer/, farmer/, admin/, auth/, profile/
```

## Environment variables

`server/.env`:

| Variable | Purpose |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | MySQL connection. Docker sets these for you automatically. |
| `PORT` | Backend port (default 5000) |
| `CLIENT_URL` | Used for CORS — must match where the frontend runs |
| `JWT_SECRET` | Change this to a random string for any real deployment |
| `AI_API_KEY` | Server-only chatbot credential |
| `AI_BASE_URL` | Chat provider base URL (`https://api.hcnsec.cn`) |
| `AI_MODEL` | Provider model (`DeepSeek-V4-Flash`) |
| `AI_TIMEOUT_MS` | Provider timeout, defaults to 90000 milliseconds |
| `SEED_*_PASSWORD` | Passwords used by `npm run seed` for the 3 test accounts |

`client/.env`:

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Where the frontend sends API requests (default `/api`; Vite proxies `/api` and `/uploads` to Express) |

## Troubleshooting

**"Access denied" / MySQL connection error (manual setup only):**
Open `server/.env` and make sure `DB_PASSWORD` matches your actual MySQL
root password (often empty on a fresh install — test with `mysql -u root`).

**Port already in use:**
Something else is using 5000, 5173, or (Docker only) 3307. Stop that
program, or change the port in `.env` / `docker-compose.yml`.

**Docker: "address already in use" on port 3306/3307:**
You likely have a local MySQL or XAMPP already running. This project's
Docker setup uses host port 3307 (not 3306) specifically to avoid that
conflict — if you still see it, another tool is using 3307 too; change the
port mapping in `docker-compose.yml`.

## Audit fixes (this delivery)

A full-stack audit found and fixed the following real, verified bugs:

**Critical — these caused login/signup to appear broken:**
- `DashboardLayout.jsx` called `user.name.charAt(0)`, but the backend only
  ever returns `first_name`/`last_name` — there is no `name` field. This
  threw an uncaught error on every dashboard render (no error boundary
  exists anywhere in the app), which is very likely what made login/signup
  look completely broken even though the backend auth was working
  correctly. Fixed to use `first_name`/`last_name`.
- `App.jsx`'s route guards checked `isAuthenticated` but never checked
  `isLoading`. On every page refresh, there's a brief window before the
  stored token is re-verified where `isAuthenticated` is `false` even for a
  valid session — so a logged-in user's protected route would redirect them
  to `/login` before the check finished. Fixed by waiting for the auth
  check to resolve before evaluating any route.

**Landing page:**
- The hero section's "Sign In" outline button had white text on a
  near-white background at rest (only the hover state had a background
  override) — verified via the actual `outline` button variant and CSS
  theme variables, not a guess. Fixed with an explicit transparent
  background.
- "Sell Your Produce" → "Sell Your Product", and the button now actually
  links to `/register?role=farmer` so it preselects the farmer role instead
  of always defaulting to buyer.
- "Browse and purchase fresh produce" / "Fresh produce, fair prices..." /
  "Browse & purchase produce" / "List your farm produce" / "Discover fresh
  produce..." → all changed to "product(s)" (reviewed individually — each
  was a noun referring to goods, not the verb "to produce").

**Other real bugs fixed:**
- Profile page's KYC status badge was hardcoded to `'verified'` for every
  single user regardless of reality. The real `kyc_status`/`is_kyc_verified`
  columns already existed in the database and were already managed by
  admins — they just weren't exposed on the user's own `/api/auth/me`
  response. Fixed end-to-end (backend now returns the real value; frontend
  now reads it, including a missing branch for the `'submitted'` status
  that would have incorrectly shown as "Rejected").
- The header dropdown's "Settings" item had no click handler — did nothing.
  Wired to the existing `/profile` route.
- A hardcoded "3" notification badge with no backing notification system
  anywhere in the backend — removed rather than left as misleading fake data.
- The notification-preferences "Save" button showed a fake "saved
  successfully" toast without calling any API. Changed to honestly state
  these are local-only until a real endpoint exists.
- Password validation required 8 characters on the frontend but only 6 on
  the backend — the frontend was rejecting valid passwords the backend
  would accept. Aligned to 6 (matching the enforced backend rule), and
  fixed a hint on the profile page that still said "8 characters."
- `database/schema.sql` defaulted new users' `country` to `'Nigeria'` — a
  leftover from an earlier template, inconsistent with the rest of the app
  (bKash/Rocket/Nagad payments, `+880` phone format). Changed to `'Bangladesh'`.

**Verified, not just reviewed:** the full auth flow (register → login →
`/api/auth/me` persistence check → logout → blocked-without-token →
role-based 403) was tested end-to-end against a live backend + MySQL
instance, matching the exact test sequence a QA pass would run. The
production build (`vite build`) was re-run after every change and compiled
2,597 modules with zero errors both before and after this audit.

**Scope note:** dashboard/page alignment, spacing, and responsive behavior
were reviewed at the code level (actual Tailwind classes, grid/flex
structure) rather than a visual/pixel check — this environment has no
browser or screenshot tool. No structural layout bugs were found in that
review, but a live look in an actual browser at a few breakpoints is still
worth doing before shipping to production.

## Round 2 fixes (from live screenshots)

- **"Start Shopping" now works as a real public storefront.** Added a new
  `/shop` route (see `client/src/pages/Shop.jsx`) that lists products with
  zero login required — the actual products API was already public, it
  just had no unauthenticated page pointed at it. Clicking "Add to Cart" or
  the wishlist heart while logged out now prompts sign-in instead of
  silently failing.
- **"Sell Your Product" verified working** — re-confirmed by grepping the
  actual compiled JS bundle for `role=farmer`, not just the source. If this
  still looks broken after updating, it's almost certainly a stale Docker
  image or browser cache — run `docker compose up --build` and hard-refresh
  (Ctrl+Shift+R).
- **Login page role-tab overlap — found the real root cause.** The base
  `TabsList` component hardcodes a fixed 40px height, but these tabs stack
  an icon above a label with extra padding — content that genuinely can't
  fit in 40px, which pushed into the description text below it. Fixed the
  actual container height rather than just nudging a margin.
- **Missing product images — found the real root cause.** The app already
  had a placeholder fallback for products without a photo, but it used a
  Unicode emoji (🌾), which silently renders as nothing on any system
  without a color-emoji font installed (common on Linux desktops). This
  affected product cards AND the "Recent Activity" icons (order/review/
  payment/product/user) app-wide. Replaced every emoji icon with a real
  SVG icon (lucide-react), which renders identically everywhere.
- **Checkout page payment methods now visually distinct** — each method
  (bKash, Rocket, Nagad, Card, Bank Transfer, Cash on Delivery) now has its
  own icon and brand-appropriate color instead of all six looking
  identical. The mobile-wallet number field also got a phone icon and a
  clearer input state.
- **Footer year fixed and made permanent** — was hardcoded to `2024`;
  now computed as `new Date().getFullYear()` so it can't go stale again.
- **Test accounts now actually work out of the box.** The previous
  `docker-compose.yml` never ran `npm run seed` — the README claimed it
  did, which was wrong. `seed.js` is idempotent (checks for existing
  accounts before inserting), so it's now run automatically on every
  container start. Expanded to 3 admin accounts + 1 farmer + 1 buyer (see
  `TEST_ACCOUNTS_PRIVATE.txt`), and removed the credentials box that was
  previously shown directly on the login page.

**Verified again after these changes:** all 5 accounts tested live via
real login requests against a running backend + MySQL instance (not
assumed). Production build re-run: 2,598 modules, zero errors. The
`role=farmer` deep link and the removal of the demo-credentials box were
both confirmed present in the actual compiled output bundle, not just the
source files.
