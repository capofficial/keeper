import { NETWORKS } from '../lib/config.js'

let currentNetworkId = 0;

export function getNetworkId() {
	return currentNetworkId;
}

export function incrementNetworkId() {
	if (currentNetworkId + 1 >= NETWORKS.length) {
		currentNetworkId = 0
	} else {
		currentNetworkId++;
	}
}