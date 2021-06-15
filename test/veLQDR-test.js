const Utils = require("./utils");

const { send } = require("@openzeppelin/test-helpers");
const BigNumber = require("bignumber.js");
const IERC20 = artifacts.require("IERC20");

const lqdrAddress = "0x10b620b2dbAC4Faa7D7FFD71Da486f5D44cd86f9";
const wftmAddress = "0x21be370d5312f44cb42ce377bc9b8a0cef1a4c83";

const VeLQDR = artifacts.require("veLQDR");
const FeeDistributor = artifacts.require("fee-distributor");
const FantomDistributor = artifacts.require("fantom-distributor");

describe("veLQDR token model test", function() {
  let accounts;
  let underlying, wftm;

  let underlyingWhale = "0x3cDe01De3bC9aedB7E363646C7E4B0Ae23A81d6F";
  let underlyingWhale1 = "0xa586f6F73DB2421655873b338CB27E94612Fe122";
  let fantomWhale = "0x71ae112a1842d0C719185e9b8D0CAaFA4E00789B";
  let lqdrWhale = "0x61E0841d103D77325e7743d1ff7117efE7c2C9f6";

  let governance;
  let farmer1, farmer2;

  let veLQDR, feeDistributor, fantomDistributor;

  async function setupContracts(underlying, governance) {
    veLQDR = await VeLQDR.new(underlying.address, "xLQDR", "xLQDR", "xLQDR_1.0.0", {from: governance});
    const startTime = new Date();
    console.log('start time: ', startTime.getTime());
    fantomDistributor = await FantomDistributor.new(veLQDR.address, Math.floor(startTime.getTime() / 1000), wftm.address, governance, governance, {from: governance});
    feeDistributor = await FeeDistributor.new(veLQDR.address, Math.floor(startTime.getTime() / 1000), underlying.address, governance, governance, fantomDistributor.address, {from: governance});

    await fantomDistributor.commit_admin(feeDistributor.address, {from: governance});
    await fantomDistributor.apply_admin({from: governance});

    console.log('voting escrow address: ', veLQDR.address);
    console.log('voting_escrow', await feeDistributor.voting_escrow());
    console.log('token', await feeDistributor.token());
    console.log('token_last_balance', (await feeDistributor.token_last_balance()).toString());
    console.log('last_token_time', (await feeDistributor.last_token_time()).toString());

    // feeDistributor.checkpoint_token({from: governance});
  }

  async function impersonates(targetAccounts){
    console.log("Impersonating...");
    for(i = 0; i < targetAccounts.length ; i++){
      console.log(targetAccounts[i]);
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [
          targetAccounts[i]
        ]
      });
    }
  }

  async function setupExternalContracts() {
    underlying = await IERC20.at(lqdrAddress);
    console.log("Fetching Underlying at: ", underlying.address);

    wftm = await IERC20.at(wftmAddress);
    console.log("Fetching Wrapped Fantom at: ", wftm.address);
  }

  async function setupBalance() {
    console.log('setupBalance1');
    let etherGiver = accounts[9];
    console.log('etherGiver: ', etherGiver);
    console.log('setupBalance2');

    let farmerBalance = await underlying.balanceOf(underlyingWhale);
    console.log('farmerBalance:', farmerBalance.toString());
    Utils.assertBNGt(farmerBalance, 0);
    await underlying.transfer(farmer1, farmerBalance, {from: underlyingWhale});

    farmerBalance = await underlying.balanceOf(underlyingWhale1);
    console.log('farmerBalance2:', farmerBalance.toString());
    Utils.assertBNGt(farmerBalance, 0);
    await underlying.transfer(farmer2, farmerBalance, {from: underlyingWhale1});
  }

  async function setupLqdrFeeBalance(balanceToDistribute) {
    let lqdrWhaleBalance = await underlying.balanceOf(lqdrWhale);
    console.log('lqdrWhaleBalance:', lqdrWhaleBalance.toString());
    Utils.assertBNGt(lqdrWhaleBalance, 0);

    await underlying.transfer(feeDistributor.address, balanceToDistribute, {from: lqdrWhale});
    let lqdrFeeBalance = await underlying.balanceOf(feeDistributor.address);
    console.log('lqdr balance for fee distributor:', lqdrFeeBalance.toString());
    Utils.assertBNGt(lqdrFeeBalance, 0);
  }

  async function setupFtmFeeBalance(balanceToDistribute) {
    let fantomWhaleBalance = await wftm.balanceOf(fantomWhale);
    console.log('fantomWhaleBalance:', fantomWhaleBalance.toString());
    Utils.assertBNGt(fantomWhaleBalance, 0);

    await wftm.transfer(fantomDistributor.address, balanceToDistribute, {from: fantomWhale});
    let wftmFeeBalance = await wftm.balanceOf(fantomDistributor.address);
    console.log('wftm balance for fee distributor:', wftmFeeBalance.toString());
    Utils.assertBNGt(wftmFeeBalance, 0);
  }

  async function lockLQDR(farmer, underlying, balance, unlock_time) {
    await veLQDR.create_lock(balance, unlock_time, {from: farmer});
  }

  before(async function () {
    console.log("here1");
    accounts = await web3.eth.getAccounts();
    console.log("here11", accounts);
    governance = accounts[0];

    farmer1 = accounts[1];
    farmer2 = accounts[2];

    await impersonates([underlyingWhale, underlyingWhale1, lqdrWhale, fantomWhale]);
    console.log("here2");

    await setupExternalContracts();
    console.log("here3");

    await setupContracts(underlying, governance);
    console.log("here4");

    await setupBalance();
    console.log("here5");
  });

  describe("xLQDR test pass", function () {
    it("User earns xLQDR", async function () {
      let farmerOldBalance = new BigNumber(await underlying.balanceOf(farmer1));
      console.log('farmerOldBalance: ', farmerOldBalance.toString());

      var myDate = "30-06-2022";
      myDate = myDate.split("-");
      var newDate = new Date( myDate[2], myDate[1] - 1, myDate[0]);
      console.log("timestamp: ", newDate.getTime());

      await underlying.approve(veLQDR.address, farmerOldBalance, {from: farmer1});

      await lockLQDR(farmer1, underlying, farmerOldBalance, newDate.getTime() / 1000);

      let farmerShareBalance = new BigNumber(await veLQDR.balanceOf(farmer1)).toFixed();
      console.log('farmerShareBalance: ', farmerShareBalance.toString());
    })
  })

  describe("fee distributor test pass", function () {
    it("User earns LQDR and WFANTOM", async function () {
      // lock lqdr for farmer1
      // let farmerOldBalance = new BigNumber(await underlying.balanceOf(farmer1));
      // console.log('farmerOldBalance: ', farmerOldBalance.toString());

      // var myDate = "30-06-2022";
      // myDate = myDate.split("-");
      // var newDate = new Date( myDate[2], myDate[1] - 1, myDate[0]);
      // console.log("timestamp: ", newDate.getTime());

      // await underlying.approve(veLQDR.address, farmerOldBalance, {from: farmer1});

      // await lockLQDR(farmer1, underlying, farmerOldBalance, newDate.getTime() / 1000);

      let farmerShareBalance = new BigNumber(await veLQDR.balanceOf(farmer1)).toFixed();
      console.log('farmerShareBalance: ', farmerShareBalance.toString());

      // lock lqdr for farmer2
      let farmerOldBalance2 = new BigNumber(await underlying.balanceOf(farmer2));
      console.log('farmerOldBalance2: ', farmerOldBalance2.toString());

      var myDate = "30-06-2022";
      myDate = myDate.split("-");
      var newDate = new Date( myDate[2], myDate[1] - 1, myDate[0]);
      console.log("timestamp: ", newDate.getTime());

      await underlying.approve(veLQDR.address, farmerOldBalance2, {from: farmer2});

      await lockLQDR(farmer2, underlying, farmerOldBalance2, newDate.getTime() / 1000);

      let farmerShareBalance2 = new BigNumber(await veLQDR.balanceOf(farmer2)).toFixed();
      console.log('farmerShareBalance2: ', farmerShareBalance2.toString());

      // send fees to distributors
      await setupLqdrFeeBalance("100" + "000000000000000000");
      await setupFtmFeeBalance("10" + "000000000000000000");
      // await feeDistributor.checkpoint_token({from: governance});

      // wait for more than 1 week
      // console.log(Date.now());
      console.log("before timestamp: ", (await feeDistributor.get_timestamp()).toString());
      await Utils.waitHours(24 * 20 + 10);
      await Utils.advanceNBlock((24 * 20 + 10) * 40);
      console.log("after timestamp: ", (await feeDistributor.get_timestamp()).toString());

      console.log('\n\n\n==== step 1 ====');
      console.log('voting escrow address: ', veLQDR.address);
      console.log('voting_escrow', await feeDistributor.voting_escrow());
      console.log('token', await feeDistributor.token());
      console.log('token_last_balance', (await feeDistributor.token_last_balance()).toString());
      console.log('last_token_time', (await feeDistributor.last_token_time()).toString());
      console.log('time_cursor', (await feeDistributor.time_cursor()).toString());
      console.log('can_checkpoint_token', await feeDistributor.can_checkpoint_token());

      // Distribute rewards
      // await feeDistributor.checkpoint_total_supply({from: governance});
      // await feeDistributor.checkpoint_token({from: governance});
      await feeDistributor.toggle_allow_checkpoint_token({from: governance});

      // console.log('\n\n\n==== step 2 ====');
      // console.log('voting escrow address: ', veLQDR.address);
      // console.log('voting_escrow', await feeDistributor.voting_escrow());
      // console.log('token', await feeDistributor.token());
      // console.log('token_last_balance', (await feeDistributor.token_last_balance()).toString());
      // console.log('last_token_time', (await feeDistributor.last_token_time()).toString());
      // console.log('time_cursor', (await feeDistributor.time_cursor()).toString());
      // console.log('can_checkpoint_token', await feeDistributor.can_checkpoint_token());

      // claim rewards for farmer1
      let lqdrClaimAmount, fantomClaimAmount;
      // let claimAmount;
      lqdrClaimAmount = await feeDistributor.claim({from: farmer1});
      // console.log("farmer1 claim amount: ", claimAmount);
      console.log("farmer1 lqdr claim amount: ", lqdrClaimAmount);
      // console.log("farmer1 fantom claim amount: ", fantomClaimAmount.toString());
      let farmer1LqdrBalance = await underlying.balanceOf(farmer1);
      let farmer1WftmBalance = await wftm.balanceOf(farmer1);
      console.log("farmer1LqdrBalance: ", farmer1LqdrBalance.toString());
      console.log("farmer1WftmBalance: ", farmer1WftmBalance.toString());

      // claim rewards for farmer2
      await feeDistributor.claim({from: farmer2});
      let farmer2LqdrBalance = await underlying.balanceOf(farmer2);
      let farmer2WftmBalance = await wftm.balanceOf(farmer2);
      console.log("farmer2LqdrBalance: ", farmer2LqdrBalance.toString());
      console.log("farmer2WftmBalance: ", farmer2WftmBalance.toString());
    })
  })
});