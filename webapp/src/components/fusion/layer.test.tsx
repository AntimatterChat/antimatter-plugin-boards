// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {act, fireEvent, render, screen} from '@testing-library/react'

import {wrapIntl} from '../../testUtils'
import Dialog from '../dialog'
import RootPortal from '../rootPortal'
import MenuWrapper from '../../widgets/menuWrapper'
import Menu from '../../widgets/menu'

import {FUSION_LAYER_ID} from './fusion_ui'
import {KANBAN_LAYER_ATTRIBUTE, kanbanLayer, layerOr, setLayerPanelBox} from './layer'

const setWebUI = (ui?: 'classic' | 'fusion') => {
    window.antimatterWebUI = ui
    if (ui) {
        document.documentElement.dataset.amWebUi = ui
    } else {
        delete document.documentElement.dataset.amWebUi
    }
}

const fusionLayer = () => document.getElementById(FUSION_LAYER_ID)!
const kanbanBox = () => fusionLayer().querySelector<HTMLElement>(`[${KANBAN_LAYER_ATTRIBUTE}]`)

beforeEach(() => {
    document.body.innerHTML = `<div id="${FUSION_LAYER_ID}" class="am-layer"></div>`
})

afterEach(() => {
    setWebUI(undefined)
    document.body.innerHTML = ''
})

describe('the Kanban layer', () => {
    test('under the Fusion UI, is one box of Fusion\'s layer, with the classes Kanban\'s styles are scoped to', () => {
        setWebUI('fusion')
        const box = kanbanLayer()!
        expect(box).not.toBeNull()
        expect(box.parentElement).toBe(fusionLayer())
        expect(box.className).toBe('focalboard-body KanbanPanel KanbanLayer')
        expect(kanbanLayer()).toBe(box)
        expect(fusionLayer().children).toHaveLength(1)
    })

    test('doesn\'t exist under the classic UI, or without Fusion\'s layer', () => {
        setWebUI('classic')
        expect(kanbanLayer()).toBeNull()
        expect(fusionLayer().children).toHaveLength(0)

        setWebUI('fusion')
        document.body.innerHTML = ''
        expect(kanbanLayer()).toBeNull()
    })

    test('takes the panel\'s box, so a dialog still covers the panel', () => {
        setWebUI('fusion')
        setLayerPanelBox({top: 48.4, left: 900, width: 520.6, height: 700}, true)
        const box = kanbanBox()!
        expect(box.style.getPropertyValue('--kanban-panel-top')).toBe('48px')
        expect(box.style.getPropertyValue('--kanban-panel-left')).toBe('900px')
        expect(box.style.getPropertyValue('--kanban-panel-width')).toBe('521px')
        expect(box.style.getPropertyValue('--kanban-panel-height')).toBe('700px')
        expect(box.classList.contains('KanbanPanel--narrow')).toBe(true)

        setLayerPanelBox({top: 0, left: 0, width: 900, height: 700}, false)
        expect(box.classList.contains('KanbanPanel--narrow')).toBe(false)
    })

    test('a popup drawn apart goes to the layer under Fusion, where it went under the classic UI', () => {
        setWebUI('fusion')
        expect(layerOr(document.body)).toBe(kanbanBox())
        setWebUI('classic')
        expect(layerOr(document.body)).toBe(document.body)
    })
})

describe('Kanban\'s dialogs', () => {
    const dialog = (
        <Dialog
            title={<span>{'Share'}</span>}
            onClose={jest.fn()}
        >
            <p>{'Inside the dialog'}</p>
        </Dialog>
    )

    test('open in Fusion\'s layer under the Fusion UI', () => {
        setWebUI('fusion')
        const {container} = render(wrapIntl(dialog))
        const inside = screen.getByText('Inside the dialog')
        expect(kanbanBox()!.contains(inside)).toBe(true)
        expect(container.contains(inside)).toBe(false)
        expect(inside.closest('[role="dialog"]')).not.toBeNull()
    })

    test('open where they stand under the classic UI', () => {
        setWebUI('classic')
        const {container} = render(wrapIntl(dialog))
        expect(container.contains(screen.getByText('Inside the dialog'))).toBe(true)
        expect(fusionLayer().children).toHaveLength(0)
    })

    test('the root portal (a card, deleting a board) is in Fusion\'s layer under the Fusion UI', () => {
        setWebUI('fusion')
        render(<RootPortal><div>{'A card'}</div></RootPortal>)
        expect(kanbanBox()!.contains(screen.getByText('A card'))).toBe(true)
    })
})

describe('Kanban\'s menus', () => {
    const menu = (onClick = jest.fn()) => (
        <MenuWrapper>
            <button type='button'>{'Open the menu'}</button>
            <Menu>
                <Menu.Text
                    id='duplicate'
                    name='Duplicate'
                    onClick={onClick}
                />
            </Menu>
        </MenuWrapper>
    )

    test('open in Fusion\'s layer under the Fusion UI, over their button, and keep working', () => {
        setWebUI('fusion')
        const onClick = jest.fn()
        const {container} = render(wrapIntl(menu(onClick)))
        fireEvent.click(screen.getByText('Open the menu'))

        const item = screen.getByText('Duplicate')
        expect(container.contains(item)).toBe(false)
        const box = item.closest<HTMLElement>('[data-kanban-menu-box]')!
        expect(box.parentElement).toBe(kanbanBox())
        expect(box.style.position).toBe('fixed')

        // A click in the menu isn't a click outside it: the item gets it, and the menu closes after it.
        act(() => {
            fireEvent.click(item)
        })
        expect(onClick).toHaveBeenCalledTimes(1)
        expect(screen.queryByText('Duplicate')).toBeNull()
    })

    test('close on a click outside, in the layer too', () => {
        setWebUI('fusion')
        render(wrapIntl(menu()))
        fireEvent.click(screen.getByText('Open the menu'))
        expect(screen.getByText('Duplicate')).toBeDefined()
        act(() => {
            fireEvent.click(document.body)
        })
        expect(screen.queryByText('Duplicate')).toBeNull()
    })

    test('open in their button under the classic UI', () => {
        setWebUI('classic')
        const {container} = render(wrapIntl(menu()))
        fireEvent.click(screen.getByText('Open the menu'))
        expect(container.contains(screen.getByText('Duplicate'))).toBe(true)
        expect(fusionLayer().children).toHaveLength(0)
    })
})
