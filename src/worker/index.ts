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
  type StructuredProfile,
  type AnalyzeRequest
} from "@/shared/types";
import { GoogleImageGeneration } from "./imageGeneration";

type WorkerBindings = {
  GOOGLE_AI_API_KEY?: string;
  DB: any;
  R2_BUCKET: any;
};

type GenerativeModel = ReturnType<GoogleGenerativeAI["getGenerativeModel"]>;
const imageGenerationService = new GoogleImageGeneration();

const app = new Hono<{ Bindings: WorkerBindings }>();

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
    
    const model = getGenerativeModel(c.env);

    if (!model) {
      return c.json(generateFallbackStructuredProfile(data));
    }
    
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

    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Clean up the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;

      const structuredProfile = JSON.parse(jsonText);
      return c.json(structuredProfile);
    } catch (modelError) {
      console.error('Error analyzing input with AI, using fallback:', modelError);
      return c.json(generateFallbackStructuredProfile(data));
    }
    
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
    let inspirations = await selectInspirationsFromDatabase(c.env.DB, profile);

    const remaining = Math.max(0, 5 - inspirations.length);

    if (remaining === 0) {
      return c.json(inspirations.slice(0, 5));
    }

    const model = getGenerativeModel(c.env);

    if (!model) {
      const fallbackInspirations = generateFallbackInspirations(profile, remaining);
      return c.json([...inspirations, ...fallbackInspirations].slice(0, 5));
    }

    const isPersonal = profile.siteName?.toLowerCase().includes('portfolio') || profile.tone?.includes('personal');

    const prompt = `
Based on this website profile, generate ${remaining} additional realistic website inspirations:

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
      inspirations = [...inspirations, ...aiInspirations];
    } catch (parseError) {
      console.error('Error generating AI inspirations, using fallback:', parseError);
      const fallbackInspirations = generateFallbackInspirations(profile, remaining);
      inspirations = [...inspirations, ...fallbackInspirations];
    }

    return c.json(inspirations.slice(0, 5));
    
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

    const generatedImages = await imageGenerationService.generateImages(
      data.structuredProfile,
      data.selectedInspirations ?? []
    );

    return c.json(generatedImages);
  } catch (error) {
    console.error('Error generating images:', error);
    return c.json({ error: 'Failed to generate images' }, 500);
  }
});

function getGenerativeModel(env: WorkerBindings): GenerativeModel | null {
  const apiKey = env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    console.warn('GOOGLE_AI_API_KEY is not set. Falling back to deterministic responses.');
    return null;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  } catch (error) {
    console.error('Failed to initialise GoogleGenerativeAI:', error);
    return null;
  }
}

function generateFallbackStructuredProfile(request: AnalyzeRequest): StructuredProfile {
  const isFrench = request.language === 'fr';
  const isPersonal = request.siteType === 'personal';
  const summary = request.deepAnswers.split(/\n+/).map((line) => line.trim()).find(Boolean) || '';
  const description = request.deepAnswers.trim() || (isFrench ? 'Décrivez votre projet ici.' : 'Describe your project here.');

  const siteName = isPersonal
    ? (isFrench ? 'Portfolio Signature' : 'Signature Portfolio')
    : (isFrench ? 'Agence Moderne' : 'Modern Agency');

  const tone = isPersonal
    ? (isFrench ? 'Créatif et authentique' : 'Creative and authentic')
    : (isFrench ? 'Professionnel et moderne' : 'Professional and modern');

  const ambience = isPersonal
    ? (isFrench ? 'Ambiance visuelle chaleureuse et immersive' : 'Warm and immersive visual atmosphere')
    : (isFrench ? 'Ambiance visuelle nette et confiante' : 'Clean and confident visual atmosphere');

  const primaryGoal = isPersonal
    ? (isFrench ? 'Mettre en valeur votre parcours et vos réalisations' : 'Highlight your background and work')
    : (isFrench ? 'Présenter clairement votre offre et générer des opportunités' : 'Present your offering clearly and generate opportunities');

  const keyHighlights = isFrench
    ? [
        'Structure générée automatiquement pour démarrer rapidement.',
        isPersonal ? 'Met en avant votre personnalité et votre histoire.' : 'Renforce la crédibilité auprès de vos clients.',
        'Sections pensées pour convertir les visiteurs.'
      ]
    : [
        'Auto-generated structure to help you start quickly.',
        isPersonal ? 'Highlights your personality and story.' : 'Builds credibility with your clients.',
        'Sections designed to convert visitors.'
      ];

  const recommendedCTA = isPersonal
    ? (isFrench ? 'Découvrir mon travail' : 'Explore my work')
    : (isFrench ? 'Discuter de votre projet' : 'Discuss your project');

  const colors = isPersonal
    ? ['#A855F7', '#1E293B', '#F472B6']
    : ['#1D4ED8', '#0F172A', '#FACC15'];

  const sections: StructuredProfile['sections'] = isPersonal
    ? [
        {
          id: 'hero',
          title: isFrench ? 'Accueil' : 'Hero',
          content: isFrench
            ? `Introduction concise mettant en avant ${summary || 'votre proposition de valeur'}.`
            : `Concise introduction that highlights ${summary || 'your key value proposition'}.`,
          mediaHint: isFrench ? 'Portrait ou scène de travail créative' : 'Portrait or creative working scene'
        },
        {
          id: 'about',
          title: isFrench ? 'À propos' : 'About',
          content: isFrench
            ? 'Racontez votre histoire, votre parcours et ce qui vous rend unique.'
            : 'Share your story, background, and what sets you apart.',
          mediaHint: isFrench ? 'Photos lifestyle ou espace de travail' : 'Lifestyle or workspace photography'
        },
        {
          id: 'work',
          title: isFrench ? 'Réalisations' : 'Work',
          content: isFrench
            ? 'Présentez vos projets phares avec un résumé de leur impact.'
            : 'Showcase flagship projects with a short impact summary.',
          mediaHint: isFrench ? 'Vignettes de projets ou maquettes visuelles' : 'Project thumbnails or visual mockups'
        },
        {
          id: 'services',
          title: isFrench ? 'Offre' : 'Services',
          content: isFrench
            ? 'Décrivez clairement les services ou prestations que vous proposez.'
            : 'Clearly describe the services or offerings you provide.',
          mediaHint: isFrench ? 'Icônes personnalisées ou visuels abstraits' : 'Custom icons or abstract visuals'
        },
        {
          id: 'contact',
          title: isFrench ? 'Contact' : 'Contact',
          content: isFrench
            ? 'Invitez les visiteurs à vous contacter via un formulaire simple ou un lien direct.'
            : 'Invite visitors to contact you through a form or direct link.',
          mediaHint: isFrench ? 'Visuel d’interface épuré' : 'Clean interface visual'
        }
      ]
    : [
        {
          id: 'hero',
          title: isFrench ? 'Accueil' : 'Hero',
          content: isFrench
            ? `Positionnez clairement votre offre et votre bénéfice clé pour les clients.`
            : 'Position your offer and the key benefit for clients clearly.',
          mediaHint: isFrench ? 'Image d’équipe ou bureau professionnel' : 'Team or professional office imagery'
        },
        {
          id: 'services',
          title: isFrench ? 'Services' : 'Services',
          content: isFrench
            ? 'Présentez vos services phares avec une courte description orientée résultats.'
            : 'Present your core services with a results-oriented description.',
          mediaHint: isFrench ? 'Illustrations de service ou icônes premium' : 'Service illustrations or premium icons'
        },
        {
          id: 'about',
          title: isFrench ? 'Notre approche' : 'Our Approach',
          content: isFrench
            ? 'Expliquez votre méthodologie, votre expérience et les preuves de confiance.'
            : 'Explain your methodology, experience, and trust indicators.',
          mediaHint: isFrench ? 'Photos d’équipe ou process visuels' : 'Team photography or process visuals'
        },
        {
          id: 'testimonials',
          title: isFrench ? 'Témoignages' : 'Testimonials',
          content: isFrench
            ? 'Ajoutez des avis clients ou des chiffres clés pour rassurer.'
            : 'Add client quotes or key figures to reassure prospects.',
          mediaHint: isFrench ? 'Portraits clients ou citations stylisées' : 'Client portraits or stylised quotes'
        },
        {
          id: 'contact',
          title: isFrench ? 'Contact' : 'Contact',
          content: isFrench
            ? 'Offrez un formulaire rapide ou un lien de prise de rendez-vous.'
            : 'Provide a quick form or scheduling link.',
          mediaHint: isFrench ? 'Interface claire et rassurante' : 'Clear, trustworthy interface imagery'
        }
      ];

  return {
    siteName,
    tagline: isPersonal
      ? (isFrench ? 'Créez une présence en ligne mémorable' : 'Craft a memorable online presence')
      : (isFrench ? 'Accélérez la croissance de votre activité' : 'Accelerate your business growth'),
    description,
    tone,
    ambience,
    primaryGoal,
    keyHighlights,
    recommendedCTA,
    colors,
    sections,
    lang: request.language,
  };
}

function generateFallbackInspirations(profile: StructuredProfile, count: number): Inspiration[] {
  const isFrench = profile.lang === 'fr';
  const toneDescriptor = profile.tone?.toLowerCase() || (isFrench ? 'moderne' : 'modern');
  const ambienceDescriptor = profile.ambience?.toLowerCase() || (isFrench ? 'immersive' : 'immersive');
  const primaryColor = profile.colors?.[0];
  const colorSnippet = primaryColor ? (isFrench ? ` autour de ${primaryColor}` : ` around ${primaryColor}`) : '';

  const personalTemplates = [
    {
      title: isFrench ? 'Studio Créatif Horizon' : 'Horizon Creative Studio',
      domain: isFrench ? 'studio-horizon.fr' : 'horizon-studio.com',
      image: 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&h=400&fit=crop&auto=format&q=80'
    },
    {
      title: isFrench ? 'Portfolio Nouvelle Vague' : 'New Wave Portfolio',
      domain: isFrench ? 'portfolio-nouvellevague.com' : 'newwave-portfolio.com',
      image: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=800&h=400&fit=crop&auto=format&q=80'
    },
    {
      title: isFrench ? 'Atelier Signature' : 'Signature Atelier',
      domain: isFrench ? 'atelier-signature.fr' : 'signature-atelier.com',
      image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=800&h=400&fit=crop&auto=format&q=80'
    }
  ];

  const businessTemplates = [
    {
      title: isFrench ? 'Agence Nova Impact' : 'Nova Impact Agency',
      domain: isFrench ? 'nova-impact.fr' : 'novaimpact.agency',
      image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=800&h=400&fit=crop&auto=format&q=80'
    },
    {
      title: isFrench ? 'Cabinet Stratège' : 'Strategist Collective',
      domain: isFrench ? 'cabinet-stratege.com' : 'strategist-collective.com',
      image: 'https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?w=800&h=400&fit=crop&auto=format&q=80'
    },
    {
      title: isFrench ? 'Solutions Altitude' : 'Altitude Solutions',
      domain: isFrench ? 'solutions-altitude.com' : 'altitude-solutions.co',
      image: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop&auto=format&q=80'
    }
  ];

  const templates = profile.siteName?.toLowerCase().includes('portfolio') || profile.primaryGoal?.toLowerCase().includes('portfolio')
    ? personalTemplates
    : businessTemplates;

  return Array.from({ length: count }, (_, index) => {
    const template = templates[index % templates.length];
    const justification = isFrench
      ? `${template.title} propose un design ${toneDescriptor}${colorSnippet} avec une ambiance ${ambienceDescriptor}, idéal pour prolonger l'univers de ${profile.siteName || 'votre projet'}.`
      : `${template.title} delivers a ${toneDescriptor} look${colorSnippet} with a ${ambienceDescriptor} atmosphere, making it a strong extension of ${profile.siteName || 'your project'}.`;

    return {
      id: `fallback_${index}`,
      title: template.title,
      domain: template.domain,
      image: template.image,
      justification
    };
  });
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
