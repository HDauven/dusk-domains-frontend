import {
  createPreviewDuskTxHandle,
  type DuskConnectAppLike,
} from '../names/internal'

export function createPreviewRegistrationApp(name: string): DuskConnectAppLike {
  return {
    async readContract() {
      throw new Error('Registration does not require a read call.')
    },
    async prepareContractCall(params) {
      return {
        ...params,
        preview: true,
      }
    },
    async writeContract(params) {
      return createPreviewDuskTxHandle({
        txId: `preview:${name}:${params.functionName}`,
      })
    },
  }
}
