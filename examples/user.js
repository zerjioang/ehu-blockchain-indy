// THIS CODE IS EDUCATIONAL ONLY
// 
// DO NOT USE AS A BASE FOR ANY REAL APP OR PRODUCTION SYSTEM
// YOU WILL SCREW UP VERY SERIOUSLY
//
// CONSIDER YOURSELF ADVISED
//
const indy = require('indy-sdk');
const connection = require('./connection.js');

/**
 * 
 * @param {*} name 
 * @param {*} pass 
 * @returns 
 */
async function createWalletDid(name, pass) {
    const config = {
        id: name
    };
    const credential = {
        key: pass
    };
    try {
        await indy.createWallet(config, credential);
    } catch (err) {
        if (err.message !== "WalletAlreadyExistsError") {
            throw e;
        }
    }
    let wh = await indy.openWallet(config, credential);
    const [did, verkey] = await indy.createAndStoreMyDid(wh, {});
    console.log("DID: " + did);
    console.log("VERKEY: " + verkey)
    return { did, verkey, wh }
}

/**
 * 
 * @param {*} wh 
 * @param {*} did 
 * @param {*} poolHandle 
 * @param {*} proofRequest 
 * @param {*} masterSecretId 
 * @returns 
 */
async function buildProof(wh, did, poolHandle, proofRequest, masterSecretId) {
    console.log("HOLDER: OBTENIENDO HANDLER DE BUSQUEDA")
    let searchHandler = await indy.proverSearchCredentialsForProofReq(
        wh,
        proofRequest,
        null
    );
    console.log("HOLDER: BUSCANDO CREDENCIALES EN LA WALLET: ", searchHandler, wh)
    let credentials = undefined;
    let credForAttr1 = undefined;
    let credForAttr2 = undefined;
    let credForPredicate1 = undefined;
    try {
        credentials = await indy.proverFetchCredentialsForProofReq(searchHandler, 'attr1_referent', 10)
        credForAttr1 = credentials[0]['cred_info'];

        credentials = await indy.proverFetchCredentialsForProofReq(searchHandler, 'attr2_referent', 10)
        credForAttr2 = credentials[0]['cred_info'];

        //credentials = await indy.proverFetchCredentialsForProofReq(searchHandler, 'predicate1_referent', 10)
        //credForPredicate1 = credentials[0]['cred_info'];
        // se cierra el acceso a la busqueda
        await indy.proverCloseCredentialsSearchForProofReq(searchHandler);
    } catch (err) {
        console.error("HOLDER: FALLO INTERNO AL BUSCAR EN LA WALLET")
        console.error(JSON.stringify(err, null, 4))
        console.error(err)
    }

    console.log("HOLDER: CREDENCIALES COINCIDENTES ENCONTRADOS")
    console.log(JSON.stringify(credentials, null, 4))

    let credsForProof = {};
    credsForProof[`${credForAttr1['referent']}`] = credForAttr1;
    credsForProof[`${credForAttr2['referent']}`] = credForAttr2;
    //credsForProof[`${credForPredicate1['referent']}`] = credForPredicate1;

    console.log("HOLDER: OBTENIENDO DE LA RED LOS DATOS ADICIONALES: SCHEMA, CREDENTIAL DEFINITION")
    console.log(JSON.stringify(credsForProof, null, 4))

    // obteniedo de la red los datos necesarios
    const [schemasJson, credDefsJson, revocStatesJson] = await connection.proverGetEntitiesFromLedger(
        poolHandle,
        did,
        credsForProof,
        'HOLDER'
    );

    // se prepara el JSON en el formato que obliga indy para crear el proof
    // y se rellena con los datos obtenidos anteriormente
    let requestedCredentials = {
        'self_attested_attributes': {},
        'requested_attributes': {
            'attr1_referent': { 'cred_id': credForAttr1['referent'], 'revealed': true },
            'attr2_referent': { 'cred_id': credForAttr2['referent'], 'revealed': true }
        },
        'requested_predicates': {
            //'predicate1_referent': { 'cred_id': credForPredicate1['referent'] },
        }
    };
    console.log("HOLDER: CONSTRUYENDO PRUEBA A PARTIR DE")
    console.log(JSON.stringify(requestedCredentials, null, 4))

    // ahora le decimos a indy que construya la prueba
    let finalProofJson = {};
    try {
        finalProofJson = await indy.proverCreateProof(
            wh,
            proofRequest,
            requestedCredentials,
            masterSecretId,
            schemasJson,
            credDefsJson,
            revocStatesJson
        );
        console.log("HOLDER: PRUEBA GENERADA")
        console.log(JSON.stringify(finalProofJson, null, 4))
    } catch (err) {
        console.error("HOLDER: FALLO AL GENERAR LA PRUEBA")
        console.error(JSON.stringify(err, null, 4))
        console.error(err)
    }
    return finalProofJson;
}

module.exports = {
    createWalletDid,
    buildProof
}