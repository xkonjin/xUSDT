import React from 'react';

// Mock lucide-react icons for testing
type IconProps = { className?: string };

const createIcon = (testId: string) => ({ className }: IconProps) => (
  <svg data-testid={testId} className={className}><path /></svg>
);

export const AlertCircle = createIcon('alert-circle');
export const AlertTriangle = createIcon('alert-triangle');
export const ArrowRight = createIcon('arrow-right');
export const Check = createIcon('check');
export const CheckCircle = createIcon('check-circle');
export const CheckCircle2 = createIcon('check-circle-2');
export const ChevronRight = createIcon('chevron-right');
export const Clock = createIcon('clock');
export const Copy = createIcon('copy');
export const DollarSign = createIcon('dollar-sign');
export const ExternalLink = createIcon('external-link');
export const Gift = createIcon('gift');
export const Info = createIcon('info');
export const Loader2 = createIcon('loader2');
export const Mail = createIcon('mail');
export const MessageCircle = createIcon('message-circle');
export const PartyPopper = createIcon('party-popper');
export const RefreshCw = createIcon('refresh-cw');
export const Send = createIcon('send');
export const Share2 = createIcon('share-2');
export const Shield = createIcon('shield');
export const Sparkles = createIcon('sparkles');
export const Twitter = createIcon('twitter');
export const Users = createIcon('users');
export const Volume2 = createIcon('volume-2');
export const VolumeX = createIcon('volume-x');
export const Wifi = createIcon('wifi');
export const WifiOff = createIcon('wifi-off');
export const X = createIcon('x');
export const XCircle = createIcon('x-circle');
