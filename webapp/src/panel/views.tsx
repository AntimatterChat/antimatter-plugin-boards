// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Antimatter: the views of the Kanban panel that weren't pages of the full page, and the frames of those that were.

import React, {useEffect} from 'react'
import {useIntl} from 'react-intl'
import {Redirect, useRouteMatch} from 'react-router-dom'

import BoardPage from '../pages/boardPage/boardPage'
import Sidebar from '../components/sidebar/sidebar'
import BoardTemplateSelector from '../components/boardTemplateSelector/boardTemplateSelector'
import RHSChannelBoards from '../components/rhsChannelBoards'
import GlobalHeaderSettingsMenu from '../components/globalHeader/globalHeaderSettingsMenu'
import Button from '../widgets/buttons/button'
import CompassIcon from '../widgets/icons/compassIcon'
import octoClient from '../octoClient'
import {useAppDispatch, useAppSelector} from '../store/hooks'
import {getCurrentChannel} from '../store/channels'
import {getCurrentTeam, getCurrentTeamId, setTeam} from '../store/teams'
import {getCurrentBoard} from '../store/boards'
import {getCurrentView} from '../store/views'
import {initialLoad} from '../store/initialLoad'
import {getMe} from '../store/users'
import {IUser} from '../user'
import {getValidEmojiData} from '../utils/emojiUtils'

import {useExpandedPanel} from './host'
import {PANEL_HOME, boardsPath, templatesPath} from './paths'
import {PanelTitle, usePanelHistory} from './panel_title'

/**
 * ChannelHome is the panel's first view, as the side panel always was: the boards linked to the current channel, and
 * the way to all of the community's boards (the full page's left sidebar) and to a new board.
 */
export const ChannelHome = (): React.JSX.Element => {
    const intl = useIntl()
    const history = usePanelHistory()
    const channel = useAppSelector(getCurrentChannel)
    const team = useAppSelector(getCurrentTeam)
    const me = useAppSelector<IUser|null>(getMe)

    return (
        <>
            <PanelTitle
                back={false}
                title={intl.formatMessage({id: 'rhs-channel-boards-header.title', defaultMessage: 'Kanban'})}
                subtitle={channel?.display_name}
            />
            <div className='KanbanPanelHome'>
                {team &&
                    <div className='KanbanPanelHome__browse'>
                        <Button
                            emphasis='tertiary'
                            size='medium'
                            icon={<CompassIcon icon='view-grid-outline'/>}
                            onClick={() => history.push(boardsPath(team.id))}
                        >
                            {intl.formatMessage({
                                id: 'KanbanPanel.all-boards',
                                defaultMessage: 'All boards',
                                description: 'Kanban side panel: the button that shows every board of the community, by category.',
                            })}
                        </Button>
                        {me && !me.is_guest &&
                            <Button
                                emphasis='tertiary'
                                size='medium'
                                icon={<CompassIcon icon='plus'/>}
                                onClick={() => history.push(templatesPath(team.id))}
                            >
                                {intl.formatMessage({
                                    id: 'KanbanPanel.new-board',
                                    defaultMessage: 'New board',
                                    description: 'Kanban side panel: the button that creates a board from a template.',
                                })}
                            </Button>}
                    </div>}
                <RHSChannelBoards/>
            </div>
        </>
    )
}

// useTeamOfRoute makes the community of the view's path (/team/<team>...) the one Kanban shows.
function useTeamOfRoute(teamId: string | undefined): void {
    const dispatch = useAppDispatch()
    const currentTeamId = useAppSelector(getCurrentTeamId)

    useEffect(() => {
        if (!teamId || teamId === currentTeamId) {
            return
        }
        octoClient.teamId = teamId
        dispatch(setTeam(teamId))
        dispatch(initialLoad())
    }, [teamId])
}

/**
 * BoardList is the community's boards by category, which the full page showed as its left sidebar: finding a board,
 * creating one or a category, and each board's menu (move, duplicate, export, hide, delete). Kanban's own settings
 * (importing an archive, its language, random icons, the tour) are in its menu.
 */
