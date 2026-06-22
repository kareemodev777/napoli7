# Napoli7 Production Readiness

Source: website4.docx

This file turns the reported issues into acceptance criteria for production readiness.

## 1) Admin image change error
Acceptance criteria:
- An admin can replace the existing site image with the intended new image without an error.
- The saved image is the one shown on the public site after refresh.
- The image metadata and alt text stay intact after save.

Verification:
- Replace the target image in admin.
- Reload the public page and confirm the updated image appears.

## 2) “Join the family” text must become “Deal” and link to the Deals tab
Acceptance criteria:
- The visible CTA text says “Deal”.
- Clicking it goes to the Deals page/tab.
- The destination is not broken on mobile or desktop.

Verification:
- Click the CTA and confirm it opens /deals.

## 3) Map pin click error
Acceptance criteria:
- Clicking the map/pin does not throw an error.
- The map still opens or behaves normally on mobile and desktop.
- The location shown matches the published Napoli7 address.

Verification:
- Open the location page and click the map/pin.

## 4) Cash on delivery must be removed for delivery, kept for pickup
Acceptance criteria:
- Delivery orders do not offer COD.
- Pickup orders still allow COD.
- The checkout copy matches the actual payment options.

Verification:
- Test both delivery and pickup checkout flows.

## 5) Password reset flow
Acceptance criteria:
- A password reset email lands the user on the reset form, not the home page.
- The reset form is reachable from the email link.
- The user can submit a new password and complete the flow.

Verification:
- Request a reset email, open the link, and confirm the reset page loads.

## 6) Orders must be sent to POS
Acceptance criteria:
- A completed checkout creates a POS payload with the required fields.
- The order appears in POS with the correct items, totals, and customer data.
- Errors are surfaced if the POS send fails.

Verification:
- Place a test order and confirm the POS payload is generated and delivered.

## 7) New order notification/alarm
Acceptance criteria:
- A new order triggers the configured notification.
- The message content includes the important order details.
- Failures are logged or surfaced for follow-up.

Verification:
- Place a test order and confirm the notification arrives.

## 8) “Send us a message” section must work
Acceptance criteria:
- The form submits successfully.
- Validation errors are shown inline.
- Success and failure states are clear to the user.

Verification:
- Submit a valid message and confirm success.
- Submit an invalid message and confirm validation.

## 9) Online upgrade offer abuse prevention
Acceptance criteria:
- The offer can be claimed only once per account creation.
- The system blocks reuse of the same phone number with different emails.
- The offer cannot be claimed repeatedly through duplicate signups.

Verification:
- Test first-time claim, repeat claim with same account, and reuse with a different email.

## 10) Reset password still not working
Acceptance criteria:
- This is treated as the same password reset issue above.
- No separate broken reset path remains.
- The user can reach the reset form from every valid reset email link.

Verification:
- Re-run the password reset flow end to end.

## Readiness rule
The site is ready only when every item above passes a real smoke test in the live app or a matching automated test.
