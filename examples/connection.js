// THIS CODE IS EDUCATIONAL ONLY
// 
// DO NOT USE AS A BASE FOR ANY REAL APP OR PRODUCTION SYSTEM
// YOU WILL SCREW UP VERY SERIOUSLY
//
// CONSIDER YOURSELF ADVISED
//
const indy = require('indy-sdk');

/**
 * 
 * @param {*} poolHandle 
 * @param {*} did 
 * @param {*} identifiers 
 * @param {*} actor 
 * @returns 
 */
async function proverGetEntitiesFromLedger(poolHandle, did, identifiers, actor) {
    let schemas = {};
    let credDefs = {};
    let revStates = {};

    for(let referent of Object.keys(identifiers)) {
        let item = identifiers[referent];
        console.log(`\"${actor}\" -> Get Schema from Ledger`);
        let [receivedSchemaId, receivedSchema] = await getSchema(poolHandle, did, item['schema_id']);
        schemas[receivedSchemaId] = receivedSchema;

        console.log(`\"${actor}\" -> Get Claim Definition from Ledger`);
        let [receivedCredDefId, receivedCredDef] = await getCredDef(poolHandle, did, item['cred_def_id']);
        credDefs[receivedCredDefId] = receivedCredDef;

        if (item.rev_reg_seq_no) {
            // TODO Create Revocation States
        }
    }

    return [schemas, credDefs, revStates];
}

/**
 * 
 * @param {*} poolHandle 
 * @param {*} did 
 * @param {*} identifiers 
 * @param {*} actor 
 * @returns 
 */
async function verifierGetEntitiesFromLedger(poolHandle, did, identifiers, actor) {
    let schemas = {};
    let credDefs = {};
    let revRegDefs = {};
    let revRegs = {};

    for(let referent of Object.keys(identifiers)) {
        let item = identifiers[referent];
        console.log(`"${actor}" -> Get Schema from Ledger`);
        let [receivedSchemaId, receivedSchema] = await getSchema(poolHandle, did, item['schema_id']);
        schemas[receivedSchemaId] = receivedSchema;

        console.log(`"${actor}" -> Get Claim Definition from Ledger`);
        let [receivedCredDefId, receivedCredDef] = await getCredDef(poolHandle, did, item['cred_def_id']);
        credDefs[receivedCredDefId] = receivedCredDef;

        if (item.rev_reg_seq_no) {
            // TODO Get Revocation Definitions and Revocation Registries
        }
    }

    return [schemas, credDefs, revRegDefs, revRegs];
}

/**
 * 
 * @param {*} poolHandle 
 * @param {*} walletHandle 
 * @param {*} Did 
 * @param {*} schema 
 * @returns 
 */
async function sendSchema(poolHandle, walletHandle, Did, schema) {
    const schemaRequest = await indy.buildSchemaRequest(Did, schema);
    console.log("contenido del objeto schema request:")
    console.log(JSON.stringify(schemaRequest, null, 4))
    return await indy.signAndSubmitRequest(poolHandle, walletHandle, Did, schemaRequest)
}

/**
 * 
 * @param {*} poolHandle 
 * @param {*} did 
 * @param {*} schemaId 
 * @returns 
 */
async function getSchema(poolHandle, did, schemaId) {
    let getSchemaRequest = await indy.buildGetSchemaRequest(did, schemaId);
    let getSchemaResponse = await indy.submitRequest(poolHandle, getSchemaRequest);
    console.log("GET SCHEMA")
    console.log(getSchemaResponse)
    const parsed = await indy.parseGetSchemaResponse(getSchemaResponse);
    console.log("GET SCHEMA PARSED")
    console.log(parsed);
    return parsed;
}

/**
 * 
 * @param {*} poolHandle 
 * @param {*} walletHandle 
 * @param {*} did 
 * @param {*} credDef 
 * @returns 
 */
async function sendCredDef(poolHandle, walletHandle, did, credDef) {
    let credDefRequest = await indy.buildCredDefRequest(did, credDef);
    return await indy.signAndSubmitRequest(poolHandle, walletHandle, did, credDefRequest);
}

/**
 * 
 * @param {*} poolHandle 
 * @param {*} did 
 * @param {*} schemaId 
 * @returns 
 */
async function getCredDef(poolHandle, did, schemaId) {
    let getCredDefRequest = await indy.buildGetCredDefRequest(did, schemaId);
    let getCredDefResponse = await indy.submitRequest(poolHandle, getCredDefRequest);
    return await indy.parseGetCredDefResponse(getCredDefResponse);
}

/**
 * 
 * @param {*} poolHandle 
 * @param {*} walletHandle 
 * @param {*} Did 
 * @param {*} newDid 
 * @param {*} newKey 
 * @param {*} role 
 * @returns 
 */
async function sendNym(poolHandle, walletHandle, Did, newDid, newKey, role) {
    let nymRequest = await indy.buildNymRequest(Did, newDid, newKey, null, role);
    return await indy.signAndSubmitRequest(poolHandle, walletHandle, Did, nymRequest);
}

/**
 * 
 * @param {*} poolHandle 
 * @param {*} From 
 * @param {*} fromWallet 
 * @param {*} fromDid 
 * @param {*} fromToKey 
 * @param {*} to 
 * @param {*} toWallet 
 * @param {*} toFromDid 
 * @param {*} toFromKey 
 * @param {*} role 
 * @returns 
 */
async function getVerinym(poolHandle, From, fromWallet, fromDid, fromToKey, to, toWallet, toFromDid, toFromKey, role) {
    let [toDid, toKey] = await indy.createAndStoreMyDid(toWallet, {});
    let didInfoJson = JSON.stringify({
        'did': toDid,
        'verkey': toKey
    });
    let authcryptedDidInfo = await indy.cryptoAuthCrypt(toWallet, toFromKey, fromToKey, Buffer.from(didInfoJson, 'utf8'));
    let [senderVerkey, authdecryptedDidInfo] =
        await indy.cryptoAuthDecrypt(fromWallet, fromToKey, Buffer.from(authcryptedDidInfo));
    let authdecryptedDidInfoJson = JSON.parse(Buffer.from(authdecryptedDidInfo));
    let retrievedVerkey = await indy.keyForDid(poolHandle, fromWallet, toFromDid);
    if (senderVerkey !== retrievedVerkey) {
        throw Error("Verkey is not the same");
    }
    await sendNym(poolHandle, fromWallet, fromDid, authdecryptedDidInfoJson['did'], authdecryptedDidInfoJson['verkey'], role);
    return toDid;
}

module.exports = {
    proverGetEntitiesFromLedger,
    verifierGetEntitiesFromLedger,
    sendSchema,
    getSchema,
    sendCredDef,
    getCredDef,
    sendNym,
    getVerinym,
}