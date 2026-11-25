// After a reboot or a herdr-core restart: each coordinator (Alfred too) whose terminal herdr-core
// ended in it (stopped_by_restart, shared/pm/coordinatorResume.ts) takes its last conversation
// up again by itself, as `coordinator start <KEY> --resume` does, once per terminal. A machine
// that cannot run it yet (offline, not ready) is tried again next tick; one the user stopped
// stays stopped. The resume is always logged in the project's log (Alfred's: the log under MAIN), and
// on the restart incident when there is one: an incident exists only when a task's agent ended too.
import { coordinatorUrls, serverPort, startCoordinator } from './pmCoordinator'
import { MAIN } from '../../shared/pm/coordinator'
import { HerdrError } from './herdr'
import type { CoreAdminDeps } from './coreCreate'
import type { PmStore } from './pmStore'
import { restartIncident, resumesAfterRestart, type EndedTerminal } from '../../shared/pm/coordinatorResume'

type Deps = CoreAdminDeps & { store: PmStore }
const BY = 'engine'
const TRANSIENT = ['unreachable', 'offline', 'busy']

export async function resumeCoordinators(deps: Deps): Promise<string[]> {
  const { store } = deps
  const resumed: string[] = []
  for (const rec of await store.coordinators()) {
    if (!rec.terminal) continue
    const t = await deps.call<EndedTerminal>('terminal.get', { terminal: rec.terminal }, 3000).catch(() => undefined)
    if (!resumesAfterRestart(rec, t)) continue
    // Alfred has no project: it runs on this computer.
    const machine = rec.project === MAIN ? '' : (await store.projects()).find(p => p.key === rec.project)?.machine
    if (machine === undefined) continue
    const urls = coordinatorUrls(new URL(`http://127.0.0.1:${serverPort()}`))
    try {
      // Marked first: a start that fails for any other reason is the user's to retry, never looped.
      await store.saveCoordinator({ ...rec, restartResumed: rec.terminal })
      await startCoordinator(deps, rec.project, { resume: true }, urls)
    } catch (e) {
      if (e instanceof HerdrError && TRANSIENT.includes(e.code)) {
        await store.saveCoordinator({ ...(await store.coordinator(rec.project) ?? rec), restartResumed: rec.restartResumed })
        continue
      }
      await store.logProject(rec.project, { by: BY, text: `could not resume the coordinator's conversation after a restart: ${(e as Error).message}` }).catch(() => {})
      continue
    }
    const i = restartIncident(await store.incidents(), machine, t?.finished_ms)
    await store.logProject(rec.project, { by: BY, text: `resumed ${rec.project === MAIN ? "Alfred's" : "the coordinator's"} last conversation by itself after a restart (its terminal ended: ${t!.reason}${i ? `; incident ${i.id}` : ''})` }).catch(() => {})
    if (i) await store.resumedIncident(i.id, rec.project)
    resumed.push(rec.project)
  }
  return resumed
}
