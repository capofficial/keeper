import { EvmPriceServiceConnection } from '@pythnetwork/pyth-evm-js'

import { setPrice } from '../stores/prices.js'
import { getMarketInfos } from '../stores/markets.js'
import { notifyError } from '../lib/helpers.js'

let t;
let symbols = {}; // source => [symbols]
let markets = {}; // source => [markets] // !! ordered same as symbols
let connection;

export default async function streamPrices() {

	clearTimeout(t);

	if (connection) {
		connection.closeWebSocket();
	}

	const marketInfos = getMarketInfos();

	if (!marketInfos || !marketInfos['BTC-USD']) {
		// Markets not ready yet, retry
		t = setTimeout(streamPrices, 2 * 1000);
		return;
	}

	connection = new EvmPriceServiceConnection("https://xc-mainnet.pyth.network");

	// map market => feedId and feedId => market
	let priceIds = [];
	let pythFeedToMarket = {};
	for (const market in marketInfos) {
		const marketInfo = marketInfos[market];
		priceIds.push(marketInfo.pythFeed);
		pythFeedToMarket[marketInfo.pythFeed] = market;
	}

	// console.log('priceIds', priceIds);
	// console.log('pythFeedToMarket', pythFeedToMarket);

	// // TEST
	// priceIds = [
	//   // You can find the ids of prices at https://pyth.network/developers/price-feed-ids#pyth-evm-testnet
	//   "0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b", // BTC/USD price id in testnet
	//   "0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6", // ETH/USD price id in testnet
	// ];
	// pythFeedToMarket = {
	// 	'0xf9c0172ba10dfa4d19088d94f5bf61d3b54d5bd7483a322a982e1373ee8ea31b': 'BTC-USD',
	// 	'0xca80ba6dc32e08d06f1aa886011eed1d77c77be9eb761cc10d72b7d0a2fd57a6': 'ETH-USD'
	// };

	connection.subscribePriceFeedUpdates(priceIds, (priceFeed) => {
		const feedId = `0x${priceFeed.id}`;
		const market = pythFeedToMarket[feedId];
		// console.log(`Received update for ${feedId} (${market})`);
		const maxAge = marketInfos[market]?.pythMaxAge;
		const priceObj = priceFeed.getPriceNoOlderThan(maxAge || 10);
		if (priceObj) {

			// convert price to decimal without exponent and extra 0s
			const price = priceObj.price / 10**(-1 * priceObj.expo);

			setPrice({
				market, 
				price, 
				timestamp: parseInt(priceObj.publishTime * 1000)
			});

		} // else price is stale
	});

	t = setTimeout(streamPrices, 15 * 60 * 1000); // re-init streams every 15min

}