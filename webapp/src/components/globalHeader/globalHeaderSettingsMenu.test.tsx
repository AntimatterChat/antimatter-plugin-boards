// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import React from 'react'
import {Provider as ReduxProvider} from 'react-redux'
import {createMemoryHistory} from 'history'

import {render, act} from '@testing-library/react'

import userEvent from '@testing-library/user-event'
import configureStore from 'redux-mock-store'

import {mocked} from 'jest-mock'

import {wrapIntl} from '../../testUtils'

import {Archiver} from '../../archiver'
import TelemetryClient, {TelemetryCategory, TelemetryActions} from '../../telemetry/telemetryClient'

import client from '../../octoClient'

import GlobalHeaderSettingsMenu from './globalHeaderSettingsMenu'

jest.mock('../../telemetry/telemetryClient')
jest.mock('../../octoClient')
const mockedTelemetry = mocked(TelemetryClient)
const mockedOctoClient = mocked(client)

describe('components/sidebar/GlobalHeaderSettingsMenu', () => {
    const mockStore = configureStore([])
    const history = createMemoryHistory()
    let store = mockStore({})
    beforeEach(() => {
        store = mockStore({
            teams: {
                current: {id: 'team_id_1'},
            },
            boards: {
                current: 'board_id',
                boards: {
                    board_id: {id: 'board_id'},
                },
                myBoardMemberships: {
                    board_id: {userId: 'user_id_1', schemeAdmin: true},
                },
            },
            users: {
                me: {
                    id: 'user-id',
                },
            },
        })
    })
    test('settings menu closed should match snapshot', () => {
        const component = wrapIntl(
            <ReduxProvider store={store}>
                <GlobalHeaderSettingsMenu history={history}/>
            </ReduxProvider>,
        )

        const {container} = render(component)
        expect(container).toMatchSnapshot()
    })

    test('settings menu open should match snapshot', () => {
        const component = wrapIntl(
            <ReduxProvider store={store}>
                <GlobalHeaderSettingsMenu history={history}/>
            </ReduxProvider>,
        )

        const {container} = render(component)
        userEvent.click(container.querySelector('.menu-entry') as Element)
        expect(container).toMatchSnapshot()
    })

    test('languages menu open should match snapshot', () => {
        const component = wrapIntl(
            <ReduxProvider store={store}>
                <GlobalHeaderSettingsMenu history={history}/>
            </ReduxProvider>,
        )

        const {container} = render(component)
        act(() => {
            userEvent.click(container.querySelector('.menu-entry') as Element)
        })
        act(() => {
            userEvent.hover(container.querySelector('#lang') as Element)
        })
        expect(container).toMatchSnapshot()
    })

    test('import archive item starts an archive import', () => {
        const importFullArchive = jest.spyOn(Archiver, 'importFullArchive').mockImplementation(() => {})
        const component = wrapIntl(
            <ReduxProvider store={store}>
                <GlobalHeaderSettingsMenu history={history}/>
            </ReduxProvider>,
        )

        const {container} = render(component)
        act(() => {
            userEvent.click(container.querySelector('.menu-entry') as Element)
        })
        userEvent.click(container.querySelector('[aria-label="Import archive"]') as Element)
        expect(mockedTelemetry.trackEvent).toHaveBeenCalledWith(TelemetryCategory, TelemetryActions.ImportArchive)
        expect(importFullArchive).toHaveBeenCalled()
        importFullArchive.mockRestore()
    })

    test('Product Tour option restarts the tour', () => {
        const component = wrapIntl(
            <ReduxProvider store={store}>
                <GlobalHeaderSettingsMenu history={history}/>
            </ReduxProvider>,
        )

        const {container} = render(component)
        act(() => {
            userEvent.click(container.querySelector('.menu-entry') as Element)
        })
        act(() => {
            userEvent.click(container.querySelector('.product-tour') as Element)
        })

        expect(mockedOctoClient.patchUserConfig).toHaveBeenCalledWith('user-id', {
            updatedFields: {
                onboardingTourStarted: '1',
                onboardingTourStep: '0',
                tourCategory: 'onboarding',
            },
        })
    })
})
