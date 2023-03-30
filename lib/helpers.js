import { ethers } from 'ethers'
import { ABIS, NETWORKS, DATASTORE, USDC } from './config.js'
import { getNetworkId, incrementNetworkId } from '../stores/network.js'

function waitFor(millSeconds) {
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, millSeconds);
	});
}

export async function withNetworkRetries(promise, nthTry, delayTime) {

	try {
		return await promise;
	} catch (e) {
		if (e) e = e.substr(0,280) + '...';
		if (nthTry == 1) {
			notifyError(`Max retries reached with error: ${e}`);
			// return Promise.reject(e);
			return;
		}
		incrementNetworkId();
		notifyError(`(nthTry: ${nthTry}) Retrying on next network with error: ${e}`);
		await waitFor(delayTime);
		return withNetworkRetries(promise, nthTry - 1, delayTime);
	}

}

export function formatOrderOrPosition(item) {

	let _item = {
		user: item.user,
		asset: item.asset,
		market: item.market,
		isLong: item.isLong,
		size: formatUnitsForAsset(item.size || item.positionSize, item.asset),
		margin: formatUnitsForAsset(item.margin || item.positionMargin, item.asset),
		price: 1 * formatUnits(item.price),
		timestamp: 1 * item.timestamp
	};
	if (item.orderId) {
		_item.orderId = 1 * item.orderId
		_item.orderType = item.orderType
	}
	if (item.fundingTracker || item.fundingRate) {
		_item.fundingTracker = item.fundingTracker || item.fundingRate
	}
	return _item;
}

export function formatUnitsForAsset(amount, asset) {
	let units = asset.toLowerCase() == USDC.toLowerCase() ? 6 : 18;
	return ethers.utils.formatUnits(amount || 0, units);
}
export function parseUnitsForAsset(amount, asset) {
	let units = asset.toLowerCase() == USDC.toLowerCase() ? 6 : 18;
	return ethers.utils.parseUnits(amount || 0, units);
}

let addresses = {}; // cache

export async function getAddress(name) {
	return await getContract(name, true);
}

export function getProvider() {
	let networkId = getNetworkId();
	const network = NETWORKS[networkId];
	if (!network) return false;
	return (new ethers.providers.JsonRpcProvider(network));
}

export async function getContract(name, addressOnly) {

	if (addressOnly && addresses[name]) return addresses[name];

	let provider = getProvider();

	const pkey = process.env.K;

	let address = addresses[name];

	if (!address) {
		// get address from data store
		let dataStore = new ethers.Contract(DATASTORE, ABIS['DataStore'], new ethers.Wallet(pkey, provider));
		address = await dataStore.getAddress(name);
	}

	if (!address) return false;

	addresses[name] = address;

	if (addressOnly) return address;

	let contract = new ethers.Contract(address, ABIS[name], new ethers.Wallet(pkey, provider));

	return contract;
}

export function notifyError(message, truncate) {
	if (!message) return console.error('Unidentified error.');
	if (truncate) {
		if (typeof(message) == 'string') {
			message = message.substr(0,280) + '...';
		} else if (message?.code) {
			message = message.code + " :: " + message?.reason;
		}
	}
	console.error('Error:', message);
}

export function formatUnits(amount, decimals) {
	return ethers.utils.formatUnits(amount || 0, decimals || 18);
}

export function parseUnits(amount, decimals) {
	if (!amount || isNaN(amount)) amount = '0';
	if (typeof(amount) == 'number') amount = "" + amount;
	return ethers.utils.parseUnits(amount, decimals || 18);
}