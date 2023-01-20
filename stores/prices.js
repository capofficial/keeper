import { getMarketOrders } from './orders.js'
import { processNewPrice } from '../lib/processor.js'

let prices = {}; // market => [price, timestamp], stores latest sent prices

export function setPrice(params) {

	console.log('setPrice', params);

	let { market, price, timestamp } = params;

	if (!market || !price) return;

	price = price * 1;

	// sanity
	if (!price || price <= 0 || price == Infinity || isNaN(price)) return;

	// check current price sink for this source. if submitted timestamp is older than current one, don't update it (no timestamp update)
	if (timestamp * 1 <= prices[market]?.[1]) return;
	// even if price is the same, must go through. this is because if a new market order comes in and we return when price hasn't changed, it won't execute it
	
	// sets and processes new price 
	const currentPrice = prices[market] && prices[market][0];
	const lastTime = prices[market]?.[1] || 0;
	const priceChanged = !currentPrice || currentPrice != price;
	const timePassed = Date.now() > lastTime + 30*1000;
	const hasMarketOrders = getMarketOrders(market).length > 0;

	console.log('pth', priceChanged, timePassed, hasMarketOrders);

	if (priceChanged || timePassed || hasMarketOrders) {
		prices[market] = [price, timestamp];
		processNewPrice(market, price);
	}

}