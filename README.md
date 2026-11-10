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
| `hours` | number | `12` | Next hours. How far ahead the hourly chart goes, as many hours as fit. 0 hides it. |
| `hourStep` | number | `1` | One column every. 2 or 3 fit a whole day in a narrow tile. |
| `days` | number | `3` | Next days. Today included, as many as fit. 0 hides them. |
| `showMoon` | boolean | `true` | Moon phase. Only on wide tiles. |
| `showDetails` | boolean | `false` | Feels like, humidity and wind. Under the temperature, when there is room. |

## Data sources

### Current weather — `weather/current`

Now, the next 48 hours and the next 7 days, from Open-Meteo (no key needed), for your place in Settings or the one set here. Read every 15 min while a widget uses it. Options are set once in Kiosko → Settings → Data sources.

| Option | Type | Default | |
|---|---|---|---|
| `units` | `metric` \| `imperial` | `"metric"` | Units |
| `latitude` | number | `0` | Latitude. Leave latitude and longitude at 0 to use the place in Settings. |
| `longitude` | number | `0` | Longitude |
| `placeName` | string | `""` | Place name. Empty: the one in Settings. |

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
