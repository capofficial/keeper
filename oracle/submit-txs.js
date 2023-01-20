// consumes queues and posts TXs to the chain, with retries on other networks
// also checks receipt of tx, and accordingly updates local store, eg if error = !exists or success, remove order from store instead of waiting for event. because waiting for event will probably mean order gets re-added to the execution queue in the meantime, and is resent as TX
import { EvmPriceServiceConnection } from '@pythnetwork/pyth-evm-js'

import { getContract, withNetworkRetries, parseUnits } from '../lib/helpers.js'

import { getMarketInfos } from '../stores/markets.js'
import { getExecutionQueue, removeOrder, getAllTriggerOrders } from '../stores/orders.js'
import { getLiquidationQueue, removePosition } from '../stores/positions.js'

// if an order or tx doesnt go through for some reason, the oracle can get stuck in a loop sending TXs (gas) for the same order every 2s, depleting funds
// so there should be an exponential backoff if it tried an orderId and that orderId appears again in the queue - not after 2s, maybe 10 sec, then 1min, then stop trying

const MAX_TRIES = 10;

let recentlyTriedExecuting = {}; // order id => [timestamp, tries]
let recentlyTriedLiquidating = {}; // position key => [timestamp, tries]

const connection = new EvmPriceServiceConnection("https://xc-testnet.pyth.network");

function cleanRecents() {
	for (const orderId in recentlyTriedExecuting) {
		if (recentlyTriedExecuting[orderId]?.[0] < Date.now() - 2 * 24 * 60 * 60 * 1000) {
			delete recentlyTriedExecuting[orderId];
		}
	}
	for (const key in recentlyTriedLiquidating) {
		if (recentlyTriedLiquidating[key]?.[0] < Date.now() - 7 * 24 * 60 * 60 * 1000) {
			delete recentlyTriedLiquidating[key];
		}
	}
}

async function executeOrders() {

	// console.log('executeOrders');

	const executionQueue = getExecutionQueue();
	const marketInfos = getMarketInfos();

	// console.log('executionQueue', executionQueue);
	// console.log('recentlyTriedExecuting', recentlyTriedExecuting);

	if (Object.keys(executionQueue).length) {

		// Use execute multiple
		const contract = await getContract('Processor');
		
		let orderIds = [], priceIds = [];

		for (const orderId in executionQueue) {

			let tries = 1, lastTryTimestamp = 0;
			if (recentlyTriedExecuting[orderId]) {
				lastTryTimestamp = recentlyTriedExecuting[orderId][0];
				tries = recentlyTriedExecuting[orderId][1] + 1;
			}

			const retryAfter = 10 * 1000 * Math.pow(2, tries - 1);

			if (tries >= MAX_TRIES || lastTryTimestamp >= Date.now() - retryAfter) continue;

			recentlyTriedExecuting[orderId] = [Date.now(), tries];

			orderIds.push(orderId * 1);
			priceIds.push(marketInfos[order.market]?.pythFeed);
			
		}

		if (!orderIds.length) return true;

		// to execute sequentially
		orderIds.sort(function (a, b) {
			return a - b;
		});

		const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);

		const pythContract = await getContract('Pyth');
		const updateFee = await pythContract.getUpdateFee(priceUpdateData);

		const tx = await contract.executeOrders(orderIds, priceUpdateData, {value: updateFee});

		const receipt = await tx.wait();

		console.log('receipt', receipt);

		// receipt.logs contains all events emitted by this tx, including errors
		if (receipt && receipt.status == 1) {

			// clear execution queue
			for (const orderId in executionQueue) {
				// remove order from queue and store, it has been executed
				// when this happens, it's possible getTriggerOrders from contract is still pending, returning old trigger orders and repopulating. same with market orders. 
				// so you should have a cache of recently executed orders so that it doesn't repopulate them
				removeOrder(orderId);
			}

		}

	}

	return true;

}

async function liquidatePositions() {

	// liq position can fail if p/l on chain is not the same as calculated here, so here you should keep an extra buffer to really make sure position is liquidatable before submitting it
	// keep track of recently tried position liquidations, if they re-appear in liq queue, do exponential backoff and retry a couple times, then once every 2 hours or so. 

	// console.log('recentlyTriedLiquidating', recentlyTriedLiquidating);

	const liquidationQueue = getLiquidationQueue();
	
	if (Object.keys(liquidationQueue).length) {

		// Use execute multiple
		const contract = await getContract('Processor');

		let users = [], markets = [], assets = [], priceIds = [];
		for (const key in liquidationQueue) {

			let tries = 1, lastTryTimestamp = 0;
			if (recentlyTriedLiquidating[key]) {
				lastTryTimestamp = recentlyTriedLiquidating[key][0];
				tries = recentlyTriedLiquidating[key][1] + 1;
			}

			const retryAfter = 60 * 1000 * Math.pow(2, tries - 1);
			
			if (tries >= MAX_TRIES || lastTryTimestamp >= retryAfter) continue;

			recentlyTriedLiquidating[key] = [Date.now(), tries];

			const keyParts = key.split('||');
			users.push(keyParts[0]);
			markets.push(keyParts[1]);
			assets.push(keyParts[2]);

			priceIds.push(marketInfos[keyParts[1]]?.pythFeed);
			
		}

		if (!users.length) return true;

		const priceUpdateData = await connection.getPriceFeedsUpdateData(priceIds);

		const pythContract = await getContract('Pyth');
		const updateFee = await pythContract.getUpdateFee(priceUpdateData);

		const tx = await contract.liquidatePositions(users, assets, markets, priceUpdateData, {value: updateFee});

		const receipt = await tx.wait();

		// receipt.logs contains all events emitted by this tx, including errors
		if (receipt && receipt.status == 1) {

			for (const key in liquidationQueue) {
				// remove position from queue and store, it has been liquidated
				removePosition(key);
			}

		}

	}

	return true;

}

let t;
// called with small timeout after TXs have returned
export default async function submitTXs() {

	// console.log('submitTXs');

	// return; // TEST

	// all tx submissions have to be sequential to avoid nonce errors, meaning wait for receipt before submitting next tx

	try {
		// console.log('submitTXs2');
		const execSuccess = await withNetworkRetries(executeOrders(), 4, 5000);
		const liqSuccess = await withNetworkRetries(liquidatePositions(), 4, 5000);
		cleanRecents();
	} catch(e) {
		// Network failure even after retries
		console.log(e);
	}

	t = setTimeout(submitTXs, 2000);

}