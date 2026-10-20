-- Adds photos to the demo seed posts (run after seed_demo.sql).
-- Free photos from Unsplash (unsplash.com/license), hotlinked from images.unsplash.com.
-- Only touches posts owned by the @seed.captioned.nyc demo users. Safe to re-run.
update public.posts p
set image_url = v.url
from (values
  ('First time at Levain, 40 min line for one cookie', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=1080&q=80&auto=format&fit=crop'),
  ('Took the 1 train the wrong way and ended up in the Bronx', 'https://images.unsplash.com/photo-1666312547951-5825f0803bd6?w=1080&q=80&auto=format&fit=crop'),
  ('Rooftop at sunset on the Upper West Side', 'https://images.unsplash.com/photo-1591825495543-981fa4410313?w=1080&q=80&auto=format&fit=crop'),
  ('John Jay made ''Asian fusion'' tacos', 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1080&q=80&auto=format&fit=crop'),
  ('Got an $18 salad because I''m ''healthy now''', 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=1080&q=80&auto=format&fit=crop'),
  ('Dorm room at 2am, roommate asleep, me doing laundry math', 'https://images.unsplash.com/photo-1543201245-c9031909fe6f?w=1080&q=80&auto=format&fit=crop'),
  ('Central Park picnic with people from orientation', 'https://images.unsplash.com/photo-1507666405895-422eee7d517f?w=1080&q=80&auto=format&fit=crop'),
  ('Butler at 11:58pm, assignment due at midnight', 'https://images.unsplash.com/photo-1535930749574-1399327ce78f?w=1080&q=80&auto=format&fit=crop'),
  ('$1 pizza slice at 3am after a party', 'https://images.unsplash.com/photo-1771875600059-665063b27d2d?w=1080&q=80&auto=format&fit=crop'),
  ('Paid $9 for an iced latte in SoHo', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=1080&q=80&auto=format&fit=crop'),
  ('Bodega cat asleep on the bread', 'https://images.unsplash.com/photo-1609779361684-8196b3a0abf1?w=1080&q=80&auto=format&fit=crop'),
  ('Midterm in Hamilton tomorrow, haven''t started', 'https://images.unsplash.com/photo-1589652717521-10c0d092dea9?w=1080&q=80&auto=format&fit=crop'),
  ('Washington Square Park on a Saturday, trying to look like a local', 'https://images.unsplash.com/photo-1689681939191-d5eaf1aab71b?w=1080&q=80&auto=format&fit=crop'),
  ('Rat carrying a whole bagel down Broadway', 'https://images.unsplash.com/photo-1720002788226-2af251ce8ab6?w=1080&q=80&auto=format&fit=crop'),
  ('Brooklyn Bridge selfie, same as everyone else', 'https://images.unsplash.com/photo-1522083043120-6f9d458f6cbd?w=1080&q=80&auto=format&fit=crop'),
  ('My roommate set off the fire alarm making ramen', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=1080&q=80&auto=format&fit=crop'),
  ('Halloween costume shopping on 14th St', 'https://images.unsplash.com/photo-1633025094151-6fc996255e28?w=1080&q=80&auto=format&fit=crop'),
  ('Waited 25 min for the 1 train at 116th', 'https://images.unsplash.com/photo-1562400379-1ddafd185d4e?w=1080&q=80&auto=format&fit=crop'),
  ('Ate a hot dog at a Yankees game', 'https://images.unsplash.com/photo-1678033382919-fa907632fdda?w=1080&q=80&auto=format&fit=crop'),
  ('Citi Bike dock was full, rode around for 20 minutes', 'https://images.unsplash.com/photo-1629628092744-8f8627929067?w=1080&q=80&auto=format&fit=crop'),
  ('Professor called on me when I was half asleep', 'https://images.unsplash.com/photo-1488015795646-7e22a773d72a?w=1080&q=80&auto=format&fit=crop'),
  ('Umbrella flipped inside out on Amsterdam', 'https://images.unsplash.com/photo-1640176836221-c731ece855ba?w=1080&q=80&auto=format&fit=crop'),
  ('Saw a celebrity at a bodega (I think)', 'https://images.unsplash.com/photo-1554224311-beee415c201f?w=1080&q=80&auto=format&fit=crop'),
  ('Laundry machine ate my quarters again', 'https://images.unsplash.com/photo-1604335398980-ededcadcc37d?w=1080&q=80&auto=format&fit=crop'),
  ('Fall leaves in Riverside Park', 'https://images.unsplash.com/photo-1745922462960-f0b2bc0342dc?w=1080&q=80&auto=format&fit=crop'),
  ('Ordered from a Korean place in K-Town at 1am', 'https://images.unsplash.com/photo-1624153064067-566cae78993d?w=1080&q=80&auto=format&fit=crop')
) as v(context, url), public.profiles pr
where pr.id = p.user_id
  and pr.email like '%@seed.captioned.nyc'
  and p.context = v.context;

select count(*) filter (where image_url is not null) as with_photo, count(*) as seed_posts
from public.posts p join public.profiles pr on pr.id = p.user_id
where pr.email like '%@seed.captioned.nyc';
