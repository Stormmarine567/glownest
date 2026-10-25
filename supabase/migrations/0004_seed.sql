-- GLOWNEST — starter data (mirrors the screenshots). Everything here is editable from the dashboards.

insert into public.categories (slug, name, sort_order) values
  ('serums', 'Serums', 1), ('cleansers', 'Cleansers', 2), ('moisturizers', 'Moisturizers', 3), ('sun-care', 'Sun Care', 4)
on conflict (slug) do nothing;

insert into public.products
  (slug, name, tagline, description, category_id, price_cents, stock_quantity, is_featured, is_bestseller,
   skin_types, concerns, goals, routine_step, routine_time, rating_avg, rating_count, sort_order)
select v.slug, v.name, v.tagline, v.description, c.id, v.price, 120, v.featured, v.best,
       v.skin, v.conc, v.goals, v.step, v.time, v.rating, v.cnt, v.sort
from (values
  ('hyaluronic-acid-serum', 'Hyaluronic Acid Serum', 'Intense Hydration', 'Formulated with clean, clinically-proven ingredients, our hyaluronic acid serum is designed to deliver visible results. Suitable for all skin types and dermatologist-tested.', 'serums', 4400, true,  false, array['dry','normal','combination','sensitive'], array['dehydration','dullness'], array['hydrate'], 'treat', 'both', 4.9, 1100, 1),
  ('vitamin-c-serum',        'Vitamin C Serum',        'Antioxidant Protection', 'A brightening antioxidant serum that helps defend skin against daily environmental stress while evening out tone.', 'serums', 4600, true,  false, array['normal','combination','oily'], array['dullness','dark_spots','aging'], array['brighten','protect'], 'treat', 'am', 4.9, 1200, 2),
  ('glow-serum',             'Glow Serum',             'Brightening & Radiance', 'A lightweight radiance serum that boosts luminosity and refines the look of uneven skin tone.', 'serums', 4800, true,  false, array['normal','dry','combination'], array['dullness','dark_spots'], array['brighten'], 'treat', 'both', 4.9, 1200, 3),
  ('hydra-moisturizer',      'Hydra Moisturizer',      'Deep Hydration', 'A cushiony daily moisturizer that seals in deep, all-day hydration without heaviness.', 'moisturizers', 4200, true, false, array['dry','normal','sensitive','combination'], array['dehydration'], array['hydrate'], 'moisturize', 'both', 4.9, 1100, 4),
  ('daily-cleanser',         'Daily Cleanser',         'Gentle & Hydrating', 'A gentle gel-cream cleanser that removes impurities while leaving skin soft and balanced.', 'cleansers', 2800, false, true, array['dry','normal','sensitive','combination','oily'], array['dehydration','redness'], array['hydrate','clear'], 'cleanse', 'both', 4.8, 856, 5),
  ('niacinamide-10-serum',   'Niacinamide 10% Serum',  'Pore Minimizer', 'A high-strength niacinamide serum that visibly minimizes pores and balances excess oil.', 'serums', 3800, false, true, array['oily','combination','normal'], array['acne','redness'], array['clear'], 'treat', 'both', 4.9, 982, 6),
  ('sun-shield-spf-50',      'Sun Shield SPF 50',      'Broad Spectrum', 'A silky broad-spectrum SPF 50 that protects against UVA/UVB with no white cast.', 'sun-care', 3200, false, true, array['dry','normal','combination','oily','sensitive'], array['aging','dark_spots'], array['protect'], 'protect', 'am', 4.7, 654, 7),
  ('collagen-cream',         'Collagen Cream',         'Anti-Aging Formula', 'A rich night cream that supports firmness and visibly softens the look of fine lines.', 'moisturizers', 4200, false, true, array['dry','normal','combination'], array['aging'], array['firm','hydrate'], 'moisturize', 'pm', 4.8, 876, 8)
) as v(slug, name, tagline, description, cat, price, featured, best, skin, conc, goals, step, time, rating, cnt, sort)
join public.categories c on c.slug = v.cat
on conflict (slug) do nothing;

