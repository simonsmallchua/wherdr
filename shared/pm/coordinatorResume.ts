// A coordinator (Alfred too) whose terminal herdr-core ended in a restart (its own stop, a reboot) takes
// its last conversation up again by itself, once. One the user stopped (closed, killed) or
// whose terminal is gone stays stopped, and so does one this decision already acted on.
import { canResume, type CoordinatorAgent } from './coordinator'
import { RESTART_REASONS, type Incident } from './incident'

export interface ResumeRecord { project: string, terminal?: string, ran?: CoordinatorAgent, restartResumed?: string }
export interface EndedTerminal { state?: string, reason?: string | null, finished_ms?: number | null }

// terminal: what herdr-core says of the record's terminal now (undefined: it did not answer, or has none).
export function resumesAfterRestart(rec: ResumeRecord, terminal: EndedTerminal | undefined): boolean {
  if (!rec.terminal || !rec.ran || !canResume(rec.ran.program, rec.project)) return false
  if (rec.restartResumed === rec.terminal) return false
  return terminal?.state === 'finished' && !!terminal.reason && RESTART_REASONS.includes(terminal.reason)
}

// The incident this restart belongs to: the first restart incident of the machine recorded
// since the terminal ended (within a day), so that its resume is logged there.
export function restartIncident(incidents: Incident[], machine: string, endedAt: number | null | undefined): Incident | undefined {
  if (!endedAt) return undefined
  return [...incidents].sort((a, b) => a.at - b.at).find(i => i.cause === 'restart' && i.machine === machine && i.at >= endedAt && i.at - endedAt < 86_400_000)
}
