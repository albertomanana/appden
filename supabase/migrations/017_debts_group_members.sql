-- ============================================================
-- Migration 017 - Debts between any two members of a group
--
-- Safe to run more than once. Apply AFTER 001-015
-- (uses is_group_member() from 010 and the notifications from 015).
--
-- Why this exists:
-- 1. The bill splitter creates debts where the creditor is not the
--    person using the app ("Ana paid, Marcos owes Ana"). The old insert
--    policy only checked that the *author* was a group member, so it
--    also let anyone point a debt at a profile outside the group.
--    Now: the author, the creditor and the debtor must all belong to
--    the debt's group, and debts.created_by records the author.
-- 2. Only the creditor could UPDATE a debt, so when the debtor
--    registered a payment the payment row was saved but amount_paid /
--    status silently stayed unchanged (RLS updates 0 rows, no error).
--    Now the creditor, the debtor or the author can update it.
-- 3. Only the debtor could add payments. The creditor could not write
--    down "Marcos me pagó en efectivo". Now either party (or the
--    author) can; debt_payments.recorded_by keeps who wrote it down,
--    paid_by stays the person who paid (the debtor).
-- 4. Delete: the creditor or the author.
-- 5. Optional due date for debts (debts.due_date).
-- 6. Notifications: say who wrote the debt down, never notify the
--    person who did the action, and tell the debtor when the creditor
--    marks a debt as settled.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Columns
-- ------------------------------------------------------------
ALTER TABLE debts
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles (id) ON DELETE SET NULL DEFAULT auth.uid(),
    ADD COLUMN IF NOT EXISTS due_date DATE;

-- Every debt written before this migration was created by its creditor.
UPDATE debts SET created_by = creditor_id WHERE created_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_debts_created_by ON debts (created_by);

ALTER TABLE debt_payments
    ADD COLUMN IF NOT EXISTS recorded_by UUID REFERENCES profiles (id) ON DELETE SET NULL DEFAULT auth.uid();

UPDATE debt_payments SET recorded_by = paid_by WHERE recorded_by IS NULL;

COMMENT ON COLUMN debts.created_by IS 'Member who wrote the debt down (may differ from creditor and debtor).';
COMMENT ON COLUMN debts.due_date IS 'Optional date by which the debt should be paid.';
COMMENT ON COLUMN debt_payments.recorded_by IS 'Member who registered the payment (creditor, debtor or author of the debt).';

-- ------------------------------------------------------------
-- 2. debts policies
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "debts_insert_group_member" ON debts;
CREATE POLICY "debts_insert_group_member" ON debts
    FOR INSERT
    WITH CHECK (
        debts.created_by = auth.uid()
        AND is_group_member(debts.group_id, auth.uid())
        AND is_group_member(debts.group_id, debts.creditor_id)
        AND is_group_member(debts.group_id, debts.debtor_id)
    );

DROP POLICY IF EXISTS "debts_update_creditor" ON debts;
DROP POLICY IF EXISTS "debts_update_involved" ON debts;
CREATE POLICY "debts_update_involved" ON debts
    FOR UPDATE
    USING (
        auth.uid() IN (debts.creditor_id, debts.debtor_id, debts.created_by)
    )
    WITH CHECK (
        auth.uid() IN (debts.creditor_id, debts.debtor_id, debts.created_by)
        AND is_group_member(debts.group_id, debts.creditor_id)
        AND is_group_member(debts.group_id, debts.debtor_id)
    );

DROP POLICY IF EXISTS "debts_delete_creditor" ON debts;
DROP POLICY IF EXISTS "debts_delete_creditor_or_author" ON debts;
CREATE POLICY "debts_delete_creditor_or_author" ON debts
    FOR DELETE
    USING (
        auth.uid() = debts.creditor_id
        OR auth.uid() = debts.created_by
    );

-- ------------------------------------------------------------
-- 3. debt_payments policies
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "debt_payments_insert_debtor" ON debt_payments;
DROP POLICY IF EXISTS "debt_payments_insert_party" ON debt_payments;
CREATE POLICY "debt_payments_insert_party" ON debt_payments
    FOR INSERT
    WITH CHECK (
        COALESCE(debt_payments.recorded_by, auth.uid()) = auth.uid()
        AND EXISTS (
            SELECT 1 FROM debts d
            WHERE d.id = debt_payments.debt_id
              AND auth.uid() IN (d.creditor_id, d.debtor_id, d.created_by)
              AND debt_payments.paid_by IN (d.debtor_id, auth.uid())
        )
    );

