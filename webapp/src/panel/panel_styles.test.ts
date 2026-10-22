// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import fs from 'fs'
import path from 'path'

import * as sass from 'sass'

// The loader the build runs on every stylesheet before Sass: it prefixes the top-level rules with ".focalboard-body ".
// eslint-disable-next-line @typescript-eslint/no-var-requires
const globalScssClassLoader = require('../../loaders/globalScssClassLoader') as (source: string) => string

// The panel's stylesheet as the build makes it: through the loader, then Sass.
const builtCss = (): string => {
    const source = fs.readFileSync(path.join(__dirname, 'panel.scss'), 'utf8')
    return sass.compileString(globalScssClassLoader(source)).css
}

const styleRules = (css: string): CSSStyleRule[] => {
    const style = document.createElement('style')
    style.textContent = css
    document.head.appendChild(style)
    const rules: CSSStyleRule[] = []
    const walk = (list: CSSRuleList) => {
        for (const rule of Array.from(list)) {
            if ('selectorText' in rule) {
                rules.push(rule as CSSStyleRule)
            } else if ('cssRules' in rule) {
                walk((rule as CSSGroupingRule).cssRules)
            }
        }
    }
    walk(style.sheet!.cssRules)
    style.remove()
    return rules
}

// Antimatter: the panel's layout (panel.scss) reaches the panel as the build makes it. Its root carries both
// .focalboard-body and .KanbanPanel, so a rule the loader turned into ".focalboard-body .KanbanPanel" never applied:
// the templates view then had no height, and the template picker covered the panel's header and its back button.
describe('panel/panel.scss, as built', () => {
    const rules = styleRules(builtCss())

    // The panel as panel.tsx draws it, on its templates view.
    document.body.innerHTML = `
        <div class="focalboard-body KanbanPanel" data-kanban-panel="true">
            <div class="KanbanPanelToolbar"></div>
            <div id="focalboard-app">
                <div class="KanbanPanelTemplates">
                    <div class="BoardTemplateSelector"></div>
                </div>
            </div>
        </div>`
    const root = document.querySelector('[data-kanban-panel]')!
    const declared = (element: Element, property: string): string[] => rules.
        filter((rule) => element.matches(rule.selectorText)).
        map((rule) => rule.style.getPropertyValue(property)).
        filter(Boolean)

    test('lays the panel out as a column: the toolbar row, then the view', () => {
        expect(declared(root, 'display')).toContain('flex')
        expect(declared(root, 'flex-direction')).toContain('column')
        expect(declared(root, 'position')).toContain('relative')
        expect(declared(root.querySelector('#focalboard-app')!, 'flex')).toContain('1 1 auto')
    })

    test('keeps the template picker in the templates view, under the toolbar row', () => {
        const templates = root.querySelector('.KanbanPanelTemplates')!
        expect(declared(templates, 'position')).toContain('relative')
        expect(declared(templates, 'flex')).toContain('1 1 auto')
    })

    test('wraps a board view\'s header in a panel of any width: its New button never leaves the panel', () => {
        root.querySelector('#focalboard-app')!.innerHTML = '<div class="BoardComponent"><div class="ViewHeader"></div></div>'
        expect(root.classList.contains('KanbanPanel--narrow')).toBe(false)
        expect(declared(root.querySelector('.ViewHeader')!, 'flex-wrap')).toContain('wrap')
    })

    test('opens a view\'s filters from the right edge of its header, inside the panel', () => {
        root.querySelector('#focalboard-app')!.innerHTML = `
            <div class="BoardComponent"><div class="ViewHeader">
                <div class="ModalWrapper"><div class="Modal bottom"><div class="FilterComponent"></div></div></div>
            </div></div>`
        const modal = root.querySelector('.Modal')!
        expect(declared(root.querySelector('.ViewHeader')!, 'position')).toContain('relative')
        expect(declared(root.querySelector('.ModalWrapper')!, 'position')).toContain('static')
        expect(declared(modal, 'right')).toContain('0')
        expect(declared(modal, 'left')).toContain('auto')
        expect(declared(modal, 'max-width')).toContain('100%')
    })

    test('applies each of its rules to the panel, none only to a panel inside another', () => {
        const panelRules = rules.filter((rule) => rule.selectorText.includes('KanbanPanel'))
        expect(panelRules.length).toBeGreaterThan(0)
        const nested = panelRules.filter((rule) => (/\.focalboard-body \.KanbanPanel(?![\w-])/).test(rule.selectorText))
        expect(nested.map((rule) => rule.selectorText)).toEqual([])
    })
})
