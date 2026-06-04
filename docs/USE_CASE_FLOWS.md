# Napoli7 Use Case & User Flow Matrix

Last updated: 2026-06-04
Owner decisions confirmed by AK are included in the product rules below.

## Product Rules Confirmed

1. Abandoned card-payment orders can be cancelled by admin/system cleanup.
2. Product price and availability should be revalidated server-side before final order placement.
3. Admin can edit orders after placement when needed.
4. WhatsApp customer notifications should be added alongside kitchen/customer email notifications.
5. Cancelled orders should restore promo-code usage when the promo had been redeemed.
6. Registered users should be able to reorder previous orders.
7. Customers cannot cancel placed orders themselves; only admin can cancel.
8. Stripe/card settlement changes after edits are handled manually for now.
9. Unsupported delivery areas must be blocked, not charged a default fee.
10. Pickup orders need their own pickup-time estimate separate from delivery estimate.

---

## 1. Public Browsing Flows

### UC-01 — Visitor lands on homepage
Actor: Visitor/customer
Main flow:
1. Visitor opens `/`.
2. Visitor sees Napoli7 branding, hero, featured content, CTAs.
3. Visitor can browse menu, deals, delivery, location, about, contact, legal pages, login/register, or cart.
Success result: Visitor reaches the desired public page or order funnel.
Edge cases: mobile nav; direct social/WhatsApp link; slow image loading; SEO/social preview.

### UC-02 — Visitor browses menu
Actor: Visitor/customer
Main flow:
1. Visitor opens `/menu`.
2. System shows categories and active products.
3. Visitor switches/scrolls categories.
4. Visitor opens a product detail page.
Success result: Visitor can evaluate products and choose an item.
Edge cases: inactive product hidden; empty category; mobile layout; stale linked product slug.

### UC-03 — Visitor views product detail
Actor: Visitor/customer
Main flow:
1. Visitor opens `/menu/[slug]`.
2. System shows image, description, veg/spicy tags, size options, customizations, quantity picker.
3. Visitor selects size, customizations, and quantity.
4. Visitor adds item to cart.
Success result: Item is added with correct price and customization snapshot.
Edge cases: single-size item; multi-size item; extra ingredient price; removable ingredient; invalid slug.

### UC-04 — Visitor reads information pages
Actor: Visitor/customer
Pages: `/about`, `/deals`, `/delivery`, `/location`, `/contact`, legal pages.
Main flow: Visitor opens page, reads details, and navigates to menu/contact/call/location.
Edge cases: map unavailable; WhatsApp/phone CTA; legal/refund questions before payment.

---

## 2. Cart Flows

### UC-05 — Add item to cart
Actor: Visitor/customer
Main flow:
1. Customer selects product, size, quantity, customizations.
2. Customer clicks Add to cart.
3. Cart count updates immediately.
4. Cart persists in localStorage.
Rules:
- Same product + same size + same customizations increments quantity.
- Same product with different size/customizations creates a separate line.

### UC-06 — View cart
Actor: Visitor/customer
Main flow:
1. Customer opens `/cart` or cart UI.
2. System shows all line items, sizes, customizations, quantity, prices, subtotal, promo field, checkout CTA.
3. Customer proceeds to checkout or returns to menu.
Edge cases: empty cart; stale cart after deploy; mobile layout.

### UC-07 — Edit cart quantity
Actor: Visitor/customer
Main flow:
1. Customer increases/decreases quantity.
2. Line total and subtotal recalculate.
3. Promo discount is clamped to subtotal.
Edge case: quantity reaches 0 and item is removed.

### UC-08 — Remove cart item
Actor: Visitor/customer
Main flow:
1. Customer removes a line item.
2. Cart count/subtotal update.
3. Empty cart state appears if no items remain.

### UC-09 — Cart after successful order
Actor: Customer
Main flow:
1. Order placement succeeds.
2. Cart is cleared.
3. Customer lands on confirmation page.
Rules: Failed or cancelled payment should not erase cart.

---

## 3. Promo-Code Flows

### UC-10 — Apply valid promo
Actor: Customer
Main flow:
1. Customer enters promo code.
2. System normalizes code to uppercase.
3. Server validates active status, date window, max uses, minimum subtotal.
4. Discount appears in summary.
5. Server revalidates at order submit.

