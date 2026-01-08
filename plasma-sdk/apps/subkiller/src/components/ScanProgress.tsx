'use client';

import { Card, CardContent } from './ui/Card';
import { Mail, Search, Brain, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ScanProgressProps {
  stage: 'connecting' | 'fetching' | 'analyzing' | 'complete';
  progress: number;
  emailsScanned: number;
  subscriptionsFound: number;
}

const STAGES = [
  { key: 'connecting', label: 'Connecting to Gmail', Icon: Mail },
  { key: 'fetching', label: 'Fetching emails', Icon: Search },
  { key: 'analyzing', label: 'AI analysis', Icon: Brain },
  { key: 'complete', label: 'Complete', Icon: CheckCircle },
] as const;

export function ScanProgress({ stage, progress, emailsScanned, subscriptionsFound }: ScanProgressProps) {
  const currentIndex = STAGES.findIndex(s => s.key === stage);
  const CurrentIcon = STAGES[currentIndex]?.Icon;

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardContent className="p-6">
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="relative">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-plasma-500 to-plasma-400 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="absolute -top-1 left-0 w-full flex justify-between">
              {STAGES.map((s, i) => (
                <div
                  key={s.key}
                  className={cn(
                    'w-4 h-4 rounded-full border-2 transition-all duration-300',
                    i <= currentIndex
                      ? 'bg-plasma-500 border-plasma-400'
                      : 'bg-gray-800 border-gray-700'
                  )}
                />
              ))}
            </div>
          </div>

          {/* Stage labels */}
          <div className="flex justify-between text-xs">
            {STAGES.map((s, i) => (
              <span
                key={s.key}
                className={cn(
                  'transition-colors duration-300',
                  i === currentIndex ? 'text-plasma-400' : 
                  i < currentIndex ? 'text-gray-400' : 'text-gray-600'
                )}
              >
                {s.label}
              </span>
            ))}
          </div>

          {/* Current stage animation */}
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              {CurrentIcon && (
                <>
                  <div className="absolute inset-0 animate-ping">
                    <CurrentIcon className="w-16 h-16 text-plasma-500/30" />
                  </div>
                  <CurrentIcon className="relative w-16 h-16 text-plasma-400" />
                </>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{emailsScanned}</p>
              <p className="text-sm text-gray-400">Emails scanned</p>
            </div>
            <div className="bg-gray-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-plasma-400">{subscriptionsFound}</p>
              <p className="text-sm text-gray-400">Subscriptions found</p>
            </div>
          </div>

          {/* Message */}
          <p className="text-center text-sm text-gray-400">
            {stage === 'connecting' && 'Securely connecting to your Gmail account...'}
            {stage === 'fetching' && 'Scanning your inbox for subscription emails...'}
            {stage === 'analyzing' && 'AI is categorizing your subscriptions...'}
            {stage === 'complete' && 'Scan complete! Review your subscriptions below.'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
