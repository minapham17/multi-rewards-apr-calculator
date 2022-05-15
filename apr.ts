import { UZV2Staking__factory } from "@unizen-io/unizen-dmas/dist/typechain/factories/UZV2Staking__factory";
import { BigNumber, toBigNumber } from "./utils/bignumber";
import { NullAddress } from "./utils/constants";
import { Context } from "./utils/context";
import { ethers } from "ethers";
import { seconds, unix } from "./utils/time";

// MEMO: https://github.com/yearn/yearn-data/blob/92e604765e617aa20bcd4fc830e6197408563995/lib/protocols/curve/apy.ts#L54
const SecondsInYear = new BigNumber(seconds("1 year"));
const EthConstant = 1e18;

// Polygon Infura RPC
const polygonProvider = new ethers.providers.JsonRpcProvider(
	`https://polygon-mainnet.infura.io/v3/7571afdbb47944d3ac05c707a41b1032`
);

const ctx = new Context({ provider: polygonProvider });
// pStaking contract on Polygon PRODUCTION_DMAS_ADDRESSES.pStaking
const STAKING_CONTRACT = "0x078f188810ad3F2506a4FD76a982F281f4df15F2";
export async function calculateMultiRewards() {
	// You can take a look at other __factory.connect call in our unizen-exchange repo
	// ctx.provider will be signer in unizen-exchange repo
	// multiRewards contract
	const multiRewards = UZV2Staking__factory.connect(
		STAKING_CONTRACT,
		ctx.provider
	);
	let i = 0;
	let tokenRewardsApr = new BigNumber(0);
	let rewardTokenAddress: string;
	try {
		rewardTokenAddress = await multiRewards.rewardTokens(0);
	} catch (err) {
		return tokenRewardsApr;
	}
	const stakingRewardsTotalSupply = await multiRewards
		.totalSupply()
		.then((val) => toBigNumber(val))
		.catch(() => toBigNumber(0));
	while (rewardTokenAddress !== NullAddress) {
		try {
			rewardTokenAddress = await multiRewards.rewardTokens(i++);
			if (rewardTokenAddress === NullAddress) break;
			const rewardData = await multiRewards.rewardData(
				rewardTokenAddress
			);
			if (rewardData.periodFinish.lt(unix())) {
				continue;
			}

			const stakingRewardsRate = await multiRewards
				.rewardData(rewardTokenAddress)
				.then((val) => toBigNumber(val.rewardRate).div(EthConstant))
				.catch(() => 0);
			// Here: instead of hardcode price
			// You should fetch the token price based on the rewardTokenAddress
			// You can use our API to fetch rewardTokenAddress price
			const prices = [0, 0.408, 0.04, 0.05];
			// priceOfRewardAsset will be the price of the rewardTokenAddress
			const priceOfRewardAsset = prices[i];

			const tokenRewardApr = SecondsInYear.times(stakingRewardsRate)
				.times(priceOfRewardAsset)
				// 0.58 is ZCX price, you have to fetch zcx price from our API instead of hardcode here
				.div(stakingRewardsTotalSupply.times(0.58).div(EthConstant));
			tokenRewardsApr = tokenRewardsApr.plus(tokenRewardApr);
		} catch {
			break;
		}
	}
	return tokenRewardsApr.toNumber() * 100;
}
