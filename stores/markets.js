let marketInfos = {};

export function setMarketInfo(infos) {
	marketInfos = infos;
}

export function getMarketInfos() {
	return marketInfos;
}

export function getMarketInfo(market) {
	return marketInfos[market];
}
export function getMarketAttribute(market, prop) {
	return marketInfos[market]?.[prop];
}