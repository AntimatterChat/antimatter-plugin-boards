// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useContext} from 'react'

// Marks the panel's root, so that the link handler leaves the panel's own links to its router, and the keyboard
// shortcuts only act on the panel.
export const PANEL_ROOT_ATTRIBUTE = 'data-kanban-panel'
export const PANEL_ROOT_SELECTOR = `[${PANEL_ROOT_ATTRIBUTE}]`

// Whether a view shows in the side panel rather than on the full page it had (the public shared board still has one).
export const InPanelContext = React.createContext(false)

export const useInPanel = (): boolean => useContext(InPanelContext)

let lastInteractionInPanel = false

const track = (event: Event) => {
    const target = event.target as Element | null
    lastInteractionInPanel = Boolean(target?.closest?.(PANEL_ROOT_SELECTOR))
}

/**
 * trackPanelFocus follows where the user last clicked or moved the focus: in the panel or in the rest of the app.
 * It returns the function that stops it.
 */
export function trackPanelFocus(root: Document = document): () => void {
    root.addEventListener('pointerdown', track, true)
    root.addEventListener('mousedown', track, true)
    root.addEventListener('focusin', track, true)
    return () => {
        root.removeEventListener('pointerdown', track, true)
        root.removeEventListener('mousedown', track, true)
        root.removeEventListener('focusin', track, true)
        lastInteractionInPanel = false
    }
}

/**
 * isPanelActive tells whether a keyboard shortcut is for the panel: the user last clicked in it or moved the focus
 * into it. Outside the panel (the full page), it always is. Kanban's shortcuts (undo, delete the selected cards...)
 * must not act on a board while the user types a message next to it.
 */
export function isPanelActive(inPanel: boolean): boolean {
    return !inPanel || lastInteractionInPanel
}
