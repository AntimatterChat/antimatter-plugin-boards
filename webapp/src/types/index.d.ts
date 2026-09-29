// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DesktopAPI} from "@mattermost/desktop-api"

export interface IAppWindow extends Window {
    baseURL?: string
    frontendBaseURL?: string
    isFocalboardPlugin?: boolean
    getCurrentTeamId?: () => string
    msCrypto: Crypto
    openInNewBrowser?: ((href: string) => void) | null
    webkit?: {messageHandlers: {nativeApp?: {postMessage: <T>(message: T) => void}}}
}

// SuiteWindow documents all custom properties
// which may be defined on global
// window object when operating in
// the Antimatter suite environment
export type SuiteWindow = Window & {
    getCurrentTeamId?: () => string
    baseURL?: string
    frontendBaseURL?: string
    isFocalboardPlugin?: boolean
    WebappUtils?: any
    desktopAPI?: Partial<DesktopAPI>
}
