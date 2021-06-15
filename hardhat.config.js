require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-truffle5");
require("@nomiclabs/hardhat-vyper");
require("hardhat-gas-reporter");

const keys = require('./dev-keys.json');

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 250,
      forking: {
        url: "https://rpcapi.fantom.network/",
        blockNumber: 9687032        , // <-- edit here
      }
    }
  },
  solidity: {
    compilers: [
      {version: "0.7.3"},
    ]
  },
  mocha: {
    timeout: 20000000
  },
  gasReporter: {
    enabled: (process.env.REPORT_GAS) ? true : false,
    currency: 'USD'
  },
  vyper: {
    version: "0.2.7",
  }
};
