import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

function files(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? files(path) : [path]
  })
}

const namedColours = 'aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen'.split(' ').join('|')
const namedLiteral = new RegExp(`(?:color|background|border|outline|shadow|fill|stroke)[\\w-]*\\s*:[^;{}]*\\b(?:${namedColours})\\b`, 'gi')
// JSX attributes (fill="red", fill={'red'}) and style objects ({ color: 'red' }).
const jsxNamedLiteral = new RegExp(`(?:color|background(?:Color)?|border(?:Color)?|outline(?:Color)?|fill|stroke|stopColor)\\s*(?:=\\s*\\{?|:)\\s*["'\`](?:${namedColours})["'\`]`, 'gi')
const literal = /#[\da-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\s*\(/gi

describe('Afterglow tokens', () => {
  it('keeps colour literals in the token file', () => {
    const paths = [...files('src'), 'index.html', 'public/site.webmanifest']
      .filter((path) => /\.(css|tsx?|html|webmanifest)$/.test(path) && !path.includes('.test.') && path !== 'src/styles/tokens.css')
    const violations = paths.flatMap((path) => {
      const source = readFileSync(path, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
      const matches = source.match(literal) ?? []
      // CSS named colours are literals too; transparent and currentColor are contextual.
      matches.push(...source.match(path.endsWith('.css') ? namedLiteral : jsxNamedLiteral) ?? [])
      return matches.map((match) => `${path}: ${match}`)
    })
    expect(violations).toEqual([])
  })

  it('catches named colours in JSX attributes and style objects', () => {
    for (const source of ['<div style={{ color: \'red\' }} />', '<svg fill={\'red\'} />', '<svg fill="red" />', '<div style={{ backgroundColor: "navy" }} />']) {
      expect(source.match(jsxNamedLiteral), source).not.toBeNull()
    }
    for (const source of ['<div style={{ color: \'var(--ink)\' }} />', '<svg fill="currentColor" />', 'const label = \'red\'']) {
      expect(source.match(jsxNamedLiteral), source).toBeNull()
    }
  })

  it('preloads the self-hosted font files', () => {
    const html = readFileSync('index.html', 'utf8')
    for (const font of ['geist', 'geist-mono', 'instrument-serif', 'instrument-serif-italic']) {
      expect(html).toContain(`rel="preload" href="/fonts/${font}.woff2" as="font" type="font/woff2" crossorigin`)
    }
  })
})
