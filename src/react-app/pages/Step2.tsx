import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import type { Project, StructuredProfile } from '@/shared/types';
import LanguageSwitch from '@/react-app/components/LanguageSwitch';
import StepIndicator from '@/react-app/components/StepIndicator';
import { persistProjectUpdate } from '@/react-app/utils/projectApi';

export default function Step2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [deepAnswers, setDeepAnswers] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadProject = async () => {
      if (!projectId) {
        navigate('/new/step1');
        return;
      }

      setIsFetching(true);
      setError(null);

      try {
        const response = await fetch(`/api/projects/by-id/${projectId}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load project (status ${response.status})`);
        }

        const projectData: Project = await response.json();

        setProject(projectData);
        setDeepAnswers(projectData.deepAnswers ?? '');
        localStorage.setItem('currentProject', JSON.stringify(projectData));
      } catch (fetchError) {
        console.error('Error loading project for step 2:', fetchError);

        const savedProject = localStorage.getItem('currentProject');
        if (savedProject) {
          try {
            const localProject = JSON.parse(savedProject) as Project;
            if (!localProject.id && projectId) {
              localProject.id = Number(projectId);
            }

            setProject(localProject);
            setDeepAnswers(localProject.deepAnswers ?? '');
          } catch (parseError) {
            console.error('Unable to parse project from localStorage:', parseError);
            setError(
              t('step2.loadError', {
                defaultValue: 'Impossible de charger votre projet. Veuillez recommencer.',
              })
            );
          }
        } else {
          setError(
            t('step2.loadError', {
              defaultValue: 'Impossible de charger votre projet. Veuillez recommencer.',
            })
          );
        }
      } finally {
        setIsFetching(false);
      }
    };

    loadProject();

    return () => controller.abort();
  }, [navigate, projectId, t]);

  const handleBack = () => {
    navigate('/new/step1');
  };

  const handleContinue = async () => {
    if (!project || deepAnswers.trim().length < 50) {
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const projectSiteType = project.siteType;
      const projectLanguage = project.language;

      const updatedProject: Project = {
        ...project,
        deepAnswers,
      };

      localStorage.setItem('currentProject', JSON.stringify(updatedProject));

      let structuredProfile: StructuredProfile | null = project.structuredProfile;

      if (!structuredProfile) {
        try {
          const analyzeResponse = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              deepAnswers,
              siteType: projectSiteType,
              language: projectLanguage,
            }),
          });

          if (analyzeResponse.ok) {
            structuredProfile = await analyzeResponse.json();
          }
        } catch (analysisError) {
          console.error('Analysis error:', analysisError);
        }
      }

      if (!structuredProfile) {
        structuredProfile = {
          siteName: projectSiteType === 'personal' ? 'Mon Portfolio' : 'Mon Entreprise',
          tagline: 'Site web professionnel',
          description: deepAnswers.slice(0, 200),
          tone: 'moderne',
          ambience: 'professionnel et élégant',
          primaryGoal: 'Présenter mon activité',
          keyHighlights: ['Qualité', 'Professionnalisme', 'Innovation'],
          recommendedCTA: 'Nous contacter',
          colors: ['#3B82F6', '#8B5CF6', '#EF4444'],
          sections: [],
          lang: projectLanguage,
        };
      }

      const projectIdToPersist = projectId ?? project.id;

      updatedProject.structuredProfile = structuredProfile;
      localStorage.setItem('currentProject', JSON.stringify(updatedProject));
      setProject(updatedProject);

      await persistProjectUpdate(
        projectIdToPersist,
        {
          deepAnswers,
          structuredProfile,
        },
        {
          errorMessage: t('errors.backendSaveFailed', {
            defaultValue:
              'Impossible de sauvegarder le projet côté serveur. Les données locales sont conservées.',
          }),
        }
      );

      navigate(`/new/step3/${projectIdToPersist}`);
    } catch (error) {
      console.error('Error in handleContinue:', error);
      setError(
        t('step2.saveError', {
          defaultValue: "Impossible d'enregistrer vos réponses. Veuillez réessayer.",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isValid = useMemo(() => deepAnswers.trim().length >= 50 && !isFetching, [deepAnswers, isFetching]);

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
        <StepIndicator currentStep={2} totalSteps={4} />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            {t('step2.title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            {t('step2.subtitle')}
          </p>
          {error && (
            <p className="mt-4 text-sm text-red-500">
              {error}
            </p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-white/50 shadow-lg mb-8"
        >
          <textarea
            value={deepAnswers}
            onChange={(e) => setDeepAnswers(e.target.value)}
            placeholder={t('step2.placeholder')}
            className="w-full h-80 resize-none border-none outline-none bg-transparent text-gray-900 placeholder-gray-500 text-lg leading-relaxed"
            style={{ minHeight: '320px' }}
            disabled={isFetching}
          />

          <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
            <span className={`text-sm ${
              deepAnswers.length >= 50 ? 'text-green-600' : 'text-gray-500'
            }`}>
              {deepAnswers.length < 50 
                ? `${deepAnswers.length}/50 - ${t('step2.minLength')}`
                : `${deepAnswers.length} caractères`
              }
            </span>
            
            {deepAnswers.length >= 50 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-2 text-green-600"
              >
                <div className="w-2 h-2 bg-green-500 rounded-full" />
                <span className="text-sm font-medium">Prêt à continuer</span>
              </motion.div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
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
            disabled={!isValid || isLoading}
            className={`flex items-center gap-3 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 ${
              isValid && !isLoading
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 hover:scale-105'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
            whileHover={isValid && !isLoading ? { y: -2 } : {}}
            whileTap={isValid && !isLoading ? { scale: 0.95 } : {}}
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
