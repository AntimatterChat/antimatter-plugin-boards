// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'fs'
import path from 'path'

// Antimatter: a board is added to a channel and removed from it, not linked and unlinked: "Add boards to <channel>",
// "Add board to channel", "Add", "Remove board", "Boards in this channel".
const en: Record<string, string> = JSON.parse(fs.readFileSync(path.join(__dirname, '../../i18n/en.json'), 'utf8'))

// A link in Kanban's words is a URL (Copy link, a shared or public link), never a board in a channel.
const URL_LINK = /\b(copy link|copying the link|(shared|registration|read-only|public|this) links?)\b/gi

const source = (file: string) => fs.readFileSync(path.join(__dirname, file), 'utf8')

describe('adding a board to a channel', () => {
    test('says "add" and "remove", never "link" or "unlink" for a board and a channel', () => {
        const linking = Object.entries(en).filter(([, text]) => (/link/i).test(text.replace(URL_LINK, '')))
        expect(linking).toEqual([])
    })

    test.each([
        ['rhs-boards.link-boards-to-channel', 'Add boards to {channelName}'],
        ['boardSelector.title', 'Add boards'],
        ['boardSelector.link', 'Add'],
        ['boardSelector.confirm-link-board', 'Add board to channel'],
        ['boardSelector.confirm-link-board-button', 'Yes, add board'],
        ['shareBoard.confirm-link-channel', 'Add board to channel'],
        ['shareBoard.confirm-link-channel-button', 'Add channel'],
        ['boardSelector.unlink', 'Remove'],
        ['BoardMember.unlinkChannel', 'Remove'],
        ['rhs-boards.unlink-board', 'Remove board'],
        ['rhs-boards.unlink-board1', 'Remove board'],
        ['rhs-boards.linked-boards', 'Boards in this channel'],
        ['rhs-boards.no-boards-linked-to-channel', 'No boards in {channelName} yet'],
        ['shareBoard.confirm-unlink.confirmBtnText', 'Remove channel'],
        ['shareBoard.confirm-unlink.title', 'Remove channel from board'],
        ['shareBoard.confirm-link-channel-button-with-other-channel', 'Remove and add here'],
    ])('%s is "%s", in the English strings and in the code', (id, text) => {
        expect(en[id]).toBe(text)
    })

    test.each([
        ['rhsChannelBoards.tsx', 'Add boards to {channelName}'],
        ['boardSelector.tsx', 'Add boards'],
        ['boardSelector.tsx', 'Add board to channel'],
        ['boardSelector.tsx', 'Yes, add board'],
        ['boardSelectorItem.tsx', 'Add'],
        ['shareBoard/shareBoard.tsx', 'Add board to channel'],
        ['shareBoard/shareBoard.tsx', 'Add channel'],
        ['boardSelectorItem.tsx', 'Remove'],
        ['rhsChannelBoardItem.tsx', 'Remove board'],
        ['rhsChannelBoards.tsx', 'Boards in this channel'],
        ['shareBoard/channelPermissionsRow.tsx', 'Remove'],
        ['shareBoard/channelPermissionsRow.tsx', 'Remove channel'],
        ['shareBoard/channelPermissionsRow.tsx', 'Remove channel from board'],
        ['shareBoard/shareBoard.tsx', 'Remove and add here'],
        ['rhsChannelBoards.tsx', 'No boards in {channelName} yet'],
    ])('%s says "%s"', (file, text) => {
        expect(source(file)).toContain(`'${text}'`)
        expect(source(file).replace(URL_LINK, '')).not.toMatch(/defaultMessage[=:] ?['"][^'"]*link/i)
    })
})
