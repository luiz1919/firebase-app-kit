export interface BuildInfo {
    /** Version from package.json. */
    version: string;
    /** Git commit that was built, or '' without git. */
    commit: string;
    /** Build date in ISO format; '' in development. */
    buildTime: string;
}
/** Build date for people (in the device's time zone), or "Versión de desarrollo" without one. */
export declare function formatBuildTime(buildTime: string): string;
