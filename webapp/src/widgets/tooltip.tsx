// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'

import {isFusion} from '../components/fusion/fusion_ui'
import {tip} from '../components/fusion/tip'

import './tooltip.scss'

type Props = {
    title: string
    children: React.ReactNode
    placement?: 'top'|'left'|'right'|'bottom'
}

// Adds tooltip div over children elements, the popup will
// be positioned based on the specified placement
// Default position is 'top'
// Under the Fusion UI, it's Fusion's tooltip (data-am-tip), drawn by the web app above the element; Kanban's own is
// hidden there (fusion_skin.scss).
function Tooltip(props: Props): React.JSX.Element {
    if (isFusion()) {
        return (
            <div
                className='octo-tooltip amfx-tip'
                {...tip(props.title)}
            >
                {props.children}
            </div>
        )
    }

    const placement = props.placement || 'top'
    const className = `octo-tooltip tooltip-${placement}`
    return (
        <div
            className={className}
            data-tooltip={props.title}
        >
            {props.children}
        </div>
    )
}

export default React.memo(Tooltip)
