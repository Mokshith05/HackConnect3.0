-- HackConnect Database Seed Data

-- 1. Create Default Admin User
insert into auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_user_meta_data, raw_app_meta_data)
values (
  '00000000-0000-0000-0000-000000000001',
  'admin@hackconnect.app',
  crypt('HackConnect@Admin2024', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  '{"role": "admin"}',
  '{"provider": "email", "providers": ["email"]}'
) on conflict (id) do nothing;

-- 2. Create Demo Event
insert into events (id, name, description, location, start_date, end_date, is_active, created_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'HackConnect Demo — 2024',
  'The ultimate networking event and hackathon for tech enthusiasts and developers to connect and build awesome projects.',
  'Innovation Hub, Hall B',
  now(),
  now() + interval '3 days',
  true,
  now()
) on conflict (id) do nothing;

-- 3. Create 5 Demo Users in auth.users
insert into auth.users (id, email, encrypted_password, email_confirmed_at, role, aud, raw_user_meta_data, raw_app_meta_data)
values
-- User 1: Alex Rivera
(
  '22222222-2222-2222-2222-222222222201',
  'alex@hackconnect.app',
  crypt('Password123!', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  '{"full_name": "Alex Rivera"}',
  '{"provider": "email", "providers": ["email"]}'
),
-- User 2: Sarah Chen
(
  '22222222-2222-2222-2222-222222222202',
  'sarah@hackconnect.app',
  crypt('Password123!', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  '{"full_name": "Sarah Chen"}',
  '{"provider": "email", "providers": ["email"]}'
),
-- User 3: David Kim
(
  '22222222-2222-2222-2222-222222222203',
  'david@hackconnect.app',
  crypt('Password123!', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  '{"full_name": "David Kim"}',
  '{"provider": "email", "providers": ["email"]}'
),
-- User 4: Emily Watson
(
  '22222222-2222-2222-2222-222222222204',
  'emily@hackconnect.app',
  crypt('Password123!', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  '{"full_name": "Emily Watson"}',
  '{"provider": "email", "providers": ["email"]}'
),
-- User 5: Marcus Vance
(
  '22222222-2222-2222-2222-222222222205',
  'marcus@hackconnect.app',
  crypt('Password123!', gen_salt('bf')),
  now(),
  'authenticated',
  'authenticated',
  '{"full_name": "Marcus Vance"}',
  '{"provider": "email", "providers": ["email"]}'
)
on conflict (id) do nothing;

-- 4. Create Profiles for the 5 Demo Users
insert into profiles (id, full_name, email, avatar_url, bio, skills, interests, linkedin_url, github_url, looking_for, event_id)
values
(
  '22222222-2222-2222-2222-222222222201',
  'Alex Rivera',
  'alex@hackconnect.app',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Alex',
  'Frontend developer passionate about sleek UI/UX and micro-interactions. building with React/Tailwind.',
  array['React', 'TypeScript', 'Tailwind', 'Next.js', 'Figma'],
  array['AI', 'Web3', 'Design Systems', 'EdTech'],
  'https://linkedin.com/in/alexrivera-demo',
  'https://github.com/alexrivera-demo',
  'teammate',
  '11111111-1111-1111-1111-111111111111'
),
(
  '22222222-2222-2222-2222-222222222202',
  'Sarah Chen',
  'sarah@hackconnect.app',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Sarah',
  'AI Research engineer. Experienced in training NLP models, fine-tuning LLMs, and Python backends.',
  array['Python', 'PyTorch', 'FastAPI', 'ML', 'LangChain'],
  array['AI', 'HealthTech', 'LLMs', 'OpenSource'],
  'https://linkedin.com/in/sarahchen-demo',
  'https://github.com/sarahchen-demo',
  'collaborator',
  '11111111-1111-1111-1111-111111111111'
),
(
  '22222222-2222-2222-2222-222222222203',
  'David Kim',
  'david@hackconnect.app',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=David',
  'Fullstack engineer and startup enthusiast. Loves building scalable backends and databases.',
  array['Go', 'PostgreSQL', 'Docker', 'React', 'AWS'],
  array['FinTech', 'SaaS', 'DevOps', 'Web3'],
  'https://linkedin.com/in/davidkim-demo',
  'https://github.com/davidkim-demo',
  'networking',
  '11111111-1111-1111-1111-111111111111'
),
(
  '22222222-2222-2222-2222-222222222204',
  'Emily Watson',
  'emily@hackconnect.app',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Emily',
  'Product manager and designer. I bridge the gap between business needs and visual engineering.',
  array['Figma', 'Product Strategy', 'Wireframing', 'Agile'],
  array['EdTech', 'SocialImpact', 'UI/UX', 'Gaming'],
  'https://linkedin.com/in/emilywatson-demo',
  'https://github.com/emilywatson-demo',
  'collaborator',
  '11111111-1111-1111-1111-111111111111'
),
(
  '22222222-2222-2222-2222-222222222205',
  'Marcus Vance',
  'marcus@hackconnect.app',
  'https://api.dicebear.com/7.x/adventurer/svg?seed=Marcus',
  'Senior backend engineer and mentor. Helping teams architecture secure and scalable systems.',
  array['Node.js', 'GraphQL', 'Kubernetes', 'Redis', 'Python'],
  array['Security', 'AI', 'Cloud Native', 'Robotics'],
  'https://linkedin.com/in/marcusvance-demo',
  'https://github.com/marcusvance-demo',
  'mentor',
  '11111111-1111-1111-1111-111111111111'
)
on conflict (id) do nothing;

-- 5. Add Users to Event Participants
insert into event_participants (event_id, user_id)
values
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222201'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222202'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222203'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222204'),
('11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222205')
on conflict (event_id, user_id) do nothing;

-- 6. Add Connections (Alex <-> Sarah, Sarah <-> Marcus)
insert into connections (id, user_a, user_b, event_id)
values
(
  '33333333-3333-3333-3333-333333333301',
  '22222222-2222-2222-2222-222222222201', -- Alex
  '22222222-2222-2222-2222-222222222202', -- Sarah
  '11111111-1111-1111-1111-111111111111'
),
(
  '33333333-3333-3333-3333-333333333302',
  '22222222-2222-2222-2222-222222222202', -- Sarah
  '22222222-2222-2222-2222-222222222205', -- Marcus
  '11111111-1111-1111-1111-111111111111'
)
on conflict (user_a, user_b) do nothing;

-- 7. Add Location Statuses
insert into location_status (user_id, event_id, zone, availability, custom_note, updated_at)
values
(
  '22222222-2222-2222-2222-222222222201', -- Alex
  '11111111-1111-1111-1111-111111111111',
  'Networking Zone',
  'available',
  'Hacking on frontend design. Come say hi!',
  now() - interval '5 minutes'
),
(
  '22222222-2222-2222-2222-222222222202', -- Sarah
  '11111111-1111-1111-1111-111111111111',
  'Workshop Room A',
  'available',
  'Listening to the LLM talk',
  now() - interval '2 minutes'
),
(
  '22222222-2222-2222-2222-222222222203', -- David
  '11111111-1111-1111-1111-111111111111',
  'Cafeteria / Food Area',
  'busy',
  'Grabbing some coffee and pizza',
  now() - interval '15 minutes'
),
(
  '22222222-2222-2222-2222-222222222204', -- Emily
  '11111111-1111-1111-1111-111111111111',
  'Main Hall',
  'available',
  'Drafting slide designs',
  now() - interval '8 minutes'
),
(
  '22222222-2222-2222-2222-222222222205', -- Marcus
  '11111111-1111-1111-1111-111111111111',
  'Hackathon Work Area',
  'busy',
  'Reviewing systems architecture diagram',
  now() - interval '20 minutes'
)
on conflict (user_id) do update set
  zone = excluded.zone,
  availability = excluded.availability,
  custom_note = excluded.custom_note,
  updated_at = now();

-- 8. Add Messages in Connections
insert into messages (connection_id, sender_id, content, created_at, is_read)
values
(
  '33333333-3333-3333-3333-333333333301',
  '22222222-2222-2222-2222-222222222201', -- Alex: Hey Sarah!
  'Hey Sarah! Saw your project idea about fine-tuning LLMs for clinical trials. I can build the React interface!',
  now() - interval '1 hour',
  true
),
(
  '33333333-3333-3333-3333-333333333301',
  '22222222-2222-2222-2222-222222222202', -- Sarah: Hi Alex!
  'Oh wow, that is exactly what I need! I have a fastAPI endpoint ready but the layout needs some UX love. Want to meet up?',
  now() - interval '50 minutes',
  true
),
(
  '33333333-3333-3333-3333-333333333301',
  '22222222-2222-2222-2222-222222222201', -- Alex
  'Definitely! I am sitting in the Networking Zone on Floor 2, near the beanbags.',
  now() - interval '45 minutes',
  true
),
(
  '33333333-3333-3333-3333-333333333301',
  '22222222-2222-2222-2222-222222222202', -- Sarah
  'Awesome, heading over in 5 mins after this workshop panel wraps up.',
  now() - interval '40 minutes',
  false
);

-- 9. Add Connection Requests (David -> Alex)
insert into connection_requests (sender_id, receiver_id, event_id, status, message, created_at)
values (
  '22222222-2222-2222-2222-222222222203', -- David
  '22222222-2222-2222-2222-222222222201', -- Alex
  '11111111-1111-1111-1111-111111111111',
  'pending',
  'Hey Alex, love your frontend portfolio. Let us team up and build a SaaS product for this hackathon.',
  now() - interval '15 minutes'
) on conflict (sender_id, receiver_id, event_id) do nothing;

-- 10. Add AI Suggestions for Alex
insert into ai_suggestions (user_id, suggested_user_id, event_id, compatibility_score, reason, icebreaker)
values
(
  '22222222-2222-2222-2222-222222222201', -- Alex Suggestion 1: Sarah
  '22222222-2222-2222-2222-222222222202', -- Sarah
  '11111111-1111-1111-1111-111111111111',
  95,
  'Perfect overlap of React front-end development and NLP/ML back-end engineering goals.',
  'Hey Sarah, how do you plan to handle the latency on fine-tuning results on the frontend?'
),
(
  '22222222-2222-2222-2222-222222222201', -- Alex Suggestion 2: Emily
  '22222222-2222-2222-2222-222222222204', -- Emily
  '11111111-1111-1111-1111-111111111111',
  88,
  'Both share UI/UX design tools and Emily looking for collaborator matches your teammate search.',
  'Hey Emily, what is your favorite tool in Figma for rapidly prototyping interactive animations?'
)
on conflict (id) do nothing;
