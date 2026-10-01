// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'

// The Boards app icon of the Antimatter UI: three kanban columns drawn as a stroke icon on a 24x24 grid,
// in the Boards app colour.
export const boardsAppColor = '#F472B6'

const columns = [
    {x: 3, height: 11},
    {x: 9.5, height: 7},
    {x: 16, height: 15},
]

const svgMarkup = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="${boardsAppColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">`,
    ...columns.map(({x, height}) => `<rect x="${x}" y="4" width="5" height="${height}" rx="1.5"/>`),
    '</svg>',
].join('')

// The app bar only takes an image URL, so it gets the icon as a data URL with the colour baked in.
export const boardsAppIconURL = `data:image/svg+xml,${encodeURIComponent(svgMarkup)}`

type Props = {
    size?: number

    // Draw the icon in the Boards app colour instead of the surrounding text colour.
    colored?: boolean
}

export default function BoardsAppIcon({size = 20, colored = false}: Props): React.JSX.Element {
    return (
        <svg
            className='BoardsAppIcon'
            width={size}
            height={size}
            viewBox='0 0 24 24'
            style={{fill: 'none', flex: 'none', color: colored ? boardsAppColor : undefined}}
            stroke='currentColor'
            strokeWidth={1.8}
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'
        >
            {columns.map(({x, height}) => (
                <rect
                    key={x}
                    x={x}
                    y={4}
                    width={5}
                    height={height}
                    rx={1.5}
                />
            ))}
        </svg>
    )
}