insert into public.product_images (product_id, url, alt, sort_order)
select id, '/images/products/' || slug || '.svg', name, 0 from public.products
on conflict do nothing;

insert into public.shipping_methods (name, description, price_cents, free_over_cents, estimated_days_min, estimated_days_max, sort_order) values
  ('Standard', 'Tracked delivery', 800, 7500, 5, 8, 1),
  ('Express',  'Priority tracked delivery', 1800, null, 2, 3, 2);

insert into public.payment_gateways (provider, display_name, is_enabled, currency) values
  ('paystack', 'Paystack', false, 'NGN'),
  ('flutterwave', 'Flutterwave', false, 'NGN')
on conflict (provider) do nothing;

insert into public.site_settings (key, value, is_public) values
  ('business', '{
     "name": "GLOWNEST",
     "tagline": "Skincare",
     "email": "hello@glownest.com",
     "phone": "+33 1 45 67 89 00",
     "address_lines": ["42 Rue de la Beauté", "75008 Paris, France"],
     "map_url": "",
     "hours": ["Mon — Fri: 9am – 6pm CET", "Sat: 10am – 4pm CET"],
     "support_note": "We reply within one business day."
   }', true),
  ('branding', '{ "logo_url": null, "favicon_url": null }', true),
  ('store', '{ "currency": "USD", "tax_percent": 0, "maintenance_mode": false, "low_stock_default": 5, "newsletter_discount": "10% off your first order" }', true),
  ('seo', '{ "title": "GLOWNEST Skincare", "description": "Science-backed skincare solutions designed to reveal your natural glow.", "analytics_id": "" }', true),
  ('notification_recipients', '[]', false)
on conflict (key) do nothing;

insert into public.social_links (platform, url, sort_order) values
  ('instagram', 'https://instagram.com/', 1), ('facebook', 'https://facebook.com/', 2),
  ('tiktok', 'https://tiktok.com/', 3), ('pinterest', 'https://pinterest.com/', 4)
on conflict do nothing;

