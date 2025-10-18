import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { User, Building2, ArrowRight } from 'lucide-react';
import { SiteType, type Project } from '@/shared/types';
import LanguageSwitch from '@/react-app/components/LanguageSwitch';
import StepIndicator from '@/react-app/components/StepIndicator';
import { apiFetch } from '@/react-app/utils/apiClient';

export default function Step1() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState<SiteType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteTypes = [
    {
      type: 'personal' as SiteType,
      icon: User,
      title: t('step1.personal.title'),
      description: t('step1.personal.description'),
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50'
    },
    {
      type: 'business' as SiteType,
      icon: Building2,
      title: t('step1.business.title'),
      description: t('step1.business.description'),
      gradient: 'from-purple-500 to-pink-500',
      bgGradient: 'from-purple-50 to-pink-50'
    }
  ];

  const handleContinue = async () => {
    if (!selectedType) return;

    setIsLoading(true);
    setError(null);
    const now = new Date().toISOString();
    const fallbackLanguage: Project['language'] = i18n.language === 'en' ? 'en' : 'fr';

    try {
      const response = await apiFetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteType: selectedType,
          language: i18n.language
        })
      });

      if (!response.ok) throw new Error('Failed to create project');

      const project: Project = await response.json();
      localStorage.setItem('currentProject', JSON.stringify(project));
      navigate(`/new/step2/${project.id}`);
    } catch (error) {
      console.error('Error creating project:', error);
      const fallbackId = Date.now();
      const fallbackProject: Project = {
        id: fallbackId,
        slug: `local-${fallbackId}`,
        siteType: selectedType,
        language: fallbackLanguage,
        status: 'draft',
        deepAnswers: null,
        structuredProfile: null,
        selectedInspirations: null,
        generatedImages: null,
        createdAt: now,
        updatedAt: now
      };

      localStorage.setItem('currentProject', JSON.stringify(fallbackProject));

      const offlineMessage = t('errors.backendUnavailable', {
        defaultValue:
          "Le serveur est momentanément indisponible. Nous continuons avec un projet sauvegardé localement.",
      });
      setError(offlineMessage);

      if (typeof window !== 'undefined') {
        alert(offlineMessage);
      }

      navigate(`/new/step2/${fallbackProject.id}`);
    } finally {
      setIsLoading(false);
    }
  };

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

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-8">
        <StepIndicator currentStep={1} totalSteps={4} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {t('step1.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('step1.subtitle')}
          </p>
          {error && (
            <p className="mt-4 text-sm text-red-500">
              {error}
            </p>
          )}
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {siteTypes.map((option, index) => (
            <motion.div
              key={option.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              onClick={() => setSelectedType(option.type)}
              className={`relative cursor-pointer group ${
                selectedType === option.type
                  ? 'ring-4 ring-blue-500 ring-opacity-50'
                  : ''
              }`}
            >
              <div className={`bg-gradient-to-br ${option.bgGradient} rounded-3xl p-8 border-2 transition-all duration-300 ${
                selectedType === option.type
                  ? 'border-blue-500 shadow-xl shadow-blue-500/20'
                  : 'border-white/50 hover:border-blue-300 hover:shadow-lg'
              }`}>
                <div className={`w-16 h-16 bg-gradient-to-br ${option.gradient} rounded-2xl flex items-center justify-center mb-6 mx-auto group-hover:scale-110 transition-transform duration-300`}>
                  <option.icon className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-3 text-center">
                  {option.title}
                </h3>
                
                <p className="text-gray-600 text-center leading-relaxed">
                  {option.description}
                </p>

                {selectedType === option.type && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center"
                  >
                    <div className="w-3 h-3 bg-white rounded-full" />
                  </motion.div>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <motion.button
            onClick={handleContinue}
            disabled={!selectedType || isLoading}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
              selectedType && !isLoading
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            whileHover={selectedType && !isLoading ? { y: -2 } : {}}
            whileTap={selectedType && !isLoading ? { scale: 0.95 } : {}}
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
