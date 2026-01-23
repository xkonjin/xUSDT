// ============================================================================
// CLAYMORPHISM COMPONENTS
// ============================================================================

export {
  ClayCard,
  ClayCardHeader,
  ClayCardTitle,
  ClayCardContent,
  ClayCardFooter,
} from "./components/ClayCard";
export type {
  ClayCardProps,
  ClayCardHeaderProps,
  ClayCardTitleProps,
  ClayCardContentProps,
  ClayCardFooterProps,
} from "./components/ClayCard";

export { ClayButton } from "./components/ClayButton";
export type { ClayButtonProps } from "./components/ClayButton";

export { ClayInput } from "./components/ClayInput";
export type { ClayInputProps } from "./components/ClayInput";

export { ClayBadge } from "./components/ClayBadge";
export type { ClayBadgeProps } from "./components/ClayBadge";

export { ClayProgress, ClayProgressSteps } from "./components/ClayProgress";
export type { ClayProgressProps, ClayProgressStepsProps } from "./components/ClayProgress";

export { ClayAvatar, ClayAvatarGroup } from "./components/ClayAvatar";
export type { ClayAvatarProps, ClayAvatarGroupProps } from "./components/ClayAvatar";

export { ClayContainer } from "./components/ClayContainer";
export type { ClayContainerProps } from "./components/ClayContainer";

export { ClaySection } from "./components/ClaySection";
export type { ClaySectionProps } from "./components/ClaySection";

export { ClayDivider } from "./components/ClayDivider";
export type { ClayDividerProps } from "./components/ClayDivider";

export { ClaySpacer } from "./components/ClaySpacer";
export type { ClaySpacerProps } from "./components/ClaySpacer";

export { ClayAlert } from "./components/ClayAlert";
export type { ClayAlertProps } from "./components/ClayAlert";

export { ClayModal, ClayModalFooter } from "./components/ClayModal";
export type { ClayModalProps, ClayModalFooterProps } from "./components/ClayModal";

export { ClaySheet, ClaySheetFooter } from "./components/ClaySheet";
export type { ClaySheetProps, ClaySheetFooterProps } from "./components/ClaySheet";

export {
  ToastProvider as ClayToastProvider,
  useToast as useClayToast,
  useSuccessToast as useClaySuccessToast,
  useErrorToast as useClayErrorToast,
} from "./components/ClayToast";
export type { Toast as ClayToast, ToastType as ClayToastType } from "./components/ClayToast";

// ============================================================================
// LIQUID GLASS & OTHER COMPONENTS
// ============================================================================

// Components
export { ErrorBoundary } from "./ErrorBoundary";
export type { ErrorBoundaryProps } from "./ErrorBoundary";

// Error handling utilities
export {
  getUserFriendlyError,
  getErrorDetails,
  isRecoverableError,
  isUserCausedError,
} from "./lib/user-errors";
export type { ErrorContext } from "./lib/user-errors";

export { Button } from "./components/Button";
export type { ButtonProps } from "./components/Button";

export { Card, CardHeader, CardTitle, CardContent } from "./components/Card";
export type {
  CardProps,
  CardHeaderProps,
  CardTitleProps,
  CardContentProps,
} from "./components/Card";

export { Input } from "./components/Input";
export type { InputProps } from "./components/Input";

export { Badge } from "./components/Badge";
export type { BadgeProps } from "./components/Badge";

export { Spinner, LoadingScreen } from "./components/Spinner";
export type { SpinnerProps, LoadingScreenProps } from "./components/Spinner";

export { Skeleton, SkeletonCard, SkeletonList } from "./components/Skeleton";
export type { SkeletonProps } from "./components/Skeleton";

export { Modal, ConfirmModal } from "./components/Modal";
export type { ModalProps, ConfirmModalProps } from "./components/Modal";

export {
  ToastProvider,
  useToast,
  useSuccessToast,
  useErrorToast,
} from "./components/Toast";
export type { Toast, ToastType } from "./components/Toast";

// New components for production polish
export { SuccessAnimation } from "./components/SuccessAnimation";
export type { SuccessAnimationProps } from "./components/SuccessAnimation";

export {
  EmptyState,
  NoTransactionsEmpty,
  NoBillsEmpty,
  NoStreamsEmpty,
  NoSubscriptionsEmpty,
} from "./components/EmptyState";
export type { EmptyStateProps } from "./components/EmptyState";

export { PaymentConfirmModal } from "./components/PaymentConfirmModal";
export type { PaymentConfirmModalProps } from "./components/PaymentConfirmModal";

export { ProgressSteps, ScanProgress } from "./components/ProgressSteps";
export type { Step, ProgressStepsProps, ScanProgressProps } from "./components/ProgressSteps";

export { PaymentProgress } from "./components/PaymentProgress";
export type { PaymentProgressProps, PaymentStatus } from "./components/PaymentProgress";

// Viral/Sharing components
export { ShareSheet } from "./components/ShareSheet";
export type { ShareSheetProps, ShareChannel } from "./components/ShareSheet";

export { InviteFriendsCard, InviteFriendsBanner } from "./components/InviteFriends";
export type { InviteFriendsCardProps } from "./components/InviteFriends";

export { SuccessSharePrompt } from "./components/SuccessShare";
export type { SuccessShareProps, ShareAction } from "./components/SuccessShare";

export { WalletManager } from "./components/WalletManager";
export type { WalletManagerProps } from "./components/WalletManager";

// Celebration animations
export { Celebration, SuccessCheckmark, PaymentSuccess } from "./components/Celebration";
export type { default as CelebrationComponent } from "./components/Celebration";

// AI Assistant
export {
  Assistant,
  AssistantProvider,
  useAssistant,
  useAssistantReaction,
  AssistantAvatar,
  AssistantBubble,
  useAssistantStore,
  useMousePosition,
  useSpeech,
  useAssistantAI,
  collectUIContext,
  PersonalityEngine,
  DEFAULT_CONFIG,
  PAGE_NAMES,
} from "./components/Assistant";
export type {
  AssistantState,
  AssistantEmotion,
  AssistantMessage,
  AssistantConfig,
  AssistantMemory,
  UIContext,
  AssistantProviderProps,
} from "./components/Assistant";
