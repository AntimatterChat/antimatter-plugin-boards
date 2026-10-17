// Copyright (c) 2026-present Antimatter contributors. See LICENSE.txt for license information.

import React from 'react'
import {IntlProvider} from 'react-intl'
import {Provider as ReduxProvider} from 'react-redux'
import {Router} from 'react-router-dom'
import configureStore from 'redux-mock-store'
import {thunk} from 'redux-thunk'
import {act, render, renderHook, screen} from '@testing-library/react'

import {InPanelContext} from './context'
import {makePanelHistory, panelPathOfState, usePanelState} from './history'
import {PanelRoutes} from './panel'
import {PANEL_HOME} from './paths'

jest.mock('../pages/boardPage/boardPage', () => ({__esModule: true, default: () => <div data-testid='board-page'/>}))
jest.mock('../pages/accessDeniedPage', () => ({__esModule: true, default: () => <div data-testid='access-denied'/>}))
jest.mock('../pages/errorPage', () => ({__esModule: true, default: () => <div data-testid='error-page'/>}))
jest.mock('../components/rhsChannelBoards', () => ({__esModule: true, default: () => <div data-testid='channel-boards'/>}))
jest.mock('../store/initialLoad', () => ({initialLoad: () => ({type: 'mock/initialLoad'})}))

// Antimatter: "Open in a new window" starts the pop-out at the board or card the panel shows: the panel tells the web
// app where it is (setPanelState), and the pop-out's panel starts there (initialPanelState, from its address).
describe('panel/usePanelState', () => {
    test('the pop-out starts at the board, with the channel\'s boards to go back to', () => {
        const history = makePanelHistory()
        renderHook(() => usePanelState(history, undefined, '/team/t1/b1/v1/c1'))

        expect(history.location.pathname).toBe('/team/t1/b1/v1/c1')
        history.back()
        expect(history.location.pathname).toBe(PANEL_HOME)
    })

    test('starts only once, whatever the panel does next', () => {
        const history = makePanelHistory()
        const {rerender} = renderHook(() => usePanelState(history, undefined, '/team/t1/b1'))
        act(() => {
            history.push('/team/t1')
        })
        rerender()
        expect(history.location.pathname).toBe('/team/t1')
    })

    test('the main window reports where the panel is, and null on the channel\'s boards', () => {
        const history = makePanelHistory()
        const setPanelState = jest.fn()
        renderHook(() => usePanelState(history, setPanelState))

        expect(setPanelState).toHaveBeenLastCalledWith(null)

        act(() => {
            history.push('/team/t1/b1/v1')
        })
        expect(setPanelState).toHaveBeenLastCalledWith('/team/t1/b1/v1')

        act(() => {
            history.push('/team/t1/b1/v1/c1?x=1')
        })
        expect(setPanelState).toHaveBeenLastCalledWith('/team/t1/b1/v1/c1?x=1')

        act(() => {
            history.reset()
        })
        expect(setPanelState).toHaveBeenLastCalledWith(null)
    })

    test('stops reporting once the panel closes', () => {
        const history = makePanelHistory()
        const setPanelState = jest.fn()
        const {unmount} = renderHook(() => usePanelState(history, setPanelState))
        unmount()
        setPanelState.mockClear()

        history.push('/team/t1/b1')
        expect(setPanelState).not.toHaveBeenCalled()
    })

    test('without the props (the classic UI), the panel works as before', () => {
        const history = makePanelHistory()
        history.push('/team/t1')
        renderHook(() => usePanelState(history))

        expect(history.location.pathname).toBe('/team/t1')
        expect(history.canGoBack()).toBe(true)
    })

    test.each([
        ['/team/t1/b1/v1/c1', '/team/t1/b1/v1/c1'],
        ['/team/t1', '/team/t1'],
        ['/team/t1/b1?r=x#c', '/team/t1/b1?r=x#c'],
        ['', null],
        [PANEL_HOME, null],
        ['/welcome', null],
        ['/lumen/channels/town-square', null],
        ['https://elsewhere.example.com/team/t1', null],
        ['/team/', null],
        ['/team/t1/../../admin_console', null],
        ['/team/t1/b1\nx', null],
        ['/team/' + 'x'.repeat(600), null],
    ])('takes %j from the pop-out\'s address as %j', (state, expected) => {
        expect(panelPathOfState(state)).toBe(expected)
    })

    test('an untrusted state that isn\'t the panel\'s leaves the pop-out on the channel\'s boards', () => {
        const history = makePanelHistory()
        renderHook(() => usePanelState(history, undefined, 'javascript:alert(1)'))
        expect(history.location.pathname).toBe(PANEL_HOME)
        expect(history.canGoBack()).toBe(false)
    })
})

describe('the pop-out\'s panel', () => {
    const mockStore = configureStore([thunk])
    const makeStore = (globalError = '') => mockStore({
        users: {me: {id: 'u1', is_guest: false, props: {}}, loggedIn: true, myConfig: {welcomePageViewed: {value: '1'}}},
        clientConfig: {value: {featureFlags: {}}},
        globalError: {value: globalError},
        teams: {current: {id: 't1', title: 'Lumen'}, currentId: 't1'},
        channels: {current: {id: 'ch1', display_name: 'Town Square', type: 'O'}},
        boards: {current: '', boards: {}, templates: {}, myBoardMemberships: {}},
        views: {current: '', views: {}},
        cards: {cards: {}, current: ''},
    })

    const Popout = ({store, history, initialPanelState}: {store: ReturnType<typeof makeStore>, history: ReturnType<typeof makePanelHistory>, initialPanelState: string}) => {
        usePanelState(history, undefined, initialPanelState)
        return (
            <IntlProvider locale='en'>
                <ReduxProvider store={store}>
                    <Router history={history}>
                        <InPanelContext.Provider value={true}>
                            <PanelRoutes/>
                        </InPanelContext.Provider>
                    </Router>
                </ReduxProvider>
            </IntlProvider>
        )
    }

    test('opens the board it was opened at', () => {
        const history = makePanelHistory()
        render(
            <Popout
                store={makeStore()}
                history={history}
                initialPanelState='/team/t1/b1/v1'
            />,
        )

        expect(screen.getByTestId('board-page')).toBeTruthy()
        expect(history.location.pathname).toBe('/team/t1/b1/v1')
    })

    test('a board the person can\'t open shows the error view', () => {
        // The board is fetched as the signed-in person; one they can't open sets Kanban's access-denied error.
        const history = makePanelHistory()
        render(
            <Popout
                store={makeStore('access-denied')}
                history={history}
                initialPanelState='/team/t1/someone-elses-board'
            />,
        )

        expect(history.location.pathname).toBe('/access-denied')
        expect(screen.getByTestId('access-denied')).toBeTruthy()
    })
})
