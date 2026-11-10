import type { AppEnvironment } from '../env.ts';
import type { BuildInfo } from '../utils/build.ts';
import type { TestDataActions } from './EnvironmentPanel.tsx';
export interface Developer {
    /** Link text, e.g. "luiz1919 en GitHub". */
    name: string;
    url: string;
}
export interface AboutButtonProps {
    appName: string;
    /** The app's build constants: { version: __APP_VERSION__, commit: __APP_COMMIT__, buildTime: __BUILD_TIME__ }. */
    build: BuildInfo;
    developer?: Developer;
    /**
     * Project in use (initFirebase(...).environment). With a dev config, adds the "Entorno" section:
     * "Cambiar a Pruebas" for those allowed (canSwitchEnvironment) and, in Pruebas, "Volver a Real" for everyone.
     */
    environment?: AppEnvironment;
    /** Who may switch to "Pruebas", e.g. the admins (useFeedbackAdmin). */
    canSwitchEnvironment?: boolean;
    /** In "Pruebas": the app's generator and cleaner of test data. */
    testData?: TestDataActions;
}
/**
 * "Acerca de" (About) link that opens a modal dialog with the version, commit, build date and
 * developer and, with `environment`, the Real / Pruebas switch and the test data tools.
 */
export declare function AboutButton({ appName, build, developer, environment, canSwitchEnvironment, testData }: AboutButtonProps): import("react").JSX.Element;
