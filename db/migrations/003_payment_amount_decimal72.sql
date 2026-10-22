-- 003_payment_amount_decimal72.sql
-- Charge-on-rental feature: every rental now writes one payment row whose
-- amount is (rental days captured by the operator) * (film rental_rate).
--
-- Part 1: the sakila default column was DECIMAL(5,2) (max 999.99 per row),
-- which the business rules could exceed: rentals allow up to 90 days and
-- films allow rates up to 99.99 (90 * 99.99 = 8,999.10). DECIMAL(7,2)
-- (max 99,999.99) removes the limit without touching existing demo rows.
--
-- Part 2: this sakila database has a third custom trigger (NOT part of the
-- standard sakila sample schema), `payment_date`, that forces server NOW()
-- (UTC) on every payment INSERT: SET NEW.payment_date = NOW()
-- It overwrote the payment timestamp sent by the application, making
-- payment_date drift ~6 hours away from rental_date for the same rental.
-- Same decision as migration 002 (drop the triggers): the application owns
-- every timestamp, so payment_date = rental_date, the same instant.
--
-- Applied to the local sakila database; re-runnable (IF EXISTS / same
-- modifier).

ALTER TABLE payment MODIFY amount DECIMAL(7,2) NOT NULL;

DROP TRIGGER IF EXISTS payment_date;
