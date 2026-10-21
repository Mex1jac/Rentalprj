-- 002_drop_sakila_custom_triggers.sql
-- Timezone fix for Task-02 (members & rentals page).
--
-- This sakila database has two custom triggers (NOT part of the standard
-- sakila sample schema) that force server NOW() (UTC) on INSERT:
--   * rental_date   trigger on rental  -> SET NEW.rental_date = NOW()
--   * customer_create_date trigger on customer -> SET NEW.create_date = NOW()
-- Meanwhile due_date and return_date are written by the application with
-- C# DateTime.Now (local time, GMT-06:00). Mixing both bases made the UI
-- show "Rented 21/10" (UTC) next to "Due 30/10" (local) for the same rental.
-- (See spec.md, Open Questions -> "Huso horario".)
--
-- Decision (2026-10-20): drop the triggers so every date column stores the
-- local-time values sent by the application, consistently.
-- Applied to the local sakila database; re-runnable (IF EXISTS).

DROP TRIGGER IF EXISTS rental_date;
DROP TRIGGER IF EXISTS customer_create_date;
