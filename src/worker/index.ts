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
  type Inspiration
} from "@/shared/types";

const app = new Hono<{ Bindings: Env }>();

app.use("*", cors());

// Projects endpoints
app.post("/api/projects", async (c) => {
  try {
    const body = await c.req.json();
    const data = CreateProjectRequestSchema.parse(body);
    
    const slug = nanoid(12);
    const now = new Date().toISOString();
    
    const project = {
      id: Date.now(), // In production, use proper ID generation
      slug,
      site_type: data.siteType,
      language: data.language,
      status: 'draft',
      created_at: now,
      updated_at: now
    };

    // Insert into database
    const insertSql = `
      INSERT INTO projects (slug, site_type, language, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    await c.env.DB.prepare(insertSql)
      .bind(slug, data.siteType, data.language, 'draft', now, now)
      .run();

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
    const params: any[] = [now];
    
    if (data.deepAnswers !== undefined) {
      updateSql += ", deep_answers = ?";
      params.push(data.deepAnswers);
    }
    
    if (data.selectedInspirations !== undefined) {
      updateSql += ", selected_inspirations = ?";
      params.push(JSON.stringify(data.selectedInspirations));
    }
    
    if (data.status !== undefined) {
      updateSql += ", status = ?";
      params.push(data.status);
    }
    
    updateSql += " WHERE id = ?";
    params.push(projectId);
    
    await c.env.DB.prepare(updateSql).bind(...params).run();
    
    return c.json({ success: true });
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
    
    // Parse JSON fields
    const project = {
      ...result,
      structuredProfile: result.structured_profile ? JSON.parse(result.structured_profile as string) : null,
      selectedInspirations: result.selected_inspirations ? JSON.parse(result.selected_inspirations as string) : null,
      generatedImages: result.generated_images ? JSON.parse(result.generated_images as string) : null,
    };
    
    return c.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return c.json({ error: 'Failed to fetch project' }, 500);
  }
});

// Analysis endpoint
app.post("/api/analyze", async (c) => {
  try {
    const body = await c.req.json();
    const data = AnalyzeRequestSchema.parse(body);
    
    const genAI = new GoogleGenerativeAI((c.env as any).GOOGLE_AI_API_KEY);
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
    const genAI = new GoogleGenerativeAI((c.env as any).GOOGLE_AI_API_KEY);
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
    const generatedImages: any[] = [];
    
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
        profile.sections.slice(0, 4).forEach((section: any, index: number) => {
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
        profile.sections.slice(0, 4).forEach((section: any, index: number) => {
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
async function selectContextualImages(profile: any, isPersonal: boolean) {
  const imageCollections = {
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

  // Analyze style from profile
  const tone = profile.tone?.toLowerCase() || '';
  let style = 'modern';
  
  if (tone.includes('minimal') || tone.includes('épuré')) style = 'minimal';
  else if (tone.includes('creative') || tone.includes('créatif')) style = 'creative';
  else if (tone.includes('corporate') || tone.includes('professionnel')) style = 'corporate';

  const category = isPersonal ? 'personal' : 'business';
  const selectedCollection = (imageCollections as any)[category][style] || (imageCollections as any)[category].modern;

  return {
    overview: selectedCollection[0],
    sections: selectedCollection.slice(1)
  };
}

// Helper function to select inspirations from database
async function selectInspirationsFromDatabase(db: any, profile: any): Promise<Inspiration[]> {
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
    const params: any[] = [category];
    
    if (industry) {
      sql += ` AND industry = ?`;
      params.push(industry);
    }
    
    if (style) {
      sql += ` AND style = ?`;
      params.push(style);
    }
    
    sql += ` ORDER BY RANDOM() LIMIT 5`;
    
    const result = await db.prepare(sql).bind(...params).all();
    
    // If we don't have enough specific matches, get some general ones
    if (result.results.length < 3) {
      const generalSql = `SELECT * FROM inspirations WHERE is_active = TRUE AND category = ? ORDER BY RANDOM() LIMIT 5`;
      const generalResult = await db.prepare(generalSql).bind(category).all();
      result.results = generalResult.results;
    }
    
    // Transform database results to Inspiration format
    const inspirations: Inspiration[] = result.results.map((row: any) => ({
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

function generateJustification(inspiration: any, profile: any): string {
  const lang = profile.lang || 'fr';
  
  if (lang === 'fr') {
    return `${inspiration.title} est un excellent exemple de ${inspiration.style || 'design moderne'} qui correspond à votre vision ${profile.tone || 'professionnelle'}. ${inspiration.description || 'Interface parfaitement adaptée à votre secteur.'} ${inspiration.features || 'Design optimisé pour l\'expérience utilisateur.'}`;
  } else {
    return `${inspiration.title} is an excellent example of ${inspiration.style || 'modern design'} that matches your ${profile.tone || 'professional'} vision. ${inspiration.description || 'Interface perfectly suited to your industry.'} ${inspiration.features || 'Design optimized for user experience.'}`;
  }
}

export default app;
