// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'

// Fusion's line icons (the web app's sprite, symbols #am-i-<name>) that Kanban draws under the Fusion UI, for the
// Compass icons it draws under the classic UI. A Compass icon without a match in Fusion's set keeps its glyph. A
// chevron is Fusion's (pointing down), turned.
type FusionMatch = {name: string, turn?: number}

export const COMPASS_TO_FUSION: Record<string, FusionMatch> = {
    plus: {name: 'plus'},
    'chevron-down': {name: 'chev'},
    'chevron-up': {name: 'chev', turn: 180},
    'chevron-right': {name: 'chev', turn: -90},
    'chevron-left': {name: 'chev', turn: 90},
    'product-boards': {name: 'kanban'},
    kanban: {name: 'kanban'},
    'view-grid-outline': {name: 'apps'},
    apps: {name: 'apps'},
    'content-copy': {name: 'copy'},
    'trash-can-outline': {name: 'trash'},
    magnify: {name: 'search'},
    'pencil-outline': {name: 'pen'},
    'emoticon-outline': {name: 'smile'},
    'lock-outline': {name: 'lock'},
    'message-text-outline': {name: 'chat'},
    'dots-horizontal': {name: 'dots'},
    'dots-vertical': {name: 'dots', turn: 90},
    check: {name: 'check'},
    close: {name: 'x'},
    'link-variant': {name: 'link'},
    globe: {name: 'globe'},
    'folder-outline': {name: 'folder'},
    'folder-plus-outline': {name: 'folder'},
    'eye-outline': {name: 'eye'},
    'eye-off-outline': {name: 'eye-off'},
    paperclip: {name: 'attach'},
    'export-variant': {name: 'export'},
    'hand-right': {name: 'hand'},
    'settings-outline': {name: 'cog'},
    update: {name: 'history'},
}

// The Fusion icons Kanban uses: each must be a symbol of Fusion's sprite (see icon.test.tsx).
export const FUSION_ICON_NAMES = Array.from(new Set(Object.values(COMPASS_TO_FUSION).map((m) => m.name)))

type Props = {
    name: string
    turn?: number
    className?: string
}

/**
 * FusionIcon draws one of Fusion's icons, as Fusion's own (.am-ic): a line drawn in the text's colour. Its stroke is
 * set on the element too, so it looks the same wherever it's drawn.
 */
export default function FusionIcon({name, turn, className}: Props): React.JSX.Element {
    return (
        <svg
            className={'am-ic' + (className ? ` ${className}` : '')}
            fill='none'
            stroke='currentColor'
            strokeWidth={1.8}
            strokeLinecap='round'
            strokeLinejoin='round'
            aria-hidden='true'
            data-fusion-icon={name}
            style={turn ? {transform: `rotate(${turn}deg)`} : undefined}
        >
            <use href={`#am-i-${name}`}/>
        </svg>
    )
}
