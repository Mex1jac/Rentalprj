-- Migration 004: logical deactivation for catalog films (backlog #8).
-- Physical delete is impossible for any film whose inventory copies carry
-- rental history (FK RESTRICT on inventory and rental), so the catalog gets
-- an `active` flag instead: deactivating hides the film from the rental
-- picker while its copies, open rentals and the cash-close history stay
-- untouched. Re-enabling is just flipping the flag back.

ALTER TABLE film
    ADD COLUMN active TINYINT(1) NOT NULL DEFAULT 1
        COMMENT '0 = deactivated (logical leave): hidden from the rental picker.'
        AFTER special_features;
