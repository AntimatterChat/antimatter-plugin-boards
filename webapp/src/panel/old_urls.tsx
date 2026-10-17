// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Antimatter: the links to the old full page keep working. Messages, emails and notifications link to
// /kanban/team/<team>/<board>/<view>/<card> (or /boards/..., as it was called before); the web app sends them to
// /<community>/focalboard/team/<team>/<board>/..., which this plugin answers: it opens the board's channel (or the
// community's last channel when the board has none, or you aren't in it) with the side panel on the page the link
// pointed to.

import {useEffect} from 'react'
import {useStore} from 'react-redux'
import {GlobalState} from '@mattermost/types/store'
import {Client4} from 'mattermost-redux/client'
import {getCurrentChannelId, getRedirectChannelNameForTeam} from 'mattermost-redux/selectors/entities/channels'
import {getCurrentTeamId, getTeam, getTeamByName} from 'mattermost-redux/selectors/entities/teams'
import {getCurrentUserId} from 'mattermost-redux/selectors/entities/users'

import octoClient from '../octoClient'

import {openKanbanPanel} from './history'
import {boardOfPath, panelPathOfAppPath, teamOfPath} from './paths'

// The longest wait for the channel to show before the panel opens anyway.
const OPEN_TIMEOUT_MS = 10000

type BoardInfo = {channelId?: string, teamId?: string}

export type RedirectDeps = {
    getState: () => GlobalState
    subscribe: (listener: () => void) => () => void
    fetchBoard: (id: string) => Promise<BoardInfo | undefined>
    isChannelMember: (channelId: string) => Promise<boolean>
    replace: (path: string) => void
    open: (panelPath: string) => void
    timeoutMs?: number
}

// A community you are a member of, by its id.
const myTeam = (state: GlobalState, teamId: string | undefined) => {
    if (!teamId || !state.entities.teams.myMembers?.[teamId]) {
        return undefined
    }
    const team = getTeam(state, teamId)
    return team && team.delete_at === 0 ? team : undefined
}

/**
 * redirectOldUrl goes from an old URL's page (the community's /<team>/focalboard/... route) to a channel, and opens
 * the panel on panelPath once the channel shows. It returns the channel's path. It never opens a channel you aren't a
 * member of: that would join you to it when it's public.
 */
export async function redirectOldUrl(teamName: string, panelPath: string, deps: RedirectDeps): Promise<string> {
    const state = deps.getState()
    const pathname = panelPath.replace(/[?#].*$/, '')

    // The community the web app picked (the last one viewed), unless the link names another of yours.
    let team = myTeam(state, teamOfPath(pathname)) ?? getTeamByName(state, teamName)
    let channelId = ''

    const board = boardOfPath(pathname)
    if (board) {
        try {
            const info = await deps.fetchBoard(board.boardId)
            team = myTeam(state, info?.teamId) ?? team

            if (info?.channelId && await deps.isChannelMember(info.channelId)) {
                channelId = info.channelId
            }
        } catch {
            // The board is private or gone: the panel's board view says so.
        }
    }

    const name = team?.name ?? teamName
    const channelPath = channelId ? `/${name}/channels/${channelId}` : `/${name}/channels/${team ? getRedirectChannelNameForTeam(state, team.id) : 'town-square'}`
    deps.replace(channelPath)

    // Open the panel once the channel is the current one: before that, the community's page has no side panel.
    const ready = () => {
        const now = deps.getState()
        const currentChannelId = getCurrentChannelId(now)
        if (!currentChannelId || (channelId && currentChannelId !== channelId)) {
            return false
        }
        return !team || getCurrentTeamId(now) === team.id
    }

    await new Promise<void>((resolve) => {
        if (ready()) {
            resolve()
            return
        }
        let unsubscribe = () => {}
        const timer = setTimeout(() => {
            unsubscribe()
            resolve()
        }, deps.timeoutMs ?? OPEN_TIMEOUT_MS)
        unsubscribe = deps.subscribe(() => {
            if (ready()) {
                clearTimeout(timer)
                unsubscribe()
                resolve()
            }
        })
    })

    deps.open(panelPath)
    return channelPath
}

/**
 * panelPathOfTeamRoute is the panel view for the plugin's team route, /<team>/focalboard/<the full page's path>
 * (/<team>/focalboard/team/<team>/<board>... for /kanban/team/<team>/<board>...).
 */
export function panelPathOfTeamRoute(pathname: string, search = '', hash = ''): {teamName: string, panelPath: string} | null {
    const match = /^\/([^/]+)\/[^/]+(\/.*)?$/.exec(pathname)
    if (!match) {
        return null
    }
    const [, teamName, rest = ''] = match
    return {teamName, panelPath: panelPathOfAppPath(rest, search, hash)}
}

const isChannelMember = async (channelId: string, userId: string) => {
    try {
        await Client4.getChannelMember(channelId, userId)
        return true
    } catch {
        return false
    }
}

type HostLocation = {pathname: string, search: string, hash: string}

export type HostHistory = {
    location: HostLocation
    replace: (path: string) => void
}

// The web app's history (its router's: without the site's subpath), which it gives the apps.
export const getHostHistory = (): HostHistory | undefined => (window as unknown as {WebappUtils?: {browserHistory?: HostHistory}}).WebappUtils?.browserHistory

type Props = {

    // The web app's history; the one it gives the apps by default.
    history?: HostHistory
}

/**
 * OldUrlRedirect answers /<team>/focalboard/... (registered as the plugin's team route): the old full-page links,
 * sent there by the web app. (The page is the web app's: Kanban's own router isn't there.)
 */
const OldUrlRedirect = (props: Props): null => {
    const store = useStore<GlobalState>()

    useEffect(() => {
        const history = props.history ?? getHostHistory()
        if (!history) {
            return
        }
        const {pathname, search, hash} = history.location
        const parsed = panelPathOfTeamRoute(pathname, search, hash)
        if (!parsed) {
            return
        }
        const userId = getCurrentUserId(store.getState())

        redirectOldUrl(parsed.teamName, parsed.panelPath, {
            getState: store.getState,
            subscribe: store.subscribe,
            fetchBoard: (id) => octoClient.getBoard(id),
            isChannelMember: (channelId) => isChannelMember(channelId, userId),
            replace: (path) => history.replace(path),
            open: openKanbanPanel,
        })
    }, [])

    return null
}

export default OldUrlRedirect
