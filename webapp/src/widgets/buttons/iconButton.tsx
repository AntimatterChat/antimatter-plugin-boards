// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'

import './iconButton.scss'
import {Utils} from '../../utils'
import {iconTip} from '../../components/fusion/tip'

type Props = {
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void
    title?: string
    icon?: React.ReactNode
    className?: string
    size?: string
    inverted?: boolean
    onMouseDown?: (e: React.MouseEvent<HTMLButtonElement>) => void
}

function IconButton(props: Props): React.JSX.Element {
    const classNames: Record<string, boolean> = {
        IconButton: true,
        'style--inverted': Boolean(props.inverted),
    }
    classNames[`${props.className}`] = Boolean(props.className)
    classNames[`size--${props.size}`] = Boolean(props.size)

    return (
        <button
            type='button'
            onClick={props.onClick}
            onMouseDown={props.onMouseDown}
            className={Utils.generateClassName(classNames)}

            // Its name, shown as Fusion's tooltip under the Fusion UI and the browser's under the classic UI.
            {...(props.title ? iconTip(props.title) : {})}
        >
            {props.icon}
        </button>
    )
}

export default React.memo(IconButton)