insert into public.site_content (key, data) values
  ('home_hero', '{
     "eyebrow": "CLEAN. EFFECTIVE. RADIANT.",
     "heading": "Healthy Skin Starts Here.",
     "text": "Science-backed skincare solutions designed to reveal your natural glow and boost your confidence.",
     "primary_cta": {"label": "Shop Bestsellers", "href": "/shop"},
     "secondary_cta": {"label": "Explore Routine", "href": "/quiz"},
     "image_url": "/images/hero-model.svg",
     "trust": {"text": "Trusted by 25K+ customers", "rating": "4.9/5"},
     "results_card": {"title": "Clinically Proven Results", "rows": [["Hydration","+92%"],["Smoothness","+88%"],["Radiance","+85%"],["Even Tone","+80%"]], "footnote": "*Based on 4 weeks of use"}
   }'),
  ('home_about', '{
     "eyebrow": "/ ABOUT US",
     "heading": "Skincare that loves your skin and the planet.",
     "text": "We create clean, effective, and sustainable skincare that delivers visible results — without compromise.",
     "cta": {"label": "Our Story", "href": "/our-story"},
     "image_url": "/images/about-botanical.svg",
     "features": [
       {"icon": "leaf", "title": "Clean Ingredients", "text": "Safe, non-toxic & dermatologist tested."},
       {"icon": "heart", "title": "Cruelty Free", "text": "Kind to animals, always."},
       {"icon": "recycle", "title": "Sustainable", "text": "Eco-conscious packaging."},
       {"icon": "users", "title": "For All Skin Types", "text": "Gentle care for every skin."}
     ]
   }'),
  ('home_routine_banner', '{
     "heading": "Build your perfect skincare routine",
     "text": "Personalized care for your unique skin needs.",
     "badges": ["Personalized for you", "Dermatologist-approved", "Backed by science"],
     "cta": {"label": "Take Skin Quiz", "href": "/quiz"},
     "image_url": "/images/routine-flatlay.svg"
   }'),
  ('home_concerns', '{
     "eyebrow": "/ FIND YOUR CARE",
     "heading": "Discover the treatment that''s right for you.",
     "cta": {"label": "Take Skin Quiz", "href": "/quiz"},
     "image_url": "/images/treatment-model.svg",
     "items": [
       {"icon": "shield", "title": "Acne Care", "text": "Clear and calm your skin.", "concern": "acne"},
       {"icon": "sun", "title": "Anti-Aging", "text": "Reduce fine lines and wrinkles.", "concern": "aging"},
       {"icon": "sparkles", "title": "Brightening", "text": "Boost radiance and even tone.", "concern": "dullness"},
       {"icon": "droplets", "title": "Hydration", "text": "Deep moisture for all-day glow.", "concern": "dehydration"}
     ]
   }'),
  ('home_promise', '{
     "eyebrow": "/ OUR PROMISE",
     "heading": "Effective skincare with clean, natural ingredients.",
     "pills": ["Paraben Free", "Sulfate Free", "Silicone Free"],
     "cta": {"label": "Shop Clean Skincare", "href": "/shop"}
   }'),
  ('home_testimonials', '{
     "eyebrow": "/ REAL RESULTS",
     "heading": "Real People, Real Results",
     "items": [
       {"quote": "Lumière has transformed my skin! It''s glowing, hydrated, and so much smoother.", "name": "Jessica R.", "place": "New York, USA"},
       {"quote": "Finally found skincare that''s gentle and effective. My skin has never looked better!", "name": "Amanda L.", "place": "London, UK"}
     ]
   }'),
  ('nav', '{ "links": [
     {"label": "Home", "href": "/"}, {"label": "Shop", "href": "/shop"}, {"label": "Our Story", "href": "/our-story"},
     {"label": "Blog", "href": "/blog"}, {"label": "Contact", "href": "/contact"} ] }'),
  ('footer', '{
     "newsletter_text": "Get 10% off and skincare tips",
     "copyright": "Glownest Skincare. All rights reserved.",
     "columns": [
       {"title": "SHOP", "links": [{"label":"All Products","href":"/shop"},{"label":"Best Sellers","href":"/shop?filter=bestsellers"},{"label":"New Arrivals","href":"/shop?filter=new"},{"label":"Skincare Quiz","href":"/quiz"}]},
       {"title": "COMPANY", "links": [{"label":"Our Story","href":"/our-story"},{"label":"Sustainability","href":"/sustainability"},{"label":"Careers","href":"/careers"}]},
       {"title": "HELP", "links": [{"label":"FAQ","href":"/faq"},{"label":"Shipping","href":"/shipping"},{"label":"Returns","href":"/returns"},{"label":"Contact Us","href":"/contact"}]}
     ]
   }'),
  ('our_story', '{
     "eyebrow": "/ OUR STORY",
     "heading": "Beauty that believes in better.",
     "text": "Glownest was born from a simple belief: skincare should be clean, effective, and kind to the planet. We combine the best of science and nature to create products that deliver real results without compromise.",
     "cta": {"label": "Shop Our Products", "href": "/shop"},
     "image_url": "/images/about-botanical.svg",
     "journey_heading": "From Paris to the World",
     "timeline": [
       {"year": "2018", "title": "The Beginning", "text": "Founded in Paris with a mission to create skincare that''s both effective and sustainable."},
       {"year": "2019", "title": "First Collection", "text": "Launched our signature Glow Serum and Hydra Moisturizer to overwhelming positive response."},
       {"year": "2021", "title": "Global Reach", "text": "Expanded to 30+ countries, earning trust from over 100,000 customers worldwide."},
       {"year": "2024", "title": "Today", "text": "Continuing to innovate with clean formulas backed by science and loved by all skin types."}
     ],
     "values_heading": "What We Stand For",
     "values": [
       {"icon": "leaf", "title": "Clean Formulas", "text": "Every ingredient is carefully selected for safety and efficacy. No harmful chemicals, ever."},
       {"icon": "heart", "title": "Cruelty Free", "text": "We never test on animals. Certified by Leaping Bunny and committed to ethical beauty."},
       {"icon": "recycle", "title": "Sustainable", "text": "Eco-conscious packaging made from recycled materials. Carbon-neutral shipping worldwide."},
       {"icon": "globe", "title": "Globally Sourced", "text": "Premium ingredients sourced responsibly from trusted suppliers around the world."},
       {"icon": "award", "title": "Dermatologist Approved", "text": "All products are clinically tested and approved by leading dermatologists."},
       {"icon": "users", "title": "For Everyone", "text": "Inclusive formulations designed to work beautifully on every skin type and tone."}
     ],
     "cta_banner": {"heading": "Ready to start your skincare journey?", "text": "Discover products tailored to your unique skin needs.", "cta": {"label": "Explore Products", "href": "/shop"}, "image_url": "/images/routine-flatlay.svg"}
   }'),
  ('quiz', '{
     "title": "Find your perfect routine",
     "intro": "Answer a few quick questions and we will build a routine from our catalogue, matched to your skin.",
     "skin_types": [
       {"id": "dry", "label": "Dry", "hint": "Feels tight, flaky or rough"},
       {"id": "oily", "label": "Oily", "hint": "Shiny, prone to breakouts"},
       {"id": "combination", "label": "Combination", "hint": "Oily T-zone, drier cheeks"},
       {"id": "sensitive", "label": "Sensitive", "hint": "Easily irritated or red"},
       {"id": "normal", "label": "Normal", "hint": "Balanced, few concerns"}
     ],
     "concerns": [
       {"id": "acne", "label": "Acne & blemishes"}, {"id": "aging", "label": "Fine lines & wrinkles"},
       {"id": "dullness", "label": "Dullness"}, {"id": "dehydration", "label": "Dehydration"},
       {"id": "dark_spots", "label": "Dark spots"}, {"id": "redness", "label": "Redness"}
     ],
     "goals": [
       {"id": "hydrate", "label": "Deep hydration"}, {"id": "brighten", "label": "Brighter, even tone"},
       {"id": "protect", "label": "Daily protection"}, {"id": "clear", "label": "Clearer skin"}, {"id": "firm", "label": "Firmer skin"}
     ],
     "preferences": [
       {"id": "fragrance_free", "label": "Fragrance-free only"},
       {"id": "vegan", "label": "Vegan formulas only"},
       {"id": "minimal", "label": "Keep it minimal (3 steps)"}
     ]
   }')
