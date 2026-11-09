# kiosko-plugin-weather

Weather from Open-Meteo, shared with every widget, and a forecast card.

A plugin for [Kiosko](https://github.com/kiosko-lcd/kiosko), the widget mosaic for small USB LCD panels.

![Weather forecast](docs/forecast.png)

## Install

In Kiosko, **Plugins → Install from npm** → `kiosko-plugin-weather`, then restart Kiosko. Or from a terminal:

```sh
npm install --prefix ~/.config/kiosko/plugins kiosko-plugin-weather
```

(macOS: `~/Library/Application Support/Kiosko/plugins`, Windows: `%APPDATA%\Kiosko\plugins`.)

## Requirements

- Your location in Kiosko → Settings (Open-Meteo, no key needed).

## Widgets

### Weather forecast — `weather/forecast`

Temperature and sky now, the next hours (temperature curve and rain) and days, and the moon when there is room.

![Weather forecast](docs/forecast.png)

Uses: `weather/current`.

| Option | Type | Default | |
|---|---|---|---|
| `hours` | boolean | `true` | Next hours |
| `days` | boolean | `true` | Next days |
| `moon` | boolean | `true` | Moon phase. Only on wide tiles. |

## Data sources

### Current weather — `weather/current`

Now and the next hours and days, from Open-Meteo (no key needed), for your location or the place set here. Read every 15 min while a widget uses it. Options are set once in Kiosko → Settings → Data sources.

| Option | Type | Default | |
|---|---|---|---|
| `name` | string | `""` | Place name. Empty: the one in Settings. |
| `latitude` | number | `0` | Latitude. 0 and 0: use the location in Settings. |
| `longitude` | number | `0` | Longitude |

## Development

```sh
npm install
npm test          # node:test
npm run check     # TypeScript
npm run build     # dist/index.js, what Kiosko loads
```

To try it in a running Kiosko without publishing: `kiosko plugins link .` and restart Kiosko.

Working on Kiosko and its plugins together: clone them side by side
(`kiosko/` and `kiosko-plugins/kiosko-plugin-weather/`) and run `npm install` in
`kiosko/`; its workspaces link every plugin found in `../kiosko-plugins`.

## License

MIT
