-- Seed: 9 Sports Tips articles (English) — one per platform sport (excluding gym, covered by belly-fat article)

-- ---------------------------------------------------------------------------
-- 1. VOLLEYBALL
-- ---------------------------------------------------------------------------
insert into public.content_posts (
  slug, title, excerpt, body, cover_image_url,
  categories, sports, status, links, meta_title, meta_description, published_at
) values (
  'volleyball-beginner-fundamentals-guide',
  'Volleyball Fundamentals: A Beginner''s Guide to Passing, Footwork & Serving',
  'Great volleyball starts before the spike — with a stable platform, quick feet, and a serve that lands in the court. Here''s a practical plan you can use at your next recreational game.',
  $body$<h2>Why fundamentals beat highlight reels</h2>
<p>Most beginner mistakes in volleyball come from rushing the flashy play. Rec leagues and open gyms reward teams that <strong>pass cleanly, move early, and serve consistently</strong>. The attack is only as good as the pass that sets it up — and your pass is only as good as your footwork and ready position.</p>
<p>Think in systems: ready stance → read the ball → move with balance → create a platform → finish toward your target. Repeat that chain for 4–6 weeks and rallies stop feeling chaotic.</p>

<h2>The 4 pillars every beginner should build</h2>
<h3>1. Ready position & footwork (daily)</h3>
<p>Stand with knees bent, weight on the balls of your feet, and shoulders slightly forward. Use <strong>shuffle steps</strong> to move laterally — don''t cross your feet. Your first step should beat the ball: left foot first when the ball goes left, right foot first when it goes right.</p>
<ul>
<li>Practice 3×10 lateral shuffles each direction before every session</li>
<li>Use a step-shuffle when the serve pulls you wide — stay balanced before contact</li>
<li>Back-pedal early on deep float serves; don''t pass while still moving backward</li>
</ul>

<h3>2. Forearm passing (your #1 skill)</h3>
<p>Join your forearms into a flat platform, keep elbows straight, and angle the platform toward your target — usually the setter at the net. Contact the ball on your forearms, not your wrists or hands.</p>
<ul>
<li>Wall passing: 50 controlled reps against a wall, aiming for the same spot</li>
<li>Partner toss: 3 sets of 20 passes to a target cone 15–20 ft away</li>
<li>Watch the server''s toss and contact point before the ball crosses the net</li>
</ul>

<h3>3. Serving for consistency, not power</h3>
<p>Underhand or overhand, your first goal is to get the ball <strong>in the court</strong> with the same toss and rhythm every time. Start 10 ft from the net; move back only after 8 of 10 serves land in a chosen zone.</p>
<blockquote>A team that serves in wins more free points than a team that serves hard into the net.</blockquote>

<h3>4. Communication & court awareness</h3>
<p>Call <em>mine</em>, <em>yours</em>, or <em>help</em> early. Know whether you''re front row or back row before the rally starts. Beginners who talk cut confusion errors in half.</p>

<img src="https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Volleyball players in ready position" />

<h2>What to avoid</h2>
<ul>
<li><strong>Swinging at passes with bent elbows</strong> — you lose control and bruise your forearms</li>
<li><strong>Standing upright while waiting</strong> — you''ll arrive late to every ball</li>
<li><strong>Power serving before you can target</strong> — free points beat aces at beginner level</li>
</ul>

<h2>Your 7-day starter checklist</h2>
<ol>
<li>Learn ready position and practice 5 minutes of shuffle footwork</li>
<li>50 wall passes focusing on a flat platform</li>
<li>Partner passing: 60 reps to a single target</li>
<li>20 serves from close range — track makes vs. attempts</li>
<li>Watch one full set and note how often rallies end on a pass error</li>
<li>Join an open gym or find a team on SportyFind</li>
<li>Stretch calves and shoulders after every session</li>
</ol>

<h2>When to get professional help</h2>
<p>Shoulder, finger, or lower-back pain that lingers after play deserves a <strong>sports physio</strong> check. A coach can also fix footwork habits early — before they become hard to unlearn. SportyFind helps you find teams, training partners, and recovery pros in Hong Kong.</p>
<p><strong>Bottom line:</strong> pass first, move early, serve in. Master those three and you''ll instantly look like the most reliable player on the court.</p>$body$,
  'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&w=1600&q=80',
  array['players', 'teams', 'coaches'],
  array['volleyball'],
  'published',
  '[
    {"label": "Find Volleyball Teams", "url": "/team?browse=1"},
    {"label": "Find a Coach", "url": "/coaches"},
    {"label": "Connect with Players", "url": "/network"},
    {"label": "Browse All Sports Tips", "url": "/content"}
  ]'::jsonb,
  'Volleyball Fundamentals for Beginners | SportyFind Sports Tips',
  'Beginner volleyball guide: ready position, passing, footwork, serving consistency, and a 7-day practice checklist for recreational players.',
  now()
)
on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body,
  cover_image_url = excluded.cover_image_url, categories = excluded.categories,
  sports = excluded.sports, status = excluded.status, links = excluded.links,
  meta_title = excluded.meta_title, meta_description = excluded.meta_description,
  published_at = coalesce(public.content_posts.published_at, excluded.published_at),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 2. BASKETBALL
