-- Fix pickleball sports tips article media (was tennis stock photo)

update public.content_posts
set
  cover_image_url = 'https://images.unsplash.com/photo-1761644658016-324918bc373c?auto=format&fit=crop&w=1600&q=80',
  body = replace(
    body,
    'photo-1554068865-24cecd4e34b8',
    'photo-1761644658016-324918bc373c'
  ),
  updated_at = now()
where slug = 'pickleball-dink-volley-beginners-guide';
