-- Fix broken Unsplash media on tennis sports tips article (404 image id)

update public.content_posts
set
  cover_image_url = 'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1600&q=80',
  body = replace(
    body,
    'photo-1622163642999-9580494a6c0b',
    'photo-1622279457486-62dcc4a431d6'
  ),
  updated_at = now()
where slug = 'tennis-serve-footwork-beginners-guide';
