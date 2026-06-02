-- BandUp — mock reading seeds (for local frontend testing)
-- 3 readings (easy / medium / hard) with questions + options.
--
-- HOW TO RUN
-- ──────────
-- Local dev (Miniflare):
--   wrangler d1 execute bandup-db --local --file=src/db/seeds/readings.sql
--
-- Production:
--   wrangler d1 execute bandup-db --file=src/db/seeds/readings.sql
--
-- Re-runnable: deletes the seeded rows (fixed IDs 9001–9003) first, then
-- re-inserts them. It does NOT touch any other readings you may have created.
-- IDs live in a high range (9001+) so they won't collide with autoincrement rows.

-- ── Reset previously-seeded rows ────────────────────────────────────────────────
DELETE FROM question_options
  WHERE question_id IN (SELECT id FROM questions WHERE reading_id IN (9001, 9002, 9003));
DELETE FROM questions WHERE reading_id IN (9001, 9002, 9003);
DELETE FROM readings WHERE id IN (9001, 9002, 9003);

-- ════════════════════════════════════════════════════════════════════════════════
-- Reading 9001 — EASY (timer 300s) — daily-life comprehension
-- ════════════════════════════════════════════════════════════════════════════════
INSERT INTO readings (id, title, passage, level, timer_seconds) VALUES (
  9001,
  'The Saturday Market',
  'Every Saturday morning, Maria walks to the farmers'' market near her home. She likes to arrive early, just after eight o''clock, when the stalls are full and the bread is still warm. Her first stop is always the fruit stand, where she buys apples, oranges, and a small basket of strawberries. The owner, Mr. Chen, knows her by name and often saves the ripest tomatoes for her.

Maria enjoys the market not only for the fresh food but also for the friendly atmosphere. Musicians play near the entrance, and children run between the tables holding balloons. Before going home, she usually buys a cup of coffee and sits on a bench to watch the crowd. By ten o''clock the market becomes very busy, so Maria is always glad she came early.',
  'easy',
  300
);

INSERT INTO questions (id, reading_id, "order", text, type, explanation) VALUES
  (90011, 9001, 0, 'What time does Maria usually arrive at the market?', 'multiple_choice', 'The passage says she arrives "just after eight o''clock".'),
  (90012, 9001, 1, 'Mr. Chen sometimes saves the ripest tomatoes for Maria.', 'true_false_not_given', 'The text states he "often saves the ripest tomatoes for her", so this is True.'),
  (90013, 9001, 2, 'Why is Maria glad she comes to the market early?', 'multiple_choice', 'The passage explains that by ten o''clock it becomes very busy.');

INSERT INTO question_options (id, question_id, label, text, is_correct) VALUES
  -- Q90011
  (900111, 90011, 'A', 'Just after seven o''clock', 0),
  (900112, 90011, 'B', 'Just after eight o''clock', 1),
  (900113, 90011, 'C', 'At nine o''clock', 0),
  (900114, 90011, 'D', 'At ten o''clock', 0),
  -- Q90012
  (900121, 90012, 'True', 'True', 1),
  (900122, 90012, 'False', 'False', 0),
  (900123, 90012, 'Not Given', 'Not Given', 0),
  -- Q90013
  (900131, 90013, 'A', 'The coffee is cheaper early', 0),
  (900132, 90013, 'B', 'The musicians only play in the morning', 0),
  (900133, 90013, 'C', 'The market gets very busy later', 1),
  (900134, 90013, 'D', 'The bread sells out quickly', 0);

-- ════════════════════════════════════════════════════════════════════════════════
-- Reading 9002 — MEDIUM (timer 1200s) — IELTS Academic style
-- ════════════════════════════════════════════════════════════════════════════════
INSERT INTO readings (id, title, passage, level, timer_seconds) VALUES (
  9002,
  'The Rise of Urban Beekeeping',
  'Over the past two decades, beekeeping has moved from the countryside into the heart of major cities. Rooftops, balconies, and community gardens in places such as London, Paris, and New York now host thousands of hives. Several factors explain this shift. Growing public awareness of declining bee populations has encouraged city dwellers to take direct action, while local honey has become a fashionable product among urban consumers.

Surprisingly, research suggests that bees can thrive in cities. Urban areas often contain a remarkable diversity of flowering plants — from park trees to window boxes — that bloom across a long season. This variety can provide a more stable food supply than the vast single-crop fields that surround many rural hives, where flowers may be abundant for only a few weeks each year.

However, the trend is not without critics. Some experts warn that placing too many managed honeybee colonies in a small area may create competition for nectar, potentially harming wild pollinators such as bumblebees and solitary bees. They argue that protecting natural habitats is a more effective long-term strategy than simply increasing the number of hives. The debate highlights a broader truth: good intentions alone do not guarantee good ecological outcomes.',
  'medium',
  1200
);

INSERT INTO questions (id, reading_id, "order", text, type, explanation) VALUES
  (90021, 9002, 0, 'According to the passage, one reason urban beekeeping has grown is that', 'multiple_choice', 'The text cites awareness of declining bee populations and the popularity of local honey.'),
  (90022, 9002, 1, 'Cities can offer bees a more stable food supply than some rural areas.', 'true_false_not_given', 'The passage states urban plant diversity "can provide a more stable food supply than the vast single-crop fields".'),
  (90023, 9002, 2, 'The passage states that urban honey is more nutritious than rural honey.', 'true_false_not_given', 'No comparison of nutritional value is made — this is Not Given.'),
  (90024, 9002, 3, 'What concern do some experts raise about urban beekeeping?', 'multiple_choice', 'Critics warn that too many managed colonies may compete with wild pollinators for nectar.');

