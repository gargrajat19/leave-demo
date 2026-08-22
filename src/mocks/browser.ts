import { setupWorker } from 'msw/browser'
import { queueHandlers } from './queueHandlers'
export const worker = setupWorker(...queueHandlers)
