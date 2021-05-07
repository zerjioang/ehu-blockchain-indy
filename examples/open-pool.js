const indy = require('indy-sdk');
const util = require('./util.js');

(async () => {
    console.log("conectando con indy...")

    const poolName = 'pool1';
    console.log(`Open Pool Ledger: ${poolName}`);

    const poolGenesisTxnPath = await util.getPoolGenesisTxnPath(poolName);
    const poolConfig = {
        "genesis_txn": poolGenesisTxnPath
    };

    try {
        await indy.createPoolLedgerConfig(poolName, poolConfig);
    } catch(e) {
    	console.error(e)
        if(e.message !== "PoolLedgerConfigAlreadyExistsError") {
            throw e;
        }
    }

    await indy.setProtocolVersion(2)

    const poolHandle = await indy.openPoolLedger(poolName);
})();