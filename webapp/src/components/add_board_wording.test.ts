// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'fs'
import path from 'path'

// Antimatter: a board is added to a channel and removed from it, not linked and unlinked: "Add boards to <channel>",
// "Add board to channel", "Add", "Remove board", "Boards in this channel".
const en: Record<string, string> = JSON.parse(fs.readFileSync(path.join(__dirname, '../../i18n/en.json'), 'utf8'))

const source = (file: string) => fs.readFileSync(path.join(__dirname, file), 'utf8')

describe('adding a board to a channel', () => {
    test('says "add", never "link board"; "remove", never "unlink board"', () => {
        const linkBoard = Object.entries(en).filter(([, text]) => (/\b(un)?link (a )?boards?\b|^Linked boards$|^Unlink$|^Link channel$/i).test(text))
        expect(linkBoard).toEqual([])
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
    ])('%s says "%s"', (file, text) => {
        expect(source(file)).toContain(`'${text}'`)
        expect(source(file)).not.toMatch(/defaultMessage[=:] ?'(Link boards?|Link|Yes, link board|Unlink( board)?|Linked boards|Link channel)'/)
    })
})
