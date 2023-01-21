let marketOrders = {}; // market => orderId => order
let triggerOrders = {}; // market => orderId => order

let executionQueue = {}; // {orderId: price}

export function setMarketOrders(orders) {
	// console.log('setMarketOrders', orders);
	// store by product id
	for (const order of orders) {
		if (!marketOrders[order.market]) marketOrders[order.market] = {};
		marketOrders[order.market][order.orderId] = order;
	}
}
export function setTriggerOrders(orders) {
	// store by product id
	for (const order of orders) {
		if (!triggerOrders[order.market]) triggerOrders[order.market] = {};
		triggerOrders[order.market][order.orderId] = order;
	}
}
export function addToExecutionQueue(order) {
	if (!executionQueue[order.orderId]) executionQueue[order.orderId] = order;
}
export function removeFromExecutionQueue(orderId) {
	delete executionQueue[orderId];
}
export function removeOrder(orderId) {
	for (const market in marketOrders) {
		if (marketOrders[market]) {
			delete marketOrders[market][orderId];
		}
	}
	for (const market in triggerOrders) {
		if (triggerOrders[market]) {
			delete triggerOrders[market][orderId];
		}
	}
	delete executionQueue[orderId];
}

export function getMarketOrders(market) {
	return Object.values(marketOrders[market] || {}) || [];
}
export function getTriggerOrders(market) {
	return Object.values(triggerOrders[market] || {}) || [];
}
export function getAllTriggerOrders() {
	return triggerOrders;
}
export function getExecutionQueue() {
	return executionQueue;
}