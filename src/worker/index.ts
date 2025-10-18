import { Hono } from "hono";
import { cors } from "hono/cors";
import { nanoid } from "nanoid";
import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  CreateProjectRequestSchema,
  UpdateProjectRequestSchema,
  AnalyzeRequestSchema,
  InspirationsRequestSchema,
  GenerateImagesRequestSchema,
  type Inspiration,
  type Project,
  type GeneratedImage,
  type StructuredProfile,
  type Section
} from "@/shared/types";

type D1Meta = {
  duration?: number;
  changes?: number;
  last_row_id: number;
};

type D1Result<T = unknown> = {
  success: boolean;
  results?: T[];
  meta: D1Meta;
};

type D1PreparedStatement<T = unknown> = {
  bind(...values: (string | number | null)[]): D1PreparedStatement<T>;
  first<R = T>(): Promise<R | null>;
  run(): Promise<D1Result<T>>;
  all<R = T>(): Promise<D1Result<R>>;
};

type D1Database = {
  prepare<T = unknown>(query: string): D1PreparedStatement<T>;
};

type Env = {
  DB: D1Database;
  GOOGLE_AI_API_KEY: string;
};

type DbProjectRow = {
  id: number;
  slug: string;
  site_type: string;
  deep_answers: string | null;
  structured_profile: string | null;
  selected_inspirations: string | null;
  generated_images: string | null;
  language: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const mapProjectFromRow = (row: DbProjectRow): Project => {
  return {
    id: Number(row.id),
    slug: row.slug,
    siteType: row.site_type as Project["siteType"],
    deepAnswers: row.deep_answers ?? null,
    structuredProfile: row.structured_profile
      ? JSON.parse(row.structured_profile)
      : null,
    selectedInspirations: row.selected_inspirations
      ? JSON.parse(row.selected_inspirations)
      : null,
    generatedImages: row.generated_images
      ? JSON.parse(row.generated_images)
      : null,
    language: row.language as Project["language"],
    status: row.status as Project["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Projects endpoints
app.post("/api/projects", async (c) => {
  try {
    const body = await c.req.json();
    const data = CreateProjectRequestSchema.parse(body);
    
    const slug = nanoid(12);
    const now = new Date().toISOString();
    
    // Insert into database
    const insertSql = `
      INSERT INTO projects (
        slug,
        site_type,
        language,
        status,
        created_at,
        updated_at,
        deep_answers,
        structured_profile,
        selected_inspirations,
        generated_images
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const insertResult = await c.env.DB.prepare(insertSql)
      .bind(slug, data.siteType, data.language, 'draft', now, now)
      .run();

    const projectId = insertResult.meta?.last_row_id;

    const project = {
      id: projectId ?? Date.now(),
      slug,
      siteType: data.siteType,
      language: data.language,
      status: 'draft' as const,
      createdAt: now,
      updatedAt: now,
    };

    return c.json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    return c.json({ error: 'Failed to create project' }, 500);
  }
});

app.patch("/api/projects/:id", async (c) => {
  try {
    const projectId = c.req.param("id");
    const body = await c.req.json();
    const data = UpdateProjectRequestSchema.parse(body);
    
    const now = new Date().toISOString();
    
    let updateSql = "UPDATE projects SET updated_at = ?";
    const params: (string | null)[] = [now];

    if (data.deepAnswers !== undefined) {
      updateSql += ", deep_answers = ?";
      params.push(data.deepAnswers ?? null);
    }
    
    if (data.structuredProfile !== undefined) {
      updateSql += ", structured_profile = ?";
      const structuredProfileValue = typeof data.structuredProfile === "string"
        ? data.structuredProfile
        : JSON.stringify(data.structuredProfile);
      params.push(structuredProfileValue);
    }

    if (data.selectedInspirations !== undefined) {
      updateSql += ", selected_inspirations = ?";
      params.push(
        data.selectedInspirations ? JSON.stringify(data.selectedInspirations) : null
      );
    }

    if (data.generatedImages !== undefined) {
      updateSql += ", generated_images = ?";
      params.push(JSON.stringify(data.generatedImages));
    }
    
    if (data.status !== undefined) {
      updateSql += ", status = ?";
      params.push(data.status);
    }

    updateSql += " WHERE id = ?";
    params.push(projectId);

    await c.env.DB.prepare(updateSql).bind(...params).run();

    const updatedRow = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ?"
    )
      .bind(projectId)
      .first<DbProjectRow>();

    if (!updatedRow) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json(mapProjectFromRow(updatedRow));
  } catch (error) {
    console.error('Error updating project:', error);
    return c.json({ error: 'Failed to update project' }, 500);
  }
});

app.get("/api/projects/:slug", async (c) => {
  try {
    const slug = c.req.param("slug");

    const result = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE slug = ?"
    ).bind(slug).first();

    if (!result) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Parse JSON fields and normalize casing
    const project = {
      id: result.id,
      slug: result.slug,
      siteType: result.site_type,
      deepAnswers: result.deep_answers ?? undefined,
      structuredProfile: result.structured_profile ? JSON.parse(result.structured_profile as string) : undefined,
      selectedInspirations: result.selected_inspirations ? JSON.parse(result.selected_inspirations as string) : undefined,
      generatedImages: result.generated_images ? JSON.parse(result.generated_images as string) : undefined,
      language: result.language,
      status: result.status,
      createdAt: result.created_at,
      updatedAt: result.updated_at,
    };

    return c.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return c.json({ error: 'Failed to fetch project' }, 500);
  }
});

app.get("/api/projects/by-id/:id", async (c) => {
  try {
    const projectId = c.req.param("id");

    const result = await c.env.DB.prepare(
      "SELECT * FROM projects WHERE id = ?"
    ).bind(projectId).first<DbProjectRow>();

    if (!result) {
      return c.json({ error: 'Project not found' }, 404);
    }

    return c.json(mapProjectFromRow(result));
  } catch (error) {
    console.error('Error fetching project by id:', error);
    return c.json({ error: 'Failed to fetch project' }, 500);
  }
});

// Analysis endpoint
app.post("/api/analyze", async (c) => {
  try {
    const body = await c.req.json();
    const data = AnalyzeRequestSchema.parse(body);
    
    const genAI = new GoogleGenerativeAI(c.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `
Analyze the following user input and generate a structured profile for a ${data.siteType} website in ${data.language === 'fr' ? 'French' : 'English'}.

User input: "${data.deepAnswers}"

Generate a comprehensive website profile including:
- Appropriate site name based on the business/personal nature
- Compelling tagline
- Design tone and visual ambience
- Color palette that matches the industry/style
- Recommended sections with detailed content plans
- Media hints for each section (photos, illustrations, etc.)

Return a JSON object with the following structure:
{
  "siteName": "string - suggested site name based on user description",
  "tagline": "string - compelling tagline that captures essence",
  "description": "string - brief professional description",
  "tone": "string - design tone (modern, professional, playful, elegant, etc.)",
  "ambience": "string - detailed visual ambience description",
  "primaryGoal": "string - main goal of the website",
  "keyHighlights": ["3-5 key", "selling points", "or highlights"],
  "recommendedCTA": "string - compelling call to action text",
  "colors": ["primary #hex", "secondary #hex", "accent #hex"] - professional color palette,
  "sections": [
    {
      "id": "hero|about|services|work|testimonials|contact",
      "title": "section title in appropriate language",
      "content": "detailed description of section content and purpose",
      "mediaHint": "specific type of media/imagery needed for this section"
    }
  ],
  "lang": "${data.language}"
}

Respond with only the JSON object, no additional text.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up the response to extract JSON
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : text;
    
    const structuredProfile = JSON.parse(jsonText);
    return c.json(structuredProfile);
    
  } catch (error) {
    console.error('Error analyzing input:', error);
    return c.json({ error: 'Failed to analyze input' }, 500);
  }
});

// Inspirations endpoint
app.post("/api/inspirations", async (c) => {
  try {
    const body = await c.req.json();
    const data = InspirationsRequestSchema.parse(body);
    
    const profile = data.structuredProfile;
    
    // Use our curated database of real inspirations
    const inspirations = await selectInspirationsFromDatabase(c.env.DB, profile);
    
    if (inspirations.length >= 5) {
      return c.json(inspirations.slice(0, 5));
    }
    
    // If we don't have enough from database, supplement with AI-generated ones
    const genAI = new GoogleGenerativeAI(c.env.GOOGLE_AI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const isPersonal = profile.siteName?.toLowerCase().includes('portfolio') || profile.tone?.includes('personal');
    
    const prompt = `
Based on this website profile, generate ${5 - inspirations.length} additional realistic website inspirations:

Profile: ${JSON.stringify(profile, null, 2)}

Generate inspirations as a JSON array matching this structure:
[
  {
    "id": "unique_id",
    "title": "Realistic website title based on profile",
    "domain": "realistic-domain.com",
    "image": "https://images.unsplash.com/appropriate-image-url?w=400&h=300&fit=crop",
    "justification": "Specific reason why this inspiration matches the profile (in ${profile.lang === 'fr' ? 'French' : 'English'})"
  }
]

Requirements:
- Match the tone: ${profile.tone}
- Match the ambience: ${profile.ambience}
- Align with the primary goal: ${profile.primaryGoal}
- Consider the industry/type: ${isPersonal ? 'personal/portfolio' : 'business/commercial'}
- Use high-quality Unsplash images with proper parameters
- Provide specific, contextual justifications in ${profile.lang === 'fr' ? 'French' : 'English'}

Respond with only the JSON array, no additional text.
`;

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;
      
      const aiInspirations: Inspiration[] = JSON.parse(jsonText);
      const combinedInspirations = [...inspirations, ...aiInspirations].slice(0, 5);
      
      return c.json(combinedInspirations);
    } catch (parseError) {
      console.error('Error parsing AI inspirations, using database only:', parseError);
      return c.json(inspirations.slice(0, 5));
    }
    
  } catch (error) {
    console.error('Error fetching inspirations:', error);
    return c.json({ error: 'Failed to fetch inspirations' }, 500);
  }
});

// Image generation endpoint
app.post("/api/generate", async (c) => {
  try {
    const body = await c.req.json();
    const data = GenerateImagesRequestSchema.parse(body);

    // Generate sophisticated contextual images based on profile analysis
    const generatedImages: GeneratedImage[] = [];
    
    const profile = data.structuredProfile;
    const isPersonal = profile.siteName?.toLowerCase().includes('portfolio') || 
                      profile.tone?.includes('personal') ||
                      profile.primaryGoal?.toLowerCase().includes('portfolio');
    
    // Generate overview image with sophisticated selection
    try {
      // Use curated high-quality images with intelligent selection based on profile
      const contextualImages = await selectContextualImages(profile, isPersonal);
      
      generatedImages.push({
        id: 'overview',
        type: 'overview',
        url: contextualImages.overview,
        filename: 'site-overview.png'
      });

      // Generate section images
      if (profile.sections && profile.sections.length > 0) {
        profile.sections.slice(0, 4).forEach((section: Section, index: number) => {
          generatedImages.push({
            id: section.id,
            type: 'section',
            sectionId: section.id,
            url: contextualImages.sections[index] || contextualImages.sections[0],
            filename: `${section.id}-section.png`
          });
        });
      }

    } catch (imageError) {
      console.error('Image generation error:', imageError);
      // Fallback to curated selection
      const fallbackImages = await selectContextualImages(profile, isPersonal);
      
      generatedImages.push({
        id: 'overview',
        type: 'overview',
        url: fallbackImages.overview,
        filename: 'site-overview.png'
      });

      if (profile.sections) {
        profile.sections.slice(0, 4).forEach((section: Section, index: number) => {
          generatedImages.push({
            id: section.id,
            type: 'section',
            sectionId: section.id,
            url: fallbackImages.sections[index] || fallbackImages.sections[0],
            filename: `${section.id}-section.png`
          });
        });
      }
    }
    
    return c.json(generatedImages);
  } catch (error) {
    console.error('Error generating images:', error);
    return c.json({ error: 'Failed to generate images' }, 500);
  }
});

// Smart contextual image selection based on profile analysis
type ContextualCollections = Record<string, string[]>;

async function selectContextualImages(
  profile: StructuredProfile,
  isPersonal: boolean
): Promise<{ overview: string; sections: string[] }> {
  const imageCollections: Record<'personal' | 'business', ContextualCollections> = {
    personal: {
      creative: [
        'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1571171637578-41bc2dd41cd2?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=800&h=400&fit=crop&auto=format&q=80'
      ],
      minimal: [
        'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop&auto=format&q=80'
      ],
      modern: [
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&h=400&fit=crop&auto=format&q=80'
      ]
    },
    business: {
      corporate: [
        'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&h=400&fit=crop&auto=format&q=80'
      ],
      modern: [
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop&auto=format&q=80'
      ],
      minimal: [
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=600&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop&auto=format&q=80',
        'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop&auto=format&q=80'
      ]
    }
  };

  const tone = profile.tone?.toLowerCase() ?? '';
  let style = 'modern';

  if (tone.includes('minimal') || tone.includes('épuré')) {
    style = 'minimal';
  } else if (tone.includes('creative') || tone.includes('créatif')) {
    style = 'creative';
  } else if (tone.includes('corporate') || tone.includes('professionnel')) {
    style = 'corporate';
  }

  const category: 'personal' | 'business' = isPersonal ? 'personal' : 'business';
  const categoryCollections = imageCollections[category];
  const selectedCollection =
    categoryCollections[style] ?? categoryCollections.modern;

  return {
    overview: selectedCollection[0],
    sections: selectedCollection.slice(1)
  };
}

// Helper function to select inspirations from database
type InspirationRow = {
  id: number;
  title: string;
  domain: string;
  image_url: string;
  style?: string | null;
  description?: string | null;
  features?: string | null;
};

async function selectInspirationsFromDatabase(
  db: D1Database,
  profile: StructuredProfile
): Promise<Inspiration[]> {
  try {
    // Analyze profile to determine best matching inspirations
    const isPersonal = profile.siteName?.toLowerCase().includes('portfolio') ||
                      profile.tone?.includes('personal') ||
                      profile.primaryGoal?.toLowerCase().includes('portfolio');
    
    const category = isPersonal ? 'personal' : 'business';
    
    // Determine industry from profile
    let industry = '';
    const description = profile.description?.toLowerCase() || '';
    
    if (description.includes('tech') || description.includes('software') || description.includes('digital')) {
      industry = 'tech';
    } else if (description.includes('design') || description.includes('creative') || description.includes('art')) {
      industry = 'design';
    } else if (description.includes('consulting') || description.includes('conseil')) {
      industry = 'consulting';
    } else if (description.includes('restaurant') || description.includes('food')) {
      industry = 'food';
    } else if (description.includes('shop') || description.includes('boutique') || description.includes('commerce')) {
      industry = 'ecommerce';
    } else if (description.includes('health') || description.includes('wellness') || description.includes('fitness')) {
      industry = 'wellness';
    } else if (description.includes('photo')) {
      industry = 'photography';
    } else if (description.includes('agency') || description.includes('agence')) {
      industry = 'agency';
    }
    
    // Determine style from profile
    let style = '';
    const tone = profile.tone?.toLowerCase() || '';
    const ambience = profile.ambience?.toLowerCase() || '';
    
    if (tone.includes('minimal') || ambience.includes('épuré') || ambience.includes('minimal')) {
      style = 'minimal';
    } else if (tone.includes('creative') || tone.includes('artistic') || ambience.includes('créatif')) {
      style = 'creative';
    } else if (tone.includes('corporate') || ambience.includes('corporate')) {
      style = 'corporate';
    } else if (tone.includes('modern') || tone.includes('moderne')) {
      style = 'modern';
    } else if (tone.includes('elegant') || tone.includes('élégant')) {
      style = 'sophisticated';
    }
    
    // Build query based on analysis
    let sql = `SELECT * FROM inspirations WHERE is_active = TRUE AND category = ?`;
    const params: string[] = [category];
    
    if (industry) {
      sql += ` AND industry = ?`;
      params.push(industry);
    }
    
    if (style) {
      sql += ` AND style = ?`;
      params.push(style);
    }
    
    sql += ` ORDER BY RANDOM() LIMIT 5`;
    
    const result = await db.prepare<InspirationRow>(sql).bind(...params).all();
    let rows = result.results ?? [];

    if (rows.length < 3) {
      const generalSql = `SELECT * FROM inspirations WHERE is_active = TRUE AND category = ? ORDER BY RANDOM() LIMIT 5`;
      const generalResult = await db
        .prepare<InspirationRow>(generalSql)
        .bind(category)
        .all();
      rows = generalResult.results ?? rows;
    }

    const inspirations: Inspiration[] = rows.map((row) => ({
      id: `db_${row.id}`,
      title: row.title,
      domain: row.domain,
      image: row.image_url,
      justification: generateJustification(row, profile)
    }));

    return inspirations;
  } catch (error) {
    console.error('Error selecting inspirations from database:', error);
    return [];
  }
}

function generateJustification(
  inspiration: InspirationRow,
  profile: StructuredProfile
): string {
  const lang = profile.lang || 'fr';
  
  if (lang === 'fr') {
    return `${inspiration.title} est un excellent exemple de ${inspiration.style || 'design moderne'} qui correspond à votre vision ${profile.tone || 'professionnelle'}. ${inspiration.description || 'Interface parfaitement adaptée à votre secteur.'} ${inspiration.features || 'Design optimisé pour l\'expérience utilisateur.'}`;
  } else {
    return `${inspiration.title} is an excellent example of ${inspiration.style || 'modern design'} that matches your ${profile.tone || 'professional'} vision. ${inspiration.description || 'Interface perfectly suited to your industry.'} ${inspiration.features || 'Design optimized for user experience.'}`;
  }
}

export default app;
