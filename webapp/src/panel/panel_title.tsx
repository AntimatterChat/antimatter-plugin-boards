// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {createContext, useContext, useState} from 'react'
import ReactDOM from 'react-dom'
import {useIntl} from 'react-intl'
import {useHistory} from 'react-router-dom'

import IconButton from '../widgets/buttons/iconButton'
import CompassIcon from '../widgets/icons/compassIcon'

import type {PanelHistory} from './history'

// The panel's toolbar: the row at the top of the panel's body where the view shown puts its title, its back button
// and its actions (the channel's boards: all boards, a new board; a board's name and view...). It's Kanban's own row,
// under the web app's panel header, which is the same for every app (the app's icon and name, its size, a new window,
// close) and has nothing of the app in it.

// The row the views fill, once it's drawn: undefined outside a panel (a view drawn on its own draws its title in
// place), null while the row isn't drawn yet.
const ToolbarSlot = createContext<HTMLElement | null | undefined>(undefined)

/**
 * PanelToolbarRow is the panel's toolbar row, above the views given as children, which fill it with PanelTitle. The
 * row takes no room when the view puts nothing in it.
 */
export const PanelToolbarRow = ({children}: {children: React.ReactNode}): React.JSX.Element => {
    const [slot, setSlot] = useState<HTMLDivElement | null>(null)

    return (
        <>
            <div
                ref={setSlot}
                className='KanbanPanelToolbar'
                data-testid='kanban-panel-toolbar'
            />
            <ToolbarSlot.Provider value={slot}>
                {children}
            </ToolbarSlot.Provider>
        </>
    )
}

// usePanelHistory is the panel's history (its router's), with its back button's moves.
export const usePanelHistory = (): PanelHistory => useHistory() as PanelHistory

type Props = {
    title: React.ReactNode
    subtitle?: React.ReactNode

    // The panel's first view has no back button.
    back?: boolean

    // What the title bar shows at its right (a settings menu...).
    actions?: React.ReactNode
}

/**
 * PanelTitle is the title bar of a panel view, in the panel's toolbar row: a back button (but on the panel's first
 * view), the view's name and what it shows (a board's name, a community's), and its actions.
 */
export const PanelTitle = ({title, subtitle, back = true, actions}: Props): React.JSX.Element | null => {
    const intl = useIntl()
    const history = usePanelHistory()
    const slot = useContext(ToolbarSlot)

    const backLabel = intl.formatMessage({
        id: 'KanbanPanel.back',
        defaultMessage: 'Back',
        description: 'Kanban side panel: the button that goes back to the previous view of the panel.',
    })

    const bar = (
        <div
            className='KanbanPanelTitle'
            data-testid='kanban-panel-title'
        >
            {back && (
                <IconButton
                    className='KanbanPanelTitle__back'
                    onClick={() => history.back()}
                    title={backLabel}
                    icon={<CompassIcon icon='chevron-left'/>}
                />
            )}
            <span
                className='KanbanPanelTitle__text'
                data-testid='kanban-panel-title-text'
            >
                {title}
            </span>
            {subtitle && (
                <span
                    className='KanbanPanelTitle__subtitle'
                    data-testid='kanban-panel-subtitle'
                >
                    {subtitle}
                </span>
            )}
            {actions && <span className='KanbanPanelTitle__actions'>{actions}</span>}
        </div>
    )

    if (slot === undefined) {
        return <div className='KanbanPanelToolbar'>{bar}</div>
    }
    if (!slot) {
        return null
    }
    return ReactDOM.createPortal(bar, slot)
}
