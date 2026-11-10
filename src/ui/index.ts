// React components shared by the apps: "Acerca de" (About, with the Real / Pruebas switch), the
// "Pruebas" banner, the login form, the sync status, the AI settings panel and the feedback
// ("Comentarios") button.
// Import their styles once in the app: import 'firebase-app-kit/ui.css' (themed with the
// --kit-* CSS variables, see the README).
export { AboutButton } from './AboutButton.tsx'
export type { AboutButtonProps, Developer } from './AboutButton.tsx'
export { AiSettingsPanel } from './AiSettingsPanel.tsx'
export type { AiSettingsPanelProps } from './AiSettingsPanel.tsx'
export { EnvBanner } from './EnvBanner.tsx'
export type { TestDataActions, TestDataSize } from './EnvironmentPanel.tsx'
export { FeedbackButton } from './FeedbackButton.tsx'
export type { FeedbackButtonProps } from './FeedbackButton.tsx'
export { LoginForm } from './LoginForm.tsx'
export type { LoginFormProps } from './LoginForm.tsx'
export { SyncStatus } from './SyncStatus.tsx'
export type { SyncStatusProps } from './SyncStatus.tsx'
export type { BuildInfo } from '../utils/build.ts'
