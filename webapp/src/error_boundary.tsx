// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import React from 'react'

import {Utils} from './utils'

type State = {
    hasError: boolean
}

type Props = {
    children: React.ReactNode

    // Antimatter: what to show instead of the error page, where leaving for it would reload the whole app (the side
    // panel).
    fallback?: React.ReactNode
}

export default class ErrorBoundary extends React.Component<Props, State> {
    state = {hasError: false}
    msg = 'Redirecting to error page...'

    handleError = (): void => {
        const url = Utils.getFrontendBaseURL(true) + '/error?id=unknown'
        window.location.replace(url)
    }

    static getDerivedStateFromError(/*error: Error*/): State {
        return {hasError: true}
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        Utils.logError(error + ': ' + errorInfo)
    }

    shouldComponentUpdate(): boolean {
        return true
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            if (this.props.fallback !== undefined) {
                return this.props.fallback
            }
            this.handleError()
            return <span>{this.msg}</span>
        }
        return this.props.children
    }
}

