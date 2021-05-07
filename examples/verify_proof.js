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

// RUST_BACKTRACE=1 node create_proof_from_request.js
(async () => {
    // activamos el modo debug para tener más información de los errores que ocurran
    //indy.setRuntimeConfig({ collect_backtrace: true })
    //indy.setDefaultLogger("debug");

    // requisitos
    let poolHandle = 0;
    let verifierDid = "";
    // contenido del request solicidato por el issuer
    let proofRequest = {};
    // contenido de la prueba generada por el holder
    let holderProof = {};

    // como es posible que nos falten datos, los obtenemos de la red antes de verificar
    const [schemasJson, credDefsJson, revocRefDefsJson, revocRegsJson] = await verifierGetEntitiesFromLedger(
        poolHandle,
        verifierDid,
        holderProof['identifiers'],
        'VERIFIER'
    );
    // verify proof
    const valid = await indy.verifierVerifyProof(
        proofRequest,
        holderProof,
        schemasJson,
        credDefsJson,
        revocRefDefsJson,
        revocRegsJson
    );
    console.log("VERIFIER VERIFICATION RESULT:");
    console.log(valid);
    // para mostrar los atributos revelados en la prueba
    console.log(holderProof['requested_proof']['revealed_attrs'])
})();