-- ---------------------------------------------------------------------------
insert into public.content_posts (
  slug, title, excerpt, body, cover_image_url,
  categories, sports, status, links, meta_title, meta_description, published_at
) values (
  'basketball-shooting-form-beginners-guide',
  'How to Shoot a Basketball: Build Reliable Form Before Range',
  'Range is earned, not forced. Start close to the rim, lock in balance and follow-through, then add distance and movement. Here''s the same progression coaches use with beginners.',
  $body$<h2>Why form shooting comes before three-pointers</h2>
<p>Most missed shots aren''t about strength — they''re about <strong>inconsistent mechanics</strong>. Feet drifting, guide hand pushing, or elbows flaring change your release angle shot to shot. Build a repeatable motion close to the basket first; distance follows naturally when your base and release stay the same.</p>
<p>Use the BEEF framework as a quick checklist: <strong>B</strong>alance, <strong>E</strong>yes on target, <strong>E</strong>lbow under the ball, <strong>F</strong>ollow-through.</p>

<h2>The 4 pillars of a consistent shot</h2>
<h3>1. Stance & balance</h3>
<p>Feet shoulder-width apart, knees slightly bent, weight on the balls of your feet. Stagger your shooting foot slightly ahead. Square your body to the rim — or turn slightly away from your shooting hand if that feels natural, but stay consistent.</p>
<ul>
<li>Land on balance after every rep — don''t fade backward</li>
<li>Load the ball in your "shot pocket" near your hip or chest before rising</li>
</ul>

<h3>2. Hand placement & release</h3>
<p>The ball sits on your <strong>finger pads</strong>, not your palm. Your shooting hand drives the shot; the guide hand stays on the side for balance only and leaves before release. Snap your wrist so fingers point at the floor — the classic "reach into the cookie jar" finish.</p>
<ul>
<li>One-hand form shooting: 25 makes from 3–5 ft with guide hand off the ball</li>
<li>Guide-hand freeze: hold follow-through until the ball hits the rim</li>
<li>Goal: 8 of 10 makes at each spot before moving back one step</li>
</ul>

<h3>3. Leg drive & rhythm</h3>
<p>Power comes from your legs. Dip, explode upward, and release at the top of your jump or on your toes if shooting stationary. Same rhythm every time — don''t rush the upper body ahead of your legs.</p>
<blockquote>50 perfect form shots beat 200 rushed attempts from the three-point line.</blockquote>

<h3>4. Game-like reps (after form is solid)</h3>
<p>Add one-dribble pull-ups, catch-and-shoot from corners, and sprint-to-stop sets. Fatigue exposes bad habits — so keep sessions short and focused: <strong>15–30 minutes of quality shooting</strong> beats an hour of sloppy volume.</p>

<img src="https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Basketball player shooting with proper form" />

<h2>What to avoid</h2>
<ul>
<li><strong>Shooting threes before you make 8/10 from close range</strong></li>
<li><strong>Guide hand flicking the ball</strong> — it adds side spin and kills accuracy</li>
<li><strong>Changing five cues at once</strong> — fix one habit per week</li>
</ul>

<h2>Your 7-day starter checklist</h2>
<ol>
<li>5-minute dynamic warm-up + 25 one-hand form makes from 3 ft</li>
<li>25 two-hand form makes — slow, eyes on rim the whole time</li>
<li>Add guide hand; 30 makes from 5 ft without moving back</li>
<li>One-dribble pull-up: 5 makes from each elbow</li>
<li>Film 10 shots — check elbow alignment and follow-through</li>
<li>Find a pickup run or coach on SportyFind</li>
<li>Ice or stretch wrists and shoulders if sore</li>
</ol>

<h2>When to get professional help</h2>
<p>Chronic jumper''s knee, wrist pain, or a shot that feels worse after coaching yourself online may need a <strong>physio or qualified coach</strong> to assess movement patterns. SportyFind connects you with basketball coaches and recovery specialists near you.</p>
<p><strong>Bottom line:</strong> earn your range with close makes, clean release, and short focused sessions. Confidence at the rim is built in inches, not in launching threes on day one.</p>$body$,
  'https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&w=1600&q=80',
  array['players', 'coaches', 'events'],
  array['basketball'],
  'published',
  '[
    {"label": "Find a Basketball Coach", "url": "/coaches"},
    {"label": "Browse Pickup Events", "url": "/events"},
    {"label": "Connect with Players", "url": "/network"},
    {"label": "Browse All Sports Tips", "url": "/content"}
  ]'::jsonb,
  'Basketball Shooting Form for Beginners | SportyFind Sports Tips',
  'Step-by-step basketball shooting guide: BEEF form, form shooting drills, leg drive, and a 7-day practice plan for beginners.',
  now()
)
on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body,
  cover_image_url = excluded.cover_image_url, categories = excluded.categories,
  sports = excluded.sports, status = excluded.status, links = excluded.links,
  meta_title = excluded.meta_title, meta_description = excluded.meta_description,
  published_at = coalesce(public.content_posts.published_at, excluded.published_at),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 3. SOCCER
