import type { NextPage } from "next";
import styles from "../styles/Home.module.css";
import { calculateRewards } from "../apr";
const Home: NextPage = () => {
	const apr = calculateRewards();
	return (
		<div className={styles.container}>
			<a>APR</a>
		</div>
	);
};

export default Home;
