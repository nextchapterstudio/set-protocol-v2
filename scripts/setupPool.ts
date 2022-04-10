import { ethers } from 'hardhat';
import { ether } from '../utils';
import { getRandomAddress } from '../utils/common';

// npx hardhat run --network localhost scripts/setupPool.ts
async function setup() {
    let poolManager = (await ethers.getSigners())[1];
    let poolManager2 = (await ethers.getSigners())[2];
    // Contract deployment: SetTokenCreator
    // Contract address:    0x8d61158a366019ac78db4149d75fff9dda51160d
    let setTokenCreator = await ethers.getContractAt('SetTokenCreator', '0x8d61158a366019ac78db4149d75fff9dda51160d', poolManager);
    let basicIssuanceModule = await ethers.getContractAt('BasicIssuanceModule', '0x1d7022f5b17d2f8b695918fb48fa1089c9f85401', poolManager);
    
    let firstComponent = await ethers.getContractAt('StandardTokenMock', '0x0b1ba0af832d7c05fd64161e0db78e85978e8082', poolManager);
    let secondComponent = await ethers.getContractAt('StandardTokenMock', '0x48bacb9266a570d521063ef5dd96e61686dbe788', poolManager);
    let components = [firstComponent.address, secondComponent.address];
    let units = [ether(1), ether(2)];
    let modules = [basicIssuanceModule.address];

    await setTokenCreator.create(
        components,
        units,
        modules,
        poolManager2.address,
        'Splash Pool Two',
        'SPT'
    );
}

setup()
    .then(() => {})
    .catch((err) => console.error(err));