-- ---------------------------------------------------------------------------
insert into public.content_posts (
  slug, title, excerpt, body, cover_image_url,
  categories, sports, status, links, meta_title, meta_description, published_at
) values (
  'soccer-first-touch-fitness-beginners-guide',
  'Soccer for Beginners: First Touch, Fitness & Smarter Movement Off the Ball',
  'You don''t need tricks to contribute — you need a clean first touch, basic fitness, and the habit of showing up where your teammate can find you. Here''s how to build all three.',
  $body$<h2>What actually helps in 5-a-side and 7-a-side</h2>
<p>Recreational soccer is won by teams that <strong>keep the ball moving</strong> and arrive with energy in the second half. Flashy skills matter less than receiving cleanly under pressure, passing to the open player, and jogging into space before you get the ball — not after.</p>
<p>Build three habits: touch away from pressure, pass and move, and recover on defense with short sprints instead of walking.</p>

<h2>The 4 pillars recreational players need</h2>
<h3>1. First touch & ball control</h3>
<p>Your first touch should set up your next action — pass, dribble, or shot. Use the inside of your foot to cushion the ball; let your ankle absorb pace instead of stiffening up.</p>
<ul>
<li>Wall passes: 100 touches each foot — inside, outside, sole</li>
<li>Receive-and-turn: partner passes, you touch across your body and play back</li>
<li>Juggling goal: work toward 20 consecutive touches to improve feel</li>
</ul>

<h3>2. Passing accuracy over power</h3>
<p>Short passes stay on the ground with the inside of your foot, body over the ball, toe up. Look at your target before the ball arrives. Weight matters — a pass too soft gets intercepted; too hard breaks rhythm.</p>
<blockquote>The best recreational players rarely lose the ball on simple five-yard passes.</blockquote>

<h3>3. Off-the-ball movement</h3>
<p>Create angles for the player on the ball. Move wide when play is central; check toward the ball when you''re marked. After you pass, don''t stand — find a new pocket of space.</p>
<ul>
<li>Rule of thumb: pass and move within 2 seconds</li>
<li>On defense, stay goal-side and close the nearest threat first</li>
</ul>

<h3>4. Match fitness (without burning out)</h3>
<p>Soccer mixes jogging, sprinting, and direction changes. Train with <strong>interval runs</strong>: 30 sec hard / 60 sec easy × 8–10. Add one longer easy run weekly for a base. Stretch hip flexors and calves — tight hips kill your first step.</p>

<img src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Soccer player controlling the ball" />

<h2>What to avoid</h2>
<ul>
<li><strong>Only practicing shooting</strong> — most touches in a game are passes and controls</li>
<li><strong>Standing and watching after you pass</strong> — you become easy to mark</li>
<li><strong>Playing through sharp knee or ankle pain</strong> — small-sided games load joints fast</li>
</ul>

<h2>Your 7-day starter checklist</h2>
<ol>
<li>100 wall passes per foot (inside of foot)</li>
<li>10 minutes juggling — record your best streak</li>
<li>Interval session: 8×30 sec sprints with full walk-back recovery</li>
<li>One small-sided game or team training session</li>
<li>Practice receiving with back to goal — touch wide and turn</li>
<li>Find a team or pickup match on SportyFind</li>
<li>10-minute hip and calf mobility routine post-game</li>
</ol>

<h2>When to get professional help</h2>
<p>Recurring hamstring strains, shin splints, or ankle instability benefit from a <strong>sports physio</strong> and structured return-to-play plan. Coaches can also place you in the right level of league so you develop instead of surviving.</p>
<p><strong>Bottom line:</strong> touch, pass, move, repeat. Master the simple stuff and you''ll stand out in every casual game you join.</p>$body$,
  'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&w=1600&q=80',
  array['players', 'teams', 'events'],
  array['soccer'],
  'published',
  '[
    {"label": "Find a Soccer Team", "url": "/team?browse=1"},
    {"label": "Browse Football Events", "url": "/events"},
    {"label": "Connect with Players", "url": "/network"},
    {"label": "Browse All Sports Tips", "url": "/content"}
  ]'::jsonb,
  'Soccer First Touch & Fitness for Beginners | SportyFind Sports Tips',
  'Beginner soccer guide: first touch, passing, off-the-ball movement, match fitness, and a 7-day training checklist.',
  now()
)
on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body,
  cover_image_url = excluded.cover_image_url, categories = excluded.categories,
  sports = excluded.sports, status = excluded.status, links = excluded.links,
  meta_title = excluded.meta_title, meta_description = excluded.meta_description,
  published_at = coalesce(public.content_posts.published_at, excluded.published_at),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 4. TENNIS
