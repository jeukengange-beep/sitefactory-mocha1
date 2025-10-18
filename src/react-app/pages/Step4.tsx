import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'framer-motion';
import { Download, Share2, MessageCircle, ArrowLeft, Eye } from 'lucide-react';
import { GeneratedImage } from '@/shared/types';
import LanguageSwitch from '@/react-app/components/LanguageSwitch';
import StepIndicator from '@/react-app/components/StepIndicator';

export default function Step4() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectSlug, setProjectSlug] = useState<string>('');

  useEffect(() => {
    generateImages();
  }, []);

  const generateImages = async () => {
    setIsLoading(true);
    try {
      const savedProject = localStorage.getItem('currentProject');
      if (!savedProject) {
        navigate('/new/step1');
        return;
      }

      const project = JSON.parse(savedProject);
      
      if (!project.structuredProfile) {
        navigate('/new/step2');
        return;
      }

      // Generate real AI images based on structured profile and inspirations
      try {
        const generateResponse = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredProfile: project.structuredProfile,
            selectedInspirations: project.selectedInspirations || []
          })
        });

        if (generateResponse.ok) {
          const aiGeneratedImages = await generateResponse.json();
          setGeneratedImages(aiGeneratedImages);
          
          // Generate slug and save final project
          const slug = `project-${Date.now()}`;
          setProjectSlug(slug);
          
          project.generatedImages = aiGeneratedImages;
          project.slug = slug;
          project.status = 'completed';
          localStorage.setItem('currentProject', JSON.stringify(project));
          
          // Try to save to backend
          try {
            await fetch(`/api/projects/${projectId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ 
                generatedImages: JSON.stringify(aiGeneratedImages),
                status: 'completed'
              })
            });
          } catch (error) {
            console.log('Backend save failed, continuing with localStorage');
          }
        } else {
          throw new Error('Image generation failed');
        }
      } catch (error) {
        console.error('Error generating AI images, using fallback:', error);
        
        // Fallback to curated images based on profile
        const profile = project.structuredProfile;
        const fallbackImages: GeneratedImage[] = [
          {
            id: 'overview',
            type: 'overview',
            url: 'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=600&fit=crop',
            filename: 'site-overview.png'
          }
        ];

        // Add section images based on structured profile
        if (profile.sections) {
          const contextualImages = [
            'https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1574169208507-84376144848b?w=800&h=400&fit=crop',
            'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=800&h=400&fit=crop'
          ];
          
          profile.sections.forEach((section: any, index: number) => {
            fallbackImages.push({
              id: section.id,
              type: 'section',
              sectionId: section.id,
              url: contextualImages[index % contextualImages.length],
              filename: `${section.id}-section.png`
            });
          });
        }

        setGeneratedImages(fallbackImages);
        
        // Generate slug and save final project
        const slug = `project-${Date.now()}`;
        setProjectSlug(slug);
        
        project.generatedImages = fallbackImages;
        project.slug = slug;
        project.status = 'completed';
        localStorage.setItem('currentProject', JSON.stringify(project));
      }
    } catch (error) {
      console.error('Error in image generation process:', error);
    } finally {
      setIsLoading(false);
    }
  };

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
    generatedImages.forEach(image => {
      setTimeout(() => handleDownload(image), 100);
    });
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/preview/${projectSlug}`;
    navigator.clipboard.writeText(shareUrl);
    // Could add a toast notification here
  };

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Bonjour ! J'ai utilisé Site-Factory pour générer l'aperçu de mon site web. Voici le lien : ${window.location.origin}/preview/${projectSlug}\n\nJe souhaite discuter de la réalisation complète pour 35 000 FCFA.`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  const overviewImage = generatedImages.find(img => img.type === 'overview');
  const sectionImages = generatedImages.filter(img => img.type === 'section');

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

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="flex justify-between items-center mt-8"
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

          <motion.button
            onClick={() => navigate(`/preview/${projectSlug}`)}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Eye className="w-5 h-5" />
            Voir la galerie
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
