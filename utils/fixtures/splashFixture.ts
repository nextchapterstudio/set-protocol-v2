import { providers } from "ethers";
import { ContractTransaction, Signer } from "ethers";
import { BigNumber } from "ethers";

import {
  BasicIssuanceModule,
  Controller,
  IntegrationRegistry,
  PriceOracle,
  SetToken,
  SetTokenCreator,
  SetValuer,
  StreamingFeeModule,
  CustomOracleNavIssuanceModule,
  ProtocolViewer,
  TradeModule
} from "../contracts";
import DeployHelper from "../deploys";
import {
  ProtocolUtils,
} from "../common";
import {
  Address,
} from "../types";
import {
  MAX_UINT_256,
} from "../constants";

import { SetToken__factory } from "../../typechain/factories/SetToken__factory";
import { ExchangeIssuanceZeroEx } from "@typechain/ExchangeIssuanceZeroEx";

// Deployed ERC20 tokens on polygon mainnet
export const TokensPolygon = {
  usdc: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  weth: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
  dai: "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063",
  wbtc: "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6",
};

// Deployed SetTokenV2 ChainlinkOracleV2Adapter on polygon mainnet
export const OracleWrappersPolygon = {
  usdc_usdc: "0x6169c62e1aaE2D56a2Dc184514e8b515Ff6F1d9e",
  weth_usdc: "0x0766894369D568da332619A4368f16eF52D4C47B",
  dai_usdc: "0xf04ff1487BB27fA6A83F6276a55aE17Eb8B3C581",
  wbtc_usdc: "0x9Cfe76A718Ea75E3e8cE4FC7ad0fEf84be70919b",
};

export class SplashFixture {
  private _provider: providers.Web3Provider | providers.JsonRpcProvider;
  private _ownerAddress: Address;
  private _ownerSigner: Signer;
  private _deployer: DeployHelper;

  public feeRecipient: Address;

  public controller: Controller;
  public factory: SetTokenCreator;
  public priceOracle: PriceOracle;
  public integrationRegistry: IntegrationRegistry;
  public setValuer: SetValuer;

  public issuanceModule: BasicIssuanceModule;
  public streamingFeeModule: StreamingFeeModule;
  public navIssuanceModule: CustomOracleNavIssuanceModule;
  public exchangeIssuanceZeroEx: ExchangeIssuanceZeroEx;
  public protocolViewer: ProtocolViewer;
  public tradeModule: TradeModule;

  constructor(provider: providers.Web3Provider | providers.JsonRpcProvider, ownerAddress: Address) {
    this._provider = provider;
    this._ownerAddress = ownerAddress;
    this._ownerSigner = provider.getSigner(ownerAddress);
    this._deployer = new DeployHelper(this._ownerSigner);
  }

  public async initialize(): Promise<void> {
    // Choose an arbitrary address as fee recipient
    [, , , this.feeRecipient] = await this._provider.listAccounts();

    this.controller = await this._deployer.core.deployController(this.feeRecipient);
    this.issuanceModule = await this._deployer.modules.deployBasicIssuanceModule(this.controller.address);
    this.integrationRegistry = await this._deployer.core.deployIntegrationRegistry(this.controller.address);
    this.factory = await this._deployer.core.deploySetTokenCreator(this.controller.address);

    this.priceOracle = await this._deployer.core.deployPriceOracle(
      this.controller.address,
      TokensPolygon.usdc,
      [],
      [TokensPolygon.usdc, TokensPolygon.weth, TokensPolygon.dai, TokensPolygon.wbtc],
      [TokensPolygon.usdc, TokensPolygon.usdc, TokensPolygon.usdc, TokensPolygon.usdc],
      [
        OracleWrappersPolygon.usdc_usdc, OracleWrappersPolygon.weth_usdc, OracleWrappersPolygon.dai_usdc, OracleWrappersPolygon.wbtc_usdc
      ]
    );

    // duplicate
    // this.integrationRegistry = await this._deployer.core.deployIntegrationRegistry(this.controller.address);
    this.setValuer = await this._deployer.core.deploySetValuer(this.controller.address);
    this.streamingFeeModule = await this._deployer.modules.deployStreamingFeeModule(this.controller.address);
    this.navIssuanceModule = await this._deployer.modules.deployCustomOracleNavIssuanceModule(this.controller.address, TokensPolygon.weth);
    this.protocolViewer = await this._deployer.viewers.deployProtocolViewer();
    this.tradeModule = await this._deployer.modules.deployTradeModule(this.controller.address);

    this.exchangeIssuanceZeroEx = await this._deployer.external.deployZeroExIssuer(
      TokensPolygon.weth,
      this.controller.address,
      // 0xdef1c0ded9bec7f1a1670819833240f027b25eff is the polygon mainnet '0x: ExchangeProxy' deployment
      "0xDef1C0ded9bec7F1a1670819833240f027b25EfF",
    );

    await this.controller.initialize(
      [this.factory.address], // Factories
      [this.issuanceModule.address, this.streamingFeeModule.address, this.navIssuanceModule.address, this.tradeModule.address], // Modules
      [this.integrationRegistry.address, this.priceOracle.address, this.setValuer.address], // Resources
      [0, 1, 2]  // Resource IDs where IntegrationRegistry is 0, PriceOracle is 1, SetValuer is 2
    );

    // deploy ZeroExApiAdapter + initialize with trade module.
    // 0xdef1c0ded9bec7f1a1670819833240f027b25eff is the 0x router for polygon
    const zeroExApiAdapter = await this._deployer.adapters.deployZeroExApiAdapter("0xdef1c0ded9bec7f1a1670819833240f027b25eff", TokensPolygon.weth);
    await this.integrationRegistry.addIntegration(this.tradeModule.address, "ZeroExApiAdapterV4", zeroExApiAdapter.address);
  }

  public async createSetToken(
    components: Address[],
    units: BigNumber[],
    modules: Address[],
    manager: Address = this._ownerAddress,
    name: string = "SetToken",
    symbol: string = "SET",
  ): Promise<SetToken> {
    const txHash: ContractTransaction = await this.factory.create(
      components,
      units,
      modules,
      manager,
      name,
      symbol,
    );

    const retrievedSetAddress = await new ProtocolUtils(this._provider).getCreatedSetTokenAddress(txHash.hash);

    return new SetToken__factory(this._ownerSigner).attach(retrievedSetAddress);
  }

  public async createNonControllerEnabledSetToken(
    components: Address[],
    units: BigNumber[],
    modules: Address[],
    manager: Address = this._ownerAddress,
    name: string = "SetToken",
    symbol: string = "SET",
  ): Promise<SetToken> {
    return await this._deployer.core.deploySetToken(
      components,
      units,
      modules,
      this.controller.address,
      manager,
      name,
      symbol
    );
  }

  public async approveAndIssueSetToken(
    setToken: SetToken,
    issueQuantity: BigNumber,
    to: Address = this._ownerAddress
  ): Promise<any> {
    const positions = await setToken.getPositions();
    for (let i = 0; i < positions.length; i++) {
      const { component } = positions[i];
      const componentInstance = await this._deployer.mocks.getTokenMock(component);
      await componentInstance.approve(this.issuanceModule.address, MAX_UINT_256);
    }

    await this.issuanceModule.issue(setToken.address, issueQuantity, to);
  }
}
