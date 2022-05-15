import type { NextPage } from "next";
import styles from "../styles/Home.module.css";
import { calculateMultiRewards } from "../apr";
const Home: NextPage = () => {
	const apr = calculateMultiRewards();
	return (
		<div className={styles.container}>
			<a>APR</a>
		</div>
	);
};

export default Home;