-- ---------------------------------------------------------------------------
insert into public.content_posts (
  slug, title, excerpt, body, cover_image_url,
  categories, sports, status, links, meta_title, meta_description, published_at
) values (
  'tennis-serve-footwork-beginners-guide',
  'Tennis Basics: Grip, Footwork & a Serve You Can Actually Repeat',
  'Double faults lose free points. Loose footwork loses rallies. Start with continental grip, split-step timing, and a simple serve motion you can hit 10 times in a row.',
  $body$<h2>Why tennis rewards consistency over power</h2>
<p>At beginner and club level, most points end on <strong>unforced errors</strong> — long forehands, netted backhands, double faults — not winners. Your fastest improvement comes from stable footwork, a repeatable serve toss, and getting the ball cross-court with margin.</p>
<p>Think placement and depth before pace. A deep ball to the middle buys you time; a short ball invites pressure.</p>

<h2>The 4 pillars club players should train</h2>
<h3>1. Grip & ready position</h3>
<p>Learn the <strong>continental grip</strong> for serve and volleys; eastern or semi-western forehand is fine for groundstrokes when starting. Hold the throat of the racket with your non-dominant hand when preparing — it keeps shoulders turned and racket head up.</p>
<ul>
<li>Split-step as your opponent strikes the ball — small hop, land on balls of feet</li>
<li>Recover to the center hash after each shot when rallying from baseline</li>
</ul>

<h3>2. Footwork & contact point</h3>
<p>Move your feet so you hit most balls at waist height with space between body and ball. Short choppy adjustment steps beat one long lunge. On forehands, step out with the lead foot; on two-handed backhands, load and rotate through contact.</p>
<blockquote>If you''re reaching with your arm, your feet stopped too early.</blockquote>

<h3>3. Serve routine & toss</h3>
<p>Use the same pre-serve ritual every time: bounce count, breath, toss. Toss slightly in front and to your hitting-side shoulder — not behind you. Start with trophy pose → upward swing → pronation at half speed before adding power.</p>
<ul>
<li>Target practice: 20 serves aiming at the T and wide boxes separately</li>
<li>Goal: 7 of 10 first serves in before increasing racket speed</li>
</ul>

<h3>4. Cross-court rally discipline</h3>
<p>Cross-court is the highest-percentage pattern — the net is lower in the middle and you have more court to work with. Rally cross-court until you get a short ball, then change direction intentionally.</p>

<img src="https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Tennis player serving on outdoor court" />

<h2>What to avoid</h2>
<ul>
<li><strong>Flat grip changes mid-match</strong> — pick one forehand grip and commit for a month</li>
<li><strong>Hero winners down the line every shot</strong> — margin wins club tennis</li>
<li><strong>Skipping the split-step</strong> — you''ll always feel late on returns</li>
</ul>

<h2>Your 7-day starter checklist</h2>
<ol>
<li>Practice continental grip with 50 shadow serves (no ball)</li>
<li>50 forehand cross-court rallies with a partner or wall</li>
<li>30-minute serve session — track first-serve percentage</li>
<li>Split-step drill: 3 sets of 20 reactions to a partner''s feed</li>
<li>Play one set — count unforced errors vs. winners</li>
<li>Book a hitting partner or coach on SportyFind</li>
<li>Forearm and rotator cuff stretches after play</li>
</ol>

<h2>When to get professional help</h2>
<p>Elbow or shoulder pain from serving often comes from poor toss or over-gripping. A <strong>coach or physio</strong> can adjust technique before it becomes chronic tennis elbow. SportyFind helps you find partners at your level and coaches who teach repeatable mechanics.</p>
<p><strong>Bottom line:</strong> move early, serve the same way every time, and rally cross-court with depth. Club tennis is a consistency sport — play the percentages.</p>$body$,
  'https://images.unsplash.com/photo-1622279457486-62dcc4a431d6?auto=format&fit=crop&w=1600&q=80',
  array['players', 'coaches'],
  array['tennis'],
  'published',
  '[
    {"label": "Find a Tennis Coach", "url": "/coaches"},
    {"label": "Connect with Hitting Partners", "url": "/network"},
    {"label": "Sports Recovery & Physio", "url": "/physio"},
    {"label": "Browse All Sports Tips", "url": "/content"}
  ]'::jsonb,
  'Tennis Serve & Footwork for Beginners | SportyFind Sports Tips',
  'Beginner tennis guide: grip, split-step footwork, serve routine, cross-court strategy, and a 7-day practice plan.',
  now()
)
on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body,
  cover_image_url = excluded.cover_image_url, categories = excluded.categories,
  sports = excluded.sports, status = excluded.status, links = excluded.links,
  meta_title = excluded.meta_title, meta_description = excluded.meta_description,
  published_at = coalesce(public.content_posts.published_at, excluded.published_at),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 5. BADMINTON
