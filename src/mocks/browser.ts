import { setupWorker } from 'msw/browser'
import { queueHandlers } from './queueHandlers'
import { demoHandlers } from './demoHandlers'
export const worker = setupWorker(...queueHandlers, ...demoHandlers)
