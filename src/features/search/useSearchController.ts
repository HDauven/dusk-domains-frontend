import {
  checkAvailability,
  forgetPendingReservation,
  openIndexedName,
  openPendingReservation,
} from './searchControllerActions'
import { resetSearchState } from './searchControllerReset'
import type { UseSearchControllerProps } from './searchControllerTypes'

// Availability is checked on Search or Enter only. Checking while typing swapped the result in
// and out on every letter, so the page jumped as people typed.
export function useSearchController(props: UseSearchControllerProps) {
  const cancel = () => props.beginNameRead()
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
    openIndexedName: (name: string) => { cancel(); return openIndexedName(props, name) },
    openPendingReservation: (reservation: Parameters<typeof openPendingReservation>[1]) => {
      cancel()
      return openPendingReservation(props, reservation)
    },
    resetSearch: (nextValue: string) => {
      cancel()
      resetSearchState(props, nextValue)
    },
    // Direct links and saved names open the public profile. Typed searches show availability.
    searchName: (name: string) => {
      cancel()
      return openIndexedName(props, name)
    },
  }
}
