import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, Check, ExternalLink } from 'lucide-react';
import { Inspiration } from '@/shared/types';
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

  useEffect(() => {
    loadInspirations();
  }, []);

  const loadInspirations = async () => {
    setIsLoadingInspirations(true);
    try {
      const savedProject = localStorage.getItem('currentProject');
      if (!savedProject) {
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

      // Generate AI-powered inspirations
      try {
        const inspirationsResponse = await fetch('/api/inspirations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            structuredProfile: project.structuredProfile
          })
        });

        if (inspirationsResponse.ok) {
          const aiInspirations = await inspirationsResponse.json();
          setInspirations(aiInspirations);
        } else {
          throw new Error('Failed to fetch AI inspirations');
        }
      } catch (error) {
        console.error('Error fetching AI inspirations, using fallback:', error);
        
        // Fallback inspirations based on project type and profile
        const isPersonal = project.siteType === 'personal';
        const profile = project.structuredProfile;
        
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
    } catch (error) {
      console.error('Error loading inspirations:', error);
      // Set minimal fallback
      setInspirations([]);
    } finally {
      setIsLoadingInspirations(false);
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
    setIsLoading(true);
    try {
      // Save to localStorage
      const savedProject = localStorage.getItem('currentProject');
      if (savedProject) {
        const project = JSON.parse(savedProject);
        project.selectedInspirations = selectedInspirations;
        localStorage.setItem('currentProject', JSON.stringify(project));
      }

      // Try to save to backend
      try {
        await fetch(`/api/projects/${projectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ selectedInspirations })
        });
      } catch (error) {
        console.log('Backend save failed, continuing with localStorage');
      }

      navigate(`/new/step4/${projectId}`);
    } catch (error) {
      console.error('Error saving inspirations:', error);
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
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-4">
            {t('step3.subtitle')}
          </p>
          <p className="text-sm text-blue-600 font-medium">
            {t('step3.selectMax')} ({selectedInspirations.length}/2)
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {inspirations.map((inspiration, index) => {
            const isSelected = selectedInspirations.find(i => i.id === inspiration.id);
            const canSelect = selectedInspirations.length < 2 || isSelected;
            
            return (
              <motion.div
                key={inspiration.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => canSelect && handleInspirationSelect(inspiration)}
                className={`relative cursor-pointer group ${
                  !canSelect ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  isSelected ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
                }`}
              >
                <div className={`bg-white rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                  isSelected
                    ? 'border-blue-500 shadow-xl shadow-blue-500/20'
                    : 'border-gray-200 hover:border-blue-300 hover:shadow-lg'
                }`}>
                  <div className="relative overflow-hidden">
                    <img
                      src={inspiration.image}
                      alt={inspiration.title}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {isSelected && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute top-3 right-3 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-4 h-4 text-white" />
                      </motion.div>
                    )}
                  </div>
                  
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">{inspiration.title}</h3>
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                    
                    <p className="text-sm text-blue-600 mb-3 font-medium">
                      {inspiration.domain}
                    </p>
                    
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-600 mb-1 font-medium">
                        {t('step3.justification')}
                      </p>
                      <p className="text-sm text-gray-800">
                        {inspiration.justification}
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
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
            disabled={isLoading}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
              !isLoading
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            whileHover={!isLoading ? { y: -2 } : {}}
            whileTap={!isLoading ? { scale: 0.95 } : {}}
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
