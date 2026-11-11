import type { AboutInfo } from './AboutSections.tsx';
export interface AboutPageProps extends AboutInfo {
    /** Way back to the settings screen: a link (hash routes) or a button (screens kept in state). */
    back?: {
        label: string;
        href?: string;
        onClick?: () => void;
    };
}
/**
 * "Acerca de" (About) as a screen, opened from the app's "Ajustes" (Settings): the app's icon,
 * name and tagline, then the cards (see AboutInfo). Its <h1> (class kit-about-title) takes
 * tabIndex -1, so the app can move the focus to it after navigating.
 */
export declare function AboutPage({ back, ...info }: AboutPageProps): import("react").JSX.Element;
