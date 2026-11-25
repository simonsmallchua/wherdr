import { describe, expect, it } from 'vitest'
import { restartIncident, resumesAfterRestart } from '../shared/pm/coordinatorResume'
import type { Incident } from '../shared/pm/incident'

const rec = { project: 'OS', terminal: 't7', ran: { program: 'omp' as const } }
const ended = (reason: string) => ({ state: 'finished', reason, finished_ms: 1000 })

describe('a coordinator ended by a restart resumes by itself', () => {
  it('resumes after stopped_by_restart, not when the user stopped it or it still runs', () => {
    expect(resumesAfterRestart(rec, ended('stopped_by_restart'))).toBe(true)
    expect(resumesAfterRestart(rec, ended('killed'))).toBe(false)
    expect(resumesAfterRestart(rec, ended('exited'))).toBe(false)
    expect(resumesAfterRestart(rec, { state: 'running' })).toBe(false)
    // herdr-core did not answer, or the terminal is gone: nothing is known, nothing is done.
    expect(resumesAfterRestart(rec, undefined)).toBe(false)
  })

  it('never twice for one terminal, again for a later one', () => {
    expect(resumesAfterRestart({ ...rec, restartResumed: 't7' }, ended('stopped_by_restart'))).toBe(false)
    expect(resumesAfterRestart({ ...rec, terminal: 't9', restartResumed: 't7' }, ended('stopped_by_restart'))).toBe(true)
  })

  it('needs a conversation to take up, in a program that can resume, and Alfred resumes like the others', () => {
    expect(resumesAfterRestart({ project: 'OS', terminal: 't7' }, ended('stopped_by_restart'))).toBe(false)
    expect(resumesAfterRestart({ ...rec, ran: { program: 'gemini' as never } }, ended('stopped_by_restart'))).toBe(false)
    expect(resumesAfterRestart({ ...rec, project: '_main' }, ended('stopped_by_restart'))).toBe(true)
    expect(resumesAfterRestart({ ...rec, project: '_main' }, ended('killed'))).toBe(false)
  })

  it('logs on the first restart incident of its machine after its terminal ended', () => {
    const i = (id: string, at: number, more: Partial<Incident> = {}): Incident => ({ id, at, machine: '', label: 'here', cause: 'restart', evidence: [], tasks: [], runs: [], ...more })
    const list = [i('late', 5000), i('other', 1500, { machine: 'b' }), i('killed', 1500, { cause: 'killed' }), i('before', 500), i('first', 2000)]
    expect(restartIncident(list, '', 1000)?.id).toBe('first')
    expect(restartIncident(list, '', undefined)).toBeUndefined()
    expect(restartIncident([i('old', 1000 + 2 * 86_400_000)], '', 1000)).toBeUndefined()
  })
})
