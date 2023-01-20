let positions = {}; // market => key => position
let liquidationQueue = {}; // {position key: price}
let fundingTrackers = {}; // key (asset||market) => ft

function positionKey(user, market, asset) {
	return `${user}||${market}||${asset}`;
}

export function setPositions(_positions) {
	// store by product id
	positions = {};
	for (const position of _positions) {
		if (!positions[position.market]) positions[position.market] = {};
		positions[position.market][positionKey(position.user, position.market, position.asset)] = position;
	}
}
export function addToLiquidationQueue(user, asset, market) {
	const key = positionKey(user, market, asset);
	if (!liquidationQueue[key]) liquidationQueue[key] = market;
}
export function removeFromLiquidationQueue(key) {
	delete liquidationQueue[key];
}
export function removePosition(key) {
	const keyParts = key.split('||');
	const market = keyParts[1];
	delete positions[market][key];
	delete liquidationQueue[key];
}
export function setFundingTrackers(_fts) {
	fundingTrackers = _fts;
}

export function getAllPositions() {
	return positions;
}
export function getPositions(market) {
	return Object.values(positions[market] || {}) || [];
}
export function getLiquidationQueue() {
	return liquidationQueue;
}
export function getFundingTracker(asset, market) {
	return fundingTrackers[`${asset}||${market}`];
}