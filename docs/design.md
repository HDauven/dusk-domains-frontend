# Design direction: Afterglow

Chosen 2026-10-01 for the redesign (#199). Afterglow keeps the night sky and the
planet horizon from the current app. It treats each name as a signature and gives
it a sunset card that appears on the name page, in My names and in share images.

## Type

- **Instrument Serif** for names and the few headings that need character. The
  `.dusk` suffix is set in italic.
- **Geist** for everything you read or operate: body text, labels, buttons, forms.
- **Geist Mono** only for addresses, contract IDs, amounts in tables and other
  registry values.

Names keep a readable minimum size and wrap before they truncate.

## Colour

| Token | Value | Use |
| --- | --- | --- |
| night | `#0c0919` | Page background |
| surface | `#171222` | Panels and controls |
| ink | `#fff5ee` | Primary text |
| muted | `#c4b6cb` | Secondary text |
| line | `#403244` | Borders and dividers |
| peach | `#f2c5ab` | The next action: primary buttons, focus, links |
| mint | `#bde5cc` | Available, verified, success |
| error | `#ffb3b3` | Errors and destructive actions |

Peach marks what to do next; mint marks a good state. Neither is decoration.
Body text must hold WCAG AA contrast against the actual surface, including
over the horizon gradient.

## Shape and motion

- The horizon sits at the bottom of every page. Its bright rim never sits behind
  text you need to read.
- Controls sit on solid dark surfaces, not on the gradient.
- Entrances take about 650 ms, hover feedback 180–350 ms. The card's planet rim
  may breathe slowly.
- A view or result rises in once, when it mounts; the cards and panels inside fade in
  40 ms apart. Refreshes keep the same elements, so nothing replays.
- Tabs, the top navigation and rows of choices such as the term picker share one pill
  that slides to the active item.
- A pointer lifts name cards a few pixels and brightens their sun; buttons press in
  slightly. Nothing that holds a fitted name is scaled.
- Dialogs and the phone menu ease in and close at once. Messages, errors and new form
  rows settle in; a status that finishes in place changes colour and fades in its new
  words.
- The sky drifts too slowly to notice: two dust layers move apart over minutes and a few
  stars twinkle. Name stars hold still. Sky motion is transform or opacity only.
- With reduced motion, nothing animates and nothing starts invisible.

## Copy

Copy is plain and short. It says what something is or what happens next. The
look carries the mood, so the words don't have to.

- No slogans, taglines or poetic lines. That covers headlines, eyebrows,
  cards, footers and empty states.
- One headline per page at most, a few words, saying what the page is for.
  Add one supporting sentence only if it adds information.
- Buttons and links name the action: "Search", "Reserve", "Renew for 1 year",
  "List for sale", "Copy address".
- Empty and error states say what is missing or went wrong, and what to do.
- Show amounts with their unit (12 DUSK) and dates as dates. Use block heights
  only where someone needs them.
- Never claim more than the chain shows. "Primary name" means the address and
  the name point to each other; it does not verify a person.
- Show only data that exists. If a name has no description or avatar record,
  the card shows the name and nothing invented.

| Instead of | Write |
| --- | --- |
| "Your name. A new horizon." | "Find your .dusk name" |
| "More than a wallet address. A place to be yourself…" | "One readable name for your Dusk address." |
| "YOUR OWN LITTLE PIECE OF THE HORIZON" | *(no eyebrow)* |
| "A quiet force. A bright beginning." | *(the name's own description record, or nothing)* |
| "Verified primary name" | "Primary name" |
| "A name that's yours. A world to make." | *(no footer line)* |
| "Make it yours." | "Manage aurora.dusk" |

## Mark

The mark is the share card's sunset in a tile: the sun half behind the planet's
lilac-to-peach rim, in the card's palette. Two sources in `brand/` drive every
brand file:

- `mark.svg` is the master, for icons from 180 px, the logos and the social
  images.
- `mark-small.svg` drops the blur and enlarges the sun and rim, so the mark stays
  crisp at 16 and 32 px. It is the favicon, the header mark and the mark on
  share cards.

To change the mark, edit those files and run `npm run brand`. Adding
`-- --indexer ../dusk-domains-indexer` also writes the indexer's share-card mark.
The tile's corner radius lives on the `tile` clip path; full-bleed icons drop it.

## Reference

The concept mockups (home/search and a name page, desktop and phone) were the
basis for this choice. They use sample data and their copy predates the rules
above. Follow this document where the two differ.