### UC-11 — Invalid promo
Result: Customer sees a clear error and no discount applies.

### UC-12 — Inactive promo
Result: Customer sees inactive-code error.

### UC-13 — Promo not active yet
Result: Customer sees not-active-yet error.

### UC-14 — Expired promo
Result: Customer sees expired-code error.

### UC-15 — Promo usage limit reached
Result: Customer sees usage-limit error.

### UC-16 — Minimum subtotal not met
Result: Customer sees required minimum spend.

### UC-17 — Discount exceeds subtotal
Rule: Discount is capped at subtotal; total never goes negative.

### UC-18 — Promo valid in cart but invalid at submit
Rule: Server revalidates and uses final authoritative outcome.

### UC-19 — COD promo redemption
Rule: Promo usage increments when the COD order is created successfully.

### UC-20 — Card promo redemption
Rule: Promo usage increments only after Stripe confirms payment.

### UC-21 — Cancelled order restores promo usage
Actor: Admin/system
Main flow:
1. Order with redeemed promo is cancelled.
2. System decrements/restores promo usage once.
3. Audit/log prevents double restoration.
Rule: Promo restoration applies to redeemed promos on cancelled orders.

---

## 4. Guest Checkout Flows

### UC-22 — Guest delivery + COD order
Main flow:
1. Guest adds items.
2. Guest opens checkout.
3. Guest enters name, UAE phone, email.
4. Guest chooses delivery.
5. Guest enters supported delivery area and address.
6. Guest chooses ASAP/scheduled slot.
7. Guest selects COD.
8. Server validates details, cart items, product availability/prices, promo, delivery zone, total.
9. Server creates order and order items with `user_id = null`.
10. Kitchen receives notification.
11. Guest sees confirmation and can track with order number + phone.

### UC-23 — Guest pickup + COD order
Main flow: Same as delivery, but pickup selected, address hidden/not required, fee = 0, pickup estimate shown.

### UC-24 — Guest card order succeeds
Main flow:
1. Guest chooses card.
2. Server creates pending order.
3. Stripe Checkout Session is created.
4. Guest pays.
5. Webhook marks order paid and notifies kitchen.
6. Customer sees confirmation.

### UC-25 — Guest cancels card payment
Main flow:
1. Guest cancels Stripe Checkout.
2. User returns to checkout with cancellation message.
3. Cart remains.
4. Pending order can be cancelled by admin/system cleanup.

### UC-26 — Guest card payment fails
Result: Webhook marks payment failed; kitchen is not notified; user can retry or choose COD.

### UC-27 — Invalid checkout details
Validation cases: missing names, invalid +971 phone, invalid email, missing address for delivery, unsupported area, empty cart, excessive quantity, notes too long.

### UC-28 — Empty cart checkout
Result: Checkout shows empty-cart message and menu CTA.

### UC-29 — Guest tracks order
Main flow: Guest enters order number/order ID + phone at `/track`; system shows timeline if matched.

### UC-30 — Guest cannot access account
Rule: `/account/*` redirects to login.

---

## 5. Registered Customer Flows

### UC-31 — Register
Main flow: Customer submits name/email/password/confirmation; Supabase sends confirmation email.
Edge cases: existing email, weak password, password mismatch, email delivery failure.

### UC-32 — Confirm email
Main flow: Customer clicks email link and then logs in.

### UC-33 — Login with password
Main flow: Customer logs in and is redirected to account/next page; pending cart remains.

### UC-34 — Login with magic link
Main flow: Customer requests link, opens link, gets authenticated.

### UC-35 — Password reset
Main flow: Customer requests reset email and follows Supabase reset flow.

### UC-36 — Account dashboard
Main flow: Logged-in user sees greeting, recent orders, quick links, logout.

### UC-37 — Logged-in checkout
Main flow:
1. User builds cart.
2. Checkout pre-fills account details/default address when available.
3. Order is saved with `user_id`.
4. Delivery address can be saved for future checkout.

### UC-38 — Order history
Main flow: User views past orders, status, items, details, and track link.

### UC-39 — Saved addresses
Main flow: User adds, deletes, and marks default saved addresses.
Rules: First saved address becomes default.

### UC-40 — Wishlist
Main flow: Logged-in user saves/removes products and views wishlist.
Logged-out user should be redirected to login.

