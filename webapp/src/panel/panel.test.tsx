// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {IntlProvider} from 'react-intl'
import {Provider as ReduxProvider} from 'react-redux'
import {Router} from 'react-router-dom'
import {act, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import RootPortal from '../components/rootPortal'

import {mockStateStore} from '../testUtils'

import {InPanelContext} from './context'
import {makePanelHistory, PanelHistory} from './history'
import {SET_RHS_EXPANDED, setHostStore} from './host'
import KanbanPanel, {PanelRoutes, isKanbanPanelOpen} from './panel'
import {PANEL_HOME} from './paths'
import {PanelToolbarRow} from './panel_title'

// The views' contents have tests of their own: here, what the panel shows where.
jest.mock('../pages/boardPage/boardPage', () => {
    const {useRouteMatch} = jest.requireActual('react-router-dom')
    const MockBoardPage = (props: {new?: boolean, readonly?: boolean}) => {
        const match = useRouteMatch()
        return (
            <div
                data-testid='board-page'
                data-params={JSON.stringify(match.params)}
                data-new={String(Boolean(props.new))}
            />
        )
    }
    return {__esModule: true, default: MockBoardPage}
})
jest.mock('../components/sidebar/sidebar', () => ({
    __esModule: true,
    default: (props: {onBoardTemplateSelectorOpen: () => void, settingsMenu?: React.ReactNode}) => (
        <div data-testid='boards-list'>
            <button onClick={props.onBoardTemplateSelectorOpen}>{'add board'}</button>
            {props.settingsMenu}
        </div>
    ),
}))
jest.mock('../components/boardTemplateSelector/boardTemplateSelector', () => ({__esModule: true, default: () => <div data-testid='templates'/>}))
jest.mock('../components/rhsChannelBoards', () => ({__esModule: true, default: () => <div data-testid='channel-boards'/>}))
jest.mock('../components/globalHeader/globalHeaderSettingsMenu', () => ({__esModule: true, default: () => <div data-testid='settings-menu'/>}))
jest.mock('../pages/welcome/welcomePage', () => ({__esModule: true, default: () => <div data-testid='welcome'/>}))
// The store keeps its reducers (they need the thunks' action types); loading the community's boards does nothing.
jest.mock('../store/initialLoad', () => {
    const actual = jest.requireActual('../store/initialLoad')
    return {...actual, initialLoad: Object.assign(() => ({type: 'mock/initialLoad'}), actual.initialLoad)}
})
jest.mock('../app', () => ({__esModule: true, default: ({children}: {children: React.ReactNode}) => <>{children}</>}))
jest.mock('../components/withWebSockets', () => ({__esModule: true, default: ({children}: {children: React.ReactNode}) => <>{children}</>}))

// Antimatter: Kanban has no full page any more: its pages are views of the side panel, with a back button.
describe('panel/KanbanPanel', () => {
    // The views dispatch plain actions only (loading the community's boards is mocked).
    const mockStore = (state: unknown) => mockStateStore([], state)

    const board = {id: 'b1', teamId: 't1', title: 'Roadmap', icon: '', cardProperties: []}

    const makeStore = (welcomeViewed = true) => mockStore({
        users: {
            me: {id: 'u1', is_guest: false, props: {}},
            loggedIn: true,
            myConfig: welcomeViewed ? {welcomePageViewed: {value: '1'}} : {},
        },
        clientConfig: {value: {featureFlags: {}}},
        globalError: {value: ''},
        teams: {current: {id: 't1', title: 'Lumen'}, currentId: 't1'},
        channels: {current: {id: 'ch1', display_name: 'Town Square', type: 'O'}},
        boards: {current: 'b1', boards: {b1: board}, templates: {}, myBoardMemberships: {}},
        views: {current: 'v1', views: {v1: {id: 'v1', title: 'Board view', fields: {viewType: 'board'}}}},
        cards: {cards: {}, current: ''},
    })

    // The web app's store, to which the panel says when it's expanded.
    const makeHostStore = () => {
        const state = {views: {rhs: {isSidebarExpanded: false}}}
        const dispatch = jest.fn((action: {type: string, expanded?: boolean}) => {
            if (action.type === SET_RHS_EXPANDED) {
                state.views.rhs.isSidebarExpanded = Boolean(action.expanded)
            }
            return action
        })
        return {getState: () => state, dispatch, subscribe: () => () => {}, replaceReducer: jest.fn()}
    }

    let hostStore: ReturnType<typeof makeHostStore>

    beforeEach(() => {
        jest.useFakeTimers()
        hostStore = makeHostStore()
        setHostStore(hostStore as never)
    })

    afterEach(() => {
        jest.useRealTimers()
        setHostStore(null)
    })

    const renderPanel = (history: PanelHistory, store = makeStore()) => render(
        <IntlProvider locale='en'>
            <PanelToolbarRow>
                <ReduxProvider store={store}>
                    <Router history={history}>
                        <InPanelContext.Provider value={true}>
                            <PanelRoutes/>
                        </InPanelContext.Provider>
                    </Router>
                </ReduxProvider>
            </PanelToolbarRow>
        </IntlProvider>,
    )

    // The panel's toolbar row, where each view puts its title, back button and actions.
    const title = () => screen.getByTestId('kanban-panel-toolbar')

    test('opens on the channel\'s boards, titled with the channel, without a back button', () => {
        const history = makePanelHistory()
        renderPanel(history)

        expect(screen.getByTestId('channel-boards')).toBeTruthy()
        expect(title().textContent).toContain('Town Square')
        expect(title().querySelector('.KanbanPanelTitle__back')).toBeNull()
    })

    test('has one icon, the panel header\'s: the toolbar doesn\'t draw Kanban\'s logo or name again', () => {
        renderPanel(makePanelHistory())

        expect(title().querySelector('.KanbanPanelTitle__logo, .BoardsAppIcon, img')).toBeNull()
        expect(title().textContent).not.toContain('Kanban')
    })

    test('puts All boards and New board in the toolbar, as icon buttons named by their tooltips', () => {
        renderPanel(makePanelHistory())

        const allBoards = screen.getByRole('button', {name: 'All boards'})
        const newBoard = screen.getByRole('button', {name: 'New board'})
        for (const button of [allBoards, newBoard]) {
            expect(title().querySelector('.KanbanPanelTitle__actions')!.contains(button)).toBe(true)
            expect(button.classList.contains('IconButton')).toBe(true)
            expect(button.classList.contains('KanbanPanelTitle__action')).toBe(true)
            expect(button.textContent).toBe('')
            expect(button.getAttribute('title') || button.getAttribute('data-am-tip')).toBe(button.getAttribute('aria-label'))
        }
        expect(Array.from(title().querySelectorAll('button')).map((b) => b.getAttribute('aria-label'))).toEqual(['All boards', 'New board'])

        // Not in the view's body any more.
        expect(document.querySelector('.KanbanPanelHome__browse')).toBeNull()
        expect(screen.getByTestId('channel-boards').closest('[data-testid="kanban-panel-toolbar"]')).toBeNull()
    })

    test('New board opens the templates', () => {
        const history = makePanelHistory()
        renderPanel(history)

        userEvent.click(screen.getByRole('button', {name: 'New board'}))
        expect(history.location.pathname).toBe('/team/t1/templates')
    })

    test('goes to the community\'s boards (the full page\'s sidebar) and back', () => {
        const history = makePanelHistory()
        renderPanel(history)

        userEvent.click(screen.getByRole('button', {name: 'All boards'}))
        expect(history.location.pathname).toBe('/team/t1')
        expect(screen.getByTestId('boards-list')).toBeTruthy()
        expect(screen.getByTestId('settings-menu')).toBeTruthy()
        expect(title().textContent).toContain('Boards')
        expect(title().textContent).toContain('Lumen')

        userEvent.click(title().querySelector('.KanbanPanelTitle__back') as Element)
        expect(history.location.pathname).toBe(PANEL_HOME)
        expect(screen.getByTestId('channel-boards')).toBeTruthy()
    })

    test('creates a board from the templates, in the widened panel', () => {
        const history = makePanelHistory()
        history.push('/team/t1')
        renderPanel(history)

        userEvent.click(screen.getByText('add board'))
        expect(history.location.pathname).toBe('/team/t1/templates')
        expect(screen.getByTestId('templates')).toBeTruthy()

        act(() => {
            jest.runOnlyPendingTimers()
        })
        expect(hostStore.dispatch).toHaveBeenCalledWith({type: SET_RHS_EXPANDED, expanded: true})
    })

    test('a board opens in the widened panel, titled with the board and its view, and narrows it when left', () => {
        const history = makePanelHistory()
        history.push('/team/t1')
        history.push('/team/t1/b1/v1')
        renderPanel(history)

        const page = screen.getByTestId('board-page')
        expect(JSON.parse(page.getAttribute('data-params')!)).toMatchObject({teamId: 't1', boardId: 'b1', viewId: 'v1'})
        expect(title().textContent).toContain('Roadmap')
        expect(title().textContent).toContain('Board view')

        act(() => {
            jest.runOnlyPendingTimers()
        })
        expect(hostStore.getState().views.rhs.isSidebarExpanded).toBe(true)

        userEvent.click(title().querySelector('.KanbanPanelTitle__back') as Element)
        expect(history.location.pathname).toBe('/team/t1')
        expect(hostStore.dispatch).toHaveBeenLastCalledWith({type: SET_RHS_EXPANDED, expanded: false})
    })

    test('a panel that was already wide stays wide when the board is left', () => {
        hostStore.getState().views.rhs.isSidebarExpanded = true
        const history = makePanelHistory()
        history.push('/team/t1')
        history.push('/team/t1/b1/v1')
        renderPanel(history)
        act(() => {
            jest.runOnlyPendingTimers()
        })

        act(() => {
            history.back()
        })
        expect(hostStore.dispatch).not.toHaveBeenCalledWith({type: SET_RHS_EXPANDED, expanded: false})
    })

    test('a card is the board\'s view with its card, in the panel (the board shows it in a dialog over the panel)', () => {
        const history = makePanelHistory()
        history.push('/team/t1/b1/v1/c1')
        renderPanel(history)

        expect(JSON.parse(screen.getByTestId('board-page').getAttribute('data-params')!)).toMatchObject({boardId: 'b1', viewId: 'v1', cardId: 'c1'})
        expect(title().textContent).toContain('Roadmap')
    })

    test('the template picker of a board for a channel has the board\'s frame', () => {
        const history = makePanelHistory()
        history.push('/team/t1/new/ch1')
        renderPanel(history)

        expect(screen.getByTestId('board-page').getAttribute('data-new')).toBe('true')
        expect(title().textContent).toContain('Create a board')
    })

    test.each(['/', '/team/', '/login?r=x', '/nowhere'])('%s opens the community\'s boards', (path) => {
        const history = makePanelHistory()
        history.push(path)
        renderPanel(history)

        expect(history.location.pathname).toBe('/team/t1')
        expect(screen.getByTestId('boards-list')).toBeTruthy()
    })

    test('shows the welcome page before a board the first time, but not before the channel\'s boards', () => {
        const appWindow = window as unknown as {isFocalboardPlugin?: boolean}
        appWindow.isFocalboardPlugin = true
        const history = makePanelHistory()
        renderPanel(history, makeStore(false))
        expect(screen.getByTestId('channel-boards')).toBeTruthy()

        act(() => {
            history.push('/team/t1/b1')
        })
        expect(history.location.pathname).toBe('/welcome')
        expect(history.location.search).toContain('r=/team/t1/b1')
        expect(screen.getByTestId('welcome')).toBeTruthy()
        delete appWindow.isFocalboardPlugin
    })

    test('is the panel\'s root, with the box its dialogs open in, and says when it shows', () => {
        const {container, unmount} = render(
            <IntlProvider locale='en'>
                <KanbanPanel history={makePanelHistory()}/>
            </IntlProvider>,
        )

        const root = container.querySelector('[data-kanban-panel]')
        expect(root).not.toBeNull()
        expect(root!.classList.contains('focalboard-body')).toBe(true)
        expect(root!.querySelector('#focalboard-app')).not.toBeNull()
        expect(root!.querySelector('#focalboard-root-portal')).not.toBeNull()
        expect(isKanbanPanelOpen()).toBe(true)

        unmount()
        expect(isKanbanPanelOpen()).toBe(false)
    })

    test('a dialog drawn with the panel opens in the panel\'s box (the card\'s dialog, on a link to a card)', () => {
        const {container} = render(
            <div data-kanban-panel={true}>
                <RootPortal>
                    <div data-testid='card-dialog'/>
                </RootPortal>
                <div id='focalboard-root-portal'/>
            </div>,
        )

        const portal = container.querySelector('#focalboard-root-portal')!
        expect(portal.contains(screen.getByTestId('card-dialog'))).toBe(true)
    })
})

describe('panel/KanbanPanel toolbar', () => {
    const makeStore = () => mockStateStore([], {
        users: {me: {id: 'u1', props: {}}, loggedIn: true, myConfig: {}},
        clientConfig: {value: {featureFlags: {}}},
        globalError: {value: ''},
        teams: {current: {id: 't1', title: 'Lumen'}, currentId: 't1'},
        channels: {current: {id: 'ch1', display_name: 'Town Square', type: 'O'}},
        boards: {current: '', boards: {}, templates: {}, myBoardMemberships: {}},
        views: {current: '', views: {}},
        cards: {cards: {}, current: ''},
    })

    test('is the first row of the panel, above its views, not in the web app\'s header', () => {
        const {container} = render(
            <IntlProvider locale='en'>
                <KanbanPanel history={makePanelHistory()}/>
            </IntlProvider>,
        )

        const root = container.querySelector('[data-kanban-panel]')!
        const toolbar = screen.getByTestId('kanban-panel-toolbar')
        expect(root.firstElementChild).toBe(toolbar)
        expect(root.querySelector('#focalboard-app')!.contains(toolbar)).toBe(false)
        expect(document.getElementById('kanban-panel-title')).toBeNull()
    })

    test('a view drawn on its own draws its title in place', () => {
        render(
            <IntlProvider locale='en'>
                <ReduxProvider store={makeStore()}>
                    <Router history={makePanelHistory()}>
                        <InPanelContext.Provider value={true}>
                            <PanelRoutes/>
                        </InPanelContext.Provider>
                    </Router>
                </ReduxProvider>
            </IntlProvider>,
        )

        const title = screen.getByTestId('kanban-panel-title')
        expect(title.parentElement!.classList.contains('KanbanPanelToolbar')).toBe(true)
        expect(title.textContent).toContain('Town Square')
    })
})
