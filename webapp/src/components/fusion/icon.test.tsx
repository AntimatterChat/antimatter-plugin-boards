// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {render} from '@testing-library/react'

import CompassIcon from '../../widgets/icons/compassIcon'

import FusionIcon, {COMPASS_TO_FUSION, FUSION_ICON_NAMES} from './icon'

// The symbols of Fusion's icon sprite (server repo: webapp/fusion/src/fusion/components/icon/icon_sprite.tsx), as of
// Kanban's Fusion look. A name Kanban uses that isn't here would draw nothing under Fusion.
const FUSION_SPRITE = [
    'hash', 'speaker', 'lock', 'forum', 'thread', 'thread-reply', 'search', 'users', 'pin', 'bell', 'inbox', 'cog',
    'shield', 'mic', 'mic-off', 'mic-lock', 'headphones', 'headphones-off', 'video', 'screen', 'hangup', 'plus', 'apps',
    'captions', 'transcript', 'reply', 'smile', 'dots', 'x', 'ban', 'chev', 'server', 'globe', 'export', 'pen', 'send',
    'compass', 'menu', 'board', 'playbook', 'check', 'store', 'plug', 'chat', 'rank', 'org', 'tag', 'clock', 'history',
    'bot', 'image', 'file', 'attach', 'follow', 'at', 'bold', 'italic', 'strike', 'heading', 'link', 'code',
    'codeblock', 'quote', 'sparkle', 'flag', 'eye-off', 'eye', 'stroke', 'library', 'flame', 'timer', 'ul', 'ol',
    'type', 'poll', 'upload', 'slash', 'star', 'bell-off', 'folder', 'leave', 'user-plus', 'forward', 'bookmark', 'copy',
    'trash', 'sticker', 'popout', 'expand', 'kanban', 'runbook', 'ticket', 'mail', 'calendar', 'pad', 'draw', 'cursor',
    'rect', 'ellipse', 'arrow', 'text', 'eraser', 'undo', 'checkbox', 'pause', 'moon', 'phone', 'pin-top', 'hand',
    'fullscreen', 'shrink-width', 'mark',
]

const setWebUI = (ui?: 'classic' | 'fusion') => {
    window.antimatterWebUI = ui
    if (ui) {
        document.documentElement.dataset.amWebUi = ui
    } else {
        delete document.documentElement.dataset.amWebUi
    }
}

afterEach(() => setWebUI(undefined))

describe('Fusion icons', () => {
    test.each(FUSION_ICON_NAMES)('%s is a symbol of Fusion\'s sprite', (name) => {
        expect(FUSION_SPRITE).toContain(name)
    })

    test('the icons Kanban draws most have a Fusion match', () => {
        for (const compass of ['plus', 'chevron-down', 'chevron-right', 'product-boards', 'content-copy', 'trash-can-outline', 'magnify', 'close', 'dots-horizontal']) {
            expect(COMPASS_TO_FUSION[compass]).toBeDefined()
        }
    })

    test('FusionIcon draws the sprite\'s symbol, with its own stroke', () => {
        const {container} = render(<FusionIcon name='kanban'/>)
        const svg = container.querySelector('svg')!
        expect(svg.getAttribute('class')).toBe('am-ic')
        expect(svg.getAttribute('stroke')).toBe('currentColor')
        expect(svg.getAttribute('fill')).toBe('none')
        expect(svg.getAttribute('aria-hidden')).toBe('true')
        expect(container.querySelector('use')!.getAttribute('href')).toBe('#am-i-kanban')
    })
})

describe('CompassIcon', () => {
    test('under the Fusion UI, draws Fusion\'s icon in the same element', () => {
        setWebUI('fusion')
        const {container} = render(
            <CompassIcon
                icon='trash-can-outline'
                className='DeleteIcon'
            />,
        )
        const i = container.querySelector('i')!
        expect(i.className).toBe('CompassIcon icon-trash-can-outline DeleteIcon amfx-icon')
        expect(i.querySelector('use')!.getAttribute('href')).toBe('#am-i-trash')
    })

    test('under the Fusion UI, turns Fusion\'s chevron for the other directions', () => {
        setWebUI('fusion')
        const {container} = render(<CompassIcon icon='chevron-right'/>)
        const svg = container.querySelector('svg')!
        expect(svg.querySelector('use')!.getAttribute('href')).toBe('#am-i-chev')
        expect(svg.style.transform).toBe('rotate(-90deg)')
    })

    test('under the Fusion UI, keeps the Compass glyph of an icon Fusion has no match for', () => {
        setWebUI('fusion')
        const {container} = render(<CompassIcon icon='drag-vertical'/>)
        expect(container.querySelector('svg')).toBeNull()
        expect(container.querySelector('i')!.className).toBe('CompassIcon icon-drag-vertical')
    })

    test('under the classic UI, is the Compass glyph, as before', () => {
        setWebUI('classic')
        const {container} = render(<CompassIcon icon='trash-can-outline'/>)
        expect(container.querySelector('svg')).toBeNull()
        expect(container.innerHTML).toBe('<i class="CompassIcon icon-trash-can-outline"></i>')
    })
})