-- Whoever wrote a payment down can remove it (mistyped amounts).
DROP POLICY IF EXISTS "debt_payments_delete_recorder" ON debt_payments;
CREATE POLICY "debt_payments_delete_recorder" ON debt_payments
    FOR DELETE
    USING (debt_payments.recorded_by = auth.uid());

-- ------------------------------------------------------------
-- 4. Notifications (replaces the 015 version of the function)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.notify_on_debt_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_actor uuid := COALESCE(auth.uid(), NEW.created_by, NEW.creditor_id);
    v_actor_name text;
    v_creditor text;
    v_debtor text;
    v_amount text := to_char(NEW.amount, 'FM999999990.00') || ' ' || NEW.currency::text;
BEGIN
    SELECT display_name INTO v_actor_name FROM profiles WHERE id = v_actor;
    SELECT display_name INTO v_creditor FROM profiles WHERE id = NEW.creditor_id;
    SELECT display_name INTO v_debtor FROM profiles WHERE id = NEW.debtor_id;

    IF TG_OP = 'INSERT' THEN
        IF v_actor IS DISTINCT FROM NEW.debtor_id THEN
            INSERT INTO notifications (user_id, group_id, type, title, body, resource_type, resource_id)
            VALUES (
                NEW.debtor_id, NEW.group_id, 'debt_created', 'Nueva deuda',
                CASE
                    WHEN v_actor = NEW.creditor_id THEN
                        COALESCE(v_creditor, 'Alguien') || ' te ha apuntado ' || v_amount || ' por "' || NEW.concept || '"'
                    ELSE
                        COALESCE(v_actor_name, 'Alguien') || ' ha apuntado que le debes ' || v_amount || ' a '
                        || COALESCE(v_creditor, 'alguien') || ' por "' || NEW.concept || '"'
                END,
                'debt', NEW.id
            );
        END IF;

        IF v_actor IS DISTINCT FROM NEW.creditor_id THEN
            INSERT INTO notifications (user_id, group_id, type, title, body, resource_type, resource_id)
            VALUES (
                NEW.creditor_id, NEW.group_id, 'debt_created', 'Nueva deuda a tu favor',
                CASE
                    WHEN v_actor = NEW.debtor_id THEN
                        COALESCE(v_debtor, 'Alguien') || ' ha apuntado que te debe ' || v_amount || ' por "' || NEW.concept || '"'
                    ELSE
                        COALESCE(v_actor_name, 'Alguien') || ' ha apuntado que ' || COALESCE(v_debtor, 'alguien')
                        || ' te debe ' || v_amount || ' por "' || NEW.concept || '"'
                END,
                'debt', NEW.id
            );
        END IF;
    ELSIF NEW.status = 'paid' AND OLD.status IS DISTINCT FROM 'paid' THEN
        IF v_actor IS DISTINCT FROM NEW.creditor_id THEN
            INSERT INTO notifications (user_id, group_id, type, title, body, resource_type, resource_id)
            VALUES (NEW.creditor_id, NEW.group_id, 'debt_paid', 'Deuda saldada',
                    COALESCE(v_debtor, 'Alguien') || ' ha saldado "' || NEW.concept || '"',
                    'debt', NEW.id);
        END IF;
        IF v_actor IS DISTINCT FROM NEW.debtor_id THEN
            INSERT INTO notifications (user_id, group_id, type, title, body, resource_type, resource_id)
            VALUES (NEW.debtor_id, NEW.group_id, 'debt_paid', 'Deuda saldada',
                    COALESCE(v_actor_name, 'Alguien') || ' ha marcado como saldada "' || NEW.concept || '"',
                    'debt', NEW.id);
        END IF;
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_debt_change failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_debts_notify ON debts;
CREATE TRIGGER trg_debts_notify
AFTER INSERT OR UPDATE OF status ON debts
FOR EACH ROW EXECUTE FUNCTION public.notify_on_debt_change();

-- Make PostgREST pick up the new columns right away.
NOTIFY pgrst, 'reload schema';
