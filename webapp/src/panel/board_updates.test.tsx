// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {Provider as ReduxProvider} from 'react-redux'
import {act, render} from '@testing-library/react'

import {Board} from '../blocks/board'
import {updateBoards} from '../store/boards'
import {removeBoardsFromAllCategories} from '../store/sidebar'
import {mockStateStore} from '../testUtils'
import wsClient from '../wsclient'

import {useBoardUpdates} from './board_updates'

const Probe = (): null => {
    useBoardUpdates()
    return null
}

const board = (id: string, teamId: string, fields: Partial<Board> = {}) => ({id, teamId, deleteAt: 0, isTemplate: false, ...fields} as Board)

// Antimatter: the panel's community boards and templates views take the boards' changes from the websocket, as the
// full page's board page around them did.
describe('panel/useBoardUpdates', () => {
    const renderProbe = () => {
        const store = mockStateStore([], {teams: {currentId: 't1'}, users: {me: {id: 'u1'}}})
        const view = render(
            <ReduxProvider store={store}>
                <Probe/>
            </ReduxProvider>,
        )
        return {store, ...view}
    }

    const sendBoards = (boards: Board[]) => act(() => {
        wsClient.onChange.Board.forEach((handler) => handler(wsClient, boards))
    })

    test('lists the community\'s new and changed boards, not another community\'s', () => {
        const {store, unmount} = renderProbe()
        const added = board('b1', 't1')
        sendBoards([added, board('b2', 't2')])
        expect(store.getActions()).toEqual([updateBoards([added])])
        unmount()
    })

    test('takes a deleted template or board out of its list and its category', () => {
        const {store, unmount} = renderProbe()
        const template = board('tpl1', 't1', {isTemplate: true, deleteAt: 5})
        sendBoards([template])
        expect(store.getActions()).toEqual([
            updateBoards([template]),
            removeBoardsFromAllCategories(['tpl1']),
        ])
        unmount()
    })

    test('stops listening when the view closes', () => {
        const before = wsClient.onChange.Board.length
        const {unmount} = renderProbe()
        expect(wsClient.onChange.Board.length).toBe(before + 1)
        expect(wsClient.onChange.BoardMember.length).toBeGreaterThan(0)
        unmount()
        expect(wsClient.onChange.Board.length).toBe(before)
    })
})
