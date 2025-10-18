import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'framer-motion';
import { Download, Share2, MessageCircle, ArrowLeft, Eye } from 'lucide-react';
import type { GeneratedImage, Project, StructuredProfile } from '@/shared/types';
import LanguageSwitch from '@/react-app/components/LanguageSwitch';
import StepIndicator from '@/react-app/components/StepIndicator';
import { persistProjectUpdate } from '@/react-app/utils/projectApi';

const overviewFallbackImage = 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=1200&h=900&fit=crop&auto=format&q=80';
const contextualFallbackImages = [
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200&h=900&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&h=900&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1483478550801-ceba5fe50e8e?w=1200&h=900&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=1200&h=900&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1574169208507-84376144848b?w=1200&h=900&fit=crop&auto=format&q=80',
];

const fallbackSectionIds = ['hero', 'about', 'services', 'work', 'testimonials', 'contact'] as const;

function buildFallbackImages(profile: StructuredProfile | null): GeneratedImage[] {
  const sections = profile?.sections && profile.sections.length > 0
    ? profile.sections
    : fallbackSectionIds.map((id) => ({ id }));

  const fallbackImages: GeneratedImage[] = [
    {
      id: 'overview',
      type: 'overview',
      url: overviewFallbackImage,
      filename: 'site-overview.png',
    },
  ];

  sections.forEach((section, index) => {
    const sectionId = typeof section.id === 'string' ? section.id : `section-${index}`;

    fallbackImages.push({
      id: sectionId,
      type: 'section',
      sectionId,
      url: contextualFallbackImages[index % contextualFallbackImages.length],
      filename: `${sectionId}-section.png`,
    });
  });

  return fallbackImages;
}

