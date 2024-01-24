import { seedTestWallet } from '@fuel-ts/wallet/test-utils';
import type { BN, Bech32Address, Bytes, JsonAbi, WalletLocked, WalletUnlocked } from 'fuels';
import {
  Predicate,
  bn,
  Provider,
  Address,
  arrayify,
  hexlify,
  randomBytes,
  getRandomB256,
  addressify,
  Contract,
  Wallet,
  ContractFactory,
  ZeroBytes32,
  BaseAssetId,
  FUEL_NETWORK_URL,
} from 'fuels';

import { FuelGaugeProjectsEnum, getFuelGaugeForcProject } from '../test/fixtures';

const { abiContents: callTestAbi } = getFuelGaugeForcProject(
  FuelGaugeProjectsEnum.CALL_TEST_CONTRACT
);

const { binHexlified: liquidityPoolContractBytecode, abiContents: liquidityPoolABI } =
  getFuelGaugeForcProject(FuelGaugeProjectsEnum.LIQUIDITY_POOL);

const { binHexlified: predicateTriple } = getFuelGaugeForcProject(
  FuelGaugeProjectsEnum.PREDICATE_TRIPLE_SIG
);

const { binHexlified: testPredicateTrue } = getFuelGaugeForcProject(
  FuelGaugeProjectsEnum.PREDICATE_TRUE
);

const { binHexlified: tokenContractBytecode, abiContents: tokenContractABI } =
  getFuelGaugeForcProject(FuelGaugeProjectsEnum.TOKEN_CONTRACT);

const PUBLIC_KEY =
  '0x2f34bc0df4db0ec391792cedb05768832b49b1aa3a2dd8c30054d1af00f67d00b74b7acbbf3087c8e0b1a4c343db50aa471d21f278ff5ce09f07795d541fb47e';

const ADDRESS_B256 = '0xf1e92c42b90934aa6372e30bc568a326f6e66a1a0288595e6e3fbd392a4f3e6e';

const ADDRESS_BECH32: Bech32Address =
  'fuel1785jcs4epy625cmjuv9u269rymmwv6s6q2y9jhnw877nj2j08ehqce3rxf';

const ADDRESS_BYTES = new Uint8Array([
  241, 233, 44, 66, 185, 9, 52, 170, 99, 114, 227, 11, 197, 104, 163, 38, 246, 230, 106, 26, 2, 136,
  89, 94, 110, 63, 189, 57, 42, 79, 62, 110,
]);

