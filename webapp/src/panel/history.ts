// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Antimatter: the panel's history. Kanban's views (a board, its card, the community's boards, the templates...) keep
// the paths they had under /kanban, in a memory history: their links and routes work as they did, the page's address
// stays the conversation's, and the panel's back button goes back through them.

import {useEffect, useState} from 'react'
import {
    History,
    LocationDescriptor,
    LocationState,
    createLocation,
    createMemoryHistory,
    createPath,
} from 'history'

import {PANEL_HOME, teamOfPath} from './paths'

export type PanelHistory = History & {

    // reset leaves the panel on one view, with nothing to go back to.
    reset: (path?: string) => void

    // canGoBack tells whether the panel has a view to go back to.
    canGoBack: () => boolean

    // back goes to the previous view; a view opened on its own goes back to the channel's boards.
    back: () => void
}

export function makePanelHistory(): PanelHistory {
    const memory = createMemoryHistory({initialEntries: [PANEL_HOME]})

    // The panel's history reads through to the memory history (location, index and length change as it moves).
    const panel = Object.create(memory) as PanelHistory

    panel.reset = (path = PANEL_HOME) => {
        if (memory.index > 0) {
            memory.go(-memory.index)
        }
        memory.replace(path)
    }

    panel.canGoBack = () => memory.index > 0

    panel.back = () => {
        if (memory.index > 0) {
            memory.goBack()
            return
        }
        memory.replace(PANEL_HOME)
    }

    return panel
}

export const panelHistory = makePanelHistory()

type PanelControls = {

    // Whether the Kanban panel is showing.
    isOpen: () => boolean

    // Shows the Kanban panel.
    show: () => void
}

let controls: PanelControls | null = null

// setPanelControls is called once the plugin has registered its panel.
export function setPanelControls(next: PanelControls | null): void {
    controls = next
}

const pathOf = (to: LocationDescriptor<LocationState>) => (typeof to === 'string' ? to : createPath(createLocation(to)))

/**
 * openKanbanPanel shows a view of the Kanban panel, e.g. '/team/<team>/<board>/<view>/<card>'.
 * A closed panel opens on it, with the channel's boards to go back to; an open one goes to it as a link would.
 */
export function openKanbanPanel(path: string, history: PanelHistory = panelHistory): void {
    const open = controls?.isOpen() ?? false
    if (!open) {
        history.reset(PANEL_HOME)
    }

    if (pathOf(path) !== createPath(history.location)) {
        history.push(path)
    }

    if (!open) {
        controls?.show()
    }
}

// openPanelHome opens the panel on the channel's boards, as the channel header button and the app bar icon do.
export function openPanelHome(history: PanelHistory = panelHistory): void {
    if (!(controls?.isOpen() ?? false)) {
        history.reset(PANEL_HOME)
    }
}

// The longest panel state the web app keeps in a pop-out window's address.
const MAX_PANEL_STATE = 512

/**
 * panelPathOfState is the view a pop-out window starts at, from the state the main window's panel reported (a board,
 * a card, the community's boards: /team/<team>/...), or null for the panel's start. The state comes from the window's
 * address, so it is untrusted: only a path of the panel's, without control characters, is taken; the board itself is
 * then fetched as the signed-in person, and one they can't open shows Kanban's error view.
 */
export function panelPathOfState(panelState?: string): string | null {
    if (!panelState || panelState.length > MAX_PANEL_STATE || /[\u0000-\u001f\u007f]/.test(panelState)) {
        return null
    }
    const location = createLocation(panelState)
    if (!location.pathname?.startsWith('/team/') || !teamOfPath(location.pathname) || location.pathname.split('/').includes('..')) {
        return null
    }
    return createPath(location)
}

/**
 * usePanelState keeps the web app told where the panel is (setPanelState: the view's path, or null on the channel's
 * boards), so that "Open in a new window" starts the pop-out at the same board or card; in the pop-out
 * (initialPanelState), the panel starts there, with the channel's boards to go back to. Without these props (the
 * classic UI), the panel works as before.
 */
export function usePanelState(history: PanelHistory, setPanelState?: (state: string | null) => void, initialPanelState?: string): void {
    useState(() => {
        const path = panelPathOfState(initialPanelState)
        if (path) {
            history.reset(PANEL_HOME)
            history.push(path)
        }
        return true
    })

    useEffect(() => {
        if (!setPanelState) {
            return undefined
        }
        const report = () => {
            const path = createPath(history.location)
            setPanelState(path === PANEL_HOME ? null : path)
        }
        report()
        return history.listen(report)
    }, [history, setPanelState])
}
