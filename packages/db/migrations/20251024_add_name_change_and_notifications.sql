-- Add name change request and notification tables
-- Migration: 20251024_add_name_change_and_notifications
-- Description: Add tables for name change requests and user notifications

-- Create name_change_request table
CREATE TABLE IF NOT EXISTS name_change_request (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES member(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES org(id) ON DELETE CASCADE,
  current_first_name TEXT,
  current_last_name TEXT,
  requested_first_name TEXT NOT NULL,
  requested_last_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  reviewed_by UUID REFERENCES member(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create notification table
CREATE TABLE IF NOT EXISTS notification (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES org(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  metadata JSONB,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_name_change_request_member_id ON name_change_request(member_id);
CREATE INDEX IF NOT EXISTS idx_name_change_request_org_id ON name_change_request(org_id);
CREATE INDEX IF NOT EXISTS idx_name_change_request_status ON name_change_request(status);
CREATE INDEX IF NOT EXISTS idx_notification_user_id ON notification(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_org_id ON notification(org_id);
CREATE INDEX IF NOT EXISTS idx_notification_read ON notification(read);
CREATE INDEX IF NOT EXISTS idx_notification_created_at ON notification(created_at DESC);

-- Add comments
COMMENT ON TABLE name_change_request IS 'Stores user name change requests requiring admin approval';
COMMENT ON TABLE notification IS 'Stores user notifications for various events';
COMMENT ON COLUMN name_change_request.status IS 'Request status: pending, approved, or denied';
COMMENT ON COLUMN notification.type IS 'Notification type (e.g., name_change_request, pa_request_created, etc.)';
COMMENT ON COLUMN notification.metadata IS 'Additional notification data stored as JSON';

-- Enable Row Level Security
ALTER TABLE name_change_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification ENABLE ROW LEVEL SECURITY;

-- RLS Policies for name_change_request

-- Users can view their own name change requests
CREATE POLICY "Users can view own name change requests"
  ON name_change_request
  FOR SELECT
  USING (
    member_id IN (
      SELECT id FROM member WHERE user_id = auth.uid()
    )
  );

-- Admins can view all name change requests in their org
CREATE POLICY "Admins can view org name change requests"
  ON name_change_request
  FOR SELECT
  USING (
    org_id IN (
      SELECT org_id FROM member
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- Users can create their own name change requests
CREATE POLICY "Users can create own name change requests"
  ON name_change_request
  FOR INSERT
  WITH CHECK (
    member_id IN (
      SELECT id FROM member WHERE user_id = auth.uid()
    )
  );

-- Admins can update name change requests in their org
CREATE POLICY "Admins can update org name change requests"
  ON name_change_request
  FOR UPDATE
  USING (
    org_id IN (
      SELECT org_id FROM member
      WHERE user_id = auth.uid()
      AND role = 'admin'
      AND status = 'active'
    )
  );

-- RLS Policies for notification

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notification
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notification
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON notification
  FOR DELETE
  USING (user_id = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_name_change_request_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER name_change_request_updated_at
  BEFORE UPDATE ON name_change_request
  FOR EACH ROW
  EXECUTE FUNCTION update_name_change_request_updated_at();
