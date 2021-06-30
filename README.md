# GriftlandsWiki

A mirror for the [Griftlands Wiki](https://griftlands.fandom.com/wiki/Griftlands_Wiki) on Fandom and a set of commands for editing.

## Features
- A local version of the wiki:
  - All wiki text pages, as `*.wikitext` files
  - All image metadata, as `*.json` files
- Commands:
  - `pull` retrieves the pages from the online wiki and stores them locally
  - `download` retrieves the raw image files. They are not to be stored on git.
  - `push` sends the local changes to the online wiki
  - `update` parses the game files and changes the local wiki accordingly
- All commands have a guard in place that warns and informs you about the incoming operations.

## Installation
1. Clone the repository
2. `npm install`

## Commands
### pull
```sh
npm run pull
```
Retrieves the pages from the online wiki and stores them locally:
1. requests all text pages from the 4 most important namespaces, 50 items at a time
2. requests all image pages, 500 items at a time
3. offers a summary of what's about to happen
4. asks you if you want to proceed
5. stores the texts as `*.wikitext` and the images as `*.json` in the local `wiki` folder
6. removes all local pages that are no longer referenced

### download
```sh
npm run download
```
Retrieves the raw image files corresponding to each `*.json` file:
1. compares the `wiki/File` and `raw/web` folders
2. offers a summary of what's about to happen
3. asks you if you want to proceed
4. downloads all necessary images to `raw/web`
5. removes all raw images that are no longer accompanied by a `*.json` file

### push
```sh
npm run push
```
Sends the local changes to the online wiki:
1. performs a `pull` so it can compare the local files with the most recent online version
2. offers a summary of what's about to happen
3. asks you if you want to proceed
4. obtains a CSRF token for editing, based on the credentials from `/scripts/utils/credentials.json`
5. writes the needed changes to the online wiki
6. (currently disabled) removes online pages that have no local counterpart

### update
```sh
npm run update
```
Parses the game files and changes the local wiki accordingly
1. unpacks the game files
2. parses and cross-references all Compendium Characters (241 people + 29 bosses)
3. TODO. This is still Work-in-Progress

## Options
- You can find some configuration options in `/scripts/utils/CONFIG.js`
- Most commands accept a page title as parameter to focus on that particular item and not scan the whole wiki.
For example:
```sh
npm run pull Allyn # retrieves just the "Allyn" page
npm run download "File:Abrupt Remark.png" # downloads just "Abrupt Remark.png"
npm run push Bax # uploads the "Bax" page
```

## TODO
- Expand the capabilities of `update`
- Maybe use `modified-date` for raw files. Currently, the `sha1` technique has flaws.