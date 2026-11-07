import type { BuildInfo } from '../utils/build.ts';
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
}
/** "Acerca de" (About) link that opens a modal dialog with the version, commit, build date and developer. */
export declare function AboutButton({ appName, build, developer }: AboutButtonProps): import("react").JSX.Element;