-- ---------------------------------------------------------------------------
insert into public.content_posts (
  slug, title, excerpt, body, cover_image_url,
  categories, sports, status, links, meta_title, meta_description, published_at
) values (
  'badminton-footwork-smash-beginners-guide',
  'Badminton for Beginners: Footwork, Grip & Clearer Smashes',
  'Badminton is the fastest racket sport — and footwork is the engine. Learn base position, split-step timing, and a smash that lands in before you chase power.',
  $body$<h2>Why footwork beats arm speed in badminton</h2>
<p>Beginners swing harder when they''re late. The fix isn''t more power — it''s getting behind the shuttle early with a <strong>balanced base</strong>. Hong Kong halls are crowded; efficient movement saves energy and prevents knee and ankle tweaks.</p>
<p>Train the sequence: center base → split-step → explosive first step → hit from balance → recover to base.</p>

<h2>The 4 pillars recreational players need</h2>
<h3>1. Grip & racket preparation</h3>
<p>Use a relaxed <strong>forehand grip</strong> (like shaking hands with the handle) for clears and smashes; be ready to switch to thumb-side for backhand defense. Keep the racket head up in ready position — not dangling by your knee.</p>
<ul>
<li>Short grip check before every session — no death-grip tension</li>
<li>Prepare early: racket back before the shuttle crosses the net</li>
</ul>

<h3>2. Base position & footwork patterns</h3>
<p>Return to the center of your singles box (or mixed doubles base) after each shot. Use a split-step as your opponent hits. Practice the six-corner drill: front forehand, front backhand, mid-court both sides, rear corners — shuffle and lunge with racket leading.</p>
<blockquote>Arrive balanced, then accelerate the racket. Never the other way around.</blockquote>

<h3>3. Clears & drops before smashes</h3>
<p>A full smash only works if you''re under the shuttle with time. Master the <strong>overhead clear</strong> to push opponents back and the drop to bring them forward. Aim clears high and deep to the back line — depth buys you breathing room.</p>
<ul>
<li>20 overhead clears focusing on full follow-through</li>
<li>10 drops from the same position — disguise with similar prep</li>
</ul>

<h3>4. Doubles rotation & communication</h3>
<p>In doubles, cover your zone and rotate when your partner is pulled wide. Call <em>mine</em> early on short shuttles. Front player intercepts; back player covers lobs — simple roles beat two players chasing the same shot.</p>

<img src="https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Badminton player hitting overhead shot" />

<h2>What to avoid</h2>
<ul>
<li><strong>Smashing from behind your body</strong> — reset with a clear instead</li>
<li><strong>Flat-footed waiting at the net</strong> — stay on balls of feet</li>
<li><strong>Ignoring the backhand clear</strong> — it gets you out of trouble every game</li>
</ul>

<h2>Your 7-day starter checklist</h2>
<ol>
<li>10 minutes six-corner footwork (no shuttle) — focus on recovery steps</li>
<li>50 overhead clears — measure depth, not speed</li>
<li>20 backhand lifts from mid-court feeds</li>
<li>One doubles session — practice front/back rotation</li>
<li>Shadow smash footwork: 3×10 from base to rear corner</li>
<li>Find a badminton group on SportyFind</li>
<li>Stretch quads, calves, and rotator cuff post-session</li>
</ol>

<h2>When to get professional help</h2>
<p>Knee pain from lunging or shoulder irritation from overhead volume may need a <strong>physio</strong> and technique tune-up. Coaches can fix grip and preparation timing faster than solo trial-and-error.</p>
<p><strong>Bottom line:</strong> get to the shuttle first, clear with depth, smash only when you''re set. Footwork is the skill that makes every other shot better.</p>$body$,
  'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&w=1600&q=80',
  array['players', 'teams'],
  array['badminton'],
  'published',
  '[
    {"label": "Find Badminton Groups", "url": "/team?browse=1"},
    {"label": "Connect with Players", "url": "/network"},
    {"label": "Find a Coach", "url": "/coaches"},
    {"label": "Browse All Sports Tips", "url": "/content"}
  ]'::jsonb,
  'Badminton Footwork & Smash Basics | SportyFind Sports Tips',
  'Beginner badminton guide: grip, base footwork, clears, doubles rotation, and a 7-day practice checklist.',
  now()
)
on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body,
  cover_image_url = excluded.cover_image_url, categories = excluded.categories,
  sports = excluded.sports, status = excluded.status, links = excluded.links,
  meta_title = excluded.meta_title, meta_description = excluded.meta_description,
  published_at = coalesce(public.content_posts.published_at, excluded.published_at),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 6. PICKLEBALL
-- ---------------------------------------------------------------------------
insert into public.content_posts (
  slug, title, excerpt, body, cover_image_url,
  categories, sports, status, links, meta_title, meta_description, published_at
) values (
  'pickleball-dink-volley-beginners-guide',
  'Pickleball for Beginners: Kitchen Rules, Dinks & Smart Doubles Play',
  'Pickleball looks casual until you stand at the kitchen line. Learn the non-volley zone, soft dinks, and the patience that wins recreational doubles.',
  $body$<h2>Why the kitchen changes everything</h2>
<p>Pickleball rewards <strong>control and placement</strong> more than raw athleticism. The non-volley zone (the "kitchen") stops serve-and-volley dominance — you must let the ball bounce before volleying inside that 7-foot area. Beginners who rush in too early lose points on foot faults; players who dink patiently often win without a single power shot.</p>
<p>Your goal: survive the soft game at the net, then attack only when the ball sits up above the net.</p>

<h2>The 4 pillars new players should master</h2>
<h3>1. Serve deep & return to the kitchen</h3>
<p>Serve underhand with contact below the waist. Aim deep to the back third — a short serve invites aggressive third shots. On return, prioritize depth and land your team at the kitchen line together.</p>
<ul>
<li>Practice 20 serves targeting back corners</li>
<li>Return deep down the middle to reduce angles</li>
</ul>

<h3>2. Dinking with soft hands</h3>
<p>A dink is a soft shot that lands in the opponent''s kitchen. Use an open paddle face, minimal backswing, and lift from your shoulder — not a wrist flick. Patience wins: wait for a ball you can attack.</p>
<blockquote>The team that out-dinks without popping the ball up usually wins the rally.</blockquote>

<h3>3. Third-shot drops & resets</h3>
<p>After the return, the serving team often hits a <strong>third-shot drop</strong> — a soft arc that lands in the kitchen so you can advance. If you''re stuck mid-court, reset with height over the net instead of forcing a low-percentage drive.</p>

<h3>4. Doubles positioning & communication</h3>
<p>Move forward together, back together. One player doesn''t rush the net alone. Call <em>mine</em>, <em>yours</em>, and <em>bounce</em> on close balls. Middle is often the safer target than sharp angles when learning.</p>

<img src="https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Pickleball players at the net" />

<h2>What to avoid</h2>
<ul>
<li><strong>Volleying inside the kitchen</strong> — foot faults are free points for opponents</li>
<li><strong>Hard drives from below net height</strong> — they sail out or get countered</li>
<li><strong>Standing 6 feet back at the net</strong> — you invite speed-ups at your feet</li>
</ul>

<h2>Your 7-day starter checklist</h2>
<ol>
<li>Read kitchen rules — practice stopping at the line on approach</li>
<li>50 dinks with a partner from opposite sides of the kitchen</li>
<li>20 third-shot drops from the baseline</li>
<li>Play two doubles games focusing on depth, not power</li>
<li>Drill 10 lobs when opponents creep too close to the net</li>
<li>Find pickleball sessions on SportyFind</li>
<li>Warm up calves and achilles — quick forward/back movement adds up</li>
</ol>

<h2>When to get professional help</h2>
<p>Elbow or shoulder soreness from over-hitting can improve with a coach''s grip and swing path check. A <strong>physio</strong> helps if knee or achilles pain flares from constant short steps.</p>
<p><strong>Bottom line:</strong> get to the kitchen as a pair, dink with patience, attack only high balls. Pickleball is a placement game dressed up as a power sport.</p>$body$,
  'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?auto=format&fit=crop&w=1600&q=80',
  array['players', 'coaches', 'general'],
  array['pickleball'],
  'published',
  '[
    {"label": "Find Pickleball Players", "url": "/network"},
    {"label": "Find a Coach", "url": "/coaches"},
    {"label": "Browse Events", "url": "/events"},
    {"label": "Browse All Sports Tips", "url": "/content"}
  ]'::jsonb,
  'Pickleball Dink & Kitchen Rules for Beginners | SportyFind Sports Tips',
  'Beginner pickleball guide: kitchen rules, dinking, third-shot drops, doubles positioning, and a 7-day checklist.',
  now()
)
on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body,
  cover_image_url = excluded.cover_image_url, categories = excluded.categories,
  sports = excluded.sports, status = excluded.status, links = excluded.links,
  meta_title = excluded.meta_title, meta_description = excluded.meta_description,
  published_at = coalesce(public.content_posts.published_at, excluded.published_at),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 7. RUNNING
