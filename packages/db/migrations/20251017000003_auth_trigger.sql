-- ⚠️  READ/UPDATE STATUS.md BEFORE & AFTER CHANGES
-- Migration: Auto-create org and member on user signup | Created: 2025-10-17

-- ============================================================================
-- AUTO-PROVISION ORG AND MEMBER ON USER SIGNUP
-- ============================================================================

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- Create a new organization for this user
  -- You can customize this to link to existing orgs instead
  INSERT INTO public.org (name)
  VALUES (
    COALESCE(
      NEW.raw_user_meta_data->>'organization_name',
      'Organization for ' || NEW.email
    )
  )
  RETURNING id INTO new_org_id;

  -- Add user as admin member of the new org
  INSERT INTO public.member (org_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'admin');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users table to auto-provision org and member
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION handle_new_user() IS 'Automatically creates org and member record when new user signs up';
COMMENT ON TRIGGER on_auth_user_created ON auth.users IS 'Triggers org/member creation on user signup';
