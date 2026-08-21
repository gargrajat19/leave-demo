import { setupWorker } from 'msw/browser'
import { leaveHandlers } from './handlers'
import { expenseHandlers } from './expenseHandlers'
export const worker = setupWorker(...leaveHandlers, ...expenseHandlers)