// A local, shareable image of the name's Night Card: the same SVG the name page shows,
// drawn in the browser. No image service or wallet data is involved.
const fonts = [['normal', 'instrument-serif.woff2'], ['italic', 'instrument-serif-italic.woff2']] as const

async function dataUrl(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Could not load ${url}`)
  const blob = await response.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

// An SVG drawn as an image loads nothing external, so inline the artwork and the font.
export async function selfContainedCard(svg: string) {
  const hrefs = [...new Set(Array.from(svg.matchAll(/href="([^"#][^"]*)"/g), match => match[1]))]
  const [faces, images] = await Promise.all([
    Promise.all(fonts.map(async ([style, file]) => `@font-face{font-family:"Instrument Serif";font-style:${style};src:url(${await dataUrl(`${import.meta.env.BASE_URL}fonts/${file}`)}) format("woff2")}`)),
    Promise.all(hrefs.map(async href => [href, await dataUrl(href)] as const)),
  ])
  let inlined = svg.replace(/<svg\b[^>]*>/, tag => `${tag}<style>${faces.join('')}</style>`)
  for (const [href, data] of images) inlined = inlined.replaceAll(`href="${href}"`, `href="${data}"`)
  return inlined
}

async function cardPng(name: string) {
  const { renderNightCard } = await import('../search/night-card/renderNightCard')
  const { svg } = await renderNightCard(name, 'download')
  const source = URL.createObjectURL(new Blob([await selfContainedCard(svg)], { type: 'image/svg+xml' }))
  try {
    const image = new Image()
    image.src = source
    await image.decode()
    const canvas = document.createElement('canvas')
    canvas.width = 1200
    canvas.height = 630
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Image download is unavailable in this browser.')
    context.drawImage(image, 0, 0, 1200, 630)
    return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  } finally {
    URL.revokeObjectURL(source)
  }
}

export async function downloadNameCard(name: string) {
  let blob: Blob | null
  try {
    blob = await cardPng(name)
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Image download')) throw error
    blob = null
  }
  if (!blob) throw new Error('Could not create the image. Try again.')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
