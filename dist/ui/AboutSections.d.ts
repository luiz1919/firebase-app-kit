import type { AppEnvironment } from '../env.ts';
import type { BuildInfo } from '../utils/build.ts';
import type { TestDataActions } from './EnvironmentPanel.tsx';
export interface Developer {
    /** Link text, e.g. "luiz1919 en GitHub". */
    name: string;
    /** '' shows the name without a link (a placeholder such as "Por definir"). */
    url: string;
}
/** A link of the "Enlaces" card. An empty `url` is a placeholder, shown as "Próximamente" (coming soon). */
export interface AboutLink {
    label: string;
    url: string;
}
/** What "Acerca de" (About) shows. Only `appName` and `build` are required; empty cards are left out. */
export interface AboutInfo {
    appName: string;
    /** The app's build constants: { version: __APP_VERSION__, commit: __APP_COMMIT__, buildTime: __BUILD_TIME__ }. */
    build: BuildInfo;
    developer?: Developer;
    /** The app's icon next to its name, e.g. '/icons/icon-192.png'. */
    icon?: string;
    /** One line under the name. */
    tagline?: string;
    /** What the app is for, in a sentence or two. */
    description?: string;
    /** "Tecnología" card: one item per library or service. */
    technology?: readonly string[];
    /** "Privacidad" card: one item per thing the app does with the user's data. */
    privacy?: readonly string[];
    /** Notice above the privacy items, e.g. that the text is a draft. */
    privacyNote?: string;
    /** "Enlaces" card. */
    links?: readonly AboutLink[];
    /** Small print under the links ("X no está asociada con ..."). */
    disclaimer?: string;
    /**
     * Project in use (initFirebase(...).environment). With a dev config, adds the "Entorno" card:
     * "Cambiar a Pruebas" for those allowed (canSwitchEnvironment) and, in Pruebas, "Volver a Real" for everyone.
     */
    environment?: AppEnvironment;
    /** Who may switch to "Pruebas", e.g. the admins (useFeedbackAdmin). */
    canSwitchEnvironment?: boolean;
    /** In "Pruebas": the app's generator and cleaner of test data. */
    testData?: TestDataActions;
}
export declare const DEFAULT_DEVELOPER: Developer;
/**
 * The cards of "Acerca de", shared by AboutPage (a screen, `level` 2) and AboutButton (a dialog,
 * `level` 3): description, "Versión", "Entorno", "Tecnología", "Privacidad" and "Enlaces".
 */
export declare function AboutSections({ info, level }: {
    info: AboutInfo;
    level: 2 | 3;
}): import("react").JSX.Element;
