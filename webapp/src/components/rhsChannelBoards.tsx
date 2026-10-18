// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect}  from 'react'
import {FormattedMessage, IntlProvider, useIntl} from 'react-intl'

import {getLanguage} from '../store/language'

import {useWebsockets} from '../hooks/websockets'

import {Board, BoardMember} from '../blocks/board'
import {getCurrentTeamId} from '../store/teams'
import {IUser} from '../user'
import {getMe, fetchMe} from '../store/users'
import {loadBoards, loadMyBoardsMemberships} from '../store/initialLoad'
import {getCurrentChannel} from '../store/channels'
import {
    getMySortedBoards,
    setLinkToChannel,
    updateBoards,
    updateMembersEnsuringBoardsAndUsers,
    addMyBoardMemberships,
} from '../store/boards'
import {useAppSelector, useAppDispatch} from '../store/hooks'
import AddIcon from '../widgets/icons/add'
import Button from '../widgets/buttons/button'

import {WSClient} from '../wsclient'

import {getMessages} from '../i18n'

import RHSChannelBoardItem from './rhsChannelBoardItem'
import EmptyState from './fusion/empty_state'
import FusionIcon from './fusion/icon'
import {isFusion} from './fusion/fusion_ui'


import './rhsChannelBoards.scss'

const RHSChannelBoards = () => {
    const boards = useAppSelector(getMySortedBoards)
    const teamId = useAppSelector(getCurrentTeamId)
    const currentChannel = useAppSelector(getCurrentChannel)
    const me = useAppSelector<IUser|null>(getMe)
    const dispatch = useAppDispatch()
    const intl = useIntl()
    const [dataLoaded, setDataLoaded] = React.useState(false)

    useEffect(() => {
        Promise.all([
            dispatch(loadBoards()),
            dispatch(loadMyBoardsMemberships()),
            dispatch(fetchMe()),
        ]).then(() => setDataLoaded(true))
    }, [currentChannel?.id])

    useWebsockets(teamId || '', (wsClient: WSClient) => {
        const onChangeBoardHandler = (_: WSClient, boards: Board[]): void => {
            dispatch(updateBoards(boards))
        }
        const onChangeMemberHandler = (_: WSClient, members: BoardMember[]): void => {
            dispatch(updateMembersEnsuringBoardsAndUsers(members))

            if (me) {
                const myBoardMemberships = members.filter((boardMember) => boardMember.userId === me.id)
                dispatch(addMyBoardMemberships(myBoardMemberships))
            }
        }

        wsClient.addOnChange(onChangeBoardHandler, 'board')
        wsClient.addOnChange(onChangeMemberHandler, 'boardMembers')

        return () => {
            wsClient.removeOnChange(onChangeBoardHandler, 'board')
            wsClient.removeOnChange(onChangeMemberHandler, 'boardMembers')
        }
    }, [me])

    if (!boards) {
        return null
    }
    if (!teamId) {
        return null
    }
    if (!currentChannel) {
        return null
    }
    if (!dataLoaded) {
        return null
    }

    const channelBoards = boards.filter((b) => b.channelId === currentChannel.id)

    let channelName = currentChannel.display_name
    let headerChannelName = currentChannel.display_name

    if (currentChannel.type === 'D') {
        channelName = intl.formatMessage({id: 'rhs-boards.dm', defaultMessage: 'DM'})
        headerChannelName = intl.formatMessage({id: 'rhs-boards.header.dm', defaultMessage: 'this Direct Message'})
    } else if (currentChannel.type === 'G') {
        channelName = intl.formatMessage({id: 'rhs-boards.gm', defaultMessage: 'GM'})
        headerChannelName = intl.formatMessage({id: 'rhs-boards.header.gm', defaultMessage: 'this Group Message'})
    }

    const canLink = Boolean(me?.permissions?.find((s: string) => s === 'create_post'))

    // Under the Fusion UI, Fusion's empty state: Kanban's icon, a title, a sentence and the one thing to do.
    if (channelBoards.length === 0 && isFusion()) {
        return (
            <div className='focalboard-body'>
                <div className='RHSChannelBoards empty'>
                    <EmptyState
                        data-testid='rhs-boards-empty'
                        icon={<FusionIcon name='kanban'/>}
                        title={intl.formatMessage({id: 'rhs-boards.no-boards-linked-to-channel', defaultMessage: 'No boards are linked to {channelName} yet'}, {channelName: headerChannelName})}
                        text={intl.formatMessage({id: 'rhs-boards.no-boards-linked-to-channel-description', defaultMessage: 'Kanban is a project management tool that helps define, organize, track and manage work across teams, with boards of cards and columns.'})}
                        action={canLink ? {
                            label: intl.formatMessage({id: 'rhs-boards.link-boards-to-channel', defaultMessage: 'Add boards to {channelName}'}, {channelName}),
                            onClick: () => dispatch(setLinkToChannel(currentChannel.id)),
                        } : undefined}
                    />
                </div>
            </div>
        )
    }

    if (channelBoards.length === 0) {
        return (
            <div className='focalboard-body'>
                <div className='RHSChannelBoards empty'>
                    <h2>
                        <FormattedMessage
                            id='rhs-boards.no-boards-linked-to-channel'
                            defaultMessage='No boards are linked to {channelName} yet'
                            values={{channelName: headerChannelName}}
                        />
                    </h2>
                    <div className='empty-paragraph'>
                        <FormattedMessage
                            id='rhs-boards.no-boards-linked-to-channel-description'
                            defaultMessage='Kanban is a project management tool that helps define, organize, track and manage work across teams, with boards of cards and columns.'
                        />
                    </div>
                    {me?.permissions?.find((s: string) => s === 'create_post') &&
                        <Button
                            onClick={() => dispatch(setLinkToChannel(currentChannel.id))}
                            emphasis='primary'
                            size='medium'
                        >
                            <FormattedMessage
                                id='rhs-boards.link-boards-to-channel'
                                defaultMessage='Add boards to {channelName}'
                                values={{channelName: channelName}}
                            />
                        </Button>
                    }
                </div>
            </div>
        )
    }

    return (
        <div className='focalboard-body'>
            <div className='RHSChannelBoards'>
                <div className='rhs-boards-header'>
                    <span className='linked-boards'>
                        <FormattedMessage
                            id='rhs-boards.linked-boards'
                            defaultMessage='Boards in this channel'
                        />
                    </span>
                    {me?.permissions?.find((s: string) => s === 'create_post') &&
                        <Button
                            onClick={() => dispatch(setLinkToChannel(currentChannel.id))}
                            icon={<AddIcon/>}
                            emphasis='primary'
                        >
                            <FormattedMessage
                                id='rhs-boards.add'
                                defaultMessage='Add'
                            />
                        </Button>
                    }
                </div>
                <div className='rhs-boards-list'>
                    {channelBoards.map((b) => (
                        <RHSChannelBoardItem
                            key={b.id}
                            board={b}
                        />))}
                </div>
            </div>
        </div>
    )
}

const IntlRHSChannelBoards = () => {
    const language = useAppSelector<string>(getLanguage)

    return (
        <IntlProvider
            locale={language.split(/[_]/)[0]}
            messages={getMessages(language)}
        >
            <RHSChannelBoards/>
        </IntlProvider>
    )
}

export default IntlRHSChannelBoards
