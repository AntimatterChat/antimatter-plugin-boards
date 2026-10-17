// Copyright (c) 2020-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Kanban draws Fusion's empty states (a small line icon, a title, a sentence), never Mattermost's illustrations, and
// its tour is text: no source file imports the old artwork or the onboarding animations, they're gone from the tree,
// and no component draws an illustration inline. This scans what the bundle is built from.

import fs from 'fs'
import path from 'path'

const SRC = __dirname
const WEBAPP = path.join(SRC, '..')

// The Mattermost artwork Kanban shipped: the illustrations of its error, access and search pages, the tour's
// animations and pictures, and the old onboarding background and upgrade picture (copied to the bundle's static/).
const OLD_ARTWORK = [
    'src/svg/error-illustration',
    'src/svg/access-denied-illustation',
    'src/svg/search-illustration',
    'static/changeViews.gif',
    'static/share.gif',
    'static/copyLink.gif',
    'static/comment.gif',
    'static/addProperty.gif',
    'static/addDescription.png',
    'static/onboardingBg.jpg',
    'static/upgrade.png',
]

// The images the plugin may still import: the emoji picker's sprite sheet (emoji, not artwork).
const ALLOWED_IMAGES = ['static/emoji_spirit.png']

const sourceFiles = (dir: string): string[] => fs.readdirSync(dir, {withFileTypes: true}).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
        return entry.name === 'node_modules' || entry.name === '__snapshots__' ? [] : sourceFiles(full)
    }
    return (/\.(tsx?|jsx?|s?css)$/).test(entry.name) && !(/\.test\.(tsx?|jsx?)$/).test(entry.name) ? [full] : []
})

// The first group of every match of a global pattern (String.matchAll is ES2020, the plugin builds for ES2019).
const captures = (code: string, pattern: RegExp): string[] => {
    const found: string[] = []
    for (let m = pattern.exec(code); m; m = pattern.exec(code)) {
        found.push(m[1])
    }
    return found
}

// The modules a file imports (import ... from, import '...', require(), import(), @import, url()), as paths from the
// web app's root when they're relative.
const importsOf = (file: string): string[] => {
    const code = fs.readFileSync(file, 'utf8')
    const specs = [
        ...captures(code, /(?:from\s+|import\s+|require\(\s*|import\(\s*)['"]([^'"]+)['"]/g),
        ...captures(code, /@import\s+['"]([^'"]+)['"]/g),
        ...captures(code, /url\(\s*['"]?([^'")]+)['"]?\s*\)/g),
    ]
    return specs.map((spec) => (spec.startsWith('.') ? path.relative(WEBAPP, path.resolve(path.dirname(file), spec)).split(path.sep).join('/') : spec))
}

const withoutExtension = (spec: string) => spec.replace(/\.(tsx?|jsx?)$/, '')

const files = sourceFiles(SRC)

describe('Mattermost artwork', () => {
    test('the scan sees the plugin\'s code', () => {
        expect(files.length).toBeGreaterThan(100)
    })

    test('no module of the plugin imports the old illustrations or the tour\'s animations', () => {
        const offenders = files.flatMap((file) => importsOf(file).
            filter((spec) => OLD_ARTWORK.includes(withoutExtension(spec)) || OLD_ARTWORK.includes(spec) || (/illustr?ation/i).test(spec)).
            map((spec) => `${path.relative(SRC, file)} imports ${spec}`))
        expect(offenders).toEqual([])
    })

    test('the old artwork is gone from the tree', () => {
        const left = OLD_ARTWORK.filter((spec) => ['', '.tsx', '.ts'].some((ext) => fs.existsSync(path.join(WEBAPP, spec + ext))))
        expect(left).toEqual([])
        expect(fs.readdirSync(path.join(WEBAPP, 'static')).filter((name) => (/\.(gif|jpe?g)$/i).test(name))).toEqual([])
    })

    test('no image is imported but the emoji picker\'s sprite sheet', () => {
        const images = files.flatMap((file) => importsOf(file).
            filter((spec) => (/\.(png|jpe?g|gif|webp|svg)$/).test(spec) && !ALLOWED_IMAGES.includes(spec)).
            map((spec) => `${path.relative(SRC, file)} imports ${spec}`))
        expect(images).toEqual([])
    })

    test('the tour\'s tips have no pictures', () => {
        const tour = path.join(SRC, 'components', 'onboardingTour')
        const withImages = sourceFiles(tour).filter((file) => (/imageURL=/).test(fs.readFileSync(file, 'utf8')))
        expect(withImages.map((file) => path.relative(SRC, file))).toEqual([])
    })

    test('no page or empty state draws an illustration inline (an SVG of many shapes)', () => {
        const pages = [
            ...sourceFiles(path.join(SRC, 'pages')),
            ...sourceFiles(path.join(SRC, 'svg')),
            path.join(SRC, 'components', 'guestNoBoards.tsx'),
            path.join(SRC, 'components', 'rhsChannelBoards.tsx'),
            path.join(SRC, 'components', 'searchDialog', 'searchDialog.tsx'),
        ].filter((file) => (/\.tsx$/).test(file))
        const drawings = pages.flatMap((file) => {
            const code = fs.readFileSync(file, 'utf8')
            const shapes = (code.match(/<(path|circle|rect|ellipse|polygon)\b/g) ?? []).length
            return shapes >= 4 ? [`${path.relative(SRC, file)}: ${shapes} shapes`] : []
        })
        expect(drawings).toEqual([])
    })
})
