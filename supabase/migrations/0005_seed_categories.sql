insert into categories (name, group_name) values
  ('Claude Max', 'AI/Software'),
  ('ChatGPT Pro', 'AI/Software'),
  ('Cursor Pro', 'AI/Software'),
  ('GitHub Copilot', 'AI/Software'),
  ('Midjourney', 'AI/Software'),
  ('อื่นๆ', 'AI/Software')
on conflict do nothing;
