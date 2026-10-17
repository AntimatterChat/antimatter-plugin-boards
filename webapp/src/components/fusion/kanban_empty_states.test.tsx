// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {Provider as ReduxProvider} from 'react-redux'
import {MemoryRouter} from 'react-router-dom'
import {act, fireEvent, render, screen} from '@testing-library/react'
import {mocked} from 'jest-mock'
import {thunk} from 'redux-thunk'

import octoClient from '../../octoClient'
import {mockStateStore, wrapIntl} from '../../testUtils'
import GuestNoBoards from '../guestNoBoards'
import RHSChannelBoards from '../rhsChannelBoards'
import {EmptyResults, EmptySearch} from '../searchDialog/searchDialog'
import ErrorPage from '../../pages/errorPage'
import AccessDeniedPage from '../../pages/accessDeniedPage'

jest.mock('../../octoClient')
const mockedOctoClient = mocked(octoClient)

const setWebUI = (ui?: 'classic' | 'fusion') => {
    window.antimatterWebUI = ui
    if (ui) {
        document.documentElement.dataset.amWebUi = ui
    } else {
        delete document.documentElement.dataset.amWebUi
    }
}

afterEach(() => setWebUI(undefined))

// Fusion's empty state (components/fusion/empty_state.tsx): its classes, a Fusion icon, and no illustration.
const expectFusionEmptyState = (root: HTMLElement, icon: string) => {
    expect(root.className).toContain('am-empty amfx-empty')
    expect(root.querySelector('.amfx-empty-ic use')!.getAttribute('href')).toBe(`#am-i-${icon}`)
    expect(root.querySelectorAll('svg')).toHaveLength(1)
}

describe('Kanban\'s empty states under the Fusion UI', () => {
    beforeEach(() => setWebUI('fusion'))

    test('a guest without boards', () => {
        render(wrapIntl(<GuestNoBoards/>))
        const root = screen.getByTestId('guest-no-boards')
        expectFusionEmptyState(root, 'kanban')
        expect(root.querySelector('.amfx-empty-title')!.textContent).toBe('No boards yet')
    })

    test('an error, in the danger tone, with its ways out', () => {
        render(wrapIntl(
            <MemoryRouter initialEntries={['/error?id=board-not-found']}>
                <ErrorPage/>
            </MemoryRouter>,
        ))
        const root = screen.getByTestId('error-page')
        expectFusionEmptyState(root, 'ban')
        expect(root.className).toContain('amfx-danger')
        expect(root.querySelector('.amfx-empty-title')!.textContent).toBe('Sorry, something went wrong')
        expect(document.querySelectorAll('.ErrorPage__actions button').length).toBeGreaterThan(0)
    })

    test('a board without access, with the way back', () => {
        const store = mockStateStore([], {})
        render(wrapIntl(
            <ReduxProvider store={store}>
                <MemoryRouter>
                    <AccessDeniedPage/>
                </MemoryRouter>
            </ReduxProvider>,
        ))
        const root = screen.getByTestId('access-denied')
        expectFusionEmptyState(root, 'lock')
        expect(root.querySelector('button')!.className).toBe('am-btn am-primary')
        expect(root.querySelector('button')!.textContent).toBe('Back to your boards')
    })

    test('the board search, before and without results', () => {
        render(wrapIntl(<EmptySearch/>))
        expectFusionEmptyState(screen.getByTestId('search-intro'), 'search')

        render(wrapIntl(<EmptyResults query='roadmap'/>))
        const root = screen.getByTestId('search-no-results')
        expectFusionEmptyState(root, 'search')
        expect(root.querySelector('.amfx-empty-title')!.textContent).toBe('No results for "roadmap"')
    })

    test('a channel without boards, with the one thing to do', async () => {
        mockedOctoClient.getBoards.mockResolvedValue([])
        mockedOctoClient.getMyBoardMemberships.mockResolvedValue([])
        const team = {id: 'team-id', name: 'team', display_name: 'Team name'}
        const store = mockStateStore([thunk], {
            teams: {allTeams: [team], current: team, currentId: team.id},
            users: {me: {id: 'user-id', permissions: ['create_post']}},
            language: {value: 'en'},
            boards: {boards: {}, myBoardMemberships: {}},
            channels: {current: {id: 'channel-id', name: 'channel', display_name: 'Channel Name', type: 'O'}},
        })
        await act(async () => {
            render(wrapIntl(
                <ReduxProvider store={store}>
                    <RHSChannelBoards/>
                </ReduxProvider>,
            ))
        })
        const root = screen.getByTestId('rhs-boards-empty')
        expectFusionEmptyState(root, 'kanban')
        const link = screen.getByRole('button', {name: 'Link boards to Channel Name'})
        expect(link.className).toBe('am-btn am-primary')
        fireEvent.click(link)
        expect(store.getActions().length).toBeGreaterThan(0)
    })
})

describe('Kanban\'s empty states under the classic UI', () => {
    beforeEach(() => setWebUI('classic'))

    test('keep their classic markup, without Fusion\'s classes or the old illustrations', () => {
        const {container} = render(wrapIntl(<GuestNoBoards/>))
        expect(container.querySelector('.GuestNoBoards .title')!.textContent).toBe('No boards yet')
        expect(container.querySelector('[class*="am-"]')).toBeNull()
        expect(container.querySelector('svg')).toBeNull()

        const search = render(wrapIntl(<EmptyResults query='roadmap'/>))
        expect(search.container.querySelector('.noResults')).not.toBeNull()
        expect(search.container.querySelector('[class*="am-"]')).toBeNull()
    })
})
