import type { AiSettings, AiSettingsActions } from '../ai/settings.ts';
export interface AiSettingsPanelProps {
    settings: AiSettings;
    actions: AiSettingsActions;
}
/**
 * One card per AI provider: save, change or delete the key, "Probar conexión" (Test connection,
 * which lists the models without spending quota and suggests one) and the model. The app owns the
 * page heading and the privacy notes around it, and stores the settings through `actions`.
 */
export declare function AiSettingsPanel({ settings, actions }: AiSettingsPanelProps): import("react").JSX.Element;
