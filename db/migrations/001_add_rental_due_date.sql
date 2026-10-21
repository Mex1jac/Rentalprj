-- Migration 001: persist the agreed due date on each rental (Task-02: rental by days).
-- The sakila `rental` table only stores rental_date and return_date, so the
-- number of days captured by the operator has nowhere to live. The due date is
-- also required by milestone 3 (upcoming-expiration emails).

ALTER TABLE rental
    ADD COLUMN due_date DATETIME NULL AFTER return_date;

-- Backfill existing rows with the film's default rental_duration.
UPDATE rental r
    JOIN inventory i ON i.inventory_id = r.inventory_id
    JOIN film f ON f.film_id = i.film_id
SET r.due_date = DATE_ADD(r.rental_date, INTERVAL f.rental_duration DAY)
WHERE r.due_date IS NULL;
