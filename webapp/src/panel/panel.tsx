// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useLayoutEffect, useRef, useState} from 'react'
import {Provider as ReduxProvider} from 'react-redux'
import {useIntl} from 'react-intl'
import {Redirect, Route, Router, Switch} from 'react-router-dom'

import App from '../app'
import store from '../store'
import manifest from '../manifest'
import ErrorBoundary from '../error_boundary'
import WithWebSockets from '../components/withWebSockets'
import FBRoute from '../route'
import {GlobalErrorRedirect, WorkspaceToTeamRedirect} from '../router'
import WelcomePage from '../pages/welcome/welcomePage'
import ErrorPage from '../pages/errorPage'
import AccessDeniedPage from '../pages/accessDeniedPage'
import {Utils} from '../utils'
import {AMWebSocketClient} from '../wsclient'

import {InPanelContext, PANEL_ROOT_ATTRIBUTE} from './context'
import {PanelHistory, panelHistory, usePanelState} from './history'
import {
    BOARD_PATH,
    NEW_LINKED_BOARD_PATH,
    PANEL_BOARDS_PATH,
    PANEL_HOME,
    PANEL_TEMPLATES_PATH,
} from './paths'
import {BoardList, ChannelHome, PanelBoard, PanelPage, PanelStart, PanelTemplates} from './views'

import './panel.scss'

/**
 * PanelRoutes are the panel's views, at the paths the full page had (under /kanban): the channel's boards first, the
 * community's boards, the templates, a board with its views and cards, the welcome and error pages.
 */
export const PanelRoutes = (): React.JSX.Element => (
    <>
        <GlobalErrorRedirect/>
        <Switch>
            {/* What the side panel always showed: no welcome page in front of it. */}
            <Route
                path={PANEL_HOME}
                exact={true}
            >
                <ChannelHome/>
            </Route>
            <Route
                path='/'
                exact={true}
            >
                <PanelStart/>
            </Route>
            <FBRoute
                exact={true}
                path='/welcome'
            >
                <PanelPage>
                    <WelcomePage/>
                </PanelPage>
            </FBRoute>
            <FBRoute path='/error'>
                <PanelPage>
                    <ErrorPage/>
                </PanelPage>
            </FBRoute>
            <FBRoute path='/access-denied'>
                <PanelPage>
                    <AccessDeniedPage/>
                </PanelPage>
            </FBRoute>
            <FBRoute
                loginRequired={true}
                path={PANEL_TEMPLATES_PATH}
                exact={true}
            >
                <PanelTemplates/>
            </FBRoute>
            <FBRoute
                loginRequired={true}
                path={NEW_LINKED_BOARD_PATH}
            >
                <PanelBoard new={true}/>
            </FBRoute>
            <FBRoute path={['/team/:teamId/shared/:boardId?/:viewId?/:cardId?', '/shared/:boardId?/:viewId?/:cardId?']}>
                <PanelBoard readonly={true}/>
            </FBRoute>
            <FBRoute
                loginRequired={true}
                path='/board/:boardId?/:viewId?/:cardId?'
                getOriginalPath={({params: {boardId, viewId, cardId}}) => `/board/${Utils.buildOriginalPath('', boardId, viewId, cardId)}`}
            >
                <PanelBoard/>
            </FBRoute>
            <FBRoute path={['/workspace/:workspaceId/shared/:boardId?/:viewId?/:cardId?', '/workspace/:workspaceId/:boardId?/:viewId?/:cardId?']}>
                <WorkspaceToTeamRedirect/>
            </FBRoute>
            <FBRoute
                loginRequired={true}
                path={PANEL_BOARDS_PATH}
                exact={true}
                getOriginalPath={({params: {teamId}}) => `/team/${teamId}`}
            >
                <BoardList/>
            </FBRoute>
            <FBRoute
                loginRequired={true}
                path={BOARD_PATH}
                getOriginalPath={({params: {teamId, boardId, viewId, cardId}}) => `/team/${Utils.buildOriginalPath(teamId, boardId, viewId, cardId)}`}
            >
                <PanelBoard/>
            </FBRoute>

            {/* /team/ alone, /login (a logged-out view), anything else: the panel's start. */}
            <Route>
                <Redirect to='/'/>
            </Route>
        </Switch>
    </>
)

