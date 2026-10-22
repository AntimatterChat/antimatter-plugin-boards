// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Antimatter: the panel's views that show boards without a board open (the community's boards, the templates) keep
// them up to date as the full page did: there, the board's page around them took the boards' changes from the
// websocket (pages/boardPage/boardPage.tsx); in the panel, a board's view is a view of its own.

import {batch} from 'react-redux'

import {Board, BoardMember} from '../blocks/board'
import {Constants} from '../constants'
import {useWebsockets} from '../hooks/websockets'
import {useAppDispatch, useAppSelector} from '../store/hooks'
import {addMyBoardMemberships, updateBoards, updateMembersEnsuringBoardsAndUsers} from '../store/boards'
import {removeBoardsFromAllCategories} from '../store/sidebar'
import {getCurrentTeamId} from '../store/teams'
import {getMe} from '../store/users'
import {IUser} from '../user'
import {WSClient} from '../wsclient'

/**
 * useBoardUpdates applies the changes to the community's boards and templates (made in another window, by someone
 * else, or by this window's own actions, which the server echoes) and to their members while the view shows: a new
 * board is listed, a deleted one or a deleted template leaves its list and its category.
 */
export function useBoardUpdates(): void {
    const dispatch = useAppDispatch()
    const teamId = useAppSelector(getCurrentTeamId)
    const me = useAppSelector<IUser|null>(getMe)

    useWebsockets(teamId || '', (wsClient: WSClient) => {
        const onChangeBoards = (_: WSClient, boards: Board[]): void => {
            const teamBoards = boards.filter((board) => board.teamId === Constants.globalTeamId || board.teamId === teamId)
            const deletedBoardIds = teamBoards.filter((board) => board.deleteAt).map((board) => board.id)
            batch(() => {
                dispatch(updateBoards(teamBoards))
                if (deletedBoardIds.length > 0) {
                    dispatch(removeBoardsFromAllCategories(deletedBoardIds))
                }
            })
        }

        const onChangeMembers = (_: WSClient, members: BoardMember[]): void => {
            dispatch(updateMembersEnsuringBoardsAndUsers(members))
            if (me) {
                dispatch(addMyBoardMemberships(members.filter((member) => member.userId === me.id)))
            }
        }

        wsClient.addOnChange(onChangeBoards, 'board')
        wsClient.addOnChange(onChangeMembers, 'boardMembers')
        return () => {
            wsClient.removeOnChange(onChangeBoards, 'board')
            wsClient.removeOnChange(onChangeMembers, 'boardMembers')
        }
    }, [me?.id])
}
