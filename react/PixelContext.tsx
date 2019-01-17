import hoistNonReactStatics from 'hoist-non-react-statics'
import React, { Component } from 'react'

const SUBSCRIPTION_TIMEOUT = 100

type EventType = 'homeView'
  | 'productView'
  | 'otherView'
  | 'categoryView'
  | 'departmentView'
  | 'internalSiteSearchView'
  | 'pageInfo'
  | 'pageView'
  | 'addToCart'
  | 'removeFromCart'

export interface PixelData {
  event?: EventType
  [data: string]: any
}

type PixelEventHandler = (data: PixelData) => void

export type Subscriber = {
  [E in EventType]?: PixelEventHandler
}

export interface ContextType {
  subscribe: (s: Subscriber) => () => void
  push: (data: PixelData) => void
}

const PixelContext = React.createContext<ContextType>({
  push: () => undefined,
  subscribe: () => () => undefined,
})

const getDisplayName = (comp: React.ComponentType<any>) => comp.displayName || comp.name || 'Component'

/**
 * Pixel is the HOC Component that provides an event subscription to the
 * Wrapped Component. This component will be used by the installed apps.
 */
export function Pixel<T>(WrappedComponent: React.ComponentType<T & ContextType>) {
  const PixelComponent: React.SFC<T> = props => (
    <PixelContext.Consumer>
      {({ subscribe, push }) =>
        <WrappedComponent
          {...props}
          push={push}
          subscribe={subscribe}
        />
      }
    </PixelContext.Consumer>
  )

  PixelComponent.displayName = `withPixel(${getDisplayName(WrappedComponent)})`

  return hoistNonReactStatics(PixelComponent, WrappedComponent)
}

interface ProviderState {
  subscribers: Subscriber[],
}

/**
 * HOC Component that has the Pixel logic, dispatching store events
 * to the subscribed external components.
 */
class PixelProvider extends Component<{}, ProviderState> {
  public state = {
    subscribers: [],
  }

  private sendingEvents = false

  public handleOnlineStatus() {
    const pixelQueue: PixelData[] = JSON.parse(localStorage.pixelQueue) || []

    if (!pixelQueue.length) {
      return
    }

    this.sendQueuedEvents()
  }

  public componentDidMount() {
    window.addEventListener('online', this.handleOnlineStatus)
  }

  public componentWillUnmount() {
    window.addEventListener('online', this.handleOnlineStatus)
  }

  /**
   * Notify all subscribers that have a valid event handler
   * defined for the corresponding data
   */
  public notifySubscribers = (data: PixelData) => {
    this.state.subscribers.forEach((subscriber: Subscriber) => {
      if (!data.event || !subscriber[data.event]) {
        return
      }

      // don't know why I need to add the bang here
      // since I check for `!subscriber[data.event]`
      // above, but typescript complains without it.
      subscriber[data.event]!(data)
    })
  }

  /**
   * Notify all subscribers of an event data
   */
  public push = (data: PixelData) => {
    const notify = () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        const pixelQueue: PixelData[] = JSON.parse(localStorage.pixelQueue) || []

        pixelQueue.push(data)

        localStorage.pixelQueue = JSON.stringify(pixelQueue)
      } else {
        this.notifySubscribers(data)
      }
    }

    if (this.state.subscribers.length === 0) {
      setTimeout(notify, SUBSCRIPTION_TIMEOUT)
    } else {
      notify()
    }
  }

  /**
   * Subscribe to all pixel events
   *
   * @returns {Function} Unsubscribe function
   */
  public subscribe = (subscriber: Subscriber) => {
    if (subscriber) {
      this.setState(state => ({
        subscribers: [subscriber, ...state.subscribers],
      }))
    }

    return () => {
      this.setState(state => ({
        subscribers: state.subscribers.filter(sub => sub !== subscriber),
      }))
    }
  }

  public render() {
    return (
      <PixelContext.Provider
        value={{
          push: this.push,
          subscribe: this.subscribe,
        }}
      >
        {this.props.children}
      </PixelContext.Provider>
    )
  }

  private sendQueuedEvents() {
    if (this.sendingEvents) {
      return
    }

    this.sendingEvents = true

    const pixelQueue: PixelData[] = JSON.parse(localStorage.pixelQueue) || []

    pixelQueue.forEach(
      queuedEvent => this.notifySubscribers(queuedEvent)
    )

    localStorage.pixelQueue = JSON.stringify([])

    this.sendingEvents = false
  }
}

export default { Pixel, PixelProvider }
