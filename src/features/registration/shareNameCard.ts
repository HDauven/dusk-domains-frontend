// A local, shareable image: no third-party image service or wallet data leaves the browser.
export async function downloadNameCard(name: string) {
  await document.fonts.ready
  const canvas = document.createElement('canvas')
  canvas.width = 1200
  canvas.height = 630
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Image download is unavailable in this browser.')
  const styles = getComputedStyle(document.documentElement)
  const colour = (token: string) => styles.getPropertyValue(token).trim()
  context.fillStyle = colour('--surface')
  context.fillRect(0, 0, 1200, 630)
  const glow = context.createRadialGradient(600, 970, 310, 600, 970, 850)
  glow.addColorStop(0, colour('--sunset'))
  glow.addColorStop(0.25, colour('--sunset-dim'))
  glow.addColorStop(1, colour('--surface'))
  context.fillStyle = glow
  context.fillRect(0, 0, 1200, 630)
  context.fillStyle = colour('--night')
  context.beginPath()
  context.ellipse(600, 970, 730, 450, 0, 0, Math.PI * 2)
  context.fill()
  context.fillStyle = colour('--ink')
  context.textAlign = 'center'
  const label = name.replace(/\.dusk$/, '')
  let size = 110
  do { context.font = `${size}px "Instrument Serif", serif`; size -= 2 } while (context.measureText(label).width > 1060 && size > 30)
  context.fillText(label, 600, 265)
  context.font = 'italic 80px "Instrument Serif", serif'
  context.fillStyle = colour('--muted')
  context.fillText('.dusk', 600, 360)
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not create the image. Try again.')
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${name}.png`
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
