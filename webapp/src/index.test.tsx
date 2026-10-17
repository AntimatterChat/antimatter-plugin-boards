// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'

import {SuiteWindow} from './types/index'

import {PanelTitlePlaceholder} from './panel/panel_title'
import OldUrlRedirect from './panel/old_urls'
import {panelHistory} from './panel/history'
import {PANEL_HOME} from './panel/paths'
import {installLinkInterceptor} from './panel/link_interceptor'

import Plugin from './index'

jest.mock('./octoClient')
// The store keeps its reducers (they need the thunks' action types); loading the community's boards does nothing.
jest.mock('./store/initialLoad', () => {
    const actual = jest.requireActual('./store/initialLoad')
    return {...actual, initialLoad: Object.assign(() => ({type: 'mock/initialLoad'}), actual.initialLoad)}
})
jest.mock('./theme', () => ({...jest.requireActual('./theme'), setAntimatterTheme: jest.fn()}))
jest.mock('./panel/link_interceptor', () => ({installLinkInterceptor: jest.fn()}))

// Antimatter: Kanban is an app of the side panel: it has no full page (registerProduct) any more.
describe('Plugin', () => {
    const removeLinkInterceptor = jest.fn()

    const makeRegistry = () => ({
        registerProduct: jest.fn(),
        registerRightHandSidebarComponent: jest.fn(() => ({
            id: 'rhs-id',
            showRHSPlugin: {type: 'mock/show'},
            hideRHSPlugin: {type: 'mock/hide'},
            toggleRHSPlugin: {type: 'mock/toggle'},
        })),
        registerNeedsTeamRoute: jest.fn(() => 'team-route-id'),
        registerChannelHeaderButtonAction: jest.fn(() => 'button-id'),
        registerAppBarComponent: jest.fn(),
        registerActionAfterChannelCreation: jest.fn(),
        registerPostWillRenderEmbedComponent: jest.fn(),
        registerSiteStatisticsHandler: jest.fn(),
        registerRootComponent: jest.fn(() => 'root-id'),
        registerWebSocketEventHandler: jest.fn(),
        registerReconnectHandler: jest.fn(),
        unregisterComponent: jest.fn(),
        unregisterWebSocketEventHandler: jest.fn(),
    })

    const makeHostStore = () => ({
        getState: () => ({
            entities: {
                general: {config: {SiteURL: 'http://localhost:8065'}},
                preferences: {myPreferences: {}},
                users: {currentUserId: 'u1'},
                channels: {currentChannelId: '', channels: {}},
                teams: {currentTeamId: 't1'},
            },
        }),
        dispatch: jest.fn(),
        subscribe: jest.fn(() => () => {}),
    })

    beforeEach(() => {
        jest.clearAllMocks()
        jest.mocked(installLinkInterceptor).mockReturnValue(removeLinkInterceptor)
    })

    const initialize = async () => {
        const plugin = new Plugin()
        const registry = makeRegistry()
        const hostStore = makeHostStore()
        await plugin.initialize(registry as never, hostStore as never)
        return {plugin, registry, hostStore}
    }

    test('registers no full page: its pages are the side panel\'s', async () => {
        const {registry} = await initialize()

        expect(registry.registerProduct).not.toHaveBeenCalled()
        expect(registry.registerRightHandSidebarComponent).toHaveBeenCalledTimes(1)

        const [, title] = registry.registerRightHandSidebarComponent.mock.calls[0] as unknown as [unknown, React.ReactElement]
        expect(title.type).toBe(PanelTitlePlaceholder)
    })

    test('keeps the full page\'s address for its links, which open the panel', async () => {
        await initialize()

        expect((window as SuiteWindow).frontendBaseURL).toMatch(/\/kanban$/)
        expect(installLinkInterceptor).toHaveBeenCalledTimes(1)
    })

    test('answers the old full-page URLs in a community', async () => {
        const {registry} = await initialize()

        expect(registry.registerNeedsTeamRoute).toHaveBeenCalledWith('/', OldUrlRedirect)
    })

    test('the channel header button and the app bar icon open the panel on the channel\'s boards', async () => {
        const {registry, hostStore} = await initialize()

        const [, headerAction] = registry.registerChannelHeaderButtonAction.mock.calls[0] as unknown as [unknown, () => void]
        panelHistory.push('/team/t1/b1')
        headerAction()
        expect(hostStore.dispatch).toHaveBeenCalledWith({type: 'mock/toggle'})
        expect(panelHistory.location.pathname).toBe(PANEL_HOME)

        const [, appBarAction] = registry.registerAppBarComponent.mock.calls[0] as unknown as [unknown, () => void]
        panelHistory.push('/team/t1/b2')
        appBarAction()
        expect(hostStore.dispatch).toHaveBeenLastCalledWith({type: 'mock/toggle'})
        expect(panelHistory.location.pathname).toBe(PANEL_HOME)
    })

    test('removes what it registered', async () => {
        const {plugin, registry} = await initialize()

        plugin.uninitialize()

        expect(registry.unregisterComponent).toHaveBeenCalledWith('rhs-id')
        expect(registry.unregisterComponent).toHaveBeenCalledWith('team-route-id')
        expect(registry.unregisterComponent).toHaveBeenCalledWith('button-id')
        expect(registry.unregisterComponent).toHaveBeenCalledWith('root-id')
        expect(removeLinkInterceptor).toHaveBeenCalled()
    })
})
