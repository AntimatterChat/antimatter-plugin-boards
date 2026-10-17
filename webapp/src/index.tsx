// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {createIntl, createIntlCache} from 'react-intl'
import {Store, Action} from 'redux'
import {Provider as ReduxProvider} from 'react-redux'
import {GlobalState} from '@mattermost/types/store'


import {setAntimatterTheme} from './theme'
import BoardsAppIcon, {boardsAppIconURL} from './widgets/icons/boardsAppIcon'
import store from './store'
import {setTeam} from './store/teams'
import WithWebSockets from './components/withWebSockets'
import {setChannel} from './store/channels'
import {initialLoad} from './store/initialLoad'
import {Utils} from './utils'
import './styles/focalboard-variables.scss'
import './styles/main.scss'
import './styles/labels.scss'
import octoClient from './octoClient'
import {Board} from './blocks/board'
import {getMessages, getCurrentLanguage} from './i18n'
import {UserSettings} from './userSettings'
import {SuiteWindow} from './types/index'
import BoardsUnfurl from './components/boardsUnfurl/boardsUnfurl'
import BoardSelector from './components/boardSelector'
import wsClient, {
    AMWebSocketClient,
    ACTION_UPDATE_BLOCK,
    ACTION_UPDATE_CLIENT_CONFIG,
    ACTION_UPDATE_SUBSCRIPTION,
    ACTION_UPDATE_CATEGORY,
    ACTION_UPDATE_BOARD_CATEGORY,
    ACTION_UPDATE_BOARD,
    ACTION_REORDER_CATEGORIES,
} from './wsclient'
import manifest from './manifest'
// eslint-disable-next-line import/no-unresolved
import {PluginRegistry} from './types/mattermost-webapp'
import './plugin.scss'
import CreateBoardFromTemplate from './components/createBoardFromTemplate'
import KanbanPanel, {isKanbanPanelOpen} from './panel/panel'
import {PanelTitlePlaceholder} from './panel/panel_title'
import OldUrlRedirect from './panel/old_urls'
import {openPanelHome, panelHistory, setPanelControls} from './panel/history'
import {installLinkInterceptor} from './panel/link_interceptor'
import {setHostStore} from './panel/host'
import {trackPanelFocus} from './panel/context'
import {KANBAN_ROUTE, PANEL_HOME, teamOfPath} from './panel/paths'

const windowAny = (window as SuiteWindow)
windowAny.baseURL = process.env.TARGET_IS_PRODUCT ? '/plugins/boards' : '/plugins/focalboard'
// Antimatter: Kanban has no full page any more (its views are the side panel's), but its links keep the address the
// full page had, which opens the panel on them.
windowAny.frontendBaseURL = KANBAN_ROUTE
windowAny.isFocalboardPlugin = true

function getSubpath(siteURL: string): string {
    const url = new URL(siteURL)

    // remove trailing slashes
    return url.pathname.replace(/\/+$/, '')
}

