import { UZV2Staking__factory } from "@unizen-io/unizen-dmas/dist/typechain/factories/UZV2Staking__factory";
import { BigNumber, toBigNumber } from "./utils/bignumber";
import { NullAddress } from "./utils/constants";
import { Context } from "./utils/context";
import { ethers } from "ethers";
import { seconds, unix } from "./utils/time";

const SecondsInYear = new BigNumber(seconds("1 year"));

const polygonProvider = new ethers.providers.JsonRpcProvider(
	`https://polygon-mainnet.infura.io/v3/7571afdbb47944d3ac05c707a41b1032`
);
const EthConstant = 1e18;

const ctx = new Context({ provider: polygonProvider });
const STAKING_CONTRACT = "0x078f188810ad3F2506a4FD76a982F281f4df15F2";
export async function calculateMultiRewards() {
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
			const prices = [0, 0.408, 0.04, 0.05];
			const priceOfRewardAsset = prices[i];

			const tokenRewardApr = SecondsInYear.times(stakingRewardsRate)
				.times(priceOfRewardAsset)
				.div(stakingRewardsTotalSupply.times(0.58).div(EthConstant));
			tokenRewardsApr = tokenRewardsApr.plus(tokenRewardApr);
		} catch {
			break;
		}
	}
	return tokenRewardsApr.toNumber() * 100;
}

export async function calculateRewards() {
	const stakingRewards = UZV2Staking__factory.connect(
		STAKING_CONTRACT,
		ctx.provider
	);

	let periodFinish: BigNumber;
	try {
		periodFinish = await stakingRewards.periodFinish().then(toBigNumber);
	} catch {
		// ... then it's a multi-reward contract
		return await calculateMultiRewards();
	}
}
