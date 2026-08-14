import React from 'react';
import { TrainingModule } from '../types';
import { PlayCircle, FileText, CheckCircle2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../utils/cn';
import { useTranslation } from '../i18n/LanguageContext';

interface TrainingsTabProps {
  trainings: TrainingModule[];
  userId: string;
  onComplete: (moduleId: string) => void;
}

export function TrainingsTab({ trainings, userId, onComplete }: TrainingsTabProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      <div className="bg-psu-blue/10 p-5 rounded-2xl border border-psu-blue/5 shadow-lg shadow-psu-blue/5">
        <h3 className="text-psu-blue text-sm font-black flex items-center gap-2 uppercase tracking-widest">
          <PlayCircle size={20} />
          {t('trainings.bannerTitle')}
        </h3>
        <p className="text-[10px] text-psu-blue/50 mt-1 uppercase font-bold tracking-widest">{t('trainings.bannerSubtitle')}</p>
      </div>

      <div className="grid gap-3">
        {trainings.map((module) => {
          const isCompleted = module.completedBy.includes(userId);
          
          return (
            <motion.div 
              key={module.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => !isCompleted && onComplete(module.id)}
              className={cn(
                "card flex items-center gap-4 transition-all cursor-pointer group",
                isCompleted ? 'opacity-40 grayscale' : 'hover:border-psu-blue/20'
              )}
            >
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all",
                isCompleted ? 'bg-psu-gray/5 text-psu-gray' : 'bg-psu-blue/10 text-psu-blue group-hover:bg-psu-blue group-hover:text-white'
              )}>
                {module.type === 'VIDEO' ? <PlayCircle size={22} /> : <FileText size={22} />}
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-psu-gray text-sm truncate">{module.title}</h4>
                <p className="text-[10px] text-psu-gray/40 font-black uppercase tracking-widest truncate mt-0.5">{module.description}</p>
              </div>

              {isCompleted ? (
                <CheckCircle2 size={18} className="text-psu-green" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-psu-bg flex items-center justify-center text-psu-gray/20">
                  <ChevronRight size={16} />
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