let openPanels = 0

// isKanbanPanelOpen tells whether the Kanban panel shows (its views are mounted only then).
export const isKanbanPanelOpen = (): boolean => openPanels > 0

const useMarkOpen = () => {
    useEffect(() => {
        openPanels++
        return () => {
            openPanels--
        }
    }, [])
}

// Under this width, the board's header wraps and its margins narrow.
export const NARROW_PANEL_WIDTH = 640

/**
 * usePanelBox follows the panel's box: it gives the dialogs its place (--kanban-panel-top, -left, -width, -height),
 * so that they cover the panel rather than the window, and tells whether the panel is narrow.
 */
export function usePanelBox(ref: React.RefObject<HTMLDivElement | null>): boolean {
    const [narrow, setNarrow] = useState(false)

    useLayoutEffect(() => {
        const element = ref.current
        if (!element) {
            return undefined
        }

        const measure = () => {
            const box = element.getBoundingClientRect()

            // Nothing is laid out yet (or in tests): keep what we have.
            if (box.width <= 0) {
                return
            }
            element.style.setProperty('--kanban-panel-top', `${Math.round(box.top)}px`)
            element.style.setProperty('--kanban-panel-left', `${Math.round(box.left)}px`)
            element.style.setProperty('--kanban-panel-width', `${Math.round(box.width)}px`)
            element.style.setProperty('--kanban-panel-height', `${Math.round(box.height)}px`)
            setNarrow(box.width < NARROW_PANEL_WIDTH)
        }
        measure()

        window.addEventListener('resize', measure)
        const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
        observer?.observe(element)
        return () => {
            window.removeEventListener('resize', measure)
            observer?.disconnect()
        }
    }, [ref])

    return narrow
}

type Props = {
    webSocketClient?: AMWebSocketClient
    history?: PanelHistory

    // Where the panel is, for the web app's "Open in a new window" (Fusion only; the classic UI passes neither).
    setPanelState?: (state: string | null) => void

    // In a pop-out window: where the main window's panel was.
    initialPanelState?: string
}

// PanelCrash replaces the panel's views when one of them fails, rather than reloading the app on the error page.
const PanelCrash = () => {
    const intl = useIntl()
    return (
        <div className='KanbanPanelCrash'>
            {intl.formatMessage({
                id: 'KanbanPanel.crashed',
                defaultMessage: 'Kanban ran into a problem. Close the panel and open it again.',
                description: 'Kanban side panel: shown instead of its content when it failed to show.',
            })}
        </div>
    )
}

/**
 * KanbanPanel is the Kanban app in the side panel: the channel's boards first, and every page the app had as a full
 * page (the community's boards by category, the templates, a board in its board, table, gallery or calendar view,
 * a card, the welcome page) as views with a back button. A board widens the panel; a card opens in a dialog over it.
 */
const KanbanPanel = ({webSocketClient, history = panelHistory, setPanelState, initialPanelState}: Props): React.JSX.Element => {
    usePanelState(history, setPanelState, initialPanelState)
    useMarkOpen()
    const rootRef = useRef<HTMLDivElement>(null)
    const narrow = usePanelBox(rootRef)

    const root = {[PANEL_ROOT_ATTRIBUTE]: true}

    return (
        <ErrorBoundary>
            <ReduxProvider store={store}>
                <WithWebSockets
                    manifest={manifest}
                    webSocketClient={webSocketClient}
                >
                    <InPanelContext.Provider value={true}>
                        <div
                            ref={rootRef}
                            className={`focalboard-body KanbanPanel${narrow ? ' KanbanPanel--narrow' : ''}`}
                            {...root}
                        >
                            <div id='focalboard-app'>
                                <App>
                                    <ErrorBoundary fallback={<PanelCrash/>}>
                                        <Router history={history}>
                                            <PanelRoutes/>
                                        </Router>
                                    </ErrorBoundary>
                                </App>
                            </div>

                            {/* The dialogs (a card, sharing a board...) cover the panel, not the whole window. */}
                            <div id='focalboard-root-portal'/>
                        </div>
                    </InPanelContext.Provider>
                </WithWebSockets>
            </ReduxProvider>
        </ErrorBoundary>
    )
}

export default KanbanPanel
