import * as dotenv from 'dotenv'
dotenv.config()

// fetches contract data and stores it, also listens to changes and updates store

// retrieves price data from polling and streaming and saves it to the store

// inits and keeps track of all stores, receives data from the data processes and saves to mongo. stores latest candles

// submits prices and candles to mongo, once per second. candles pushed to mongo for all products and intervals (update many) in one transaction every 1 minute (per clock)

// posts TXs to blockchain: execute, trigger, or liquidate, checked every 2s

// sends data from store to API app as requested

import pollContracts from './oracle/poll-contracts.js'
import streamPrices from './oracle/stream-prices.js'

import submitTXs from './oracle/submit-txs.js'

pollContracts();
streamPrices();
submitTXs();