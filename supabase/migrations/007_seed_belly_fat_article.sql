-- Seed: featured Sports Tips article (English) — how to lose belly fat

insert into public.content_posts (
  slug,
  title,
  excerpt,
  body,
  cover_image_url,
  category,
  sport,
  status,
  links,
  meta_title,
  meta_description,
  published_at
) values (
  'how-to-lose-belly-fat-safely',
  'How to Lose Belly Fat: A Science-Backed Guide for Active People',
  'Spot reduction is a myth — but the right mix of training, nutrition, sleep, and consistency will shrink your waistline. Here''s a practical playbook you can start this week.',
  $body$<h2>Why belly fat is stubborn (and what actually works)</h2>
<p>Abdominal fat — especially visceral fat around your organs — responds to <strong>overall fat loss</strong>, not hundreds of crunches. Your body decides where it stores and releases fat based on genetics, hormones, sleep, stress, and calorie balance. The good news: athletes and active people often see faster progress because they already have a training base to build on.</p>
<p>The goal isn''t a crash diet. It''s a sustainable system: strength + cardio + protein + recovery — repeated for 8–12 weeks.</p>

<h2>The 4 pillars that move the needle</h2>
<h3>1. Strength training (3× per week)</h3>
<p>Compound lifts — squats, deadlifts, rows, presses — build muscle, raise your daily calorie burn, and improve insulin sensitivity. Aim for 3 full-body or upper/lower sessions. You don''t need a perfect program; you need <em>consistency</em>.</p>
<ul>
<li>Start each session with a big compound movement</li>
<li>Progressive overload: add reps or weight weekly</li>
<li>Keep rest periods honest (60–90 sec on accessories)</li>
</ul>

<h3>2. Cardio that you''ll actually do</h3>
<p>Mix <strong>Zone 2</strong> (brisk walks, easy cycling, 30–45 min) with <strong>1–2 HIIT sessions</strong> per week if your joints tolerate it. HIIT burns calories fast; Zone 2 improves fat oxidation without crushing recovery.</p>
<blockquote>A simple week: 2× strength, 2× Zone 2, 1× intervals, 2× rest or light movement.</blockquote>

<h3>3. Nutrition: protein first, then portion control</h3>
<p>Most active people under-eat protein. Target <strong>1.6–2.2 g per kg</strong> of body weight daily. Fill half your plate with vegetables, prioritize lean protein, and keep ultra-processed snacks out of easy reach.</p>
<ul>
<li>Track food for 7 days — awareness beats guessing</li>
<li>A modest deficit (300–500 kcal) beats extreme cuts</li>
<li>Alcohol and liquid calories often hide the real problem</li>
</ul>

<h3>4. Sleep & stress (the hidden levers)</h3>
<p>Poor sleep spikes cortisol and cravings. Seven to nine hours isn''t luxury — it''s fat-loss infrastructure. Manage stress with walks, breath work, or sport you enjoy. Burnout diets fail; systems survive.</p>

<img src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Athlete training in the gym" />

<h2>What to avoid</h2>
<ul>
<li><strong>Spot-reduction gadgets</strong> — no belt melts belly fat</li>
<li><strong>Detox teas & starvation</strong> — you lose water and muscle, then rebound</li>
<li><strong>All-cardio, no weights</strong> — you become a smaller version of the same shape</li>
</ul>

<h2>Your 7-day starter checklist</h2>
<ol>
<li>Book 3 strength sessions in your calendar</li>
<li>Prep protein for breakfast (eggs, Greek yogurt, shake)</li>
<li>Walk 8,000+ steps on non-gym days</li>
<li>Cut sugary drinks for one week</li>
<li>Track waist circumference weekly (not daily scale obsession)</li>
<li>Find a training partner or coach for accountability</li>
<li>Sleep before 11 pm at least 5 nights</li>
</ol>

<h2>When to get professional help</h2>
<p>If you have medical conditions, chronic pain, or have yo-yo dieted for years, work with a <strong>qualified coach</strong> or <strong>sports physio</strong> before aggressive cuts. SportyFind connects you with trainers and recovery pros in your sport — so your plan fits how you actually move.</p>
<p><strong>Bottom line:</strong> lose belly fat by getting leaner overall, keeping muscle, and building habits you can repeat. Start small, stack wins, and give it 12 weeks before you judge the mirror.</p>$body$,
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=1600&q=80',
  'players',
  'Gym / Fitness',
  'published',
  '[
    {"label": "Find a Coach", "url": "/coaches"},
    {"label": "Connect with Athletes", "url": "/network"},
    {"label": "Sports Recovery & Physio", "url": "/physio"},
    {"label": "Browse All Sports Tips", "url": "/content"}
  ]'::jsonb,
  'How to Lose Belly Fat Safely | SportyFind Sports Tips',
  'Science-backed guide to losing belly fat: strength training, cardio, nutrition, sleep, and a 7-day starter checklist for active people.',
  now()
)
on conflict (slug) do update set
  title = excluded.title,
  excerpt = excluded.excerpt,
  body = excluded.body,
  cover_image_url = excluded.cover_image_url,
  category = excluded.category,
  sport = excluded.sport,
  status = excluded.status,
  links = excluded.links,
  meta_title = excluded.meta_title,
  meta_description = excluded.meta_description,
  published_at = coalesce(public.content_posts.published_at, excluded.published_at),
  updated_at = now();
