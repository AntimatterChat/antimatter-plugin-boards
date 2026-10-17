// Copyright (c) 2026-present Antimatter contributors. See LICENSE.txt for license information.

import {boardOfPath, boardPath, isAppPath, panelPathOfAppPath, teamOfPath} from './paths'

// Antimatter: Kanban's views keep the paths the full page had under /kanban, in the side panel's own history.
describe('panel/paths', () => {
    test.each([
        ['/kanban', true],
        ['/kanban/team/t1/b1', true],
        ['/boards/team/t1/b1', true],
        ['/boards', true],
        ['/kanbanroom/channels/town-square', false],
        ['/boardsroom', false],
        ['/plugins/focalboard/team/t1/shared/b1', false],
        ['/lumen/channels/town-square', false],
    ])('isAppPath(%s) is %s', (path, expected) => {
        expect(isAppPath(path)).toBe(expected)
    })

    test.each([
        ['/kanban', '', '', '/'],
        ['/kanban/', '', '', '/'],
        ['/kanban/team/t1/b1', '', '', '/team/t1/b1'],
        ['/kanban/team/t1/b1/v1/c1', '?r=x', '#c', '/team/t1/b1/v1/c1?r=x#c'],
        ['/boards/team/t1/b1/', '', '', '/team/t1/b1'],
        ['/team/t1', '', '', '/team/t1'],
    ])('panelPathOfAppPath(%s%s%s) is %s', (path, search, hash, expected) => {
        expect(panelPathOfAppPath(path, search, hash)).toBe(expected)
    })

    test('boardOfPath reads a board, its view and its card', () => {
        expect(boardOfPath('/team/t1/b1')).toEqual({teamId: 't1', boardId: 'b1', viewId: undefined, cardId: undefined})
        expect(boardOfPath('/team/t1/b1/v1/c1')).toEqual({teamId: 't1', boardId: 'b1', viewId: 'v1', cardId: 'c1'})
    })

    test.each([
        '/team/t1',
        '/team/t1/templates',
        '/team/t1/new/ch1',
        '/team/t1/shared/b1',
        '/channel',
        '/',
        '/welcome',
    ])('boardOfPath(%s) shows no board', (path) => {
        expect(boardOfPath(path)).toBeNull()
    })

    test('teamOfPath reads the community of a path', () => {
        expect(teamOfPath('/team/t1/b1')).toBe('t1')
        expect(teamOfPath('/team/t1')).toBe('t1')
        expect(teamOfPath('/channel')).toBeUndefined()
    })

    test('boardPath builds the full page\'s board path', () => {
        expect(boardPath('t1', 'b1')).toBe('/team/t1/b1')
        expect(boardPath('t1', 'b1', 'v1')).toBe('/team/t1/b1/v1')
        expect(boardPath('t1', 'b1', undefined, 'c1')).toBe('/team/t1/b1/0/c1')
    })
})
