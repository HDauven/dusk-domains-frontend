import {
  checkAvailability,
  forgetPendingReservation,
  openIndexedName,
  openPendingReservation,
} from './searchControllerActions'
import { resetSearchState } from './searchControllerReset'
import type { UseSearchControllerProps } from './searchControllerTypes'

export function useSearchController(props: UseSearchControllerProps) {
  return {
    forgetPendingReservation: (reservation: Parameters<typeof forgetPendingReservation>[1]) => (
      forgetPendingReservation(props, reservation)
    ),
    handleCheckAvailability: () => checkAvailability(props),
    handleSearchHome: () => {
      props.openSearchView()
      resetSearchState(props, '')
    },
    openIndexedName: (name: string) => openIndexedName(props, name),
    openPendingReservation: (reservation: Parameters<typeof openPendingReservation>[1]) => (
      openPendingReservation(props, reservation)
    ),
    resetSearch: (nextValue: string) => resetSearchState(props, nextValue),
    // Opens a name the way a typed search would, for example from a /name/ URL.
    searchName: (name: string) => {
      props.openSearchView()
      resetSearchState(props, name)
      return checkAvailability({ ...props, query: name })
    },
  }
}
