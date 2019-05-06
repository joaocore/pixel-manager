import React, { Fragment } from 'react'
import { DataProps, graphql } from 'react-apollo'

import PixelIFrame from './PixelIFrame'
import installedPixelsQuery from './queries/installedPixelsQuery.gql'

interface Data {
  installedPixels: string[]
}

const withInstalledPixels = graphql<{}, Data>(installedPixelsQuery)

const PixelManager: React.SFC<Partial<DataProps<Data, {}>>> = ({ data }) => {
  if (!data || data.loading || !data.installedPixels) {
    return null
  }

  return (
    <Fragment>
      {data.installedPixels.map(pixel => (
        <PixelIFrame key={pixel} pixel={pixel} />
      ))}
    </Fragment>
  )
}

export default withInstalledPixels(PixelManager)