### UC-41 — Reorder previous order
Actor: Registered customer
Main flow:
1. User opens a past order.
2. User clicks Reorder.
3. System checks each product is still active and price/current size is valid.
4. Available items are added to cart with previous quantities/customizations where possible.
5. User is shown any unavailable/changed items.
6. User proceeds to checkout.

### UC-42 — Logout
Main flow: User signs out and account routes become inaccessible.

---

## 6. Delivery & Pickup Flows

### UC-43 — Supported delivery area
Main flow: Customer selects supported area; fee appears; order submit revalidates fee.

### UC-44 — Pickup order
Main flow: Customer selects pickup; address hidden; fee = 0; pickup estimate is shown.

### UC-45 — Unsupported delivery area blocked
Actor: Customer
Main flow:
1. Customer enters/selects unsupported area.
2. System shows delivery unavailable.
3. Place Order is blocked until customer selects supported area or pickup.
4. Server also rejects unsupported delivery area.

### UC-46 — Delivery fee changes before submit
Rule: Server fee calculation is authoritative.

### UC-47 — Separate estimates
Rules:
- Delivery confirmation should show delivery estimate.
- Pickup confirmation should show pickup estimate.

---

## 7. Confirmation & Tracking Flows

### UC-48 — Order confirmation
Main flow: Customer sees order number, items, total, payment status, estimate, tracking link, menu link.

### UC-49 — Invalid confirmation link
Result: Safe not-found/error page.

### UC-50 — Tracking after admin update
Main flow: Admin updates status; customer track page reflects current status.

### UC-51 — Customer status notifications
Rule: Send email and WhatsApp status notification when applicable.

---

## 8. Payment Flows

### UC-52 — COD
Rule: Kitchen is notified immediately; customer pays manually on delivery/pickup.

### UC-53 — Card success
Rule: Webhook is source of truth; paid card orders notify kitchen after confirmation.

### UC-54 — Card abandoned
Rule: Pending order can be cancelled by admin/system cleanup; promo is not consumed unless paid.

### UC-55 — Stripe webhook failure
Rule: Admin reconciles manually in Stripe dashboard for now.

### UC-56 — Refund event
Rule: Stripe refund webhook may mark payment refunded, but manual handling remains current operating model.

### UC-57 — Admin edit after card payment
Rule: System records payment difference; Stripe settlement is handled manually.

---

## 9. Contact & Support Flows

### UC-58 — Contact form
Main flow: Visitor submits contact form; system emails Napoli7; user sees success/error.

### UC-59 — Phone call
Main flow: Visitor taps phone link and calls Napoli7.

### UC-60 — Location/directions
Main flow: Visitor opens map/location and gets directions.

---

## 10. Admin Access Flows

### UC-61 — Admin login
Main flow: Admin logs in and accesses `/admin` after role check.

### UC-62 — Non-admin blocked
Rule: Logged-in customers cannot access admin.

### UC-63 — Guest blocked
Rule: Guest is redirected to login.

### UC-64 — Expired admin session
Rule: Admin actions reject or redirect until login is refreshed.

---

## 11. Admin Order Management Flows

### UC-65 — View orders
Main flow: Admin sees orders newest-first with filters/status/actionable count.

### UC-66 — View order detail
Main flow: Admin opens detail page and sees customer, address, items, customizations, notes, promo, payment, totals.

### UC-67 — Update status
Main flow: Admin updates status; server verifies admin; customer tracking updates; customer notification is sent.

### UC-68 — Cancel order
Actor: Admin
Main flow:
1. Admin sets status to cancelled.
2. System updates order.
3. System restores redeemed promo usage if applicable.
4. Customer receives cancellation notification via email/WhatsApp.
Rule: Customer cannot self-cancel.

### UC-69 — Edit order line items
Main flow: Admin changes quantities/removes lines/adds active products; totals recalculate; audit row is recorded.

### UC-70 — Adjust delivery fee
Main flow: Admin edits fee; total and payment difference recalculate.

### UC-71 — Adjust discount
Main flow: Admin edits discount; discount is clamped to subtotal; audit row records change.

### UC-72 — Internal notes
Main flow: Admin writes internal/admin/payment notes.

### UC-73 — Actionable order count
Main flow: Admin notification bell polls count; non-admin receives 401.

---

## 12. Admin Catalog Flows

### UC-74 — View catalog
Admin views categories, products, sizes, customizations.

