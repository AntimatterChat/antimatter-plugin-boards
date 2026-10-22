// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {act, render} from '@testing-library/react'

import Menu from '.'

// Antimatter: a long menu scrolls within the window, rather than running past its bottom (the Properties menu of a
// board with many properties, in the side panel).
describe('widgets/menu/Menu in a small window', () => {
    const innerHeight = window.innerHeight

    const innerWidth = window.innerWidth

    // The menu's contents are `height` tall and start `top` pixels down the window; the menu spans `left` to `right`.
    const layOut = (top: number, height: number, left = 100, right = 340) => {
        jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({top, bottom: top + height, left, right} as DOMRect)
        jest.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(height)
    }

    const renderMenu = () => render(
        <Menu>
            <Menu.Text
                id='one'
                name='One'
                onClick={jest.fn()}
            />
        </Menu>,
    )

    const contents = (container: HTMLElement) => container.querySelector('.menu-contents') as HTMLElement

    afterEach(() => {
        jest.restoreAllMocks()
        window.innerHeight = innerHeight
        window.innerWidth = innerWidth
    })

    test('scrolls a menu that would run past the bottom of the window', () => {
        window.innerHeight = 720
        layOut(313, 600)
        const {container} = renderMenu()
        expect(contents(container).style.maxHeight).toBe(`${720 - 16 - 313}px`)
        expect(contents(container).style.overflowY).toBe('auto')
    })

    test('leaves a menu that fits as it is', () => {
        window.innerHeight = 720
        layOut(100, 300)
        const {container} = renderMenu()
        expect(contents(container).getAttribute('style')).toBeNull()
    })

    test('follows the window\'s height', () => {
        window.innerHeight = 720
        layOut(313, 600)
        const {container} = renderMenu()
        expect(contents(container).style.maxHeight).toBe('391px')

        window.innerHeight = 1200
        act(() => {
            window.dispatchEvent(new Event('resize'))
        })
        expect(contents(container).style.maxHeight).toBe('')
        expect(contents(container).style.overflowY).toBe('')
    })

    test('moves a menu that would run past the right edge of the window to the left', () => {
        window.innerWidth = 1280
        layOut(100, 300, 1118, 1388)
        const {container} = renderMenu()
        const menu = container.querySelector('.Menu') as HTMLElement
        expect(menu.style.transform).toBe(`translateX(-${1388 - (1280 - 16)}px)`)
    })

    test('leaves a menu within the window\'s width where it is', () => {
        window.innerWidth = 1280
        layOut(100, 300, 800, 1060)
        const {container} = renderMenu()
        expect((container.querySelector('.Menu') as HTMLElement).style.transform).toBe('')
    })
})
