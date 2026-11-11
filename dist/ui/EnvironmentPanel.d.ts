import type { AppEnvironment } from '../env.ts';
import type { WriteProgress } from '../testData.ts';
export interface TestDataSize {
    id: string;
    /** E.g. "Bastantes (≈500)". */
    label: string;
}
/** The app's test data generator, shown in "Acerca de" (About) only while in "Pruebas". */
export interface TestDataActions {
    /** Amounts to choose from; the first one is selected by default. */
    sizes: readonly TestDataSize[];
    /** Creates test data of that size; resolves to a summary for the user ("Creadas 5 listas…"). */
    generate: (sizeId: string, onProgress: (progress: WriteProgress) => void) => Promise<string>;
    /** Deletes the user's data in the dev project; resolves to a summary for the user. */
    clear: (onProgress: (progress: WriteProgress) => void) => Promise<string>;
}
interface EnvironmentPanelProps {
    environment: AppEnvironment;
    canSwitch: boolean;
    testData?: TestDataActions;
    /** Heading level of the card: 2 on the "Acerca de" screen, 3 in its dialog. */
    level?: 2 | 3;
}
/** "Entorno" (Environment) card of "Acerca de" (About): Real / Pruebas switch and test data. */
export declare function EnvironmentPanel({ environment, canSwitch, testData, level }: EnvironmentPanelProps): import("react").JSX.Element | null;
export {};
