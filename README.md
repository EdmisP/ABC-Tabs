# Finland ABC Archive and Tab Maker

Static browser-based ABC archive, notation viewer and tablature maker.

## Features

- Finland and Russia ABC tune library
- ABC notation editor and sheet-music rendering
- Tablature generation for the supported instruments
- Lowest-fret preference for fretted instruments when a pitch is available in more than one position
- Duplicate-tune filtering in the song selector
- MIDI import
- Playback, loop, speed, note highlighting and tablature highlighting
- PDF and ABC export
- Installable web-app metadata and Finnish-flag icons

## Supported instruments

- Kantele
- Prima Balalaika
- Prima Domra
- Waldzither
- Mandolin
- Appalachian dulcimer
- Citera
- Musima Chord Zither
- Tamburitza (12-TET)

## GitHub Pages

The repository is ready to serve as a static GitHub Pages site.

1. Create a GitHub repository.
2. Upload the contents of this folder to the repository root.
3. Push to the `main` branch.
4. In **Settings → Pages**, choose **GitHub Actions** as the source.
5. The included Pages workflow deploys the site automatically.

You can also use **Deploy from a branch** with `main` and `/ (root)`; no build step is required.

## Local use

Open `index.html` in a modern browser. The notation renderer is loaded from jsDelivr, so an internet connection is required for first use.

## Main files

- `index.html` — application logic and interface
- `styles.css` — screen and print styling
- `song-library.js` — embedded tune index
- `songs/` — ABC source files
- `app.webmanifest` — installed-app metadata
- `service-worker.js` — lightweight asset cache for hosted use
- `icons/` and `favicon.ico` — Finnish-flag app icons
