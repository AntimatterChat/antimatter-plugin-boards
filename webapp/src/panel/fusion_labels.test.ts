// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'fs'
import path from 'path'

import {Constants} from '../constants'

// The label colours of the Fusion UI (fusion_labels.scss) must be readable: every label's text on its fill has a
// contrast of at least 4.5:1 (WCAG AA for text), in the dark and the light themes, whatever surface it sits on.

const css = fs.readFileSync(path.join(__dirname, 'fusion_labels.scss'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')

// The custom properties declared by the rule of the given selector.
const declarations = (selector: string): Record<string, string> => {
    const start = css.indexOf(selector + ' {')
    expect(start).toBeGreaterThanOrEqual(0)
    const body = css.slice(start + selector.length + 2, css.indexOf('}', start))
    return Object.fromEntries(Array.from(body.matchAll(/(--[\w-]+):\s*([^;]+);/g)).map((m) => [m[1], m[2].trim()]))
}

const THEMES = {
    dark: declarations('html[data-am-web-ui=\'fusion\'] body'),
    light: declarations('html[data-am-web-ui=\'fusion\'][data-am-theme=\'light\'] body'),
    'system, light': declarations('    html[data-am-web-ui=\'fusion\'][data-am-theme=\'system\'] body'),
}

// Fusion's surfaces (webapp/fusion/src/fusion/styles/_00_tokens.scss) a label is drawn on: main, side and raise, in
// Fusion Dark and OLED, and in Fusion Light.
const SURFACES = {
    dark: ['#313338', '#2B2D31', '#383A40', '#000000', '#0E0E10', '#18191C'],
    light: ['#FFFFFF', '#F2F0F9', '#F1EEFA'],
    'system, light': ['#FFFFFF', '#F2F0F9', '#F1EEFA'],
}

// The label colours Kanban has (Constants.menuColors: propColorGray...), as their variables (--prop-gray...).
const LABEL_VARIABLES = Object.keys(Constants.menuColors).map((c) => '--prop-' + c.replace('propColor', '').toLowerCase())

const channel = (c: number) => {
    const v = c / 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
}

const luminance = (hex: string) => {
    const h = hex.replace('#', '')
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16))
    return (0.2126 * channel(r)) + (0.7152 * channel(g)) + (0.0722 * channel(b))
}

export const contrast = (a: string, b: string): number => {
    const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
    return (l1 + 0.05) / (l2 + 0.05)
}

describe('Kanban\'s label colours under the Fusion UI', () => {
    test('the contrast is WCAG\'s', () => {
        expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5)
        expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2)
    })

    describe.each(Object.keys(THEMES) as Array<keyof typeof THEMES>)('the %s themes', (theme) => {
        const vars = THEMES[theme]
        const text = vars['--kanban-label-text']

        test('give every label colour a solid fill, and the labels a text colour', () => {
            expect(text).toMatch(/^#[0-9a-f]{6}$/)
            for (const variable of LABEL_VARIABLES) {
                expect(vars[variable]).toMatch(/^#[0-9a-f]{6}$/)
            }
        })

        test.each(LABEL_VARIABLES)('%s: the text is readable on the fill (4.5:1 or more)', (variable) => {
            expect(contrast(text, vars[variable])).toBeGreaterThanOrEqual(4.5)
        })

        test('the text colour is readable on Fusion\'s surfaces too', () => {
            for (const surface of SURFACES[theme]) {
                expect(contrast(text, surface)).toBeGreaterThanOrEqual(4.5)
            }
        })

        test('the colours can be told apart', () => {
            const fills = LABEL_VARIABLES.map((v) => vars[v])
            expect(new Set(fills).size).toBe(fills.length)
        })
    })

    test('the light system theme has the light colours', () => {
        expect(THEMES['system, light']).toEqual(THEMES.light)
    })

    test('a coloured label\'s text takes the label text colour', () => {
        expect(css).toMatch(/\.Label:not\(\.empty\)[^{]*\{\s*color: var\(--kanban-label-text\);/)
    })
})
