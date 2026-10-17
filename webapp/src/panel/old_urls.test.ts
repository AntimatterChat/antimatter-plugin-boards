// Copyright (c) 2026-present Antimatter contributors. See LICENSE.txt for license information.

import {GlobalState} from '@mattermost/types/store'

import {RedirectDeps, panelPathOfTeamRoute, redirectOldUrl} from './old_urls'

jest.mock('mattermost-redux/selectors/entities/channels', () => ({
    ...jest.requireActual('mattermost-redux/selectors/entities/channels'),

    // The community's last channel.
    getRedirectChannelNameForTeam: jest.fn((_state: unknown, teamId: string) => `last-of-${teamId}`),
}))

jest.mock('../octoClient', () => ({getBoard: jest.fn()}))

// Antimatter: the old full-page links (/kanban/team/<team>/<board>/..., sent by the web app to
// /<community>/focalboard/...) open a channel with the side panel on the page they point to, and never a channel you
// aren't a member of (that would join you to it).
describe('panel/old_urls', () => {
    const team = (id: string, name: string) => ({id, name, display_name: name, delete_at: 0})

    const makeState = (currentTeamId = '', currentChannelId = ''): GlobalState => ({
        entities: {
            teams: {
                currentTeamId,
                teams: {
                    t1: team('t1', 'lumen'),
                    t2: team('t2', 'labs'),
                    t3: team('t3', 'elsewhere'),
                },
                myMembers: {
                    t1: {team_id: 't1', user_id: 'u1'},
                    t2: {team_id: 't2', user_id: 'u1'},
                },
            },
            channels: {
                currentChannelId,
            },
        },
    } as unknown as GlobalState)

    // A web app whose state moves to the channel it is sent to.
    const makeDeps = (overrides: Partial<RedirectDeps> = {}) => {
        let state = makeState()
        const listeners = new Set<() => void>()
        const deps: RedirectDeps & {replace: jest.Mock, open: jest.Mock} = {
            getState: () => state,
            subscribe: (listener) => {
                listeners.add(listener)
                return () => listeners.delete(listener)
            },
            fetchBoard: jest.fn(async () => undefined),
            isChannelMember: jest.fn(async () => false),
            replace: jest.fn((path: string) => {
                const [, teamName, , channel] = path.split('/')
                const teamId = Object.values(makeState().entities.teams.teams).find((t) => t.name === teamName)?.id || ''
                setTimeout(() => {
                    state = makeState(teamId, channel)
                    listeners.forEach((listener) => listener())
                }, 0)
            }),
            open: jest.fn(),
            timeoutMs: 1000,
            ...overrides,
        } as RedirectDeps & {replace: jest.Mock, open: jest.Mock}
        return deps
    }

    test('opens a board linked to a channel you are in, in that channel, with the panel on the card', async () => {
        const deps = makeDeps({
            fetchBoard: jest.fn(async () => ({teamId: 't1', channelId: 'ch1'})),
            isChannelMember: jest.fn(async (id: string) => id === 'ch1'),
        })

        const path = await redirectOldUrl('lumen', '/team/t1/b1/v1/c1?x=1', deps)

        expect(path).toBe('/lumen/channels/ch1')
        expect(deps.replace).toHaveBeenCalledWith('/lumen/channels/ch1')
        expect(deps.open).toHaveBeenCalledWith('/team/t1/b1/v1/c1?x=1')
    })

    test('never opens the board\'s channel when you are not a member: the community\'s last channel instead', async () => {
        const deps = makeDeps({
            fetchBoard: jest.fn(async () => ({teamId: 't1', channelId: 'public-channel'})),
            isChannelMember: jest.fn(async () => false),
        })

        const path = await redirectOldUrl('lumen', '/team/t1/b1', deps)

        expect(path).toBe('/lumen/channels/last-of-t1')
        expect(deps.replace).not.toHaveBeenCalledWith(expect.stringContaining('public-channel'))
        expect(deps.open).toHaveBeenCalledWith('/team/t1/b1')
    })

    test('opens a board of another of your communities in that community', async () => {
        const deps = makeDeps({fetchBoard: jest.fn(async () => ({teamId: 't2', channelId: ''}))})

        const path = await redirectOldUrl('lumen', '/team/t2/b1', deps)

        expect(path).toBe('/labs/channels/last-of-t2')
        expect(deps.open).toHaveBeenCalledWith('/team/t2/b1')
    })

    test('stays in the community the web app picked for a board of a community you are not in', async () => {
        const deps = makeDeps({fetchBoard: jest.fn(async () => ({teamId: 't3', channelId: 'ch3'}))})

        const path = await redirectOldUrl('lumen', '/team/t3/b1', deps)

        expect(path).toBe('/lumen/channels/last-of-t1')
        expect(deps.isChannelMember).toHaveBeenCalledWith('ch3')
        expect(deps.open).toHaveBeenCalledWith('/team/t3/b1')
    })

    test('a board it can\'t read (private, gone) still opens the panel, which says so', async () => {
        const deps = makeDeps({fetchBoard: jest.fn(async () => {
            throw new Error('403')
        })})

        const path = await redirectOldUrl('lumen', '/team/t1/b1', deps)

        expect(path).toBe('/lumen/channels/last-of-t1')
        expect(deps.open).toHaveBeenCalledWith('/team/t1/b1')
    })

    test('a link to the full page\'s start opens the panel\'s start, without asking for a board', async () => {
        const deps = makeDeps()

        await redirectOldUrl('lumen', '/', deps)

        expect(deps.fetchBoard).not.toHaveBeenCalled()
        expect(deps.replace).toHaveBeenCalledWith('/lumen/channels/last-of-t1')
        expect(deps.open).toHaveBeenCalledWith('/')
    })

    test('opens the panel only once the channel shows', async () => {
        const deps = makeDeps({
            fetchBoard: jest.fn(async () => ({teamId: 't1', channelId: 'ch1'})),
            isChannelMember: jest.fn(async () => true),
            replace: jest.fn(),
            timeoutMs: 50,
        })

        const done = redirectOldUrl('lumen', '/team/t1/b1', deps)
        await Promise.resolve()
        expect(deps.open).not.toHaveBeenCalled()

        // The channel never shows: the panel opens anyway, after a while.
        await done
        expect(deps.open).toHaveBeenCalledWith('/team/t1/b1')
    })

    test.each([
        ['/lumen/focalboard/team/t1/b1/v1/c1', '?r=x', '#c', {teamName: 'lumen', panelPath: '/team/t1/b1/v1/c1?r=x#c'}],
        ['/lumen/focalboard', '', '', {teamName: 'lumen', panelPath: '/'}],
        ['/lumen/focalboard/', '', '', {teamName: 'lumen', panelPath: '/'}],
        ['/lumen', '', '', null],
    ])('panelPathOfTeamRoute(%s)', (pathname, search, hash, expected) => {
        expect(panelPathOfTeamRoute(pathname, search, hash)).toEqual(expected)
    })
})
