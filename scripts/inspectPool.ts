import { ethers } from 'hardhat';

// npx hardhat run --network localhost scripts/inspectPool.ts
async function inspect() {
    let deployoooor = (await ethers.getSigners())[0];
    let poolManager = (await ethers.getSigners())[2];
    let splashController = await ethers.getContractAt('Controller', '0x1dc4c1cefef38a777b15aa20260a54e584b16c48', poolManager);

    let poolOneAddress = await splashController.sets(1);
    let poolOneToken = await ethers.getContractAt('SetToken', poolOneAddress, poolManager);
    console.log(`pool address: ${poolOneToken.address}`);
    console.log(`pool name:  ${await poolOneToken.name()}`);
    console.log(`pool symbol:  ${await poolOneToken.symbol()}`);
    console.log(`pool components:  ${await poolOneToken.getComponents()}`);
    console.log(`pool supply:  ${await poolOneToken.totalSupply()}`);
    console.log(`pool manager:  ${await poolOneToken.manager()}`);
    console.log(`manager balance:  ${await poolOneToken.balanceOf(poolManager.address)}`);
    console.log(`deployooor balance:  ${await poolOneToken.balanceOf(deployoooor.address)}`);
    console.log(`pool positions:  ${await poolOneToken.getPositions()}`);

    // setup
    // one time per pool by the manager
    let basicIssuanceModule = await ethers.getContractAt('BasicIssuanceModule', '0x1d7022f5b17d2f8b695918fb48fa1089c9f85401', poolManager);
    await basicIssuanceModule.initialize(poolOneToken.address, ethers.constants.AddressZero);

    // issue tokens to a user
    await (basicIssuanceModule
        .connect(deployoooor))
        .issue(poolOneToken.address, 5, deployoooor.address);
}

inspect()
    .then(() => {})
    .catch((err) => console.error(err));