export default class Plugin {
    channelHeaderButtonId?: string
    rhsId?: string
    boardSelectorId?: string
    teamRouteId?: string
    registry?: PluginRegistry
    removeLinkInterceptor?: () => void
    removeFocusTracking?: () => void

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-empty-function
    async initialize(registry: PluginRegistry, amStore: Store<GlobalState, Action>): Promise<void> {
        const siteURL = amStore.getState().entities.general.config.SiteURL
        const subpath = siteURL ? getSubpath(siteURL) : ''
        windowAny.frontendBaseURL = subpath + windowAny.frontendBaseURL
        windowAny.baseURL = subpath + windowAny.baseURL
        setHostStore(amStore as unknown as Store<unknown, Action>)
        const cache = createIntlCache()
        const intl = createIntl({
            // modeled after <IntlProvider> in webapp/src/app.tsx
            locale: getCurrentLanguage(),
            messages: getMessages(getCurrentLanguage())
        }, cache)


        this.registry = registry

        UserSettings.nameFormat = amStore.getState().entities.preferences?.myPreferences['display_settings--name_format']?.value || null
        let theme = amStore.getState().entities.preferences.myPreferences.theme
        setAntimatterTheme(theme)

        const productID = process.env.TARGET_IS_PRODUCT ? 'boards' : manifest.id

        // register websocket handlers
        this.registry?.registerWebSocketEventHandler(`custom_${productID}_${ACTION_UPDATE_BOARD}`, (e: any) => wsClient.updateHandler(e.data))
        this.registry?.registerWebSocketEventHandler(`custom_${productID}_${ACTION_UPDATE_CATEGORY}`, (e: any) => wsClient.updateHandler(e.data))
        this.registry?.registerWebSocketEventHandler(`custom_${productID}_${ACTION_UPDATE_BOARD_CATEGORY}`, (e: any) => wsClient.updateHandler(e.data))
        this.registry?.registerWebSocketEventHandler(`custom_${productID}_${ACTION_UPDATE_CLIENT_CONFIG}`, (e: any) => wsClient.updateClientConfigHandler(e.data))
        this.registry?.registerWebSocketEventHandler(`custom_${productID}_${ACTION_UPDATE_SUBSCRIPTION}`, (e: any) => wsClient.updateSubscriptionHandler(e.data))
        this.registry?.registerWebSocketEventHandler(`custom_${productID}_${ACTION_REORDER_CATEGORIES}`, (e) => wsClient.updateHandler(e.data))

        this.registry?.registerWebSocketEventHandler('plugin_statuses_changed', (e: any) => wsClient.pluginStatusesChangedHandler(e.data))
        this.registry?.registerWebSocketEventHandler('preferences_changed', (e: any) => {
            let preferences
            try {
                preferences = JSON.parse(e.data.preferences)
            } catch {
                preferences = []
            }
            if (preferences) {
                for (const preference of preferences) {
                    if (preference.category === 'theme' && theme !== preference.value) {
                        setAntimatterTheme(JSON.parse(preference.value))
                        theme = preference.value
                    }
                    if (preference.category === 'display_settings' && preference.name === 'name_format') {
                        UserSettings.nameFormat = preference.value
                    }
                }
            }
        })

        // Register reconnection handler for graceful recovery
        if (this.registry?.registerReconnectHandler) {
            this.registry.registerReconnectHandler(() => {
                Utils.log('Boards plugin: WebSocket reconnected, refreshing data')
                store.dispatch(initialLoad())
            })
        }

        let lastViewedChannel = amStore.getState().entities.channels.currentChannelId
        let prevTeamID: string

        const currentChannel = amStore.getState().entities.channels.currentChannelId
        const currentChannelObj = amStore.getState().entities.channels.channels[currentChannel]
        store.dispatch(setChannel(currentChannelObj))

        amStore.subscribe(() => {
            const currentUserId = amStore.getState().entities.users.currentUserId
            const currentChannel = amStore.getState().entities.channels.currentChannelId
            if (lastViewedChannel !== currentChannel && currentChannel) {
                localStorage.setItem('focalboardLastViewedChannel:' + currentUserId, currentChannel)
                lastViewedChannel = currentChannel
                octoClient.channelId = currentChannel
                const currentChannelObj = amStore.getState().entities.channels.channels[lastViewedChannel]
                store.dispatch(setChannel(currentChannelObj))
            }

            // Watch for change in active team.
            // This handles the user selecting a team from the team sidebar.
            const currentTeamID = amStore.getState().entities.teams.currentTeamId
            if (currentTeamID && currentTeamID !== prevTeamID) {
                // Antimatter: a panel left on a view of the community you left goes back to the channel's boards.
                const panelTeamID = teamOfPath(panelHistory.location.pathname)
                if (prevTeamID && panelTeamID && panelTeamID !== currentTeamID) {
                    panelHistory.reset(PANEL_HOME)
                }
                prevTeamID = currentTeamID
                store.dispatch(setTeam(currentTeamID))
                octoClient.teamId = currentTeamID
                store.dispatch(initialLoad())
            }

            if (currentTeamID && currentTeamID !== prevTeamID) {
                let theme = amStore.getState().entities.preferences.myPreferences[`theme--${currentTeamID}`]
                if (!theme) {
                    theme = amStore.getState().entities.preferences.myPreferences['theme--'] || amStore.getState().entities.preferences.myPreferences.theme
                }
                setAntimatterTheme(theme)
            }
        })

        // Antimatter: Kanban is an app of the side panel, without a full page (registerProduct): the community's
        // boards, the templates, a board and its cards are views of the panel. Links to the old pages open them
        // there (OldUrlRedirect and the link handler below).
        const {id: rhsId, showRHSPlugin, toggleRHSPlugin} = this.registry.registerRightHandSidebarComponent(
            (props: {webSocketClient: AMWebSocketClient, setPanelState?: (state: string | null) => void, initialPanelState?: string}) => (
                <KanbanPanel
                    webSocketClient={props.webSocketClient}
                    setPanelState={props.setPanelState}
                    initialPanelState={props.initialPanelState}
                />
            ),
            <PanelTitlePlaceholder/>,
        )
        this.rhsId = rhsId
        setPanelControls({
            isOpen: isKanbanPanelOpen,
            show: () => amStore.dispatch(showRHSPlugin),
        })

        // The channel header button and the app bar icon open the panel on the channel's boards.
        const togglePanel = () => {
            openPanelHome()
            amStore.dispatch(toggleRHSPlugin)
        }

        this.channelHeaderButtonId = registry.registerChannelHeaderButtonAction(<BoardsAppIcon colored={true}/>, togglePanel, 'Kanban', 'Kanban')

        // The old full-page URLs (/kanban/..., sent to /<team>/focalboard/... by the web app) open the side panel.
        if (this.registry.registerNeedsTeamRoute) {
            this.teamRouteId = this.registry.registerNeedsTeamRoute('/', OldUrlRedirect)
        }

        // Links to the old full page, in messages, link previews and dialogs, open the side panel.
        this.removeLinkInterceptor = installLinkInterceptor({getSiteURL: () => amStore.getState().entities.general.config.SiteURL || ''})

        // Kanban's keyboard shortcuts act on the panel only after a click in it.
        this.removeFocusTracking = trackPanelFocus()

        if (this.registry.registerAppBarComponent) {
            this.registry.registerAppBarComponent(boardsAppIconURL, togglePanel, intl.formatMessage({id: 'AppBar.Tooltip', defaultMessage: 'Kanban'}))
        }

        if (this.registry.registerActionAfterChannelCreation) {
            this.registry.registerActionAfterChannelCreation((props: {
                setCanCreate: (canCreate: boolean) => void,
                setAction: (fn: () => (channelId: string, teamId: string) => Promise<Board | undefined>) => void,
                newBoardInfoIcon: React.ReactNode,
            }) => (
                <ReduxProvider store={store}>
                    <CreateBoardFromTemplate
                        setCanCreate={props.setCanCreate}
                        setAction={props.setAction}
                        newBoardInfoIcon={props.newBoardInfoIcon}
                    />
                </ReduxProvider>
            ))
        }

        this.registry.registerPostWillRenderEmbedComponent(
            (embed) => embed.type === 'boards',
            (props: {embed: {data: string}, webSocketClient: AMWebSocketClient}) => (
                <ReduxProvider store={store}>
                    <BoardsUnfurl
                        embed={props.embed}
                        webSocketClient={props.webSocketClient}
                    />
                </ReduxProvider>
            ),
            false
        )

        // Site statistics handler
        if (registry.registerSiteStatisticsHandler) {
            registry.registerSiteStatisticsHandler(async () => {
                const siteStats = await octoClient.getSiteStatistics()
                if (siteStats) {
                    return {
                        boards_count: {
                            name: intl.formatMessage({id: 'SiteStats.total_boards', defaultMessage: 'Total Boards'}),
                            id: 'total_boards',
                            icon: 'icon-product-boards',
                            value: siteStats.board_count,
                        },
                        cards_count: {
                            name: intl.formatMessage({id: 'SiteStats.total_cards', defaultMessage: 'Total Cards'}),
                            id: 'total_cards',
                            icon: 'icon-products',
                            value: siteStats.card_count,
                        },
                    }
                }
                return {}
            })
        }

        this.boardSelectorId = this.registry.registerRootComponent((props: {webSocketClient: AMWebSocketClient}) => (
            <ReduxProvider store={store}>
                <WithWebSockets manifest={manifest} webSocketClient={props.webSocketClient}>
                    <BoardSelector />
                </WithWebSockets>
            </ReduxProvider>
        ))

        windowAny.getCurrentTeamId = (): string => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            return amStore.getState().entities.teams.currentTeamId
        }
    }

    uninitialize(): void {
        if (this.channelHeaderButtonId) {
            this.registry?.unregisterComponent(this.channelHeaderButtonId)
        }
        if (this.rhsId) {
            this.registry?.unregisterComponent(this.rhsId)
        }
        if (this.boardSelectorId) {
            this.registry?.unregisterComponent(this.boardSelectorId)
        }
        if (this.teamRouteId) {
            this.registry?.unregisterComponent(this.teamRouteId)
        }
        this.removeLinkInterceptor?.()
        delete this.removeLinkInterceptor
        this.removeFocusTracking?.()
        delete this.removeFocusTracking
        setPanelControls(null)
        setHostStore(null)

        // unregister websocket handlers
        this.registry?.unregisterWebSocketEventHandler(wsClient.clientPrefix + ACTION_UPDATE_BLOCK)
    }
}
