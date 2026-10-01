import { useEffect, useRef } from 'react'
import { scheduleSearch } from './debouncedSearch'
import {
  checkAvailability,
  forgetPendingReservation,
  openIndexedName,
  openPendingReservation,
} from './searchControllerActions'
import { resetSearchState } from './searchControllerReset'
import type { UseSearchControllerProps } from './searchControllerTypes'

export function useSearchController(props: UseSearchControllerProps) {
  const cancelSearch = useRef(() => {})
  useEffect(() => () => cancelSearch.current(), [])
  const cancel = () => { cancelSearch.current(); props.beginNameRead() }
  return {
    forgetPendingReservation: (reservation: Parameters<typeof forgetPendingReservation>[1]) => (
      forgetPendingReservation(props, reservation)
    ),
    handleCheckAvailability: () => { cancel(); return checkAvailability(props) },
    handleSearchHome: () => {
      cancel()
      props.openSearchView()
      resetSearchState(props, '')
    },
    openIndexedName: (name: string) => openIndexedName(props, name),
    openPendingReservation: (reservation: Parameters<typeof openPendingReservation>[1]) => (
      openPendingReservation(props, reservation)
    ),
    resetSearch: (nextValue: string) => {
      cancel()
      resetSearchState(props, nextValue)
      cancelSearch.current = scheduleSearch(nextValue, query => { void checkAvailability({ ...props, query }) })
    },
    // Opens a name the way a typed search would, for example from a /name/ URL.
    searchName: (name: string) => {
      cancel()
      props.openSearchView()
      resetSearchState(props, name)
      return openIndexedName({ ...props, query: name }, name)
    },
  }
}
