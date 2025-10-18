
CREATE TABLE projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  site_type TEXT NOT NULL, -- 'personal' or 'business'
  deep_answers TEXT,
  structured_profile TEXT, -- JSON
  selected_inspirations TEXT, -- JSON array
  generated_images TEXT, -- JSON array of image URLs
  language TEXT NOT NULL DEFAULT 'fr', -- 'fr' or 'en'
  status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'completed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_status ON projects(status);
