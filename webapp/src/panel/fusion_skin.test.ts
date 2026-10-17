// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'fs'
import path from 'path'

// Kanban's Fusion stylesheets restyle classes the classic UI draws too (.Button, .Dialog, .Menu, .Label...): every
// rule must only ever apply under the Fusion UI, never to the classic UI.
const SCOPE = 'html[data-am-web-ui=\'fusion\']'

const SHEETS = ['fusion_skin.scss', 'fusion_labels.scss']

const read = (sheet: string) => fs.readFileSync(path.join(__dirname, sheet), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

// The selectors of the stylesheet's top-level rules, and of the rules right inside its at-rules (@media...).
export const topLevelSelectors = (css: string): string[] => {
    const selectors: string[] = []
    const walk = (text: string) => {
        let depth = 0
        let start = 0
        let blockStart = 0
        let head = ''
        for (let i = 0; i < text.length; i++) {
            if (text[i] === '{') {
                if (depth === 0) {
                    head = text.slice(start, i).trim()
                    blockStart = i + 1
                }
                depth++
            } else if (text[i] === '}') {
                depth--
                if (depth === 0) {
                    if (head.startsWith('@')) {
                        walk(text.slice(blockStart, i))
                    } else {
                        selectors.push(head)
                    }
                    start = i + 1
                }
            } else if (text[i] === ';' && depth === 0) {
                start = i + 1
            }
        }
    }
    walk(css)
    return selectors
}

describe.each(SHEETS)('%s', (sheet) => {
    const css = read(sheet)

    test('has rules', () => {
        expect(topLevelSelectors(css).length).toBeGreaterThan(0)
    })

    test('scopes every rule to the Fusion UI', () => {
        const unscoped = topLevelSelectors(css).
            flatMap((selector) => selector.split(',').map((s) => s.trim())).
            filter((selector) => !selector.startsWith(SCOPE))
        expect(unscoped).toEqual([])
    })

    test('the scope check finds a rule that isn\'t scoped, in an at-rule too', () => {
        const selectors = topLevelSelectors('.Button { color: red; } @media (min-width: 1px) { .Menu { color: red; } }')
        expect(selectors).toEqual(['.Button', '.Menu'])
    })
})

describe('the Fusion skin', () => {
    const css = read('fusion_skin.scss')

    test('uses Fusion\'s tokens, not hard-coded colours or the classic theme\'s', () => {
        const colours = css.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []

        // White on Fusion's accent and danger colours (and the switch's knob), as Fusion's own controls.
        expect(colours.filter((c) => c.toLowerCase() !== '#fff')).toEqual([])
        expect(css).not.toMatch(/--center-channel|--button-bg|--sidebar-/)
        expect(css).toContain('var(--am-main)')
        expect(css).toContain('var(--am-raise)')
        expect(css).toContain('var(--am-line)')
    })

    test('draws with Fusion\'s fonts, not Open Sans or Metropolis', () => {
        expect(css).toContain('font-family: var(--am-font-ui)')
        expect(css).toContain('font-family: var(--am-font-display)')
        expect(css).not.toMatch(/Open Sans|Metropolis/)
    })

    test('maps Kanban\'s own variables to Fusion\'s tokens', () => {
        expect(css).toMatch(/--elevation-4: var\(--am-shadow\)/)
        expect(css).toMatch(/--error-text: var\(--am-danger\)/)
    })

    test('is loaded by the panel', () => {
        const panel = fs.readFileSync(path.join(__dirname, 'panel.tsx'), 'utf8')
        for (const sheet of SHEETS) {
            expect(panel).toContain(`import './${sheet}'`)
        }
    })
})