-- ---------------------------------------------------------------------------
insert into public.content_posts (
  slug, title, excerpt, body, cover_image_url,
  categories, sports, status, links, meta_title, meta_description, published_at
) values (
  'running-injury-free-5k-beginners-guide',
  'Running for Beginners: Build to 5K Without Shin Splints or Burnout',
  'Most new runners go out too fast and too far. Use run-walk progressions, easy pacing, and strength basics to build a habit that lasts past week two.',
  $body$<h2>Why easy running is the secret (even when it feels too slow)</h2>
<p>Your first 8–12 weeks should feel <strong>mostly conversational</strong>. If you can''t speak in short sentences, you''re probably going too hard for base building. Fitness comes from consistent easy volume; speed comes later — after your tendons and joints adapt.</p>
<p>Think in months, not days. A 5K finish is a milestone; injury-free consistency is the real win.</p>

<h2>The 4 pillars of a safe beginner block</h2>
<h3>1. Run-walk progression</h3>
<p>Alternate jogging and walking from day one. Example: 1 min run / 2 min walk × 8, three times per week. Add 30–60 seconds of running per week; don''t add distance and speed in the same week.</p>
<ul>
<li>Same route weekly so progress is obvious</li>
<li>Rest or cross-train at least one day between run days initially</li>
</ul>

<h3>2. Cadence, posture & footstrike</h3>
<p>Run tall — slight forward lean from ankles, not waist. Aim for relatively quick, light steps (often cited around 170–180 steps/min as a guide, but comfort matters more than chasing a number). Land under your hips, not far in front.</p>
<blockquote>If it sounds like you''re stomping, shorten your stride and soften the landing.</blockquote>

<h3>3. Strength & mobility (2× per week)</h3>
<p>Runners need glutes and calves that can absorb load. Add bodyweight squats, calf raises, single-leg balances, and hip bridges. Five minutes of ankle and hip mobility before runs reduces shin and knee stress.</p>

<h3>4. Shoes, surface & recovery</h3>
<p>Replace shoes every 500–800 km or when midsole feels dead. Mix softer surfaces when you can. Sleep and protein support tendon recovery — skimping here is how shin splints appear in week three.</p>

<img src="https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Runner on a trail at easy pace" />

<h2>What to avoid</h2>
<ul>
<li><strong>Running every day in month one</strong> — tissues adapt slower than lungs</li>
<li><strong>Only running hard</strong> — no easy days, no progress</li>
<li><strong>Ignoring pain that changes your gait</strong> — that''s a stop sign, not a push-through moment</li>
</ul>

<h2>Your 7-day starter checklist</h2>
<ol>
<li>Run-walk session 1: 8×(1 min run, 2 min walk)</li>
<li>10-minute glute and calf strength circuit</li>
<li>Run-walk session 2: same or +1 rep — keep it easy</li>
<li>Walk 30 minutes on a rest day for active recovery</li>
<li>Run-walk session 3: focus on quiet, light footfalls</li>
<li>Find a running buddy or group on SportyFind</li>
<li>Log distance and how you felt — not just pace</li>
</ol>

<h2>When to get professional help</h2>
<p>Sharp pain, swelling, or pain that worsens each run warrants a <strong>sports physio</strong> assessment. Coaches can also help with gait cues if you keep hitting the same niggle every block.</p>
<p><strong>Bottom line:</strong> slow down, run-walk, strengthen, repeat. A 5K you can train for again next month beats a heroic first week you can''t walk off.</p>$body$,
  'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=1600&q=80',
  array['players', 'physio', 'general'],
  array['running'],
  'published',
  '[
    {"label": "Find Running Partners", "url": "/network"},
    {"label": "Sports Recovery & Physio", "url": "/physio"},
    {"label": "Browse Running Events", "url": "/events"},
    {"label": "Browse All Sports Tips", "url": "/content"}
  ]'::jsonb,
  'Injury-Free 5K Running Plan for Beginners | SportyFind Sports Tips',
  'Beginner running guide: run-walk progressions, easy pacing, strength basics, and a 7-day plan to build toward 5K.',
  now()
)
on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body,
  cover_image_url = excluded.cover_image_url, categories = excluded.categories,
  sports = excluded.sports, status = excluded.status, links = excluded.links,
  meta_title = excluded.meta_title, meta_description = excluded.meta_description,
  published_at = coalesce(public.content_posts.published_at, excluded.published_at),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 8. BOXING
