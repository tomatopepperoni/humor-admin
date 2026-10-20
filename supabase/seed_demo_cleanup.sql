-- Removes the demo seed data from seed_demo.sql.
-- Deleting the fake auth users cascades to their profiles, posts, captions and votes.
delete from auth.users where email like '%@seed.captioned.nyc';