on conflict (key) do nothing;

insert into public.pages (slug, title, summary, body) values
  ('shipping', 'Shipping', 'Everything about how we get your order to you.', '{"sections":[
    {"heading":"Shipping methods","body":"Standard (tracked) and Express (priority tracked) delivery are available at checkout."},
    {"heading":"Delivery estimates","body":"Standard: 5–8 business days. Express: 2–3 business days. Orders are dispatched within 1–2 business days."},
    {"heading":"Shipping charges","body":"Standard shipping is free on orders above the free-shipping threshold shown in your cart. Express is always charged at the rate shown at checkout."},
    {"heading":"Tracking","body":"You receive an email and a dashboard notification with your tracking number as soon as your order ships."},
    {"heading":"Delivery conditions","body":"Please make sure your address is complete and that someone can receive the parcel. Contact us promptly if your parcel is delayed."}]}'),
  ('returns', 'Returns', 'Our return and refund policy.', '{"sections":[
    {"heading":"Return policy","body":"If you are not happy, you may request a return within 30 days of delivery."},
    {"heading":"Eligibility","body":"Items must be unused or less than 20% used, in original packaging. Opened products that caused a reaction are always eligible."},
    {"heading":"How to return","body":"Open the order in your dashboard and choose Request return. We reply within one business day with instructions."},
    {"heading":"Refunds","body":"Approved refunds go back to your original payment method within 5–10 business days of us receiving the parcel."}]}'),
  ('privacy', 'Privacy Policy', 'How GLOWNEST handles your information.', '{"sections":[
    {"heading":"Information we collect","body":"Account details, order and delivery information, and the preferences you give us (such as your skincare quiz answers)."},
    {"heading":"How we use it","body":"To fulfil orders, provide support, personalise recommendations, and — only with your consent — send marketing emails."},
    {"heading":"Data protection","body":"Data is stored with Supabase using encryption in transit and at rest. Payments are processed by our payment partners; we never store card numbers."},
    {"heading":"Cookies and tracking","body":"We use essential cookies for sign-in and your cart, and optional analytics if enabled."},
    {"heading":"Your rights","body":"You can access, correct, export or delete your data, and unsubscribe from marketing at any time."},
    {"heading":"Contact","body":"Email hello@glownest.com with any privacy question."}]}'),
  ('sustainability', 'Sustainability', 'Kind to your skin and the planet.', '{"sections":[
    {"heading":"Recycled packaging","body":"Our packaging is made from recycled materials and designed to be recycled again."},
    {"heading":"Carbon-neutral shipping","body":"We offset the emissions of every parcel we ship."}]}'),
  ('careers', 'Careers', 'Help us build skincare that believes in better.', '{"sections":[
    {"heading":"Life at GLOWNEST","body":"We are a small, ambitious team that cares about science, sustainability and kindness."},
    {"heading":"How to apply","body":"Send your CV and a short note about why you would like to join to careers@glownest.com, mentioning the role title in the subject line."}]}')
