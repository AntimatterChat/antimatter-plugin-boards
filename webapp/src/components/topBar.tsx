// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.


import React from 'react'

import './topBar.scss'

import {Utils} from '../utils'
import {Constants} from '../constants'

const TopBar = (): React.JSX.Element | null => {
    if (!Utils.isFocalboardPlugin()) {
        return null
    }

    return (
        <div
            className='TopBar'
        >
            <div className='versionFrame'>
                <div
                    className='version'
                    title={`v${Constants.versionString}`}
                >
                    {`v${Constants.versionString}`}
                </div>
            </div>
        </div>
    )
}

export default React.memo(TopBar)
