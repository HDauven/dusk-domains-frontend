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
  }
}
