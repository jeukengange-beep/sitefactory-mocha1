
CREATE TABLE inspirations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  domain TEXT NOT NULL,
  url TEXT NOT NULL,
  image_url TEXT NOT NULL,
  category TEXT NOT NULL,
  industry TEXT,
  style TEXT,
  description TEXT,
  features TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_inspirations_category ON inspirations(category);
CREATE INDEX idx_inspirations_industry ON inspirations(industry);
CREATE INDEX idx_inspirations_style ON inspirations(style);
CREATE INDEX idx_inspirations_active ON inspirations(is_active);

-- Insert curated inspirations database
INSERT INTO inspirations (title, domain, url, image_url, category, industry, style, description, features) VALUES
-- Personal/Portfolio sites
('Robbie Leonardi', 'rleonardi.com', 'https://rleonardi.com', 'https://images.unsplash.com/photo-1558618667-fcc251c78b5e?w=400&h=300&fit=crop', 'personal', 'design', 'creative', 'Portfolio interactif innovant avec narration visuelle', 'Animation, storytelling, UX créative'),
('Brittany Chiang', 'brittanychiang.com', 'https://brittanychiang.com', 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&h=300&fit=crop', 'personal', 'tech', 'minimal', 'Portfolio développeur minimaliste et élégant', 'Navigation fluide, typographie claire'),
('Denis Chandler', 'denisechandler.com', 'https://denisechandler.com', 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=300&fit=crop', 'personal', 'photography', 'artistic', 'Portfolio photographe avec galeries immersives', 'Galerie plein écran, mise en valeur images'),
('Seb Kay', 'sebkay.com', 'https://sebkay.com', 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop', 'personal', 'writing', 'clean', 'Portfolio écrivain avec mise en page magazine', 'Lisibilité optimale, hiérarchie claire'),
('Marie Poulin', 'mariepoulin.com', 'https://mariepoulin.com', 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=300&fit=crop', 'personal', 'consulting', 'modern', 'Portfolio coach business avec branding fort', 'Cohérence visuelle, call-to-actions clairs'),

-- Business/Corporate sites
('Stripe', 'stripe.com', 'https://stripe.com', 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=400&h=300&fit=crop', 'business', 'fintech', 'modern', 'Interface fintech leader avec design système', 'Animations micro, hiérarchie information'),
('Linear', 'linear.app', 'https://linear.app', 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=400&h=300&fit=crop', 'business', 'saas', 'minimal', 'Tool de productivité avec UX exceptionnelle', 'Navigation intuitive, design système cohérent'),
('Notion', 'notion.so', 'https://notion.so', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=300&fit=crop', 'business', 'productivity', 'clean', 'Plateforme workspace avec onboarding fluide', 'Illustrations custom, messaging clair'),
('Figma', 'figma.com', 'https://figma.com', 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=300&fit=crop', 'business', 'design', 'creative', 'Outil design collaboratif avec branding fort', 'Animations engageantes, communauté intégrée'),
('Basecamp', 'basecamp.com', 'https://basecamp.com', 'https://images.unsplash.com/photo-1553484771-cc0d9b8c2b33?w=400&h=300&fit=crop', 'business', 'project-management', 'friendly', 'Gestion projet avec ton humain et accessible', 'Simplicité, clarté du message'),

-- Agency/Studio sites
('Metalab', 'metalab.com', 'https://metalab.com', 'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?w=400&h=300&fit=crop', 'business', 'agency', 'bold', 'Agence design avec portfolio impressionnant', 'Case studies détaillées, animations premium'),
('Fantasy', 'fantasy.co', 'https://fantasy.co', 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=400&h=300&fit=crop', 'business', 'agency', 'artistic', 'Studio créatif avec expériences immersives', 'Interactions uniques, storytelling visuel'),
('Instrument', 'instrument.com', 'https://instrument.com', 'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=400&h=300&fit=crop', 'business', 'agency', 'experimental', 'Agence digitale avec approche avant-gardiste', 'Expérimentations visuelles, culture forte'),
('Pentagram', 'pentagram.com', 'https://pentagram.com', 'https://images.unsplash.com/photo-1541462608143-67571c6738dd?w=400&h=300&fit=crop', 'business', 'design', 'sophisticated', 'Cabinet design légendaire avec heritage riche', 'Élégance, prestige, projets iconiques'),
('IDEO', 'ideo.com', 'https://ideo.com', 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400&h=300&fit=crop', 'business', 'innovation', 'human-centered', 'Cabinet innovation avec approche humaine', 'Méthodes design thinking, impact social'),

-- E-commerce sites
('Allbirds', 'allbirds.com', 'https://allbirds.com', 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=400&h=300&fit=crop', 'business', 'ecommerce', 'sustainable', 'Marque chaussures avec mission environnementale', 'Storytelling produit, valeurs claires'),
('Glossier', 'glossier.com', 'https://glossier.com', 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=400&h=300&fit=crop', 'business', 'beauty', 'minimal', 'Marque beauté avec esthétique Instagram', 'UGC intégré, expérience produit fluide'),
('Patagonia', 'patagonia.com', 'https://patagonia.com', 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop', 'business', 'outdoor', 'authentic', 'Marque outdoor avec engagement environnemental', 'Storytelling mission, authenticité'),
('Away', 'awaytravel.com', 'https://awaytravel.com', 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=400&h=300&fit=crop', 'business', 'travel', 'modern', 'Marque bagages avec expérience premium', 'Lifestyle aspirationnel, design produit'),
('Everlane', 'everlane.com', 'https://everlane.com', 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&h=300&fit=crop', 'business', 'fashion', 'transparent', 'Mode éthique avec transparence prix', 'Transparence processus, esthétique épurée'),

-- Restaurant/Food sites
('The Plant Café', 'theplantcafe.com', 'https://theplantcafe.com', 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop', 'business', 'restaurant', 'organic', 'Restaurant végétarien avec ambiance naturelle', 'Menu intégré, réservation en ligne'),
('Sweetgreen', 'sweetgreen.com', 'https://sweetgreen.com', 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop', 'business', 'food', 'fresh', 'Chaîne salades avec approche locale', 'Commande en ligne, localisation des ingredients'),
('Blue Apron', 'blueapron.com', 'https://blueapron.com', 'https://images.unsplash.com/photo-1556909114-d5ac0c717932?w=400&h=300&fit=crop', 'business', 'food', 'homey', 'Service meal kit avec recettes chef', 'Processus step-by-step, personnalisation'),

-- Health/Wellness sites
('Headspace', 'headspace.com', 'https://headspace.com', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&h=300&fit=crop', 'business', 'wellness', 'calming', 'App méditation avec design apaisant', 'Illustrations custom, progression gamifiée'),
('Calm', 'calm.com', 'https://calm.com', 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&h=300&fit=crop', 'business', 'wellness', 'serene', 'App relaxation avec ambiance zen', 'Palette apaisante, sons intégrés'),
('Peloton', 'onepeloton.com', 'https://onepeloton.com', 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&h=300&fit=crop', 'business', 'fitness', 'energetic', 'Fitness connecté avec communauté forte', 'Contenu communauté, motivation'),

-- Professional Services
('McKinsey', 'mckinsey.com', 'https://mckinsey.com', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop', 'business', 'consulting', 'corporate', 'Cabinet conseil avec autorité expertise', 'Thought leadership, insights sectoriels'),
('Deloitte', 'deloitte.com', 'https://deloitte.com', 'https://images.unsplash.com/photo-1521791136064-7986c2920216?w=400&h=300&fit=crop', 'business', 'consulting', 'professional', 'Conseil avec approche transformation digitale', 'Études de cas, expertise industrie'),

-- Educational sites
('MasterClass', 'masterclass.com', 'https://masterclass.com', 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop', 'business', 'education', 'premium', 'Cours en ligne avec célébrités', 'Vidéo qualité cinéma, storytelling fort'),
('Coursera', 'coursera.org', 'https://coursera.org', 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&h=300&fit=crop', 'business', 'education', 'accessible', 'Plateforme MOOC avec universités prestigieuses', 'Parcours apprentissage, certifications');
