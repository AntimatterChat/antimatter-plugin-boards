// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import EmptyState from './fusion/empty_state'
import FusionIcon from './fusion/icon'
import {isFusion} from './fusion/fusion_ui'

import './guestNoBoards.scss'

const GuestNoBoards = () => {
    const intl = useIntl()

    // Under the Fusion UI, Fusion's empty state: Kanban's icon, a title and a sentence.
    if (isFusion()) {
        return (
            <div className='GuestNoBoards'>
                <EmptyState
                    data-testid='guest-no-boards'
                    icon={<FusionIcon name='kanban'/>}
                    title={intl.formatMessage({id: 'guest-no-board.title', defaultMessage: 'No boards yet'})}
                    text={intl.formatMessage({id: 'guest-no-board.subtitle', defaultMessage: 'You don\'t have access to any board in this team yet, please wait until somebody adds you to any board.'})}
                />
            </div>
        )
    }

    return (
        <div className='GuestNoBoards'>
            <div>
                <div className='title'>
                    <FormattedMessage
                        id='guest-no-board.title'
                        defaultMessage={'No boards yet'}
                    />
                </div>
                <div className='subtitle'>
                    <FormattedMessage
                        id='guest-no-board.subtitle'
                        defaultMessage={'You don\'t have access to any board in this team yet, please wait until somebody adds you to any board.'}
                    />
                </div>
            </div>
        </div>
    )
}

export default React.memo(GuestNoBoards)
