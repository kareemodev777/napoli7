-- The Grand Opening popup was written when the 50% sale was guests-only, so it
-- told people to "order as a guest". The sale now applies to every customer,
-- signed in or not, which makes that line actively misleading: an account holder
-- reading it would think they had to sign out to get the discount.
--
-- Guarded on the exact seeded text. The popup is admin-editable, so if the owner
-- has already reworded it by hand this must leave their copy alone rather than
-- overwrite it on the next deploy.
update public.marketing_popup
set body = 'From 28 July to 28 August, every item is half price. No code, nothing to claim — the 50% is applied automatically at checkout, whether you have an account or not.'
where id = 1
  and body = 'From 28 July to 28 August, every item is half price. No account, no code — order as a guest and the 50% is applied automatically at checkout.';
