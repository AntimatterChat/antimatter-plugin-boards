// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useState} from 'react'
import ReactDOM from 'react-dom'

import {fusionLayer} from './fusion_ui'

// Under the Fusion UI, Kanban's dialogs and menus are drawn in Fusion's layer (#am-layer), above the app, as Fusion's
// own are: they aren't cut by the side panel and they take the layer's styles. They're drawn in one box of the layer,
// the Kanban layer, which carries the classes Kanban's styles are scoped to (.focalboard-body, .KanbanPanel) and the
// panel's box (--kanban-panel-*), so a dialog still covers the panel. Under the classic UI nothing moves.

export const KANBAN_LAYER_ATTRIBUTE = 'data-kanban-layer'

const LAYER_CLASS = 'focalboard-body KanbanPanel KanbanLayer'
const NARROW_CLASS = 'KanbanPanel--narrow'

// kanbanLayer returns Kanban's box in Fusion's layer, made on first use, or null outside the Fusion UI (or in a page
// without Fusion's layer).
export function kanbanLayer(): HTMLElement | null {
    const layer = fusionLayer()
    if (!layer) {
        return null
    }
    let box = layer.querySelector<HTMLElement>(`:scope > [${KANBAN_LAYER_ATTRIBUTE}]`)
    if (!box) {
        box = document.createElement('div')
        box.className = LAYER_CLASS
        box.setAttribute(KANBAN_LAYER_ATTRIBUTE, 'true')
        layer.appendChild(box)
    }
    return box
}

export type PanelBox = {top: number, left: number, width: number, height: number}

// setLayerPanelBox gives the Kanban layer the panel's place and width class, as the panel has them, so that what's
// drawn in the layer covers the panel as it did inside it.
export function setLayerPanelBox(box: PanelBox, narrow: boolean): void {
    const layer = kanbanLayer()
    if (!layer) {
        return
    }
    layer.style.setProperty('--kanban-panel-top', `${Math.round(box.top)}px`)
    layer.style.setProperty('--kanban-panel-left', `${Math.round(box.left)}px`)
    layer.style.setProperty('--kanban-panel-width', `${Math.round(box.width)}px`)
    layer.style.setProperty('--kanban-panel-height', `${Math.round(box.height)}px`)
    layer.classList.toggle(NARROW_CLASS, narrow)
}

type Props = {
    children: React.ReactNode
}

/**
 * LayerPortal draws its children in the Kanban layer under the Fusion UI, and where it stands under the classic UI.
 * Where it draws is decided once, when it's mounted.
 */
export function LayerPortal({children}: Props): React.JSX.Element {
    const [layer] = useState(kanbanLayer)
    if (!layer) {
        return <>{children}</>
    }
    return ReactDOM.createPortal(children, layer)
}

// layerOr is where a popup drawn apart from its component (a select's menu) goes: the Kanban layer under the Fusion
// UI, so that it shows above Kanban's dialogs there, and the given element under the classic UI.
export function layerOr<T extends HTMLElement | null>(fallback: T): HTMLElement | T {
    return kanbanLayer() || fallback
}
