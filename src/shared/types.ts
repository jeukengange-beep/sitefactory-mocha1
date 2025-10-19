import z from "zod";

export const SiteTypeSchema = z.enum(["personal", "business"]);
export type SiteType = z.infer<typeof SiteTypeSchema>;

export const LanguageSchema = z.enum(["fr", "en"]);
export type Language = z.infer<typeof LanguageSchema>;

export const InspirationSchema = z.object({
  id: z.string(),
  title: z.string(),
  domain: z.string(),
  image: z.string(),
  justification: z.string(),
});
export type Inspiration = z.infer<typeof InspirationSchema>;

export const SectionSchema = z.object({
  id: z.enum(["hero", "about", "services", "work", "testimonials", "contact"]).or(z.string()),
  title: z.string().optional(),
  content: z.union([z.string(), z.array(z.string())]).optional(),
  mediaHint: z.string().optional(),
});
export type Section = z.infer<typeof SectionSchema>;

export const StructuredProfileSchema = z.object({
  siteName: z.string(),
  tagline: z.string(),
  description: z.string(),
  tone: z.string(),
  ambience: z.string(),
  primaryGoal: z.string(),
  keyHighlights: z.array(z.string()),
  recommendedCTA: z.string(),
  colors: z.array(z.string()),
  sections: z.array(SectionSchema).optional(),
  lang: LanguageSchema,
});
export type StructuredProfile = z.infer<typeof StructuredProfileSchema>;

export const GeneratedImageSchema = z.object({
  id: z.string(),
  type: z.enum(["overview", "section"]),
  sectionId: z.string().optional(),
  url: z.string(),
  filename: z.string(),
});
export type GeneratedImage = z.infer<typeof GeneratedImageSchema>;

export const ProjectSchema = z.object({
  id: z.number(),
  slug: z.string(),
  siteType: SiteTypeSchema,
  deepAnswers: z.string().nullable(),
  structuredProfile: StructuredProfileSchema.nullable(),
  selectedInspirations: z.array(InspirationSchema).nullable(),
  generatedImages: z.array(GeneratedImageSchema).nullable(),
  language: LanguageSchema,
  status: z.enum(["draft", "completed"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

export type StoredProject = Project & {
  /**
   * Marks projects that were created locally when the backend was unavailable.
   * These drafts should skip server persistence until a real record exists.
   */
  isLocalDraft?: boolean;
};

// API Request/Response schemas
export const CreateProjectRequestSchema = z.object({
  siteType: SiteTypeSchema,
  language: LanguageSchema,
});
export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

export const UpdateProjectRequestSchema = z.object({
  deepAnswers: z.string().optional(),
  structuredProfile: StructuredProfileSchema.optional(),
  selectedInspirations: z.array(InspirationSchema).optional(),
  generatedImages: z.array(GeneratedImageSchema).optional(),
  status: z.enum(["draft", "completed"]).optional(),
});
export type UpdateProjectRequest = z.infer<typeof UpdateProjectRequestSchema>;

export const AnalyzeRequestSchema = z.object({
  deepAnswers: z.string(),
  siteType: SiteTypeSchema,
  language: LanguageSchema,
});
export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;

export const InspirationsRequestSchema = z.object({
  structuredProfile: StructuredProfileSchema,
});
export type InspirationsRequest = z.infer<typeof InspirationsRequestSchema>;

export const GenerateImagesRequestSchema = z.object({
  structuredProfile: StructuredProfileSchema,
  selectedInspirations: z.array(InspirationSchema).optional(),
});
export type GenerateImagesRequest = z.infer<typeof GenerateImagesRequestSchema>;
