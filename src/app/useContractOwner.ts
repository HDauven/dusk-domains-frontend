import { useEffect, useState } from 'react'
import { isDeployedContract } from './contractOwner'

export function useContractOwner(nodeUrl: string, owner: string) {
  const [result, setResult] = useState<{ nodeUrl: string; owner: string; isContract: boolean } | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)])
    void isDeployedContract(nodeUrl, owner, signal).then(isContract => {
      if (!controller.signal.aborted) setResult({ nodeUrl, owner, isContract })
    })
    return () => controller.abort()
  }, [nodeUrl, owner])
  return result?.nodeUrl === nodeUrl && result.owner === owner && result.isContract
}
