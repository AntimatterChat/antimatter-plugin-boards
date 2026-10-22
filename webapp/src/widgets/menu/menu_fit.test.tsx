// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {act, render} from '@testing-library/react'

import Menu from '.'

// Antimatter: a long menu scrolls within the window, rather than running past its bottom (the Properties menu of a
// board with many properties, in the side panel).
describe('widgets/menu/Menu in a short window', () => {
    const innerHeight = window.innerHeight

    // The menu's contents are `height` tall and start `top` pixels down the window.
    const layOut = (top: number, height: number) => {
        jest.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({top, bottom: top + height} as DOMRect)
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
})
