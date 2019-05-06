import React, { memo, useRef, useEffect } from 'react'
import { useRuntime } from 'vtex.render-runtime'

import { PixelData, usePixel } from './PixelContext'

interface Props {
  pixel: string
}

// internal: the apps bellow need special
// access and are trusted.
const WHITELIST = [
  'vtex.request-capture',
  'gocommerce.google-analytics',
  'vtex.google-analytics',
]

const ACCOUNT_WHITELIST = ['boticario']

const isWhitelisted = (app: string, accountName: string): boolean => {
  return WHITELIST.includes(app) || ACCOUNT_WHITELIST.includes(accountName)
}

const sendEvent = (frameWindow: Window, data: PixelData) => {
  frameWindow.postMessage(data, '*')
}

const PixelIFrame: React.FunctionComponent<Props> = ({ pixel }) => {
  const frame: React.RefObject<HTMLIFrameElement> = useRef(null)

  const {
    culture: { currency },
    account,
  } = useRuntime()
  const { subscribe } = usePixel()

  useEffect(() => {
    const pixelEventHandler = (event: string) => (data: PixelData) => {
      if (frame.current === null || frame.current.contentWindow === null) {
        return
      }

      const eventName = `vtex:${event}`

      const eventData = {
        currency,
        eventName,
        ...data,
      }

      sendEvent(frame.current.contentWindow, eventData)
    }

    const unsubscribe = subscribe({
      addToCart: pixelEventHandler('addToCart'),
      categoryView: pixelEventHandler('categoryView'),
      departmentView: pixelEventHandler('departmentView'),
      homeView: pixelEventHandler('homeView'),
      internalSiteSearchView: pixelEventHandler('internalSiteSearchView'),
      otherView: pixelEventHandler('otherView'),
      pageInfo: pixelEventHandler('pageInfo'),
      pageView: pixelEventHandler('pageView'),
      productView: pixelEventHandler('productView'),
      productClick: pixelEventHandler('productClick'),
      removeFromCart: pixelEventHandler('removeFromCart'),
      pageComponentInteraction: pixelEventHandler('pageComponentInteraction'),
    })

    return () => unsubscribe()
  }, [currency, pixel, subscribe])

  const [appName] = pixel.split('@')

  return (
    <iframe
      title={pixel}
      hidden
      sandbox={isWhitelisted(appName, account) ? undefined : 'allow-scripts'}
      src={`/tracking-frame/${pixel}`}
      ref={frame}
    />
  )
}

const areEqual = (prevProps: Props, props: Props) =>
  prevProps.pixel === props.pixel

export default memo(PixelIFrame, areEqual)