### UC-75 — Create/edit/delete category
Admin manages categories; public menu/sitemap revalidates.

### UC-76 — Create/edit/deactivate/delete product
Admin manages product details, flags, image URL, active status.
Rules: Existing orders keep product snapshots.

### UC-77 — Manage sizes
Admin adds/edits/removes size options and prices.

### UC-78 — Manage customizations
Admin adds/removes ingredient customizations, extra price, removable flag.

### UC-79 — Upload product image
Admin uploads image; product can use new URL.

---

## 13. Admin Promo Flows

### UC-80 — View promos
Admin views all promo settings and usage.

### UC-81 — Create percent promo
Admin creates percent discount; percent must be <= 100.

### UC-82 — Create AED promo
Admin creates flat AED discount.

### UC-83 — Edit/disable/delete promo
Admin updates promo; cart/checkout revalidate.

### UC-84 — Invalid promo config rejected
Server validation rejects invalid values.

---

## 14. Admin Delivery-Zone Flows

### UC-85 — View zones
Admin sees delivery areas and fees.

### UC-86 — Create/edit/delete zone
Admin manages supported areas and fees.

### UC-87 — Disable zone
Disabled/unsupported zones must block delivery checkout.

---

## 15. Admin Customer Flows

### UC-88 — View customers
Admin sees customers derived from orders grouped by email or phone.

### UC-89 — Identify repeat customer
Admin sees order count, total spent, first/last order.

---

## 16. Notification Flows

### UC-90 — Kitchen notification for COD
Order creation triggers kitchen notification immediately.

### UC-91 — Kitchen notification for card-paid order
Stripe success webhook triggers kitchen notification.

### UC-92 — Customer status notifications
Status changes send email and WhatsApp where configured.

---

## 17. Security & System Rules

### UC-93 — Server-side money authority
Server validates/recomputes cart items, products, promo, fee, subtotal, discount, total.

### UC-94 — Admin action authorization
Every admin action calls admin-role guard.

### UC-95 — Account route authorization
Account routes require authenticated customer.

### UC-96 — Public tracking privacy
Tracking requires order identifier and phone match.

---

## 18. Error & Edge-Case Flows

### UC-97 — Supabase unavailable
Customer sees friendly error; cart remains.

### UC-98 — Order created but item insert fails
System logs failure; admin handling/retry needed.

### UC-99 — Notification failure
Order still succeeds; admin panel remains source of truth.

### UC-100 — Refresh checkout
Cart persists; account prefill may reload.

### UC-101 — Cross-device cart
Cart does not sync across browsers/devices; account order history does.

### UC-102 — Login after guest cart
Cart remains and order can attach to user after login.

### UC-103 — Duplicate submit
UI pending state should prevent double-submit; card order creation should avoid duplicate writes where possible.

### UC-104 — Browser back after order
Cart is empty and user sees empty-cart/confirmation state.

### UC-105 — Stale product price/availability
Server should revalidate current product/size/customization before accepting order.

### UC-106 — Wrong phone/email
Tracking/notifications may fail; admin can edit order details if needed.

---

## 19. SEO, Analytics & Sharing

### UC-107 — Sitemap crawl
Public pages/products included; private/cart/checkout/admin/api excluded.

### UC-108 — Robots directives
Search engines are blocked from private/transactional routes.

### UC-109 — Social sharing
Homepage/product links render Open Graph previews.

### UC-110 — Analytics
Vercel Analytics records page views and Web Vitals without personal data.

---

## High-Priority QA Checklist

1. Guest delivery + COD order with supported area.
2. Guest pickup + COD order with pickup estimate.
3. Guest card success via Stripe test card.
4. Card cancel returns to checkout and cart remains.
5. Unsupported delivery area blocks checkout client-side and server-side.
6. Valid promo applies and redeems for COD.
7. Cancelled order restores redeemed promo usage.
8. Registered user places order and sees it in order history.
9. Registered user reorders a previous order.
10. Admin edits order after placement.
11. Admin cancels order; customer cannot self-cancel.
12. Admin status update changes public tracking and sends notifications.
13. Admin catalog/product/promo/delivery-zone CRUD.
14. Non-admin cannot access admin routes.
15. Server rejects stale/inactive products and manipulated prices.
16. Build, lint, typecheck, and unit tests pass.