export const BoardList = (): React.JSX.Element => {
    const intl = useIntl()
    const history = usePanelHistory()
    const match = useRouteMatch<{teamId: string}>()
    const team = useAppSelector(getCurrentTeam)
    useTeamOfRoute(match.params.teamId)

    return (
        <>
            <PanelTitle
                title={intl.formatMessage({
                    id: 'KanbanPanel.boards-title',
                    defaultMessage: 'Boards',
                    description: 'Kanban side panel: the title of the view that lists every board of the community.',
                })}
                subtitle={team?.title}
            />
            <div className='KanbanPanelBoards'>
                <Sidebar
                    onBoardTemplateSelectorOpen={() => history.push(templatesPath(match.params.teamId))}
                    settingsMenu={<GlobalHeaderSettingsMenu history={history}/>}
                />
            </div>
        </>
    )
}

/**
 * PanelTemplates creates a board from a template (or from nothing). It widens the panel: the templates are previewed
 * as boards.
 */
export const PanelTemplates = (): React.JSX.Element => {
    const intl = useIntl()
    const match = useRouteMatch<{teamId: string}>()
    useTeamOfRoute(match.params.teamId)
    useExpandedPanel()

    return (
        <>
            <PanelTitle
                title={intl.formatMessage({id: 'BoardTemplateSelector.plugin.no-content-title', defaultMessage: 'Create a board'})}
            />
            <div className='KanbanPanelTemplates'>
                <BoardTemplateSelector/>
            </div>
        </>
    )
}

type BoardProps = {
    readonly?: boolean
    new?: boolean
}

/**
 * PanelBoard is a board in the widened panel: its board, table, gallery or calendar view (each scrolls within the
 * panel when it's wider), and the card it shows, in a dialog over the panel. The template picker of a board for a
 * channel (new) has the same frame.
 */
export const PanelBoard = (props: BoardProps): React.JSX.Element => {
    const intl = useIntl()
    const match = useRouteMatch<{boardId?: string}>()
    const board = useAppSelector(getCurrentBoard)
    const view = useAppSelector(getCurrentView)
    useExpandedPanel()

    let title: string
    let subtitle: string | undefined
    if (props.new) {
        title = intl.formatMessage({id: 'BoardTemplateSelector.plugin.no-content-title', defaultMessage: 'Create a board'})
    } else if (board && board.id === match.params.boardId) {
        const icon = board.icon ? (getValidEmojiData(board.icon)?.native || board.icon) : ''
        const name = board.title || intl.formatMessage({id: 'ViewTitle.untitled-board', defaultMessage: 'Untitled board'})
        title = icon ? `${icon} ${name}` : name
        subtitle = view?.title || undefined
    } else {
        title = intl.formatMessage({
            id: 'KanbanPanel.board-title',
            defaultMessage: 'Board',
            description: 'Kanban side panel: the title of a board\'s view while the board loads.',
        })
    }

    return (
        <>
            <PanelTitle
                title={title}
                subtitle={subtitle}
            />
            <BoardPage
                readonly={props.readonly}
                new={props.new}
            />
        </>
    )
}

type PageProps = {
    children: React.ReactNode
}

// PanelPage is a page of the full page that keeps its look in the panel: the welcome page, the error pages.
export const PanelPage = ({children}: PageProps): React.JSX.Element => {
    const intl = useIntl()

    return (
        <>
            <PanelTitle title={intl.formatMessage({id: 'rhs-channel-boards-header.title', defaultMessage: 'Kanban'})}/>
            <div className='KanbanPanelPage'>
                {children}
            </div>
        </>
    )
}

/**
 * PanelStart answers the full page's start (/kanban, and the views that go "home"): the community's boards, or the
 * channel's when there is no community.
 */
export const PanelStart = (): React.JSX.Element => {
    const teamId = useAppSelector(getCurrentTeamId)
    return <Redirect to={teamId ? boardsPath(teamId) : PANEL_HOME}/>
}
