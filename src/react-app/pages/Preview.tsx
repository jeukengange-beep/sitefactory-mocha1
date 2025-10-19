import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router';
import { motion } from 'framer-motion';
import { Download, Share2, MessageCircle, Sparkles } from 'lucide-react';
import { Project, GeneratedImage } from '@/shared/types';
import LanguageSwitch from '@/react-app/components/LanguageSwitch';

export default function Preview() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProject();
  }, [slug]);

  const loadProject = async () => {
    setIsLoading(true);
    try {
      // Try to load from localStorage first
      const savedProject = localStorage.getItem('currentProject');
      if (savedProject) {
        const projectData = JSON.parse(savedProject);
        if (projectData.slug === slug) {
          setProject(projectData);
          setIsLoading(false);
          return;
        }
      }

      // Mock project data for now
      const mockProject: Project = {
        id: 1,
        slug: slug || '',
        siteType: 'business',
        language: 'fr',
        status: 'completed',
        deepAnswers: null,
        structuredProfile: null,
        selectedInspirations: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        generatedImages: [
          {
            id: 'overview',
            type: 'overview',
            url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop',
            filename: 'site-overview.png'
          },
          {
            id: 'hero',
            type: 'section',
            sectionId: 'hero',
            url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop',
            filename: 'hero-section.png'
          },
          {
            id: 'about',
            type: 'section',
            sectionId: 'about',
            url: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop',
            filename: 'about-section.png'
          },
          {
            id: 'services',
            type: 'section',
            sectionId: 'services',
            url: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=400&fit=crop',
            filename: 'services-section.png'
          }
        ]
      };

      setProject(mockProject);
    } catch (error) {
      console.error('Error loading project:', error);
    } finally {
      setIsLoading(false);
    }
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
    if (!project?.generatedImages) return;
    project.generatedImages.forEach(image => {
      setTimeout(() => handleDownload(image), 100);
    });
  };

  const handleShare = () => {
    const shareUrl = window.location.href;
    navigator.clipboard.writeText(shareUrl);
    // Could add a toast notification here
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Bonjour ! J'ai utilisé Site-Factory pour générer l'aperçu de mon site web. Voici le lien : ${window.location.href}\n\nJe souhaite discuter de la réalisation complète pour 35 000 FCFA.`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">{t('common.loading')}</p>
        </motion.div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Projet introuvable</h2>
          <p className="text-gray-600">Ce lien ne semble pas valide.</p>
        </div>
      </div>
    );
  }

  const overviewImage = project.generatedImages?.find(img => img.type === 'overview');
  const sectionImages = project.generatedImages?.filter(img => img.type === 'section') || [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-400/10 to-pink-400/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex justify-between items-center p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Site-Factory
          </h1>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <LanguageSwitch />
        </motion.div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Galerie d'aperçus
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Voici les aperçus visuels générés pour ce projet
          </p>
        </motion.div>

        {/* Overview Image */}
        {overviewImage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-12"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6">{t('step4.overview')}</h3>
            <div className="bg-white rounded-3xl p-6 shadow-lg border border-white/50">
              <div className="relative group">
                <img
                  src={overviewImage.url}
                  alt="Site Overview"
                  className="w-full rounded-2xl shadow-lg"
                />
                <motion.button
                  onClick={() => handleDownload(overviewImage)}
                  className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm text-white p-3 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Download className="w-5 h-5" />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Section Images */}
        {sectionImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mb-12"
          >
            <h3 className="text-2xl font-bold text-gray-900 mb-6">{t('step4.sections')}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sectionImages.map((image, index) => (
                <motion.div
                  key={image.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="bg-white rounded-2xl p-4 shadow-lg border border-white/50"
                >
                  <div className="relative group">
                    <img
                      src={image.url}
                      alt={`Section ${image.sectionId}`}
                      className="w-full rounded-xl shadow-md"
                    />
                    <motion.button
                      onClick={() => handleDownload(image)}
                      className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <Download className="w-4 h-4" />
                    </motion.button>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-3 capitalize">
                    Section {image.sectionId}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-white/50 shadow-lg"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <motion.button
              onClick={handleDownloadAll}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-5 h-5 text-gray-700" />
              <span className="font-medium text-gray-700">{t('step4.downloadAll')}</span>
            </motion.button>

            <motion.button
              onClick={handleShare}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-blue-100 hover:bg-blue-200 rounded-2xl transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Share2 className="w-5 h-5 text-blue-700" />
              <span className="font-medium text-blue-700">{t('step4.shareLink')}</span>
            </motion.button>

            <motion.button
              onClick={handleWhatsApp}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all"
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-medium">{t('step4.whatsappCTA')}</span>
            </motion.button>
          </div>

          <div className="text-center mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 mb-2">{t('step4.priceDescription')}</p>
            <p className="text-2xl font-bold text-gray-900">{t('step4.price')}</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
