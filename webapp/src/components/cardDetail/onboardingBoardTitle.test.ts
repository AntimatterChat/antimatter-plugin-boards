// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'fs'
import path from 'path'

import {OnboardingBoardTitle} from './cardDetail'

// The onboarding tour finds the welcome board by its title. When Boards became Kanban, the
// template was renamed "Welcome to Kanban!" while the code still looked for "Welcome to Boards!",
// and the tour stopped working. Keep the title the webapp looks for in step with the template the
// server ships (server/assets/templates-boardarchive, packed into templates.boardarchive).
describe('onboarding board title', () => {
    test('matches the title of a built-in template', () => {
        const templatesDir = path.resolve(__dirname, '../../../../server/assets/templates-boardarchive')
        const boardTitles = fs.readdirSync(templatesDir, {withFileTypes: true})
            .filter((entry) => entry.isDirectory())
            .flatMap((entry) => {
                const lines = fs.readFileSync(path.join(templatesDir, entry.name, 'board.jsonl'), 'utf8').split('\n')
                return lines
                    .filter((line) => line.trim() !== '')
                    .map((line) => JSON.parse(line))
                    .filter((line) => line.data?.type === 'board' || line.type === 'board')
                    .map((line) => line.data.title as string)
            })

        expect(boardTitles.length).toBeGreaterThan(1)
        expect(boardTitles).toContain(OnboardingBoardTitle)
    })
})
