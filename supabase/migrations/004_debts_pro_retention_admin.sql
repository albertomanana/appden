-- ============================================================
-- The Appden - Debts Pro + Retention + Admin
-- ============================================================

ALTER TABLE debt_payments
    ADD COLUMN IF NOT EXISTS receipt_url TEXT,
    ADD COLUMN IF NOT EXISTS receipt_mime_type TEXT;

CREATE TABLE IF NOT EXISTS debt_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    debtor_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    frequency TEXT NOT NULL DEFAULT 'normal' CHECK (frequency IN ('suave', 'normal', 'estricto')),
    channels JSONB NOT NULL DEFAULT '{"push": true, "email": false, "whatsapp": true}'::jsonb,
    next_run_at TIMESTAMPTZ,
    last_sent_at TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (debt_id)
);

CREATE INDEX IF NOT EXISTS idx_debt_reminders_group_next
    ON debt_reminders(group_id, next_run_at);

CREATE TABLE IF NOT EXISTS debt_installments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
    installment_number INTEGER NOT NULL CHECK (installment_number > 0),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    due_date DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(debt_id, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_debt_installments_debt_due
    ON debt_installments(debt_id, due_date);

CREATE TABLE IF NOT EXISTS group_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 120),
    target_type TEXT NOT NULL DEFAULT 'custom' CHECK (target_type IN ('debt_reduction', 'zero_overdue', 'custom')),
    target_value NUMERIC(12, 2) NOT NULL CHECK (target_value >= 0),
    current_value NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
    deadline DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_goals_group_status
    ON group_goals(group_id, status);

CREATE TABLE IF NOT EXISTS user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_key TEXT NOT NULL,
    badge_label TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(group_id, user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_group_user
    ON user_badges(group_id, user_id);

CREATE TABLE IF NOT EXISTS group_member_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    can_manage_debts BOOLEAN NOT NULL DEFAULT false,
    can_manage_music BOOLEAN NOT NULL DEFAULT false,
    can_manage_files BOOLEAN NOT NULL DEFAULT false,
    can_manage_members BOOLEAN NOT NULL DEFAULT false,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_member_permissions_group
    ON group_member_permissions(group_id);

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
    ON push_subscriptions(user_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_debt_reminders_updated_at'
    ) THEN
        CREATE TRIGGER trg_debt_reminders_updated_at
            BEFORE UPDATE ON debt_reminders
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_group_goals_updated_at'
    ) THEN
        CREATE TRIGGER trg_group_goals_updated_at
            BEFORE UPDATE ON group_goals
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trg_group_member_permissions_updated_at'
    ) THEN
        CREATE TRIGGER trg_group_member_permissions_updated_at
            BEFORE UPDATE ON group_member_permissions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at();
    END IF;
END$$;

ALTER TABLE debt_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE debt_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_member_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "debt_reminders_select_group_member" ON debt_reminders;
CREATE POLICY "debt_reminders_select_group_member" ON debt_reminders
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = debt_reminders.group_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "debt_reminders_upsert_group_member" ON debt_reminders;
CREATE POLICY "debt_reminders_upsert_group_member" ON debt_reminders
    FOR INSERT
    WITH CHECK (
        debt_reminders.created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = debt_reminders.group_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "debt_reminders_update_creator_or_owner" ON debt_reminders;
CREATE POLICY "debt_reminders_update_creator_or_owner" ON debt_reminders
    FOR UPDATE
    USING (
        debt_reminders.created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM groups g
            WHERE g.id = debt_reminders.group_id
              AND g.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "debt_installments_select_group_member" ON debt_installments;
CREATE POLICY "debt_installments_select_group_member" ON debt_installments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM debts d
            JOIN group_members gm ON gm.group_id = d.group_id
            WHERE d.id = debt_installments.debt_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "debt_installments_manage_creditor" ON debt_installments;
CREATE POLICY "debt_installments_manage_creditor" ON debt_installments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM debts d
            WHERE d.id = debt_installments.debt_id
              AND d.creditor_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM debts d
            WHERE d.id = debt_installments.debt_id
              AND d.creditor_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "group_goals_select_group_member" ON group_goals;
CREATE POLICY "group_goals_select_group_member" ON group_goals
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_goals.group_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "group_goals_insert_group_member" ON group_goals;
CREATE POLICY "group_goals_insert_group_member" ON group_goals
    FOR INSERT
    WITH CHECK (
        group_goals.created_by = auth.uid()
        AND EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_goals.group_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "group_goals_update_creator_or_owner" ON group_goals;
CREATE POLICY "group_goals_update_creator_or_owner" ON group_goals
    FOR UPDATE
    USING (
        group_goals.created_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM groups g
            WHERE g.id = group_goals.group_id
              AND g.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "user_badges_select_group_member" ON user_badges;
CREATE POLICY "user_badges_select_group_member" ON user_badges
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = user_badges.group_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "user_badges_manage_owner" ON user_badges;
CREATE POLICY "user_badges_manage_owner" ON user_badges
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM groups g
            WHERE g.id = user_badges.group_id
              AND g.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM groups g
            WHERE g.id = user_badges.group_id
              AND g.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "group_member_permissions_select_group_member" ON group_member_permissions;
CREATE POLICY "group_member_permissions_select_group_member" ON group_member_permissions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM group_members gm
            WHERE gm.group_id = group_member_permissions.group_id
              AND gm.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "group_member_permissions_manage_owner" ON group_member_permissions;
CREATE POLICY "group_member_permissions_manage_owner" ON group_member_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM groups g
            WHERE g.id = group_member_permissions.group_id
              AND g.created_by = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM groups g
            WHERE g.id = group_member_permissions.group_id
              AND g.created_by = auth.uid()
        )
    );

DROP POLICY IF EXISTS "push_subscriptions_select_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_select_own" ON push_subscriptions
    FOR SELECT
    USING (push_subscriptions.user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_insert_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_insert_own" ON push_subscriptions
    FOR INSERT
    WITH CHECK (push_subscriptions.user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_update_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_update_own" ON push_subscriptions
    FOR UPDATE
    USING (push_subscriptions.user_id = auth.uid())
    WITH CHECK (push_subscriptions.user_id = auth.uid());

DROP POLICY IF EXISTS "push_subscriptions_delete_own" ON push_subscriptions;
CREATE POLICY "push_subscriptions_delete_own" ON push_subscriptions
    FOR DELETE
    USING (push_subscriptions.user_id = auth.uid());