-- ---------------------------------------------------------------------------
insert into public.content_posts (
  slug, title, excerpt, body, cover_image_url,
  categories, sports, status, links, meta_title, meta_description, published_at
) values (
  'boxing-technique-conditioning-beginners-guide',
  'Boxing for Beginners: Stance, Combos & Conditioning That Actually Transfers',
  'Fitness boxing and sparring both start with the same foundation — balanced stance, tight guard, and punches that return home. Build technique before you chase exhaustion.',
  $body$<h2>Why technique beats exhaustion in your first months</h2>
<p>Throwing hard for three rounds with sloppy form is a fast path to <strong>shoulder strain and bad habits</strong>. Beginners improve faster by drilling stance, guard, and basic combinations at controlled speed — then adding conditioning when mechanics hold up under fatigue.</p>
<p>Whether you''re training for fitness or amateur bouts, the sequence is the same: stance → jab → cross → hooks → movement → intensity.</p>

<h2>The 4 pillars every new boxer needs</h2>
<h3>1. Stance & guard</h3>
<p>Orthodox: left foot forward, right foot back, feet shoulder-width, knees soft, chin down, hands at cheekbones, elbows in. Weight balanced — not leaning forward or sitting back. After every punch, return hands to guard.</p>
<ul>
<li>Mirror check: 3×1 min shadowboxing focusing only on guard recovery</li>
<li>Don''t telegraph — exhale on punches, stay relaxed between shots</li>
</ul>

<h3>2. The basic six & footwork</h3>
<p>Learn the jab (1), cross (2), lead hook (3), rear hook (4), lead uppercut (5), rear uppercut (6). Start stationary; add push-step forward and pivot out after combos. <strong>Move your head off the center line</strong> after you finish — even in pad work.</p>
<blockquote>Punches are leg-driven. If only your arm moves, you''re leaving power and stability on the table.</blockquote>

<h3>3. Pad & bag discipline</h3>
<p>On the heavy bag, aim for crisp combinations — not wild flurries. 3-minute rounds, 1-minute rest. Begin with 1-2, 1-2-3, 1-2-5-2. Keep wrists straight on hooks; thumb stays outside the fist when wrapped properly.</p>

<h3>4. Conditioning that supports boxing</h3>
<p>Jump rope builds rhythm and calf endurance. Add core work (planks, dead bugs) and hip mobility. Roadwork or intervals 2× weekly — but don''t skip skill work for cardio-only sessions.</p>

<img src="https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Boxer training with focus mitts" />

<h2>What to avoid</h2>
<ul>
<li><strong>Dropping your hands after combos</strong> — habits form fast on the bag</li>
<li><strong>Only throwing power shots</strong> — the jab sets up everything else</li>
<li><strong>Sparring before you can move and guard under light pressure</strong></li>
</ul>

<h2>Your 7-day starter checklist</h2>
<ol>
<li>3 rounds shadowboxing — jab and cross only, full guard recovery</li>
<li>Jump rope: 6×1 min with 30 sec rest</li>
<li>Bag work: 4 rounds of 1-2 and 1-2-3 at 70% power</li>
<li>Core circuit: 3 rounds plank, dead bug, Russian twist</li>
<li>Footwork drill: pivot out after every 1-2 on the bag</li>
<li>Find a coach or class on SportyFind</li>
<li>Wrap wrists correctly; ice shoulders if unusually sore</li>
</ol>

<h2>When to get professional help</h2>
<p>Hand, wrist, or shoulder pain — or interest in sparring — means it''s time for a <strong>qualified coach and physio</strong>. Proper wrap technique and progressions matter before live contact.</p>
<p><strong>Bottom line:</strong> guard up, feet balanced, combos small and sharp. Fitness follows when your form survives the last round.</p>$body$,
  'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?auto=format&fit=crop&w=1600&q=80',
  array['players', 'coaches', 'physio'],
  array['boxing'],
  'published',
  '[
    {"label": "Find a Boxing Coach", "url": "/coaches"},
    {"label": "Sports Recovery & Physio", "url": "/physio"},
    {"label": "Connect with Training Partners", "url": "/network"},
    {"label": "Browse All Sports Tips", "url": "/content"}
  ]'::jsonb,
  'Boxing Technique & Conditioning for Beginners | SportyFind Sports Tips',
  'Beginner boxing guide: stance, guard, basic combinations, bag work, conditioning, and a 7-day training checklist.',
  now()
)
on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body,
  cover_image_url = excluded.cover_image_url, categories = excluded.categories,
  sports = excluded.sports, status = excluded.status, links = excluded.links,
  meta_title = excluded.meta_title, meta_description = excluded.meta_description,
  published_at = coalesce(public.content_posts.published_at, excluded.published_at),
  updated_at = now();

