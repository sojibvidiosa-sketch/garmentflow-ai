-- Tighten who may call database functions through the API.
-- Supabase grants EXECUTE on new functions to anon and authenticated by
-- default; only the public demo-request function should be callable signed out,
-- and trigger functions should not be callable by anyone directly.

revoke execute on all functions in schema public from anon, public;
grant execute on function public.submit_lead(text, text, text, text, text, text) to anon;

revoke execute on function
  public.audit_change(), public.check_buyer_company(), public.check_same_company(),
  public.handle_new_user(), public.enforce_po_limit(), public.enforce_seat_limit(),
  public.keep_one_admin(), public.set_updated_at(), public.assert_platform_admin()
from authenticated;

-- Functions created later start closed; each migration grants what it needs.
alter default privileges in schema public revoke execute on functions from anon, authenticated, public;
