// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {CSSProperties} from 'react'

import SeparatorOption from './separatorOption'
import SwitchOption from './switchOption'
import TextOption from './textOption'
import ColorOption from './colorOption'
import SubMenuOption, {HoveringContext} from './subMenuOption'
import LabelOption from './labelOption'

import './menu.scss'
import textInputOption from './textInputOption'
import MenuUtil from './menuUtil'

// The space kept between a menu and the bottom of the window, and the least height a long menu shrinks to.
const WINDOW_MARGIN = 16
const MIN_SCROLLING_HEIGHT = 120

type Props = {
    children: React.ReactNode
    position?: 'top' | 'bottom' | 'left' | 'right' | 'auto'
    fixed?: boolean
    parentRef?: React.RefObject<any>
}

export default class Menu extends React.PureComponent<Props> {
    static Color = ColorOption
    static SubMenu = SubMenuOption
    static Switch = SwitchOption
    static Separator = SeparatorOption
    static Text = TextOption
    static TextInput = textInputOption
    static Label = LabelOption

    menuRef: React.RefObject<HTMLDivElement | null>
    contentsRef: React.RefObject<HTMLDivElement | null>

    constructor(props: Props) {
        super(props)

        this.menuRef = React.createRef<HTMLDivElement>()
        this.contentsRef = React.createRef<HTMLDivElement>()
    }

    public state: {hovering: React.ReactNode, contentsStyle?: CSSProperties, shiftLeft: number} = {
        hovering: null,
        shiftLeft: 0,
    }

    private fitFrame = 0

    public componentDidMount(): void {
        this.fitInWindow()

        // Once more when the menu has its place: under Fusion, it's drawn in Fusion's layer, at its button, once its
        // box there has measured the button.
        this.fitFrame = window.requestAnimationFrame(this.fitInWindow)
        window.addEventListener('resize', this.fitInWindow)
    }

    public componentWillUnmount(): void {
        window.cancelAnimationFrame(this.fitFrame)
        window.removeEventListener('resize', this.fitInWindow)
    }

    // Antimatter: a menu stays within the window. One longer than the space left below its top (a board with many
    // properties, in the side panel or a short window) scrolls, rather than running past the bottom of the window,
    // out of reach; one that would run past its right edge (opened from a button at the right of the side panel)
    // moves left.
    private fitInWindow = (): void => {
        const contents = this.contentsRef.current
        const menu = this.menuRef.current
        if (!contents || !menu) {
            return
        }
        const top = contents.getBoundingClientRect().top
        const available = Math.floor(window.innerHeight - WINDOW_MARGIN - top)
        const contentsStyle = top >= 0 && contents.scrollHeight > available ? {maxHeight: Math.max(available, MIN_SCROLLING_HEIGHT), overflowY: 'auto' as const} : undefined

        // Where the menu would be without the shift it has.
        const box = menu.getBoundingClientRect()
        const left = box.left + this.state.shiftLeft
        const right = box.right + this.state.shiftLeft
        const shiftLeft = Math.max(0, Math.min(Math.ceil(right - (window.innerWidth - WINDOW_MARGIN)), Math.floor(left - WINDOW_MARGIN)))

        if (contentsStyle?.maxHeight !== this.state.contentsStyle?.maxHeight || shiftLeft !== this.state.shiftLeft) {
            this.setState({contentsStyle, shiftLeft})
        }
    }

    public render(): React.JSX.Element {
        const {position, fixed, children} = this.props

        let style: CSSProperties = {}
        if (this.props.parentRef) {
            const forceBottom = position ? ['bottom', 'left', 'right'].includes(position) : false
            style = MenuUtil.openUp(this.props.parentRef, forceBottom).style
        }
        if (this.state.shiftLeft > 0) {
            style = {...style, transform: `translateX(-${this.state.shiftLeft}px)`}
        }

        return (
            <div
                className={`Menu noselect ${position || 'bottom'} ${fixed ? ' fixed' : ''}`}
                style={style}
                ref={this.menuRef}
            >
                <div
                    className='menu-contents'
                    ref={this.contentsRef}
                    style={this.state.contentsStyle}
                >
                    <div className='menu-options'>
                        {React.Children.map(children, (child) => (
                            <div
                                onMouseEnter={() => this.setState({hovering: child})}
                            >
                                <HoveringContext.Provider value={child === this.state.hovering}>
                                    {child}
                                </HoveringContext.Provider>
                            </div>))}
                    </div>

                    <div className='menu-spacer hideOnWidescreen'/>

                    <div className='menu-options hideOnWidescreen'>
                        <Menu.Text
                            id='menu-cancel'
                            name={'Cancel'}
                            className='menu-cancel'
                            onClick={this.onCancel}
                        />
                    </div>
                </div>
            </div>
        )
    }

    private onCancel = () => {
        // No need to do anything, as click bubbled up to MenuWrapper, which closes
    }
}
