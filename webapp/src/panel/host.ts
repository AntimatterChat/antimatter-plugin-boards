// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Antimatter: what the panel asks of the web app around it. Kanban keeps its own store; the panel's width and the
// current community and channel are the web app's.

import {useEffect} from 'react'
import {Action, Store} from 'redux'

// The web app's action and state for an expanded side panel. In the Fusion UI, an app's panel that is expanded takes
// all the room the conversation leaves it (its user can still drag its edge); in the classic UI, it covers the
// conversation.
export const SET_RHS_EXPANDED = 'SET_RHS_EXPANDED'

export const setPanelExpanded = (expanded: boolean): {type: string, expanded: boolean} => ({type: SET_RHS_EXPANDED, expanded})

export const isPanelExpanded = (state: unknown): boolean => Boolean((state as {views?: {rhs?: {isSidebarExpanded?: boolean}}})?.views?.rhs?.isSidebarExpanded)

let hostStore: Store<unknown, Action> | null = null

// setHostStore is called once by the plugin, with the web app's store.
export function setHostStore(store: Store<unknown, Action> | null): void {
    hostStore = store
}

export const getHostStore = (): Store<unknown, Action> | null => hostStore

/**
 * useExpandedPanel widens the side panel while the view that calls it shows (a board, which was a full page), and
 * gives it back its width when the view goes, unless it was already wide.
 */
export function useExpandedPanel(active = true, store: Store<unknown, Action> | null = hostStore): void {
    useEffect(() => {
        if (!active || !store) {
            return undefined
        }

        const wasExpanded = isPanelExpanded(store.getState())

        // After the web app's own effects: opening the panel first gives it its default width.
        const timer = window.setTimeout(() => {
            if (!isPanelExpanded(store.getState())) {
                store.dispatch(setPanelExpanded(true))
            }
        }, 0)

        return () => {
            window.clearTimeout(timer)
            if (!wasExpanded && isPanelExpanded(store.getState())) {
                store.dispatch(setPanelExpanded(false))
            }
        }
    }, [active, store])
}
