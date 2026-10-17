// Copyright (c) 2026-present Antimatter contributors. See LICENSE.txt for license information.

import {makePanelHistory, openKanbanPanel, openPanelHome, setPanelControls} from './history'
import {PANEL_HOME} from './paths'

describe('panel/history', () => {
    afterEach(() => {
        setPanelControls(null)
    })

    test('starts on the channel\'s boards, with nothing to go back to', () => {
        const history = makePanelHistory()
        expect(history.location.pathname).toBe(PANEL_HOME)
        expect(history.canGoBack()).toBe(false)
    })

    test('goes back through the views, and back to the channel\'s boards from a view opened on its own', () => {
        const history = makePanelHistory()
        history.push('/team/t1')
        history.push('/team/t1/b1')
        expect(history.canGoBack()).toBe(true)

        history.back()
        expect(history.location.pathname).toBe('/team/t1')
        history.back()
        expect(history.location.pathname).toBe(PANEL_HOME)

        history.replace('/team/t1/b1')
        history.back()
        expect(history.location.pathname).toBe(PANEL_HOME)
    })

    test('reset leaves one view', () => {
        const history = makePanelHistory()
        history.push('/team/t1')
        history.push('/team/t1/b1')
        history.reset('/team/t1/b2')
        expect(history.location.pathname).toBe('/team/t1/b2')
        expect(history.canGoBack()).toBe(false)
    })

    test('a closed panel opens on the view, with the channel\'s boards to go back to', () => {
        const history = makePanelHistory()
        history.push('/team/t1')
        const show = jest.fn()
        setPanelControls({isOpen: () => false, show})

        openKanbanPanel('/team/t1/b1/v1/c1', history)

        expect(show).toHaveBeenCalledTimes(1)
        expect(history.location.pathname).toBe('/team/t1/b1/v1/c1')
        history.back()
        expect(history.location.pathname).toBe(PANEL_HOME)
    })

    test('an open panel goes to the view as a link would, once', () => {
        const history = makePanelHistory()
        history.push('/team/t1')
        const show = jest.fn()
        setPanelControls({isOpen: () => true, show})

        openKanbanPanel('/team/t1/b1', history)
        openKanbanPanel('/team/t1/b1', history)

        expect(show).not.toHaveBeenCalled()
        expect(history.location.pathname).toBe('/team/t1/b1')
        history.back()
        expect(history.location.pathname).toBe('/team/t1')
    })

    test('the channel header button and the app bar icon open a closed panel on the channel\'s boards', () => {
        const history = makePanelHistory()
        history.push('/team/t1/b1')

        setPanelControls({isOpen: () => true, show: jest.fn()})
        openPanelHome(history)
        expect(history.location.pathname).toBe('/team/t1/b1')

        setPanelControls({isOpen: () => false, show: jest.fn()})
        openPanelHome(history)
        expect(history.location.pathname).toBe(PANEL_HOME)
    })
})
