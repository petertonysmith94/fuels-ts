import { generateTestWallet } from '@fuel-ts/wallet/test-utils';
import type { BigNumberish, CoinQuantity, WalletLocked } from 'fuels';
import {
  bn,
  Provider,
  hashMessage,
  Wallet,
  WalletUnlocked,
  Signer,
  BaseAssetId,
  FUEL_NETWORK_URL,
} from 'fuels';

describe('Doc Examples', () => {
  test('it can work with wallets', async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);
    // #region wallets
    // #context import { Wallet, WalletLocked, WalletUnlocked } from 'fuels';

    // use the `generate` helper to make an Unlocked Wallet
    const myWallet: WalletUnlocked = Wallet.generate({
      provider,
    });

    // or use an Address to create a wallet
    const someWallet: WalletLocked = Wallet.fromAddress(myWallet.address, provider);
    // #endregion wallets

    const PRIVATE_KEY = myWallet.privateKey;

    // #region wallet-locked-to-unlocked
    const lockedWallet: WalletLocked = Wallet.fromAddress(myWallet.address, provider);
    // #region wallet-from-private-key
    // unlock an existing wallet
    let unlockedWallet: WalletUnlocked = lockedWallet.unlock(PRIVATE_KEY);
    // or directly from a private key
    unlockedWallet = Wallet.fromPrivateKey(PRIVATE_KEY, provider);
    // #endregion wallet-locked-to-unlocked
    // #endregion wallet-from-private-key

    // #region wallet-unlocked-to-locked
    const newlyLockedWallet = unlockedWallet.lock();
    // #endregion wallet-unlocked-to-locked

    // #region wallet-check-balance
    // #context import { Wallet, WalletUnlocked, BigNumberish} from 'fuels';
    const balance: BigNumberish = await myWallet.getBalance(BaseAssetId);
    // #endregion wallet-check-balance

    // #region wallet-check-balances
    // #context import { Wallet, WalletUnlocked, CoinQuantity} from 'fuels';
    const balances: CoinQuantity[] = await myWallet.getBalances();
    // #endregion wallet-check-balances

    expect(newlyLockedWallet.address).toEqual(someWallet.address);
    expect(balance).toBeTruthy();
    expect(balances.length).toEqual(0);
  });

  it('it can work sign messages with wallets', async () => {
    const provider = await Provider.create(FUEL_NETWORK_URL);
    // #region wallet-message-signing
    // #context import { WalletUnlocked, hashMessage, Signer} from 'fuels';
    const wallet = WalletUnlocked.generate({
      provider,
    });
    const message = 'doc-test-message';
    const signedMessage = await wallet.signMessage(message);
    const hashedMessage = hashMessage(message);
    const recoveredAddress = Signer.recoverAddress(hashedMessage, signedMessage);

    expect(wallet.privateKey).toBeTruthy();
    expect(wallet.publicKey).toBeTruthy();
    expect(wallet.address).toEqual(recoveredAddress);
    // #endregion wallet-message-signing
  });

  it('can create wallets', async () => {
    // #region wallet-setup
    // #context import { Provider, bn, FUEL_NETWORK_URL } from 'fuels';
    // #context import { generateTestWallet } from '@fuel-ts/wallet/test-utils';
    const provider = await Provider.create(FUEL_NETWORK_URL);
    const assetIdA = '0x0101010101010101010101010101010101010101010101010101010101010101';
    const assetIdB = '0x0202020202020202020202020202020202020202020202020202020202020202';

    // single asset
    const walletA = await generateTestWallet(provider, [[42, BaseAssetId]]);

    // multiple assets
    const walletB = await generateTestWallet(provider, [
      // [Amount, AssetId]
      [100, assetIdA],
      [200, assetIdB],
      [30, BaseAssetId],
    ]);

    // this wallet has no assets
    const walletC = await generateTestWallet(provider);

    // retrieve balances of wallets
    const walletABalances = await walletA.getBalances();
    const walletBBalances = await walletB.getBalances();
    const walletCBalances = await walletC.getBalances();

    // validate balances
    expect(walletABalances).toEqual([{ assetId: BaseAssetId, amount: bn(42) }]);
    expect(walletBBalances).toEqual([
      { assetId: BaseAssetId, amount: bn(30) },
      { assetId: assetIdA, amount: bn(100) },
      { assetId: assetIdB, amount: bn(200) },
    ]);
    expect(walletCBalances).toEqual([]);
    // #endregion wallet-setup
  });

  it('can connect to testnet', async () => {
    // #region provider-testnet
    // #context import { Provider, WalletUnlocked } from 'fuels';
    const provider = await Provider.create('https://beta-5.fuel.network/graphql');
    // Setup a private key
    const PRIVATE_KEY = 'a1447cd75accc6b71a976fd3401a1f6ce318d27ba660b0315ee6ac347bf39568';

    // Create the wallet, passing provider
    const wallet: WalletUnlocked = Wallet.fromPrivateKey(PRIVATE_KEY, provider);

    // #region signer-address
    const signer = new Signer(PRIVATE_KEY);
    // validate address
    expect(wallet.address).toEqual(signer.address);
    // #endregion provider-testnet
    // #endregion signer-address
  });

  it('can connect to a local provider', async () => {
    // #region provider-local
    // #context import { Provider, WalletUnlocked, FUEL_NETWORK_URL } from 'fuels';
    const localProvider = await Provider.create(FUEL_NETWORK_URL);
    // Setup a private key
    const PRIVATE_KEY = 'a1447cd75accc6b71a976fd3401a1f6ce318d27ba660b0315ee6ac347bf39568';

    // Create the wallet, passing provider
    const wallet: WalletUnlocked = Wallet.fromPrivateKey(PRIVATE_KEY, localProvider);

    const signer = new Signer(PRIVATE_KEY);
    // validate address
    expect(wallet.address).toEqual(signer.address);
    // #endregion provider-local
  });

  it('can query address with wallets', async () => {
    // #region wallet-query
    // #context import { Provider, FUEL_NETWORK_URL } from 'fuels';
    // #context import { generateTestWallet } from '@fuel-ts/wallet/test-utils';
    const provider = await Provider.create(FUEL_NETWORK_URL);
    const assetIdA = '0x0101010101010101010101010101010101010101010101010101010101010101';

    const wallet = await generateTestWallet(provider, [
      [42, BaseAssetId],
      [100, assetIdA],
    ]);

    // get single coin
    const coin = await wallet.getCoins(BaseAssetId);

    // get all coins
    const coins = await wallet.getCoins();

    expect(coin.length).toEqual(1);
    expect(coin).toEqual([
      expect.objectContaining({
        assetId: BaseAssetId,
        amount: bn(42),
      }),
    ]);
    expect(coins).toEqual([
      expect.objectContaining({
        assetId: BaseAssetId,
        amount: bn(42),
      }),
      expect.objectContaining({
        assetId: assetIdA,
        amount: bn(100),
      }),
    ]);
    // #endregion wallet-query

    // #region wallet-get-balances
    const walletBalances = await wallet.getBalances();
    expect(walletBalances).toEqual([
      { assetId: BaseAssetId, amount: bn(42) },
      { assetId: assetIdA, amount: bn(100) },
    ]);
    // #endregion wallet-get-balances

    // #region wallet-get-spendable-resources
    const spendableResources = await wallet.getResourcesToSpend([
      { amount: 32, assetId: BaseAssetId, max: 42 },
      { amount: 50, assetId: assetIdA },
    ]);
    expect(spendableResources[0].amount).toEqual(bn(42));
    expect(spendableResources[1].amount).toEqual(bn(100));
    // #endregion wallet-get-spendable-resources
  });
});
