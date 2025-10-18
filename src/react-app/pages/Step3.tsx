import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check, ExternalLink } from 'lucide-react';
import { Inspiration, Project } from '@/shared/types';
import LanguageSwitch from '@/react-app/components/LanguageSwitch';
import StepIndicator from '@/react-app/components/StepIndicator';

export default function Step3() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [inspirations, setInspirations] = useState<Inspiration[]>([]);
  const [selectedInspirations, setSelectedInspirations] = useState<Inspiration[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingInspirations, setIsLoadingInspirations] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) {
        navigate('/new/step1');
        return;
      }

      const project = JSON.parse(savedProject);
      project.siteType = project.siteType ?? project.site_type;
      project.language = project.language ?? project.lang ?? 'fr';
      project.id = project.id ?? (projectId ? Number(projectId) : projectId);

      if (!project.structuredProfile) {
        // If no structured profile, redirect back to step 2
        navigate(`/new/step2/${projectId}`);
        return;
      }

      try {
        const response = await fetch(`/api/projects/by-id/${projectId}`);
        if (!response.ok) {
          throw new Error('Failed to load project');
        }

        const projectData: Project = await response.json();

        if (!projectData.structuredProfile) {
          navigate(`/new/step2/${projectId}`);
          return;
        }

        setSelectedInspirations(projectData.selectedInspirations ?? []);

        await loadInspirations(projectData);
      } catch (err) {
        console.error('Error loading project for inspirations:', err);
        setInspirations([]);
        setError(
          t('step3.loadError', {
            defaultValue: 'Impossible de charger le projet ou les inspirations.'
          })
        );
      } finally {
        setIsLoadingInspirations(false);
      }
    };

    fetchProject();
  }, [navigate, projectId, t]);

  const loadInspirations = async (currentProject: Project) => {
    try {
      const inspirationsResponse = await fetch('/api/inspirations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredProfile: currentProject.structuredProfile
        })
      });

      if (!inspirationsResponse.ok) {
        throw new Error('Failed to fetch AI inspirations');
      }

      const aiInspirations: Inspiration[] = await inspirationsResponse.json();
      setInspirations(aiInspirations);
    } catch (error) {
      console.error('Error fetching AI inspirations, using fallback:', error);

      const profile = currentProject.structuredProfile;
      const isPersonal = currentProject.siteType === 'personal';

      const fallbackInspirations: Inspiration[] = [
        {
          id: '1',
          title: isPersonal ? 'Portfolio Créatif' : 'Agence Moderne',
          domain: isPersonal ? 'portfoliocreative.design' : 'agencemoderne.co',
          image: 'https://images.unsplash.com/photo-1558618667-fcc251c78b5e?w=400&h=300&fit=crop',
          justification: `Design ${profile?.tone || 'moderne'} qui correspond à votre vision ${profile?.ambience || 'professionnelle'}`
        },
        {
          id: '2',
          title: isPersonal ? 'Showcase Artistique' : 'Services Pro',
          domain: isPersonal ? 'showcaseartistique.fr' : 'servicespro.io',
          image: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=400&h=300&fit=crop',
          justification: profile?.lang === 'fr'
            ? `Excellent exemple pour ${profile?.primaryGoal || 'présenter votre activité'}`
            : `Excellent example for ${profile?.primaryGoal || 'showcasing your business'}`
        },
        {
          id: '3',
          title: profile?.siteName || 'Site Inspiration',
          domain: 'inspiration-design.com',
          image: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=400&h=300&fit=crop',
          justification: `Interface adaptée à votre secteur avec ${profile?.recommendedCTA || 'call-to-action efficace'}`
        },
        {
          id: '4',
          title: isPersonal ? 'Portfolio Elite' : 'Business Hub',
          domain: isPersonal ? 'portfolioelite.design' : 'businesshub.co',
          image: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=400&h=300&fit=crop',
          justification: profile?.keyHighlights?.[0] || 'Design professionnel et impactant'
        },
        {
          id: '5',
          title: 'Studio Créatif',
          domain: 'studiocreatif.fr',
          image: 'https://images.unsplash.com/photo-1574169208507-84376144848b?w=400&h=300&fit=crop',
          justification: profile?.keyHighlights?.[1] || 'Approche authentique et personnalisée'
        }
      ];

      setInspirations(fallbackInspirations);
    }
  };

  const handleBack = () => {
    navigate(`/new/step2/${projectId}`);
  };

  const handleInspirationSelect = (inspiration: Inspiration) => {
    if (selectedInspirations.find(i => i.id === inspiration.id)) {
      setSelectedInspirations(prev => prev.filter(i => i.id !== inspiration.id));
    } else if (selectedInspirations.length < 2) {
      setSelectedInspirations(prev => [...prev, inspiration]);
    }
  };

  const handleContinue = async () => {
    if (!projectId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedInspirations })
      });

      if (!response.ok) {
        throw new Error('Failed to save inspirations');
      }

      navigate(`/new/step4/${projectId}`);
    } catch (err) {
      console.error('Error saving inspirations:', err);
      setError(
        t('step3.saveError', {
          defaultValue: 'Impossible d\'enregistrer vos inspirations. Veuillez réessayer.'
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingInspirations) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-600">Recherche d'inspirations...</p>
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
        <StepIndicator currentStep={3} totalSteps={4} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {t('step3.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('step3.subtitle')}
          </p>
          {error && (
            <p className="mt-4 text-sm text-red-500">
              {error}
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {inspirations.map(inspiration => {
            const isSelected = selectedInspirations.some(i => i.id === inspiration.id);
            return (
              <motion.div
                key={inspiration.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => handleInspirationSelect(inspiration)}
                className={`group relative cursor-pointer bg-white/80 backdrop-blur-sm rounded-3xl border border-white/60 shadow-lg overflow-hidden transition-all duration-300 ${
                  isSelected ? 'ring-4 ring-blue-500 ring-opacity-50 shadow-xl shadow-blue-500/20' : 'hover:shadow-xl hover:-translate-y-1'
                }`}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={inspiration.image}
                    alt={inspiration.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-4 right-4 w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg"
                    >
                      <Check className="w-5 h-5" />
                    </motion.div>
                  )}
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {inspiration.title}
                      </h3>
                      <p className="text-sm text-blue-600 flex items-center gap-2">
                        <ExternalLink className="w-4 h-4" />
                        {inspiration.domain}
                      </p>
                    </div>
                  </div>

                  <p className="text-gray-600 leading-relaxed">
                    {inspiration.justification}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex justify-between items-center"
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
            onClick={handleContinue}
            disabled={selectedInspirations.length === 0 || isLoading}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
              selectedInspirations.length > 0 && !isLoading
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            whileHover={selectedInspirations.length > 0 && !isLoading ? { y: -2 } : {}}
            whileTap={selectedInspirations.length > 0 && !isLoading ? { scale: 0.95 } : {}}
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                {t('common.loading')}
              </>
            ) : (
              <>
                {t('common.continue')}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}

