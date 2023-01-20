// get contract data
import { MAX_ITEMS_PER_FETCH } from '../lib/config.js'
import { getContract, notifyError, formatUnits, formatOrderOrPosition, withNetworkRetries } from '../lib/helpers.js'
import { setMarketInfo } from '../stores/markets.js'
import { setMarketOrders, setTriggerOrders } from '../stores/orders.js'
import { setPositions, getAllPositions, setFundingTrackers } from '../stores/positions.js'

function cleanItems(items) {
	items = items.filter((item) => !item.size.isZero());
	items = items.map((item) => formatOrderOrPosition(item));
	return items;
}

async function getMarketOrders() {
	const contract = await getContract('OrderStore');
	// +10 is used in case new market orders make it through between requests
	let length = await contract.getMarketOrderCount();
	length = Math.min(10 + 1 * length, MAX_ITEMS_PER_FETCH);
	let orders = cleanItems(await contract.getMarketOrders(length));
	console.log(Date.now(), 'market orders', orders);
	setMarketOrders(orders);
	return true;
}

async function getTriggerOrders() {

	let orders = [];
	const contract = await getContract('OrderStore');
		
	async function getTriggerOrdersPaginated(length, offset) {
		orders = orders.concat(await contract.getTriggerOrders(length, offset));
	}

	const length = await contract.getTriggerOrderCount();
	
	if (length > MAX_ITEMS_PER_FETCH) {
		// paginate
		const pages = Math.ceil(length / MAX_ITEMS_PER_FETCH);
		for (let i = 0; i < pages; i++) {
			await getTriggerOrdersPaginated(MAX_ITEMS_PER_FETCH, i * (MAX_ITEMS_PER_FETCH + 1));
		}
	} else {
		orders = await contract.getTriggerOrders(length + 10, 0);
	}

	orders = cleanItems(orders);
	setTriggerOrders(orders);
	return true;

}

async function getPositions() {

	let positions = [];
	const contract = await getContract('PositionStore');
		
	async function getPositionsPaginated(length, offset) {
		positions = positions.concat(await contract.getPositions(length, offset));
	}

	const length = await contract.getPositionCount();
	
	if (length > MAX_ITEMS_PER_FETCH) {
		// paginate
		const pages = Math.ceil(length / MAX_ITEMS_PER_FETCH);
		for (let i = 0; i < pages; i++) {
			await getPositionsPaginated(MAX_ITEMS_PER_FETCH, i * (MAX_ITEMS_PER_FETCH + 1));
		}
	} else {
		positions = await contract.getPositions(length + 10, 0);
	}

	// console.log('positions PRE', positions);
	positions = cleanItems(positions);
	setPositions(positions);
	return true;

}

async function getMarkets() {
	const contract = await getContract('MarketStore');
	const marketList = await contract.getMarketList();
	const _markets = await contract.getMany(marketList);
	let markets = {};
	let i=0;
	for (const product in _markets) {
		markets[marketList[i]] = _markets[product];
		i++;
	}
	setMarketInfo(markets);
	return true;
}

async function getFundingTrackers() {

	const contract = await getContract('FundingStore');

	const positions = getAllPositions();

	let ftData = {};
	for (const market in positions) {
		if (!positions[market]) continue;
		for (const key in positions[market]) {
			const pos = positions[market][key];
			ftData[`${pos.asset}||${market}`] = [pos.asset, market];
		}
		
	}

	let assets = [];
	let markets = [];

	for (const key in ftData) {
		const item = ftData[key];
		assets.push(item[0]);
		markets.push(item[1]);
	}

	if (!assets.length || !markets.length) return true;

	// get fundingTrackers for active positions
	const fundingTrackers = await contract.getFundingTrackers(assets, markets);

	let ftReturnData = {};
	let i = 0;
	for (const ft of fundingTrackers) {
		ftReturnData[`${assets[i]}||${markets[i]}`] = ft;
		i++;
	}
	setFundingTrackers(ftReturnData);
	return true;
}

async function promiseWithInterval(promise, interval) {
	try {
		const r = await promise();
	} catch(e) {
		notifyError('PROMISE ERROR ' + e);
	}
	setTimeout(() => {
		promiseWithInterval(promise, interval);
	}, interval);
}

export default async function() {

	try {

		let promises = [
			getMarketOrders(),
			getTriggerOrders(),
			getPositions(),
			getMarkets(),
			getFundingTrackers()
		];

		const results = await withNetworkRetries(Promise.all(promises), 10, 2000);

		// query fetch marketorders every 3 seconds, positions every 10 seconds, trigger orders every 30 seconds - and populate stores. settimeout after they return results. if they get out of hand with storage, maybe increase those intervals.

		promiseWithInterval(getMarketOrders, 3000);
		promiseWithInterval(getTriggerOrders, 10 * 1000);
		promiseWithInterval(getPositions, 30 * 1000);
		promiseWithInterval(getMarkets, 60 * 1000); // has market.isClosed
		promiseWithInterval(getFundingTrackers, 2 * 60 * 1000);

	} catch(e) {
		notifyError('Poll contracts ' + e);
	}

}