# Keeper

This repo lets you run a keeper to execute orders placed on [CAP](https://cap.io). Keepers receive 5% of the fees of any order they execute.

## Installation

Start by cloning this repo onto your machine or cloud server. Add a `.env` file containing the private key you want to execute orders from (see `.env.example` for an example). Then:

```
npm i -g pm2
npm i
npm run prod
```

This will run and watch the keeper process using pm2. To automatically run it on system reboot, run `pm2 save`.