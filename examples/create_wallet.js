const indy = require('indy-sdk');
(async () => {
    console.log("creando wallet indy...")

    const config = {
        id: "sergio"
    };
    const credential = {
        key: "una-clave-por-defecto"
    };
    await indy.createWallet(config, credential);

    //let wh = 0;
    let wh = await indy.openWallet(config, credential);
    const [did, verkey] = await indy.createAndStoreMyDid(wh, {});
    console.log("DID: " + did);
    console.log("VERKEY: " + verkey)

})();