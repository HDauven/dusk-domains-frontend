import type { ResolverRecord } from '../../../names/internal'

export type AsyncAction = () => Promise<void> | void
export type ClearRecordAction = (record: ResolverRecord) => Promise<void> | void