on conflict (slug) do nothing;

insert into public.faqs (category, question, answer, sort_order) values
  ('Products', 'Are your products suitable for sensitive skin?', 'Yes. Our formulas are dermatologist-tested and free from parabens, sulfates and silicones. As with any new product we recommend a patch test first.', 1),
  ('Products', 'Are your products cruelty-free?', 'Always. We never test on animals and are certified by Leaping Bunny.', 2),
  ('Products', 'How long will it take to see results?', 'Hydration improves within days; brightening and firming typically take 4–8 weeks of consistent use.', 3),
  ('Products', 'Where are your products made?', 'Our formulas are developed in Paris and produced with carefully selected, responsibly sourced ingredients.', 4),
  ('Orders & Shipping', 'How can I track my order?', 'Once shipped you will receive an email and dashboard notification with your tracking number. You can also see it under Dashboard → My Orders.', 5),
  ('Orders & Shipping', 'Can I cancel my order?', 'You can request a cancellation from your dashboard before it ships.', 6),
  ('Returns', 'What is your return policy?', 'You can request a return within 30 days of delivery. See our Returns page for details.', 7);

insert into public.job_postings (title, department, location, employment_type, description, how_to_apply) values
  ('Customer Care Specialist', 'Support', 'Remote', 'Full-time', 'Help our customers find the right routine and resolve order questions with warmth and speed.', 'Email careers@glownest.com with your CV.'),
  ('Content & Community Lead', 'Marketing', 'Paris / Remote', 'Full-time', 'Own our editorial voice across the blog, newsletter and social channels.', 'Email careers@glownest.com with your CV and portfolio.');

insert into public.blog_posts (slug, title, excerpt, category, cover_url, read_minutes, is_featured, published_at) values
  ('ultimate-guide-to-building-a-skincare-routine', 'The Ultimate Guide to Building a Skincare Routine', 'Not sure where to start? We break down the essentials — from cleansing to SPF — so you can build a routine that actually works for your skin type.', 'SKINCARE TIPS', '/images/routine-flatlay.svg', 5, true, '2024-12-15'),
  ('why-vitamin-c-should-be-in-your-routine', 'Why Vitamin C Should Be in Your Routine', 'Discover the science behind this powerhouse ingredient and how it can transform your skin''s brightness and...', 'INGREDIENTS', '/images/treatment-model.svg', 4, false, '2024-12-10'),
  ('how-to-layer-your-skincare-products', 'How to Layer Your Skincare Products', 'The order you apply your products matters. Learn the right sequence for maximum absorption and results.', 'SKINCARE TIPS', '/images/about-botanical.svg', 3, false, '2024-12-05'),
  ('understanding-your-skin-type', 'Understanding Your Skin Type', 'Oily, dry, combination, or sensitive? Knowing your skin type is the first step to finding the right products.', 'EDUCATION', '/images/hero-model.svg', 6, false, '2024-11-28');
