import type { ReactNode } from 'react'

// Icons from Lucide (https://lucide.dev, ISC license), inlined so the kit and the apps do not
// need an icon library.

function Icon({ size, children }: { size: number; children: ReactNode }) {
  return (
    <svg className="kit-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

export const InfoIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" /></Icon>
)

export const CloseIcon = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></Icon>
)

export const ExternalLinkIcon = ({ size = 14 }: { size?: number }) => (
  <Icon size={size}><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></Icon>
)

export const LogInIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="m10 17 5-5-5-5" /><path d="M15 12H3" /><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" /></Icon>
)

export const EyeIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" /><circle cx="12" cy="12" r="3" /></Icon>
)

export const EyeOffIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" /><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" /><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" /><path d="m2 2 20 20" /></Icon>
)

export const CloudCheckIcon = ({ size = 23 }: { size?: number }) => (
  <Icon size={size}><path d="m17 15-5.5 5.5L9 18" /><path d="M5.516 16.07A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 3.501 7.327" /></Icon>
)

export const CloudUploadIcon = ({ size = 23 }: { size?: number }) => (
  <Icon size={size}><path d="M12 13v8" /><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" /><path d="m8 17 4-4 4 4" /></Icon>
)

export const CloudOffIcon = ({ size = 23 }: { size?: number }) => (
  <Icon size={size}><path d="M10.94 5.274A7 7 0 0 1 15.71 10h1.79a4.5 4.5 0 0 1 4.222 6.057" /><path d="M18.796 18.81A4.5 4.5 0 0 1 17.5 19H9A7 7 0 0 1 5.79 5.78" /><path d="m2 2 20 20" /></Icon>
)

export const CloudAlertIcon = ({ size = 23 }: { size?: number }) => (
  <Icon size={size}><path d="M12 12v4" /><path d="M12 20h.01" /><path d="M8.128 16.949A7 7 0 1 1 15.71 8h1.79a1 1 0 0 1 0 9h-1.642" /></Icon>
)
