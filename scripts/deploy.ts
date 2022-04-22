import { ethers } from 'hardhat';
import { Address } from '../utils/types';
import { getSplashFixture } from '../utils/test/index';

// npx hardhat run --network localhost scripts/deploy.ts
async function deploy() {
    let owner = (await ethers.getSigners())[0];
    let fixture = await getSplashFixture(owner.address);
    await fixture.initialize();
}

deploy()
    .then(() => {})
    .catch((err) => console.error(err));