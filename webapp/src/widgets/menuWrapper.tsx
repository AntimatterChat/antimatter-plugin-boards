// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import React, {useRef, useState, useEffect, useCallback, useLayoutEffect} from 'react'
import ReactDOM from 'react-dom'

import {kanbanLayer} from '../components/fusion/layer'

import './menuWrapper.scss'

// Above the dialogs of the Kanban layer (and their confirmations), whose menus these can be.
const LAYER_MENU_Z_INDEX = 500

type Box = {top: number, left: number, width: number, height: number}

type Props = {
    children?: React.ReactNode
    stopPropagationOnToggle?: boolean
    className?: string
    disabled?: boolean
    isOpen?: boolean
    onToggle?: (open: boolean) => void
    label?: string
}

const MenuWrapper = (props: Props) => {
    const node = useRef<HTMLDivElement>(null)
    const [open, setOpen] = useState(Boolean(props.isOpen))

    // Under the Fusion UI, the menu is drawn in Fusion's layer (Kanban's box there), in a box over the wrapper: it
    // opens where it did, without being cut by the panel. Under the classic UI, it's drawn in the wrapper.
    const [layer] = useState(kanbanLayer)
    const menuBox = useRef<HTMLDivElement>(null)
    const [anchor, setAnchor] = useState<Box | null>(null)

    if (!Array.isArray(props.children) || props.children.length !== 2) {
        throw new Error('MenuWrapper needs exactly 2 children')
    }

    const close = useCallback((): void => {
        if (open) {
            setOpen(false)
            props.onToggle && props.onToggle(false)
        }
    }, [props.onToggle, open])

    const closeOnBlur = useCallback((e: Event) => {
        if (e.target && (node.current?.contains(e.target as Node) || menuBox.current?.contains(e.target as Node))) {
            return
        }

        close()
    }, [close])

    const keyboardClose = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            close()
        }

        if (e.key === 'Tab') {
            closeOnBlur(e)
        }
    }, [close, closeOnBlur])

    const toggle = useCallback((e: React.MouseEvent<HTMLDivElement, MouseEvent>): void => {
        if (props.disabled) {
            return
        }

        /**
         * This is only here so that we can toggle the menus in the sidebar, because the default behavior of the mobile
         * version (ie the one that uses a modal) needs propagation to close the modal after selecting something
         * We need to refactor this so that the modal is explicitly closed on toggle, but for now I am aiming to preserve the existing logic
         * so as to not break other things
        **/
        if (props.stopPropagationOnToggle) {
            e.preventDefault()
            e.stopPropagation()
        }
        setOpen(!open)
        props.onToggle && props.onToggle(!open)
    }, [props.onToggle, open, props.disabled])

    useEffect(() => {
        if (open) {
            document.addEventListener('menuItemClicked', close, true)
            document.addEventListener('click', closeOnBlur, true)
            document.addEventListener('keyup', keyboardClose, true)
        }
        return () => {
            if (open) {
                document.removeEventListener('menuItemClicked', close, true)
                document.removeEventListener('click', closeOnBlur, true)
                document.removeEventListener('keyup', keyboardClose, true)
            }
        }
    }, [open, close, closeOnBlur, keyboardClose])

    // The wrapper's box, followed while the menu is open in the layer (the panel scrolls, the window is resized).
    useLayoutEffect(() => {
        if (!open || !layer) {
            return undefined
        }
        const measure = () => {
            const rect = node.current?.getBoundingClientRect()
            if (rect) {
                setAnchor({top: rect.top, left: rect.left, width: rect.width, height: rect.height})
            }
        }
        measure()
        window.addEventListener('resize', measure)
        document.addEventListener('scroll', measure, true)
        return () => {
            window.removeEventListener('resize', measure)
            document.removeEventListener('scroll', measure, true)
        }
    }, [open, layer])

    const {children} = props
    const menu = children && !props.disabled && open ? Object.values(children)[1] : null
    let className = 'MenuWrapper'
    if (props.disabled) {
        className += ' disabled'
    }
    if (open) {
        className += ' override menuOpened'
    }
    if (props.className) {
        className += ' ' + props.className
    }

    return (
        <div
            role='button'
            aria-label={props.label || 'menuwrapper'}
            className={className}
            onClick={toggle}
            ref={node}
        >
            {children ? Object.values(children)[0] : null}
            {layer && menu ? ReactDOM.createPortal((
                <div
                    ref={menuBox}
                    className='MenuWrapper menuOpened KanbanMenuBox'
                    data-kanban-menu-box='true'
                    style={{
                        position: 'fixed',
                        top: anchor?.top ?? 0,
                        left: anchor?.left ?? 0,
                        width: anchor?.width ?? 0,
                        height: anchor?.height ?? 0,
                        zIndex: LAYER_MENU_Z_INDEX,
                        pointerEvents: 'none',
                        visibility: anchor ? 'visible' : 'hidden',
                    }}
                >
                    {menu}
                </div>
            ), layer) : menu}
        </div>
    )
}

export default React.memo(MenuWrapper)
