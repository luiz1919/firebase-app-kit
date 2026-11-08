// React components shared by the apps: "Acerca de" (About), the login form, the sync status and
// the AI settings panel.
// Import their styles once in the app: import 'firebase-app-kit/ui.css' (themed with the
// --kit-* CSS variables, see the README).
export { AboutButton } from './AboutButton.tsx'
export type { AboutButtonProps, Developer } from './AboutButton.tsx'
export { AiSettingsPanel } from './AiSettingsPanel.tsx'
export type { AiSettingsPanelProps } from './AiSettingsPanel.tsx'
export { LoginForm } from './LoginForm.tsx'
export type { LoginFormProps } from './LoginForm.tsx'
export { SyncStatus } from './SyncStatus.tsx'
export type { SyncStatusProps } from './SyncStatus.tsx'
export type { BuildInfo } from '../utils/build.ts'
