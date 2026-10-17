// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Antimatter: Kanban has no full page any more. Its pages are views of its side panel, kept at the paths the full
// page had under /kanban (/team/<team>/<board>/<view>/<card>...), in the panel's own history. This module only holds
// the paths, so that anything (utils, the router) can use them without importing the panel.

// The route the full page had, which links in messages, emails and notifications still use.
export const KANBAN_ROUTE = '/kanban'

// The route it had as Boards, which older links still use.
export const LEGACY_ROUTE = '/boards'

// The panel's first view: the boards linked to the current channel (what the side panel always showed).
export const PANEL_HOME = '/channel'

// The community's boards, by category: what the full page's left sidebar was.
export const PANEL_BOARDS_PATH = '/team/:teamId'

// Creating a board from a template.
export const PANEL_TEMPLATES_PATH = '/team/:teamId/templates'

// A board, one of its views and one of its cards.
export const BOARD_PATH = '/team/:teamId/:boardId?/:viewId?/:cardId?'

// The template picker for a board linked to a channel.
export const NEW_LINKED_BOARD_PATH = '/team/:teamId/new/:channelId'

export const boardsPath = (teamId: string): string => `/team/${teamId}`

export const templatesPath = (teamId: string): string => `/team/${teamId}/templates`

export const boardPath = (teamId: string, boardId: string, viewId?: string, cardId?: string): string => {
    let path = `/team/${teamId}/${boardId}`
    if (viewId || cardId) {
        path += `/${viewId || '0'}`
    }
    if (cardId) {
        path += `/${cardId}`
    }
    return path
}

export const newLinkedBoardPath = (teamId: string, channelId: string): string => `/team/${teamId}/new/${channelId}`

const BOARD_PATH_RE = /^\/team\/([^/?#]+)\/([^/?#]+)(?:\/([^/?#]+))?(?:\/([^/?#]+))?\/?$/
const RESERVED_SEGMENTS = new Set(['new', 'shared', 'templates'])

export type BoardPathParams = {
    teamId: string
    boardId: string
    viewId?: string
    cardId?: string
}

/**
 * boardOfPath gives the board a panel path shows (/team/<team>/<board>[/<view>[/<card>]]), or null when it shows no
 * board: the community's boards, the templates, a shared board...
 */
export function boardOfPath(pathname: string): BoardPathParams | null {
    const match = BOARD_PATH_RE.exec(pathname)
    if (!match || RESERVED_SEGMENTS.has(match[2])) {
        return null
    }
    const [, teamId, boardId, viewId, cardId] = match
    return {teamId, boardId, viewId: viewId || undefined, cardId: cardId || undefined}
}

// The community a panel path belongs to (/team/<team>...), if any.
export function teamOfPath(pathname: string): string | undefined {
    return /^\/team\/([^/?#]+)/.exec(pathname)?.[1]
}

// Whether a path is the full page's (/kanban, /kanban/..., or /boards and /boards/... as it was called before).
export const isAppPath = (pathname: string): boolean => [KANBAN_ROUTE, LEGACY_ROUTE].some((base) => pathname === base || pathname.startsWith(base + '/'))

/**
 * panelPathOfAppPath is the panel view for a path of the full page, with its query and hash
 * (/kanban/team/<team>/<board> is /team/<team>/<board>; /kanban alone is the panel's start: '/').
 */
export function panelPathOfAppPath(pathname: string, search = '', hash = ''): string {
    let path = pathname
    for (const base of [KANBAN_ROUTE, LEGACY_ROUTE]) {
        if (path === base || path.startsWith(base + '/')) {
            path = path.slice(base.length)
            break
        }
    }
    path = path.replace(/\/+$/, '') || '/'
    return path + search + hash
}
