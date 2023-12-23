import * as dotenv from 'dotenv'
dotenv.config()

// use alchemy as the main network source everywhere, even regular rpc requests
export const NETWORKS = [
	"https://mainnet.base.org",
	"https://base-mainnet.public.blastapi.io"
];

export const BPS_DIVIDER = 10000;

export const PYTH_PRICE_SERVICE = "https://hermes.pyth.network";

export const DATASTORE = process.env.DATASTORE;

export const USDC = process.env.USDC;

export const POLL_REQUEST_TIMEOUT = 4000;

export const MAX_ITEMS_PER_FETCH = 1000;

const orderTuple = `tuple(
	uint256 orderId,
	address user,
	address asset,
	string market,
	uint256 margin,
	uint256 size,
	uint256 price,
	uint256 fee,
	bool isLong,
	uint8 orderType,
	bool isReduceOnly,
	uint256 timestamp,
	uint256 expiry,
	uint256 cancelOrderId
)`;

export const ABIS = {
	"DataStore": [
		`function getAddress(string key) view returns(address)`
	],
	"Pyth": [
		`function getUpdateFee(bytes[] calldata updateData) external view returns (uint256 feeAmount)`
	],
	"Funding": [
		`event FundingUpdated(
        address indexed asset,
        string market,
        int256 fundingTracker,
	    int256 fundingIncrement
    )`
	],
	"FundingStore": [
		`function getFundingTrackers(
		address[] calldata assets,
		string[] calldata markets 
	) external view returns(int256[] memory fts)`
	],
	"Orders": [

	],
	"OrderStore": [
		`function getMarketOrderCount() view returns(uint256)`,
		`function getMarketOrders(uint256 length) view returns(${orderTuple}[])`,
		`function getTriggerOrderCount() view returns(uint256)`,
		`function getTriggerOrders(uint256 length, uint256 offset) view returns(${orderTuple}[])`
	],
	"Pool": [
		`function setGlobalUPLs(address[] assets, int256[] upls)`
	],
	"Positions": [

	],
	"PositionStore": [
		`function getPositionCount() view returns(uint256)`,
		`function getPositions(uint256 length, uint256 offset) view returns(tuple(
			address user,
			address asset,
			string market,
			bool isLong,
			uint256 size,
			uint256 margin,
			int256 fundingTracker,
			uint256 price,
			uint256 timestamp
		)[])`
	],
	"Processor": [
		`function executeOrders(uint256[] orderIds, bytes[] calldata priceUpdateData) payable`,
		`function liquidatePositions(address[] users, address[] assets, string[] markets, bytes[] calldata priceUpdateData) payable`,
	],
	"MarketStore": [
		`function getMarketList() external view returns(string[] memory)`,
    	`function getMany(string[] _markets) view returns(tuple(
    		string name,
    		string category,
    		address chainlinkFeed,
    		uint256 maxLeverage,
    		uint256 maxDeviation,
    		uint256 fee,
    		uint256 liqThreshold,
    		uint256 fundingFactor,
    		uint256 minOrderAge,
    		uint256 pythMaxAge,
    		bytes32 pythFeed,
    		bool allowChainlinkExecution,
    		bool isClosed,
    		bool isReduceOnly
    	)[])`
	]
}