-- ---------------------------------------------------------------------------
-- 9. YOGA
-- ---------------------------------------------------------------------------
insert into public.content_posts (
  slug, title, excerpt, body, cover_image_url,
  categories, sports, status, links, meta_title, meta_description, published_at
) values (
  'yoga-mobility-recovery-active-people-guide',
  'Yoga for Active People: Mobility, Recovery & Sessions That Support Your Sport',
  'Yoga isn''t just stretching — it''s controlled breathing, joint stability, and recovery you can stack on top of training. Here''s how athletes use it without losing training time.',
  $body$<h2>Why athletes add yoga (and why it isn''t "just stretching")</h2>
<p>Training tightens hips, hamstrings, and shoulders — especially if you lift, run, or play court sports. Yoga builds <strong>usable mobility</strong>: range you can control, not just passive flexibility. Breath work also downshifts nervous system stress after hard sessions.</p>
<p>Use yoga as recovery infrastructure, not a replacement for strength or sport-specific work.</p>

<h2>The 4 pillars of a practical yoga practice</h2>
<h3>1. Breath as the anchor</h3>
<p>Nasal breathing in steady flows calms the system and improves focus. Inhales expand the rib cage; exhales deepen stretches safely. If you''re holding your breath, back off the intensity.</p>
<ul>
<li>Start sessions with 2 minutes of box breathing (4 sec in, 4 hold, 4 out, 4 hold)</li>
<li>Match movement to breath in sun salutations — don''t rush</li>
</ul>

<h3>2. Hip & hamstring mobility for movers</h3>
<p>Runners and court athletes benefit from low lunge, pigeon prep, and half splits. Hold 5–8 breaths per side; sensation should be moderate, not sharp pain. Active stretches (leg swings with control) pair well before sport.</p>
<blockquote>Mobility gains stick when you show up 15–20 minutes, 3× per week — not one heroic hour monthly.</blockquote>

<h3>3. Shoulder & thoracic spine for overhead sports</h3>
<p>Volleyball, tennis, and badminton load the shoulders. Add cat-cow, thread the needle, and gentle shoulder flossing. Strengthen external rotation with band work outside yoga if you overhead often.</p>

<h3>4. Recovery flows after hard training</h3>
<p>Post-game or post-lift: legs-up-the-wall, supine twists, and gentle forward folds. Keep heart rate down — this is parasympathetic recovery, not another workout. Even 10 minutes helps sleep and next-day soreness.</p>

<img src="https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&amp;fit=crop&amp;w=1200&amp;q=80" alt="Yoga mobility session in a studio" />

<h2>What to avoid</h2>
<ul>
<li><strong>Competitive stretching</strong> — forcing depth causes injury, not flexibility</li>
<li><strong>Hot power yoga the day before a max-effort game</strong> — match intensity to your schedule</li>
<li><strong>Skipping rest poses</strong> — savasana is part of the training effect</li>
</ul>

<h2>Your 7-day starter checklist</h2>
<ol>
<li>15-min morning flow: cat-cow, downdog, low lunge, child''s pose</li>
<li>Post-workout: 10-min legs-up-the-wall + supine twist</li>
<li>Hip focus session: pigeon prep and figure-4 stretch, 8 breaths each side</li>
<li>Shoulder mobility: thread the needle × 5 each side</li>
<li>One full 30–45 min beginner class (online or in-person)</li>
<li>Find yoga-friendly training partners on SportyFind</li>
<li>Log sleep quality on yoga days vs. non-yoga days</li>
</ol>

<h2>When to get professional help</h2>
<p>Joint pain during specific poses, dizziness, or existing injuries deserve a <strong>physio or experienced instructor</strong> who can modify poses. SportyFind connects active people with recovery and coaching support across sports.</p>
<p><strong>Bottom line:</strong> breathe, move with control, recover on purpose. Yoga makes your other training last longer — that''s the ROI.</p>$body$,
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1600&q=80',
  array['players', 'physio', 'general'],
  array['yoga'],
  'published',
  '[
    {"label": "Sports Recovery & Physio", "url": "/physio"},
    {"label": "Connect with Active People", "url": "/network"},
    {"label": "Find a Coach", "url": "/coaches"},
    {"label": "Browse All Sports Tips", "url": "/content"}
  ]'::jsonb,
  'Yoga Mobility & Recovery for Active People | SportyFind Sports Tips',
  'Yoga guide for athletes: breath work, hip and shoulder mobility, recovery flows, and a 7-day practice checklist.',
  now()
)
on conflict (slug) do update set
  title = excluded.title, excerpt = excluded.excerpt, body = excluded.body,
  cover_image_url = excluded.cover_image_url, categories = excluded.categories,
  sports = excluded.sports, status = excluded.status, links = excluded.links,
  meta_title = excluded.meta_title, meta_description = excluded.meta_description,
  published_at = coalesce(public.content_posts.published_at, excluded.published_at),
  updated_at = now();
