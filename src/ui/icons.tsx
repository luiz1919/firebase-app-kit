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

export const MessageIcon = ({ size = 22 }: { size?: number }) => (
  <Icon size={size}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /><path d="M13 8H7" /><path d="M17 12H7" /></Icon>
)

export const PlusIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M5 12h14" /><path d="M12 5v14" /></Icon>
)

export const ArrowLeftIcon = ({ size = 20 }: { size?: number }) => (
  <Icon size={size}><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></Icon>
)

export const ImagePlusIcon = ({ size = 18 }: { size?: number }) => (
  <Icon size={size}><path d="M16 5h6" /><path d="M19 2v6" /><path d="M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /><circle cx="9" cy="9" r="2" /></Icon>
)

export const CopyIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></Icon>
)

export const PencilIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" /><path d="m15 5 4 4" /></Icon>
)

export const TrashIcon = ({ size = 16 }: { size?: number }) => (
  <Icon size={size}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></Icon>
)
