// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Antimatter: Kanban's components behave as views of the side panel there: they navigate in the panel, keep the
// app's keyboard shortcuts and page, and build the links the full page had.

import React from 'react'
import {Provider as ReduxProvider} from 'react-redux'
import {Router} from 'react-router-dom'
import {createMemoryHistory} from 'history'
import {fireEvent, render, screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'

import {mockDOM, mockStateStore, wrapDNDIntl, wrapIntl} from '../testUtils'
import {TestBlockFactory} from '../test/testBlockFactory'
import {Utils} from '../utils'
import mutator from '../mutator'
import UndoRedoHotKeys from '../pages/boardPage/undoRedoHotKeys'
import ErrorPage from '../pages/errorPage'
import BoardsSwitcher from '../components/boardsSwitcher/boardsSwitcher'
import CardActionsMenu from '../components/cardActionsMenu/cardActionsMenu'
import RHSChannelBoardItem from '../components/rhsChannelBoardItem'

import {InPanelContext, trackPanelFocus} from './context'
import {openKanbanPanel} from './history'

jest.mock('./history', () => ({
    ...jest.requireActual('./history'),
    openKanbanPanel: jest.fn(),
}))

jest.mock('../mutator', () => ({
    __esModule: true,
    default: {
        canUndo: true,
        canRedo: false,
        undoDescription: '',
        undo: jest.fn(() => Promise.resolve()),
        redo: jest.fn(() => Promise.resolve()),
    },
}))

beforeAll(() => {
    mockDOM()
})

const inPanel = (children: React.ReactNode) => (
    <InPanelContext.Provider value={true}>
        <div data-kanban-panel={true}>
            {children}
        </div>
    </InPanelContext.Provider>
)

describe('in the side panel', () => {
    afterEach(() => {
        jest.clearAllMocks()
        document.body.innerHTML = ''
    })

    describe('undo and redo', () => {
        let stop: () => void

        beforeEach(() => {
            stop = trackPanelFocus()
        })

        afterEach(() => {
            stop()
        })

        const ctrlZ = {key: 'z', code: 'KeyZ', keyCode: 90, ctrlKey: true}

        test('undo the board\'s last change only after a click in the panel', () => {
            const store = mockStateStore([], {})
            render(wrapIntl(
                <ReduxProvider store={store}>
                    {inPanel(<div data-testid='in-panel'><UndoRedoHotKeys/></div>)}
                    <div
                        data-testid='conversation'
                        tabIndex={-1}
                    />
                </ReduxProvider>,
            ))

            // In the conversation next to the board: Ctrl+Z isn't the board's.
            userEvent.click(screen.getByTestId('conversation'))
            fireEvent.keyDown(screen.getByTestId('conversation'), ctrlZ)
            expect(mutator.undo).not.toHaveBeenCalled()

            userEvent.click(screen.getByTestId('in-panel'))
            fireEvent.keyDown(document.body, ctrlZ)
            expect(mutator.undo).toHaveBeenCalledTimes(1)
        })

        test('the full page keeps its shortcuts', () => {
            const store = mockStateStore([], {})
            render(wrapIntl(
                <ReduxProvider store={store}>
                    <UndoRedoHotKeys/>
                </ReduxProvider>,
            ))

            fireEvent.keyDown(document.body, ctrlZ)
            expect(mutator.undo).toHaveBeenCalledTimes(1)
        })
    })

    describe('"Find boards"', () => {
        const state = {
            users: {me: {id: 'user_id_1', props: {}}},
            cards: {cards: {}, current: ''},
            teams: {current: {id: 'team-id'}},
        }

        test('leaves Ctrl/Cmd+K and Escape to the app', () => {
            const store = mockStateStore([], state)
            const {container} = render(wrapDNDIntl(
                <ReduxProvider store={store}>
                    <Router history={createMemoryHistory()}>
                        {inPanel(<BoardsSwitcher onBoardTemplateSelectorOpen={jest.fn()}/>)}
                    </Router>
                </ReduxProvider>,
            ))

            const ctrlK = new KeyboardEvent('keydown', {key: 'k', keyCode: 75, ctrlKey: true, metaKey: true, cancelable: true, bubbles: true})
            document.dispatchEvent(ctrlK)
            expect(ctrlK.defaultPrevented).toBe(false)
            expect(container.querySelector('.BoardSwitcherDialog')).toBeNull()

            const escape = new KeyboardEvent('keydown', {key: 'Escape', keyCode: 27, cancelable: true, bubbles: true})
            document.dispatchEvent(escape)
            expect(escape.defaultPrevented).toBe(false)
        })

        test('shows Kanban\'s settings menu next to it', () => {
            const store = mockStateStore([], state)
            render(wrapDNDIntl(
                <ReduxProvider store={store}>
                    <Router history={createMemoryHistory()}>
                        {inPanel(
                            <BoardsSwitcher
                                onBoardTemplateSelectorOpen={jest.fn()}
                                settingsMenu={<div data-testid='settings-menu'/>}
                            />,
                        )}
                    </Router>
                </ReduxProvider>,
            ))

            expect(screen.getByTestId('settings-menu')).toBeTruthy()
        })
    })

    test('a card\'s link is the full page\'s, not the conversation\'s address', () => {
        const copy = jest.spyOn(Utils, 'copyTextToClipboard').mockImplementation(() => true)
        const board = TestBlockFactory.createBoard()
        const store = mockStateStore([], {
            boards: {current: board.id, boards: {[board.id]: board}, templates: [], myBoardMemberships: {[board.id]: {userId: 'user_id_1', schemeAdmin: true}}},
            teams: {current: {id: 'team-id'}},
            users: {me: {id: 'user_id_1'}},
        })
        const history = createMemoryHistory({initialEntries: ['/team/team-id/board-id/view-id']})
        const appWindow = window as unknown as {frontendBaseURL?: string}
        const previous = appWindow.frontendBaseURL
        appWindow.frontendBaseURL = '/kanban'

        render(wrapIntl(
            <ReduxProvider store={store}>
                <Router history={history}>
                    {inPanel(
                        <CardActionsMenu
                            cardId='card-id'
                            boardId='board-id'
                            onClickDelete={jest.fn()}
                        />,
                    )}
                </Router>
            </ReduxProvider>,
        ))

        userEvent.click(screen.getByText('Copy link'))
        expect(copy).toHaveBeenCalledWith(`${window.location.origin}/kanban/team/team-id/board-id/view-id/card-id`)

        appWindow.frontendBaseURL = previous
        copy.mockRestore()
    })

    test('the error page\'s "Back to team" goes to the panel\'s start, without leaving the page', () => {
        const history = createMemoryHistory({initialEntries: ['/error?id=board-not-found']})
        const store = mockStateStore([], {})
        render(wrapIntl(
            <ReduxProvider store={store}>
                <Router history={history}>
                    {inPanel(<ErrorPage/>)}
                </Router>
            </ReduxProvider>,
        ))

        userEvent.click(screen.getByText('Back to team'))
        expect(history.location.pathname).toBe('/')
    })

    describe('a board linked to the channel', () => {
        const board = TestBlockFactory.createBoard()
        board.id = 'board-id'
        board.title = 'Roadmap'
        const store = mockStateStore([], {
            teams: {current: {id: 'team-id', name: 'team', display_name: 'Team'}},
            boards: {myBoardMemberships: {[board.id]: {userId: 'user_id_1', schemeAdmin: true}}},
        })

        test('opens in the panel', () => {
            const history = createMemoryHistory({initialEntries: ['/channel']})
            render(wrapIntl(
                <ReduxProvider store={store}>
                    <Router history={history}>
                        {inPanel(<RHSChannelBoardItem board={board}/>)}
                    </Router>
                </ReduxProvider>,
            ))

            userEvent.click(screen.getByText('Roadmap'))
            expect(history.location.pathname).toBe('/team/team-id/board-id')
        })

        test('opens the panel on it from outside the panel', () => {
            const open = jest.spyOn(window, 'open')
            render(wrapIntl(
                <ReduxProvider store={store}>
                    <RHSChannelBoardItem board={board}/>
                </ReduxProvider>,
            ))

            userEvent.click(screen.getByText('Roadmap'))
            expect(openKanbanPanel).toHaveBeenCalledWith('/team/team-id/board-id')
            expect(open).not.toHaveBeenCalled()
            open.mockRestore()
        })
    })
})
