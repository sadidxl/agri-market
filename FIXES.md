# AgriMarket fixes — 29 September 2026

## Run the updated project

Keep your existing MySQL database and your uploaded photos. No schema migration is required.
Do not re-import database/schema.sql into an existing database: that script resets tables.
The supplied server/.env retains your original database settings and includes the chatbot
configuration. Check that those database settings match your machine.

From the agri-market folder:

```bash
npm install
npm run install:all
npm run dev
```

Open http://localhost:5173. Restart both servers after replacing the project.
Alternatively, use the existing Docker setup: `docker compose up --build`.
Dependencies and generated build files are omitted from this ZIP; npm installs them.

## Changes

- Start Shopping opens /shop. Sell Your Product opens registration with Farmer selected.
  The decorative hero layer no longer intercepts mouse/touch input.
- Product-card hearts sit above the details overlay, are visible on touchscreens, and
  support keyboard use. Product images/names now open details from the buyer dashboard.
- A shared WishlistProvider loads the buyer's saved products, keeps filled hearts and
  counts synchronized, persists via the API, clears on logout, and responds to changes
  in another browser tab. In-flight buttons are disabled to prevent repeated writes.
- Wishlist API rows explicitly contain product_id. Saves use the existing unique
  constraint for duplicate-safe insertion. Removal stays scoped to the current buyer.
- Wishlist links, remove buttons, and cart actions use the correct product ID.
  Cart success messages wait for successful requests. Add All runs sequentially,
  skips unavailable products, reports failures, and keeps products saved.
- ProductImage resolves upload paths consistently across buyer, farmer, and admin
  pages and displays a placeholder for missing/broken photos. Uploaded files remain
  in server/uploads. A fallback cannot recover a photo missing from that folder.
- client/.env uses /api. Vite proxies /api and /uploads to Express on port 5000.
  If you host frontend and backend separately, set VITE_API_URL to your public API
  URL before building. For same-origin production, proxy /api and /uploads to Express.
- Chatbot now calls https://api.hcnsec.cn/v1/chat/completions using a Bearer token from
  server/.env. Model: DeepSeek-V4-Flash (confirmed in the account's model list).
  The key is server-only, is not placed in client code, and is excluded from git.
  This private ZIP includes the configured server/.env; do not publish that file.
- Chat history accepts only user/assistant roles and bounded text. The provider has
  a 90-second timeout because live responses took approximately 41–45 seconds here.
  If AI fails, the widget clearly identifies its built-in FAQ response.

## Validation completed

- Vite production build passed. Its existing large-bundle advisory remains.
- Five Node backend tests passed: Chat Completions contract/history validation,
  fallback handling, input validation, wishlist response/query scope, and idempotent writes.
- Eleven Chromium browser checks passed with no runtime errors: desktop/mobile landing
  buttons, guest sign-in flow, saved-heart refresh, detail-page keyboard removal,
  signed-in public shop, photo resolution/fallback, failed wishlist mutations,
  wishlist links/cart/removal, Add All availability handling, admin photos, and chat UI.
- Provider model discovery succeeded; a real completion returned HTTP 200. The actual
  sendMessage controller also returned mode=ai with a real response.
- Browser tests used controlled API fixtures. Backend SQL tests used a mock query
  adapter. Your live MySQL database was not connected or modified during testing;
  verify one save/remove/cart cycle against it after starting the project.

To repeat backend checks:

```bash
npm test
```

To repeat browser checks, start Vite in another terminal, then:

```bash
npm install --no-save playwright
npx playwright install chromium
npm run test:browser
```

The browser checks use fixture API data and do not change your real database.

## Main files

- client/src/pages/Index.jsx
- client/src/components/dashboard/ProductCard.jsx
- client/src/contexts/WishlistContext.jsx
- client/src/hooks/use-wishlist-action.js
- client/src/pages/buyer/Wishlist.jsx
- client/src/components/ProductImage.jsx and client/src/lib/imageUrl.js
- client/src/components/chatbot/ChatbotWidget.jsx
- server/controllers/wishlistController.js
- server/controllers/chatbotController.js

Additional product/detail/dashboard pages use the shared wishlist and image components.
