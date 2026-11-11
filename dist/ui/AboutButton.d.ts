import type { AboutInfo } from './AboutSections.tsx';
export type { Developer } from './AboutSections.tsx';
export type AboutButtonProps = AboutInfo;
/**
 * Info icon button (40 px, for a header, e.g. the sign-in screen's) that opens "Acerca de"
 * (About) in a modal dialog, with the same cards as AboutPage. Inside the app, prefer AboutPage
 * in "Ajustes" (Settings).
 */
export declare function AboutButton(info: AboutButtonProps): import("react").JSX.Element;
