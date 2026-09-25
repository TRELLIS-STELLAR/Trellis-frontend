/**
 * Stable categories exposed to user interfaces and support tooling.
 * Raw provider and contract messages are intentionally not returned to users.
 */
export type TrellisErrorCode =
  | 'TX_CANCELLED'
  | 'SIMULATION_FAILED'
  | 'INSUFFICIENT_BALANCE'
  | 'UNAUTHORIZED'
  | 'VALIDATION_FAILED'
  | 'NETWORK_UNAVAILABLE'
  | 'UNEXPECTED_ERROR'

export interface UserSafeError {
  code: TrellisErrorCode
  message: string
  retryable: boolean
  correlationId: string
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error ?? '')
}

function createCorrelationId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `trellis-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/**
 * Maps wallet, network, and contract failures to stable product-facing data.
 * The original error should only be logged in a protected diagnostic context.
 */
export function toUserSafeError(error: unknown, correlationId = createCorrelationId()): UserSafeError {
  const message = errorMessage(error).toLowerCase()

  if (message.includes('user rejected') || message.includes('user declined')) {
    return {
      code: 'TX_CANCELLED',
      message: 'Transaction cancelled. Review the details and approve it when you are ready.',
      retryable: false,
      correlationId,
    }
  }

  if (message.includes('insufficient balance') || message.includes('underfunded')) {
    return {
      code: 'INSUFFICIENT_BALANCE',
      message: 'Your wallet does not have enough funds to complete this transaction.',
      retryable: false,
      correlationId,
    }
  }

  if (message.includes('unauthorized') || message.includes('not authorized') || message.includes('auth')) {
    return {
      code: 'UNAUTHORIZED',
      message: 'You are not authorized to perform this action. Reconnect your wallet and try again.',
      retryable: false,
      correlationId,
    }
  }

  if (message.includes('simulation failed')) {
    return {
      code: 'SIMULATION_FAILED',
      message: 'This transaction cannot be completed with the current details. Review the values and try again.',
      retryable: true,
      correlationId,
    }
  }

  if (message.includes('invalid') || message.includes('validation')) {
    return {
      code: 'VALIDATION_FAILED',
      message: 'Some transaction details are invalid. Review the highlighted values and try again.',
      retryable: false,
      correlationId,
    }
  }

  if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
    return {
      code: 'NETWORK_UNAVAILABLE',
      message: 'We could not reach the network. Check your connection and try again.',
      retryable: true,
      correlationId,
    }
  }

  return {
    code: 'UNEXPECTED_ERROR',
    message: 'We could not complete this action. Try again shortly, then contact support with the reference ID if it persists.',
    retryable: true,
    correlationId,
  }
}

/**
 * Backwards-compatible helper for existing call sites that only render text.
 */
export function getHumanReadableError(error: unknown): string {
  return toUserSafeError(error).message
}

/** Common Soroban error-code families for low-level diagnostics. */
export const SOROBAN_ERROR_CODES = {
  CONTRACT_ERR: 1,
  HOST_ERR: 2,
  AUTH_ERR: 3,
} as const