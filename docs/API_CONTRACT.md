# Balaji Electronic API contract — v1

Base URL: `VITE_API_BASE_URL`. JSON request and response bodies. Authenticated
requests use `Authorization: Bearer <token>`.

## Endpoints

- `GET /products?query=&category=&page=&limit=&sort=` — paginated products.
- `GET /products/:sku` — product, pricing, media, stock and warranty.
- `POST /auth/otp` `{ phone, role }` — issue OTP challenge.
- `POST /auth/verify` `{ challengeId, otp }` — session and customer profile.
- `GET /delivery/serviceability?pincode=` — availability, charge and ETA.
- `POST /coupons/validate` `{ code, cart }` — authoritative discount result.
- `POST /orders` `{ items, address, role, coupon }` — immutable server-priced order.
- `POST /payments` `{ orderId, provider }` — provider checkout payload.
- `POST /payments/webhook` — server-only signed payment confirmation.
- `GET /orders` and `GET /orders/:id` — customer order history and tracking.
- `POST /trade/applications` — wholesaler KYC/business onboarding.

## Required product fields

`sku`, `name`, `category`, `brand`, `description`, `images[]`, `mrp`,
`sellingPrice`, `taxRate`, `stock`, `warranty`, `status`, `updatedAt`.

Prices, inventory, coupon results and totals must always be recalculated by the
server. The browser values are display-only and must never be trusted.
