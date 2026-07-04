import type { useDomainRecordState } from '../../features/domains/useDomainRecordState'
import type { useNamePreview } from '../../features/search/useNamePreview'
import type { useRegistrationRuntime } from '../useRegistrationRuntime'

export type NamePreview = ReturnType<typeof useNamePreview>
export type RegistrationRuntime = ReturnType<typeof useRegistrationRuntime>
export type DomainRecordState = ReturnType<typeof useDomainRecordState>