export default function Step4() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectSlug, setProjectSlug] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const generateImages = useCallback(async () => {
    if (!projectId) {
      navigate('/new/step1');
      return;
    }

    setIsLoading(true);
    setError(null);

    let currentProject: Project | null = null;

    try {
      const response = await fetch(`/api/projects/by-id/${projectId}`);

      if (!response.ok) {
        throw new Error(`Failed to load project (status ${response.status})`);
      }

      currentProject = await response.json();
      localStorage.setItem('currentProject', JSON.stringify(currentProject));
    } catch (fetchError) {
      console.error('Error loading project for step 4:', fetchError);

      const savedProject = localStorage.getItem('currentProject');
      if (savedProject) {
        try {
          const localProject = JSON.parse(savedProject) as Project;
          if (!localProject.id) {
            localProject.id = Number(projectId);
          }

          currentProject = localProject;
        } catch (parseError) {
          console.error('Unable to parse project from localStorage:', parseError);
        }
      }

      if (!currentProject) {
        setError(
          t('step4.loadError', {
            defaultValue: 'Impossible de récupérer votre projet. Veuillez recommencer.',
          })
        );
        setIsLoading(false);
        return;
      }
    }

    if (!currentProject) {
      setIsLoading(false);
      return;
    }

    const projectData: Project = currentProject;

    setProjectSlug(projectData.slug);

    if (!projectData.structuredProfile) {
      navigate(`/new/step2/${projectId}`);
      return;
    }

    if (projectData.generatedImages && projectData.generatedImages.length > 0) {
      setGeneratedImages(projectData.generatedImages);
      setIsLoading(false);
      return;
    }

    try {
      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredProfile: projectData.structuredProfile,
          selectedInspirations: projectData.selectedInspirations ?? [],
        }),
      });

      if (!generateResponse.ok) {
        throw new Error('Image generation failed');
      }

      const aiGeneratedImages: GeneratedImage[] = await generateResponse.json();
      setGeneratedImages(aiGeneratedImages);

      const completedProject: Project = {
        ...projectData,
        generatedImages: aiGeneratedImages,
        status: 'completed',
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem('currentProject', JSON.stringify(completedProject));

      await persistProjectUpdate(
        projectId,
        {
          generatedImages: aiGeneratedImages,
          status: 'completed',
        },
        {
          errorMessage: t('errors.backendSaveFailed', {
            defaultValue:
              'Impossible de sauvegarder le projet côté serveur. Les données locales sont conservées.',
          }),
        }
      );
    } catch (generationError) {
      console.error('Error generating AI images, using fallback:', generationError);
      setError(
        t('step4.generationError', {
          defaultValue:
            "Impossible de générer automatiquement les images. Nous avons sélectionné des visuels adaptés.",
        })
      );

      const fallbackImages = buildFallbackImages(projectData.structuredProfile);
      setGeneratedImages(fallbackImages);

      const completedProject: Project = {
        ...projectData,
        generatedImages: fallbackImages,
        status: 'completed',
        updatedAt: new Date().toISOString(),
      };

      localStorage.setItem('currentProject', JSON.stringify(completedProject));

      await persistProjectUpdate(
        projectId,
        {
          generatedImages: fallbackImages,
          status: 'completed',
        },
        {
          errorMessage: t('errors.backendSaveFailed', {
            defaultValue:
              'Impossible de sauvegarder le projet côté serveur. Les données locales sont conservées.',
          }),
        }
      );
    } finally {
      setIsLoading(false);
    }
  }, [navigate, projectId, t]);

  useEffect(() => {
    generateImages();
  }, [generateImages]);

  const handleBack = () => {
    navigate(`/new/step3/${projectId}`);
  };

  const handleDownload = (image: GeneratedImage) => {
    const link = document.createElement('a');
    link.href = image.url;
    link.download = image.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    generatedImages.forEach((image) => {
      setTimeout(() => handleDownload(image), 100);
    });
  };

  const handleShare = () => {
    if (!projectSlug) return;
    const shareUrl = `${window.location.origin}/preview/${projectSlug}`;
    navigator.clipboard.writeText(shareUrl);
  };

  const handleWhatsApp = () => {
    if (!projectSlug) return;
    const message = encodeURIComponent(
      `Bonjour ! J'ai utilisé Site-Factory pour générer l'aperçu de mon site web. Voici le lien : ${window.location.origin}/preview/${projectSlug}\n\nJe souhaite discuter de la réalisation complète pour 35 000 FCFA.`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const overviewImage = generatedImages.find((img) => img.type === 'overview');
  const sectionImages = generatedImages.filter((img) => img.type === 'section');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center max-w-md mx-auto px-6"
        >
          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-6" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Génération en cours...</h3>
          <p className="text-gray-600">Nous créons vos aperçus premium avec un effet waouh garanti !</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/10 to-pink-400/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6 lg:p-8">
        <motion.h1
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
        >
          Site-Factory
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <LanguageSwitch />
        </motion.div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <StepIndicator currentStep={4} totalSteps={4} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {t('step4.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('step4.subtitle')}
          </p>
          {error && (
            <p className="mt-4 text-sm text-red-500">
              {error}
            </p>
          )}
        </motion.div>

        {overviewImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white/60 shadow-xl overflow-hidden mb-10"
          >
            <div className="aspect-[16/9] bg-black/5 relative">
              <img src={overviewImage.url} alt="Aperçu principal" className="w-full h-full object-cover" />
              <div className="absolute top-4 right-4 flex gap-3">
                <button
                  onClick={() => handleDownload(overviewImage)}
                  className="px-4 py-2 rounded-full bg-white/80 backdrop-blur flex items-center gap-2 text-gray-700 font-medium hover:bg-white"
                >
                  <Download className="w-4 h-4" />
                  {t('step4.download')}
                </button>
                <button
                  onClick={() => window.open(overviewImage.url, '_blank')}
                  className="px-4 py-2 rounded-full bg-white/80 backdrop-blur flex items-center gap-2 text-gray-700 font-medium hover:bg-white"
                >
                  <Eye className="w-4 h-4" />
                  {t('step4.preview')}
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {sectionImages.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
            {sectionImages.map((image) => (
              <motion.div
                key={image.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white/60 shadow-lg overflow-hidden"
              >
                <div className="aspect-[4/3]">
                  <img src={image.url} alt={image.sectionId} className="w-full h-full object-cover" />
                </div>
                <div className="p-6 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 capitalize">
                      {image.sectionId}
                    </h3>
                    <p className="text-sm text-gray-500">{t('step4.sectionPreview')}</p>
                  </div>
                  <button
                    onClick={() => handleDownload(image)}
                    className="px-4 py-2 rounded-full bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {t('step4.download')}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/80 backdrop-blur-sm rounded-3xl border border-white/60 shadow-xl p-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6"
        >
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('step4.shareTitle')}</h3>
            <p className="text-gray-600">{t('step4.shareSubtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleDownloadAll}
              className="px-5 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold flex items-center gap-2 shadow-lg shadow-blue-500/20 hover:shadow-xl hover:shadow-blue-500/30"
            >
              <Download className="w-5 h-5" />
              {t('step4.downloadAll')}
            </button>
            <button
              onClick={handleShare}
              className="px-5 py-3 rounded-2xl bg-white text-gray-700 font-semibold flex items-center gap-2 border border-gray-200 hover:border-gray-300"
              disabled={!projectSlug}
            >
              <Share2 className="w-5 h-5" />
              {t('step4.copyLink')}
            </button>
            <button
              onClick={handleWhatsApp}
              className="px-5 py-3 rounded-2xl bg-green-50 text-green-600 font-semibold flex items-center gap-2 border border-green-100 hover:border-green-200"
              disabled={!projectSlug}
            >
              <MessageCircle className="w-5 h-5" />
              {t('step4.whatsapp')}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-10 flex justify-between items-center"
        >
          <motion.button
            onClick={handleBack}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-white/70 backdrop-blur-sm border border-white/50 text-gray-700 font-medium hover:bg-white/80 transition-colors"
            whileHover={{ x: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <ArrowLeft className="w-4 h-4" />
            {t('common.back')}
          </motion.button>

          <div className="text-right">
            <p className="text-sm text-gray-500">{t('step4.footerNote')}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
