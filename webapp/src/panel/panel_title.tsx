// Copyright (c) 2026-present Antimatter contributors. See LICENSE.txt for license information.

import React, {useEffect, useState} from 'react'
import ReactDOM from 'react-dom'
import {useIntl} from 'react-intl'
import {useHistory} from 'react-router-dom'

import IconButton from '../widgets/buttons/iconButton'
import CompassIcon from '../widgets/icons/compassIcon'
import BoardsAppIcon from '../widgets/icons/boardsAppIcon'

import type {PanelHistory} from './history'

// The title bar of the side panel is the web app's: the views fill the placeholder the plugin registers as its title.
export const PANEL_TITLE_ID = 'kanban-panel-title'
const TITLE_READY_EVENT = 'kanban-panel-title-ready'

/**
 * PanelTitlePlaceholder is the panel's title, as registered with the web app (registerRightHandSidebarComponent):
 * an empty box that the panel's views fill.
 */
export const PanelTitlePlaceholder = (): React.JSX.Element => {
    useEffect(() => {
        window.dispatchEvent(new Event(TITLE_READY_EVENT))
    }, [])

    return (
        <div
            id={PANEL_TITLE_ID}
            className='KanbanPanelTitlePlaceholder'
        />
    )
}

// useTitleContainer is the placeholder, once the web app has drawn it (it may come after the panel's views).
function useTitleContainer(): HTMLElement | null {
    const [container, setContainer] = useState<HTMLElement | null>(() => document.getElementById(PANEL_TITLE_ID))

    useEffect(() => {
        const find = () => {
            const found = document.getElementById(PANEL_TITLE_ID)
            setContainer((current) => (current === found ? current : found))
        }
        find()
        window.addEventListener(TITLE_READY_EVENT, find)
        return () => window.removeEventListener(TITLE_READY_EVENT, find)
    }, [])

    return container
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
 * PanelTitle is the title bar of a panel view: a back button (but on the panel's first view), the view's name and what
 * it shows (a board's name, a channel's).
 */
export const PanelTitle = ({title, subtitle, back = true, actions}: Props): React.JSX.Element | null => {
    const intl = useIntl()
    const history = usePanelHistory()
    const container = useTitleContainer()
    if (!container) {
        return null
    }

    const backLabel = intl.formatMessage({
        id: 'KanbanPanel.back',
        defaultMessage: 'Back',
        description: 'Kanban side panel: the button that goes back to the previous view of the panel.',
    })

    return ReactDOM.createPortal((
        <div
            className='KanbanPanelTitle'
            data-testid='kanban-panel-title'
        >
            {back ? (
                <IconButton
                    className='KanbanPanelTitle__back'
                    onClick={() => history.back()}
                    title={backLabel}
                    icon={<CompassIcon icon='chevron-left'/>}
                />
            ) : (
                <span className='KanbanPanelTitle__logo'>
                    <BoardsAppIcon
                        size={24}
                        colored={true}
                    />
                </span>
            )}
            <span
                className='KanbanPanelTitle__text'
                data-testid='kanban-panel-title-text'
            >
                {title}
            </span>
            {subtitle && (
                <span
                    className='KanbanPanelTitle__subtitle style--none sidebar--right__title__subtitle'
                    data-testid='kanban-panel-subtitle'
                >
                    {subtitle}
                </span>
            )}
            {actions && <span className='KanbanPanelTitle__actions'>{actions}</span>}
        </div>
    ), container)
}
