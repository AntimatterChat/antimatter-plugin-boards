// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {installLinkInterceptor, panelPathOfLink} from './link_interceptor'

// Antimatter: links to the old full page, anywhere in the app, open the side panel in place.
describe('panel/link_interceptor', () => {
    const origin = window.location.origin

    test.each([
        [`${origin}/kanban/team/t1/b1`, '', '/team/t1/b1'],
        [`${origin}/kanban/team/t1/b1/0/c1?r=x#c`, '', '/team/t1/b1/0/c1?r=x#c'],
        ['/boards/team/t1/b1', '', '/team/t1/b1'],
        [`${origin}/kanban`, '', '/'],
        [`${origin}/chat/kanban/team/t1/b1`, `${origin}/chat`, '/team/t1/b1'],
        [`${origin}/kanban/team/t1/b1`, `${origin}/chat`, null],
        ['https://elsewhere.example.com/kanban/team/t1/b1', '', null],
        [`${origin}/plugins/focalboard/team/t1/shared/b1?r=token`, '', null],
        [`${origin}/lumen/channels/town-square`, '', null],
        [`${origin}/kanbanroom/channels/town-square`, '', null],
    ])('panelPathOfLink(%s, site %s) is %s', (href, siteURL, expected) => {
        expect(panelPathOfLink(href, siteURL)).toBe(expected)
    })

    describe('installLinkInterceptor', () => {
        let open: jest.Mock
        let remove: () => void

        beforeEach(() => {
            open = jest.fn()
            remove = installLinkInterceptor({getSiteURL: () => origin, open})
        })

        afterEach(() => {
            remove()
            document.body.innerHTML = ''
        })

        const link = (href: string, attributes: Record<string, string> = {}, parent: HTMLElement = document.body) => {
            const anchor = document.createElement('a')
            anchor.href = href
            anchor.textContent = 'link'
            for (const [name, value] of Object.entries(attributes)) {
                anchor.setAttribute(name, value)
            }
            parent.appendChild(anchor)
            return anchor
        }

        const click = (element: Element, init: MouseEventInit = {}) => {
            const event = new MouseEvent('click', {bubbles: true, cancelable: true, button: 0, ...init})
            element.dispatchEvent(event)
            return event
        }

        test('opens a link to a board in the panel, instead of the page', () => {
            const event = click(link('/kanban/team/t1/b1/v1/c1'))
            expect(open).toHaveBeenCalledWith('/team/t1/b1/v1/c1')
            expect(event.defaultPrevented).toBe(true)
        })

        test('opens a link to a board, in a link preview\'s card, in the panel', () => {
            const anchor = link('/kanban/team/t1/b1/0/c1', {class: 'FocalboardUnfurl'})
            const inner = document.createElement('span')
            anchor.appendChild(inner)
            click(inner)
            expect(open).toHaveBeenCalledWith('/team/t1/b1/0/c1')
        })

        test('leaves the clicks that open a new tab or window', () => {
            const anchor = link('/kanban/team/t1/b1')
            click(anchor, {ctrlKey: true})
            click(anchor, {metaKey: true})
            click(anchor, {shiftKey: true})
            click(anchor, {button: 1})
            click(link('/kanban/team/t1/b1', {target: '_blank'}))
            click(link('/kanban/team/t1/b1', {download: ''}))
            expect(open).not.toHaveBeenCalled()
        })

        test('leaves the panel\'s own links to its router', () => {
            const panel = document.createElement('div')
            panel.setAttribute('data-kanban-panel', 'true')
            document.body.appendChild(panel)
            click(link('/kanban/team/t1/b1', {}, panel))
            expect(open).not.toHaveBeenCalled()
        })

        test('leaves the other links, and a publicly shared board\'s page', () => {
            const event = click(link('/lumen/channels/town-square'))
            click(link('/plugins/focalboard/team/t1/shared/b1?r=token'))
            expect(open).not.toHaveBeenCalled()
            expect(event.defaultPrevented).toBe(false)
        })

        test('stops once removed', () => {
            remove()
            click(link('/kanban/team/t1/b1'))
            expect(open).not.toHaveBeenCalled()
        })
    })
})
