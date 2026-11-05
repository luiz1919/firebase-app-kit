// Fechas YYYY-MM-DD en hora local. Sin dependencias.

const dateFormatter = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })

/** Fecha de hoy en hora local, como YYYY-MM-DD. */
export function todayIso(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** Formatea una fecha YYYY-MM-DD ("5 nov 2026") sin desfases de zona horaria. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return dateFormatter.format(new Date(year, month - 1, day))
}
