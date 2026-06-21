# Napoli7 backlog plan

Date: 2026-06-21
Source: website4.docx

## Goal
Bring the Napoli7 public site and ordering flow up to the level described in the backlog document, with each issue having a clear target state, acceptance criteria, and verification path.

## Working assumptions
- If the document is light on specs, use the live brand/site copy, existing design system, and current product/menu data as the source of truth.
- Prefer small, testable changes over broad rewrites.
- Keep the public site consistent across home, about, location, contact, menu, checkout, FAQ, and legal pages.
- If an item is already fixed in code, still keep its acceptance criteria here so it stays verified.

## Workstreams
1. Marketing and brand pages: home, about, hero, story blocks, CTAs, imagery.
2. Menu and product catalog: categories, availability, sizes, labels, mobile presentation.
3. Location, contact, and ordering: map, delivery area, address capture, checkout, POS, notifications.

## Issue-by-issue acceptance criteria

1. Opening hours are consistent everywhere
- Home, location, contact, FAQ, and footer all show the same open hours.
- Closed days are stated clearly.
- No page says a different opening window than another.

2. Google Maps works on desktop and mobile
- The map loads without console errors.
- The embed or interactive map is usable on a phone viewport.
- The pin lands on the intended shop location.

3. Volcano / hero image crop is corrected
- The image is framed intentionally on both desktop and mobile.
- Important content is not clipped off.
- No awkward crop at common breakpoints.

4. Wrong image asset is replaced
- The page uses the intended photo, not a placeholder or incorrect fallback.
- The alt text matches the visible content.
- The same image choice is consistent in the relevant section(s).

5. Map pin is placed on the right spot
- The visible pin, address copy, and directions link all refer to the same physical location.
- The pin matches the coordinates used in the codebase.
- No mismatch between the map marker and the written address.

6. The “Create your account” CTA points to the right destination
- Clicking the CTA goes to the intended account or deals flow.
- The CTA label matches what the destination actually does.
- The link does not dead-end or loop.

7. The “Order now” CTA goes to the right place
- Clicking it takes the user into ordering, not a dead page.
- On mobile and desktop it is easy to find and tap.
- The CTA text matches the destination state (menu, delivery, checkout, or hours).

8. About-page image link behavior is correct
- The image and any linked wrapper behave as intended.
- Clicking the image, if enabled, takes the user to the right page.
- If it is purely decorative, it is not misleadingly clickable.

9. About / Our Story layout is fixed
- Text blocks have clear hierarchy and spacing.
- Image and text columns align cleanly.
- No orphaned copy or awkward line breaks at common breakpoints.

10. Cart icon is clear
- The cart affordance is obvious as a cart.
- Quantity is visible when items exist.
- On mobile and desktop the user understands the control without guessing.

11. Delivery minimum is calculated correctly
- The minimum order check uses item subtotal only.
- Delivery fee is not counted toward meeting the minimum.
- The checkout warning reflects the actual rule.

12. Public Vegan category is visible
- Vegan items are grouped in a public-facing category or collection.
- The category appears in the menu and can be browsed by customers.
- Vegan items are discoverable without needing an internal label.

13. Public “Create your Own Pizza” category is visible
- The category exists in the public menu.
- It is easy to find from the menu navigation or category list.
- The product/category name matches the customer-facing label.

14. Pizza availability state is shown clearly
- Unavailable items are visibly marked.
- The user cannot add unavailable items to the cart.
- The wording is human and matches the live kitchen state.

15. The “momentarily unavailable” state is exposed when needed
- Temporarily unavailable products show the correct label.
- The add-to-cart action is blocked or disabled.
- The state is reversible without manual code changes.

16. Mobile hero layout is fixed
- The hero image and copy do not overlap badly.
- The main CTA remains visible without feeling cramped.
- The layout looks deliberate on small screens.

17. Mobile navigation is fixed
- Menu, deals, about, track order, location, contact, and cart remain reachable.
- The nav does not overflow or hide key actions.
- The mobile nav is easy to open and close.

18. Focaccia no longer offers the removed 30 cm and 24 cm sizes
- Focaccia products do not expose the removed size options.
- The product card and detail modal/page only show the allowed configuration.
- Pricing still resolves correctly for the remaining setup.

19. Delivery area and zone logic are correct
- The delivery area copy matches the actual coverage.
- In-zone customers are accepted.
- Out-of-zone customers are clearly told what happens next.

20. Address autofill / saved-address behavior works
- Saved addresses can be reused.
- The form pre-fills when the customer selects a known address.
- The chosen address is validated against the active delivery zones.

21. The location page copy matches the real shop address
- The written address is consistent with FAQ/contact/legal pages.
- The map and directions link use the same address.
- No page shows a conflicting street or landmark.

22. Password reset works end-to-end
- The reset route exists.
- The user can request a reset and reach the confirm step.
- The flow gives a clear success or failure message.

23. Edit page works end-to-end
- The intended edit route is reachable.
- Existing data can be loaded and changed.
- Save/persist behavior is validated, not just the UI shell.

24. POS transmission works
- Checkout orders can be sent to the POS payload.
- Required fields are present in the payload.
- Errors are surfaced clearly if the POS call fails.

25. Kitchen / order notifications work
- New order notifications fire for the correct event.
- The recipient and content are correct.
- Failure states are logged and testable.

26. Contact page hours are accurate
- The contact page copy matches the live opening hours.
- The page does not show stale messaging.
- The hours text is consistent with home/location/FAQ.

27. FAQ payment copy is accurate
- The FAQ says the real accepted payment methods.
- It does not mention outdated or unavailable methods.
- Pickup-only cash-on-delivery wording is clear if that rule still applies.

28. Contact form submission works
- The form submits successfully to the notification endpoint or server action.
- Validation errors are shown inline.
- Success and failure states are both user-friendly.

29. Google Maps / directions links are correct
- Desktop and mobile directions links open the right destination.
- There are no broken or duplicate map links.
- The links are consistent on home, location, and contact.

30. Brand imagery and labels are consistent across pages
- Hero, about, and story images use the intended assets.
- Alt text matches the content.
- No page uses an outdated placeholder or contradictory label.

31. Menu category ordering is sensible
- Public menu sections appear in the intended order.
- Important categories are visible without deep scrolling.
- The menu is easy to scan on mobile.

32. Product cards present key information clearly
- Price, title, and relevant badges are readable.
- Veg/spicy indicators match the product data.
- Card buttons are obvious and tappable.

33. Checkout confirmation state is trustworthy
- The paid/unpaid state is derived from real payment status.
- A redirect alone does not mark an order paid.
- The user sees a clear status message.

34. Customer-facing copy is consistent across the site
- Address, hours, phone, WhatsApp, and email match everywhere.
- The same tone and wording is used for the same concept.
- No stale copy remains from an earlier version of the site.

## Implementation order
1. Fix data issues that directly affect public menu correctness.
2. Fix layout and CTA issues on the public pages.
3. Fix location/contact/delivery consistency.
4. Verify checkout, POS, notifications, and confirmation behavior.
5. Add or update tests for each changed behavior.

## Verification strategy
- Run focused tests for each changed file or workflow.
- Run the full test suite after the edits land.
- Smoke-test home, menu, about, location, contact, and checkout in the browser.
- Compare page copy after changes to make sure the same facts appear everywhere.
