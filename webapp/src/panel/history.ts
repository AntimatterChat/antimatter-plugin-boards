// Copyright (c) 2026-present Antimatter contributors. See LICENSE.txt for license information.

// Antimatter: the panel's history. Kanban's views (a board, its card, the community's boards, the templates...) keep
// the paths they had under /kanban, in a memory history: their links and routes work as they did, the page's address
// stays the conversation's, and the panel's back button goes back through them.

import {
    History,
    LocationDescriptor,
    LocationState,
    createLocation,
    createMemoryHistory,
    createPath,
} from 'history'

import {PANEL_HOME} from './paths'

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
