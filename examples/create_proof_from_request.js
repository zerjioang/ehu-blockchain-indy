const indy = require('indy-sdk');
const util = require('./util.js');

// para limpiar los ficheros que crea indy en el ordenador
// rm -rf $HOME/.indy_client/ /tmp/indy

// para ejecutar el contenedor con la red de ejemplo
// docker run --rm -itd -p 9701-9708:9701-9708 indy-node:latest

// nos metemos dentro del contenedor
// docker exec -it 44ce0a8074ca bash

// carpetas de interes
// ls /etc/indy/
// ls /var/lib/indy/sandbox

// la localizacion del fichero genesis es
// /var/lib/indy/sandbox/pool_transactions_genesis

async function getSchema(poolHandle, did, schemaId) {
    let getSchemaRequest = await indy.buildGetSchemaRequest(did, schemaId);
    let getSchemaResponse = await indy.submitRequest(poolHandle, getSchemaRequest);
    return await indy.parseGetSchemaResponse(getSchemaResponse);
}

async function getCredDef(poolHandle, did, schemaId) {
    let getCredDefRequest = await indy.buildGetCredDefRequest(did, schemaId);
    let getCredDefResponse = await indy.submitRequest(poolHandle, getCredDefRequest);
    return await indy.parseGetCredDefResponse(getCredDefResponse);
}

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

// RUST_BACKTRACE=1 node create_proof_from_request.js
(async () => {
    // activamos el modo debug para tener más información de los errores que ocurran
    //indy.setRuntimeConfig({ collect_backtrace: true })
    //indy.setDefaultLogger("debug");

    // requisitos
    let holderWallet = 0;
    let proofRequestJson = {};
    let masterSecretId = 0;

    // setup
    let searchProofRequest = await indy.proverSearchCredentialsForProofReq(holderWallet, proofRequestJson, null)
    // obtenemos la lista de credenciales que nos pueden validar el attributo attr1_referent
    credentials = await indy.proverFetchCredentialsForProofReq(searchProofRequest, 'attr1_referent', 100)
    credForAttr1 = credentials[0]['cred_info'];

    // obtenemos la lista de credenciales que nos pueden validar el predicado predicate1_referent
    await indy.proverFetchCredentialsForProofReq(searchProofRequest, 'predicate1_referent', 100)
    credForPredicate1 = credentials[0]['cred_info'];

    // obtenemos la lista de credenciales que nos pueden validar el predicado predicate2_referent
    await indy.proverFetchCredentialsForProofReq(searchProofRequest, 'predicate2_referent', 100)
    let credForPredicate2 = credentials[0]['cred_info'];

    //una vez encontrados todas las credenciales que nos siren para validar, cerramos el proceso de busqueda
    await indy.proverCloseCredentialsSearchForProofReq(searchProofRequest);

    // con los resultados anteriores, 
    let credsForProof = {};
    credsForProof[`${credForAttr1['referent']}`] = credForAttr1;
    credsForProof[`${credForPredicate1['referent']}`] = credForPredicate1;
    credsForProof[`${credForPredicate2['referent']}`] = credForPredicate2;

    // como nos falta informacion, obtenemos lo que nos falta de la red
    // el schema
    // el credential definition
    // los datos de revocacion (si existieran)
    [schemasJson, credDefsJson, revocStatesJson] = await proverGetEntitiesFromLedger(poolHandle, aliceThriftDid, credsForProof, 'HOLDER');

    let proofDataJson = {
        'self_attested_attributes': {},
        'requested_attributes': {
            'attr1_referent': {'cred_id': credForAttr1['referent'], 'revealed': true}
        },
        'requested_predicates': {
            'predicate1_referent': {'cred_id': credForPredicate1['referent']},
            'predicate2_referent': {'cred_id': credForPredicate2['referent']}
        }
    };
    let verifiableProofJson = await indy.proverCreateProof(
        holderWallet,
        proofRequestJson,
        proofDataJson,
        masterSecretId,
        schemasJson,
        credDefsJson,
        revocStatesJson
    );
    console.log("HOLDER CREATED VERIFIABLE PROOF CONTENT:");
    console.log(JSON.stringify(verifiableProofJson, null, 4));
})();