INSERT INTO question_options (id, question_id, label, text, is_correct) VALUES
  -- Q90021
  (900211, 90021, 'A', 'city governments now pay people to keep bees', 0),
  (900212, 90021, 'B', 'people have become more aware of falling bee numbers', 1),
  (900213, 90021, 'C', 'rural beekeeping has been made illegal', 0),
  (900214, 90021, 'D', 'honey has become much cheaper to produce', 0),
  -- Q90022
  (900221, 90022, 'True', 'True', 1),
  (900222, 90022, 'False', 'False', 0),
  (900223, 90022, 'Not Given', 'Not Given', 0),
  -- Q90023
  (900231, 90023, 'True', 'True', 0),
  (900232, 90023, 'False', 'False', 0),
  (900233, 90023, 'Not Given', 'Not Given', 1),
  -- Q90024
  (900241, 90024, 'A', 'Honeybees may spread disease to humans', 0),
  (900242, 90024, 'B', 'City honey often tastes unpleasant', 0),
  (900243, 90024, 'C', 'Too many hives may compete with wild pollinators', 1),
  (900244, 90024, 'D', 'Beekeeping equipment is too expensive for cities', 0);

-- ════════════════════════════════════════════════════════════════════════════════
-- Reading 9003 — HARD (timer 1500s) — SAT-style, inference-heavy
-- ════════════════════════════════════════════════════════════════════════════════
INSERT INTO readings (id, title, passage, level, timer_seconds) VALUES (
  9003,
  'The Paradox of Choice',
  'It is widely assumed that more options make us better off. A market offering fifty kinds of jam, the reasoning goes, must serve consumers more fully than one offering six. Yet a now-famous study complicated this intuition. When shoppers were presented with an extensive display of twenty-four jams, they were more likely to stop and sample than when shown a limited display of six. But when it came to purchasing, the smaller selection outperformed the larger one dramatically: shoppers facing fewer options were roughly ten times more likely to actually buy.

The explanation offered by psychologists rests less on the jam than on the mind of the chooser. An abundance of alternatives, they argue, raises the perceived cost of a wrong decision. With six jams, a disappointing choice is easily forgiven; with twenty-four, the chooser cannot help imagining that some untried jar would have been superior. The result is not liberation but a quiet paralysis, accompanied by a lingering dissatisfaction with whatever is finally selected.

This does not mean that choice is inherently harmful — few would prefer a world of rigid uniformity. Rather, the findings suggest that the relationship between options and well-being is not linear. Beyond a certain threshold, each additional alternative yields diminishing returns and may even impose a psychological tax. The wise designer of menus, retirement plans, or public policy, then, is not the one who maximizes options but the one who curates them.',
  'hard',
  1500
);

INSERT INTO questions (id, reading_id, "order", text, type, explanation) VALUES
  (90031, 9003, 0, 'The central finding of the jam study is best described as', 'multiple_choice', 'A larger display attracted more interest but produced far fewer purchases than the smaller one.'),
  (90032, 9003, 1, 'The author mentions "twenty-four jams" primarily to', 'multiple_choice', 'The large display illustrates how excessive choice can suppress actual buying.'),
  (90033, 9003, 2, 'It can be inferred that the "psychological tax" refers to', 'multiple_choice', 'It refers to the dissatisfaction and difficulty deciding that come with too many options.'),
  (90034, 9003, 3, 'The passage suggests that an effective policy designer should', 'multiple_choice', 'The final sentence argues for curating rather than maximizing options.');

INSERT INTO question_options (id, question_id, label, text, is_correct) VALUES
  -- Q90031
  (900311, 90031, 'A', 'more choice attracted attention but reduced purchases', 1),
  (900312, 90031, 'B', 'consumers always prefer fewer options', 0),
  (900313, 90031, 'C', 'the quality of the jam determined sales', 0),
  (900314, 90031, 'D', 'sampling and buying rise together', 0),
  -- Q90032
  (900321, 90032, 'A', 'prove that variety is meaningless to shoppers', 0),
  (900322, 90032, 'B', 'show how an overload of options can discourage buying', 1),
  (900323, 90032, 'C', 'criticize the shoppers for being indecisive', 0),
  (900324, 90032, 'D', 'recommend that stores stock more products', 0),
  -- Q90033
  (900331, 90033, 'A', 'an actual fee charged at checkout', 0),
  (900332, 90033, 'B', 'the time wasted sampling free products', 0),
  (900333, 90033, 'C', 'the dissatisfaction and indecision caused by too many options', 1),
  (900334, 90033, 'D', 'the higher price of premium goods', 0),
  -- Q90034
  (900341, 90034, 'A', 'offer the widest possible range of choices', 0),
  (900342, 90034, 'B', 'eliminate consumer choice entirely', 0),
  (900343, 90034, 'C', 'thoughtfully curate a limited set of options', 1),
  (900344, 90034, 'D', 'let costs alone decide what to offer', 0);