describe('Doc Examples', () => {
  let gasPrice: BN;

  beforeAll(async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);
    ({ minGasPrice: gasPrice } = provider.getGasConfig());
  });
  test('it has an Address class using bech32Address', () => {
    const address = new Address(ADDRESS_BECH32);

    expect(address.toB256()).toEqual(ADDRESS_B256);
    expect(address.toBytes()).toEqual(ADDRESS_BYTES);
    expect(address.toHexString()).toEqual(ADDRESS_B256);
  });

  test('it has an Address class using public key', () => {
    const address = Address.fromPublicKey(PUBLIC_KEY);

    expect(address.toAddress()).toEqual(ADDRESS_BECH32);
    expect(address.toB256()).toEqual(ADDRESS_B256);
  });

  test('it has an Address class using b256Address', () => {
    const address = Address.fromB256(ADDRESS_B256);

    expect(address.toAddress()).toEqual(ADDRESS_BECH32);
    expect(address.toB256()).toEqual(ADDRESS_B256);
  });

  test('it has Address tools', () => {
    // you can make a random address - useful for testing
    const address = Address.fromRandom();

    // you can it has a new Address from an ambiguous source that may be a Bech32 or B256 address
    const addressCloneFromBech = Address.fromString(address.toString());
    const addressCloneFromB256 = Address.fromString(address.toB256());

    // if you aren't sure where the address comes from, use fromDynamicInput
    const dataFromInput: string =
      '0xf1e92c42b90934aa6372e30bc568a326f6e66a1a0288595e6e3fbd392a4f3e6e';
    // if the input string can't be resolved this will throw an error
    const someAddress = Address.fromDynamicInput(dataFromInput);

    // you can verify equality using the helper functions
    expect(address.equals(addressCloneFromBech)).toBeTruthy();
    expect(addressCloneFromBech.toString()).toEqual(addressCloneFromB256.toString());
    expect(someAddress).toBeTruthy();
  });

  test('it has Bytes tools', () => {
    const random32Bytes: Bytes = randomBytes(32);
    const random32BytesString: string = hexlify(random32Bytes);
    const zeroed32Bytes: string = ZeroBytes32;

    expect(arrayify(random32Bytes)).toEqual(arrayify(random32BytesString));

    expect(zeroed32Bytes).toEqual(hexlify(zeroed32Bytes));
  });

  test('it has b256 tools', () => {
    const randomB256Bytes: Bytes = randomBytes(32);
    const randomB256: string = getRandomB256();

    const hexedB256: string = hexlify(randomB256Bytes);

    expect(arrayify(randomB256Bytes)).toEqual(arrayify(hexedB256));

    expect(randomB256).toEqual(hexlify(randomB256));
  });

  test('it has conversion tools', async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);

    const assetId: string = ZeroBytes32;
    const randomB256Bytes: Bytes = randomBytes(32);
    const hexedB256: string = hexlify(randomB256Bytes);
    const address = Address.fromB256(hexedB256);
    const arrayB256: Uint8Array = arrayify(randomB256Bytes);
    const walletLike: WalletLocked = Wallet.fromAddress(address, provider);
    const contractLike: Contract = new Contract(address, callTestAbi, provider);

    expect(address.equals(addressify(walletLike) as Address)).toBeTruthy();
    expect(address.equals(contractLike.id as Address)).toBeTruthy();
    expect(address.toBytes()).toEqual(arrayB256);
    expect(address.toB256()).toEqual(hexedB256);
    expect(arrayify(address.toB256())).toEqual(arrayB256);

    expect(arrayify(assetId)).toEqual(arrayify(Address.fromB256(assetId).toB256()));
  });

  it('can create a predicate', async () => {
    // #region predicate-basic
    // #context import { Predicate, arrayify, FUEL_NETWORK_URL } from 'fuels';
    const provider = await Provider.create(FUEL_NETWORK_URL);
    const predicate = new Predicate(testPredicateTrue, provider);

    expect(predicate.address).toBeTruthy();
    expect(predicate.bytes).toEqual(arrayify(testPredicateTrue));
    // #endregion predicate-basic
  });

  it('can create a predicate and use', async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);
    // Setup a private key
    const PRIVATE_KEY_1 = '0x862512a2363db2b3a375c0d4bbbd27172180d89f23f2e259bac850ab02619301';
    const PRIVATE_KEY_2 = '0x37fa81c84ccd547c30c176b118d5cb892bdb113e8e80141f266519422ef9eefd';
    const PRIVATE_KEY_3 = '0x976e5c3fa620092c718d852ca703b6da9e3075b9f2ecb8ed42d9f746bf26aafb';

    // Create the wallets, passing provider
    const wallet1: WalletUnlocked = Wallet.fromPrivateKey(PRIVATE_KEY_1, provider);
    const wallet2: WalletUnlocked = Wallet.fromPrivateKey(PRIVATE_KEY_2, provider);
    const wallet3: WalletUnlocked = Wallet.fromPrivateKey(PRIVATE_KEY_3, provider);
    const receiver = Wallet.generate({ provider });

    await seedTestWallet(wallet1, [{ assetId: BaseAssetId, amount: bn(1_000_000) }]);
    await seedTestWallet(wallet2, [{ assetId: BaseAssetId, amount: bn(2_000_000) }]);
    await seedTestWallet(wallet3, [{ assetId: BaseAssetId, amount: bn(300_000) }]);

    const AbiInputs: JsonAbi = {
      types: [
        {
          typeId: 0,
          type: 'bool',
          components: null,
          typeParameters: null,
        },
        {
          typeId: 1,
          type: 'struct B512',
          components: null,
          typeParameters: null,
        },
        {
          typeId: 2,
          type: '[_; 3]',
          components: [
            {
              name: '__array_element',
              type: 1,
              typeArguments: null,
            },
          ],

          typeParameters: null,
        },
      ],
      functions: [
        {
          inputs: [
            {
              name: 'data',
              type: 2,
              typeArguments: null,
            },
          ],
          name: 'main',
          output: {
            name: '',
            type: 0,
            typeArguments: null,
          },
          attributes: null,
        },
      ],
      loggedTypes: [],
      configurables: [],
    };
    const predicate = new Predicate(predicateTriple, provider, AbiInputs);
    const amountToPredicate = 600_000;
    const amountToReceiver = 100;
    const initialPredicateBalance = await predicate.getBalance();

    const response = await wallet1.transfer(predicate.address, amountToPredicate, BaseAssetId, {
      gasPrice,
      gasLimit: 10_000,
    });
    await response.waitForResult();
    const predicateBalance = await predicate.getBalance();

    // assert that predicate address now has the expected amount to predicate
    expect(bn(predicateBalance)).toEqual(initialPredicateBalance.add(amountToPredicate));

    const depositOnPredicate = await wallet1.transfer(predicate.address, 1000, BaseAssetId, {
      gasPrice,
      gasLimit: 10_000,
    });
    // Wait for Transaction to succeed
    await depositOnPredicate.waitForResult();
    const updatedPredicateBalance = await predicate.getBalance();

    // assert that predicate address now has the updated expected amount to predicate
    expect(bn(updatedPredicateBalance)).toEqual(
      initialPredicateBalance.add(amountToPredicate).add(1000)
    );

    const dataToSign = '0x0000000000000000000000000000000000000000000000000000000000000000';
    const signature1 = await wallet1.signMessage(dataToSign);
    const signature2 = await wallet2.signMessage(dataToSign);
    const signature3 = await wallet3.signMessage(dataToSign);

    const signatures = [signature1, signature2, signature3];

    const tx = await predicate
      .setData(signatures)
      .transfer(receiver.address, amountToReceiver, BaseAssetId, { gasPrice, gasLimit: 10_000 });
    await tx.waitForResult();

    // check balances
    const finalPredicateBalance = await predicate.getBalance();
    const receiverBalance = await receiver.getBalance();

    // assert that predicate address now has a zero balance
    expect(bn(initialPredicateBalance).lte(finalPredicateBalance)).toBeTruthy();
    // assert that predicate funds now belong to the receiver
    expect(bn(receiverBalance).gte(bn(amountToReceiver))).toBeTruthy();
  });

  test.skip('deposit and withdraw cookbook guide', async () => {
    // #region deposit-and-withdraw-cookbook-wallet-setup
    const provider = await Provider.create(FUEL_NETWORK_URL);
    const PRIVATE_KEY = '0x862512a2363db2b3a375c0d4bbbd27172180d89f23f2e259bac850ab02619301';
    const wallet = Wallet.fromPrivateKey(PRIVATE_KEY, provider);
    await seedTestWallet(wallet, [{ assetId: BaseAssetId, amount: bn(100_000) }]);
    // #endregion deposit-and-withdraw-cookbook-wallet-setup

    // #region deposit-and-withdraw-cookbook-contract-deployments
    const tokenContractFactory = new ContractFactory(
      tokenContractBytecode,
      tokenContractABI,
      wallet
    );
    const tokenContract = await tokenContractFactory.deployContract({ gasPrice });
    const tokenContractID = tokenContract.id;

    const liquidityPoolContractFactory = new ContractFactory(
      liquidityPoolContractBytecode,
      liquidityPoolABI,
      wallet
    );
    const liquidityPoolContract = await liquidityPoolContractFactory.deployContract({ gasPrice });
    const liquidityPoolContractID = liquidityPoolContract.id;
    await liquidityPoolContract.functions.set_base_token(tokenContractID).call();
    // #endregion deposit-and-withdraw-cookbook-contract-deployments

    // mint some base tokens to the current wallet
    // #region deposit-and-withdraw-cookbook-mint-and-transfer
    await tokenContract.functions.mint_coins(500, 1).call();
    await tokenContract.functions
      .transfer_coins_to_output(
        200,
        {
          value: tokenContract.id,
        },
        {
          value: wallet.address.toB256(),
        }
      )
      .txParams({
        variableOutputs: 1,
        gasPrice,
      })
      .call();
    // #endregion deposit-and-withdraw-cookbook-mint-and-transfer

    // deposit base tokens into the liquidity pool
    // #region deposit-and-withdraw-cookbook-deposit
    await liquidityPoolContract.functions
      .deposit({
        value: wallet.address.toB256(),
      })
      .callParams({
        forward: {
          amount: bn(100),
          assetId: tokenContractID.toB256(),
        },
      })
      .call();
    // #endregion deposit-and-withdraw-cookbook-deposit

    // verify balances
    expect(await wallet.getBalance(tokenContractID.toB256())).toEqual(bn(100));
    expect(await wallet.getBalance(liquidityPoolContractID.toB256())).toEqual(bn(200));

    // withdraw base tokens from the liquidity pool
    // #region deposit-and-withdraw-cookbook-withdraw
    const lpTokenBalance = await wallet.getBalance(liquidityPoolContractID.toB256());
    await liquidityPoolContract.functions
      .withdraw({
        value: wallet.address.toB256(),
      })
      .callParams({
        forward: {
          amount: lpTokenBalance,
          assetId: liquidityPoolContractID.toB256(),
        },
      })
      .call();
    // #endregion deposit-and-withdraw-cookbook-withdraw

    // verify balances again
    expect(await wallet.getBalance(tokenContractID.toB256())).toEqual(bn(200));
    expect(await wallet.getBalance(liquidityPoolContractID.toB256())).toEqual(bn(0));
  });
});
