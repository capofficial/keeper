import { ethers } from 'ethers'
import { BPS_DIVIDER } from './config.js'
import { getMarketOrders, getTriggerOrders, addToExecutionQueue } from '../stores/orders.js'
import { getPositions, addToLiquidationQueue, getFundingTracker, setPositionUPL } from '../stores/positions.js'
import { getMarketAttribute } from '../stores/markets.js'
import { notifyError, formatUnits } from './helpers.js'

export async function processNewPrice(market, price) {

	// console.log('>> processing price ', market, price);

	// Market orders

	const marketOrders = getMarketOrders(market);

	for (const order of marketOrders) {
		addToExecutionQueue(order);
	}

	// Limit and stop orders

	const triggerOrders = getTriggerOrders(market);

	for (const order of triggerOrders) {
		if (order.orderType == 1) {
			// Limit order
			if (order.isLong && price <= order.price || !order.isLong && price >= order.price) {
				addToExecutionQueue(order);
			}
		} else if (order.orderType == 2) {
			// Stop order
			if (order.isLong && price >= order.price || !order.isLong && price <= order.price) {
				addToExecutionQueue(order);
			}
		}
	}

	// Liquidations

	const positions = getPositions(market);
	// console.log('positions', positions);

	let liqThreshold = getMarketAttribute(market, 'liqThreshold');
	// console.log('liqThreshold', liqThreshold);

	if (!liqThreshold) liqThreshold = BPS_DIVIDER;

	for (const position of positions) {

		// calculate p/l
		let pnl;
		if (position.isLong) {
			pnl = (price * 1 - position.price * 1) / position.price;
		} else {
			pnl = (position.price * 1 - price * 1) / position.price;
		}

		// console.log('pnl %', pnl * 100);

		pnl = position.size * pnl;

		try {
			// funding fee
			let ft = getFundingTracker(position.asset, position.market); // funding tracker is in UNIT * bps
			// console.log('ft', ft);
			// console.log('pft', position.fundingTracker);
			if (ft != undefined) {
				ft = formatUnits(ft);
				const pft = formatUnits(position.fundingTracker);
				const ftDiff = ft * 1 - pft * 1;
				const fundingFee = position.size * ftDiff / BPS_DIVIDER;
				if (position.isLong) {
					pnl -= fundingFee;
				} else {
					pnl += fundingFee;
				}
				// console.log('fundingFee', fundingFee);
			}
		} catch(e) {
			notifyError('Funding CALC ' + e);
		}

		// console.log('pnl', pnl);

		const threshold = position.margin * liqThreshold / BPS_DIVIDER;

		// console.log('threshold', threshold);

		if (pnl <= -1 * threshold) {
			console.log('Adding to liq queue', pnl, position.user, position.asset, market);
			addToLiquidationQueue(position.user, position.asset, market);
		}

		// set position up/l
		setPositionUPL(position, pnl);

	}

}