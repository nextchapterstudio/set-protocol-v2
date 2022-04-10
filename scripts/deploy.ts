import { ethers } from 'hardhat';
import { getSystemFixture } from "../utils/test/index";

// npx hardhat run --network localhost scripts/deploy.ts
async function deploy() {
    let owner = (await ethers.getSigners())[0];
    let fixture = await getSystemFixture(owner.address);
    await fixture.initialize();
}

deploy()
    .then(() => {})
    .catch((err) => console.error(err));