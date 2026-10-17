// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {isPanelActive, trackPanelFocus} from './context'

// Antimatter: Kanban's keyboard shortcuts (undo, deleting the selected cards...) act on the panel only after a click in
// it: typing a message next to a board keeps them for the message.
describe('panel/context', () => {
    let stop: () => void
    let panel: HTMLElement
    let outside: HTMLElement

    beforeEach(() => {
        stop = trackPanelFocus()
        panel = document.createElement('div')
        panel.setAttribute('data-kanban-panel', 'true')
        const card = document.createElement('div')
        panel.appendChild(card)
        outside = document.createElement('textarea')
        document.body.append(panel, outside)
    })

    afterEach(() => {
        stop()
        document.body.innerHTML = ''
    })

    test('the full page\'s shortcuts always act', () => {
        expect(isPanelActive(false)).toBe(true)
    })

    test('the panel\'s shortcuts act after a click in the panel, not after one in the rest of the app', () => {
        expect(isPanelActive(true)).toBe(false)

        panel.firstElementChild!.dispatchEvent(new Event('pointerdown', {bubbles: true}))
        expect(isPanelActive(true)).toBe(true)

        outside.dispatchEvent(new Event('pointerdown', {bubbles: true}))
        expect(isPanelActive(true)).toBe(false)
    })

    test('moving the focus counts as well', () => {
        panel.firstElementChild!.dispatchEvent(new FocusEvent('focusin', {bubbles: true}))
        expect(isPanelActive(true)).toBe(true)

        outside.dispatchEvent(new FocusEvent('focusin', {bubbles: true}))
        expect(isPanelActive(true)).toBe(false)
    })

    test('stops following once stopped', () => {
        panel.firstElementChild!.dispatchEvent(new Event('pointerdown', {bubbles: true}))
        stop()
        expect(isPanelActive(true)).toBe(false)
        panel.firstElementChild!.dispatchEvent(new Event('pointerdown', {bubbles: true}))
        expect(isPanelActive(true)).toBe(false)
        stop = trackPanelFocus()
    })
})
