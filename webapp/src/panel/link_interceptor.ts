// Copyright (c) 2026-present Antimatter contributors. See LICENSE.txt for license information.

import {PANEL_ROOT_SELECTOR} from './context'
import {openKanbanPanel} from './history'
import {isAppPath, panelPathOfAppPath} from './paths'

// The site's subpath (e.g. /chat for https://example.com/chat), from its URL.
const sitePathname = (siteURL: string) => {
    try {
        return new URL(siteURL, window.location.origin).pathname.replace(/\/+$/, '')
    } catch {
        return ''
    }
}

/**
 * panelPathOfLink is the panel view a link opens (e.g. '/team/<team>/<board>/<view>/<card>'), or null when it isn't a
 * link to Kanban's full page on this site: another site, another page of the app, a download, a publicly shared board
 * (/plugins/focalboard/..., a page of its own for people without an account).
 */
export function panelPathOfLink(href: string, siteURL: string): string | null {
    let url: URL
    try {
        url = new URL(href, window.location.href)
    } catch {
        return null
    }
    if (url.origin !== window.location.origin) {
        return null
    }

    let pathname = url.pathname
    const base = sitePathname(siteURL)
    if (base) {
        if (pathname !== base && !pathname.startsWith(base + '/')) {
            return null
        }
        pathname = pathname.slice(base.length) || '/'
    }

    if (!isAppPath(pathname)) {
        return null
    }
    return panelPathOfAppPath(pathname, url.search, url.hash)
}

type Options = {
    getSiteURL: () => string
    open?: (path: string) => void
    root?: Document
}

/**
 * installLinkInterceptor opens the links to the old full page (/kanban/team/<team>/<board>..., or /boards/... as it
 * was called before, in messages, link previews, notifications, dialogs...) in the side panel, without leaving the
 * conversation. It listens before the app does (capture), and leaves alone the clicks that open a new tab or window,
 * and the panel's own links (its router has them). It returns the function that removes it.
 */
export function installLinkInterceptor({getSiteURL, open = openKanbanPanel, root = document}: Options): () => void {
    const onClick = (event: MouseEvent) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return
        }

        const target = event.target as Element | null
        const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null
        if (!anchor || anchor.closest(PANEL_ROOT_SELECTOR)) {
            return
        }
        if ((anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) {
            return
        }

        const path = panelPathOfLink(anchor.getAttribute('href') ?? '', getSiteURL())
        if (!path) {
            return
        }

        event.preventDefault()
        event.stopPropagation()
        open(path)
    }

    root.addEventListener('click', onClick, true)
    return () => root.removeEventListener('click', onClick, true)
}
