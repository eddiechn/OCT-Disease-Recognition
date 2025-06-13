/**
 * Calculate the number of days saved between a current appointment date and a new appointment date
 * @param currentDate The current appointment date in ISO format (YYYY-MM-DD)
 * @param newDate The new appointment date
 * @returns The number of days saved (positive if the new date is earlier, negative if later)
 */
export function calculateDaysSaved(currentDate: string, newDate: Date): number {
  const current = new Date(currentDate)
  const daysDiff = Math.floor((current.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24))
  return daysDiff
}
