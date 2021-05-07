// THIS CODE IS EDUCATIONAL ONLY
// 
// DO NOT USE AS A BASE FOR ANY REAL APP OR PRODUCTION SYSTEM
// YOU WILL SCREW UP VERY SERIOUSLY
//
// CONSIDER YOURSELF ADVISED
//
const indy = require('indy-sdk');
const util = require('./util.js');
const user = require('./user.js');
const encoder = require('./encoder.js');
const connection = require('./connection.js');

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

// para ejecutar este fichero
// nvm use v8.10.0
// node create_pool_demo.js

/**
 * 
 * @returns a random identifier based on current time
 */
function randomVersion() {
    return "1." + (new Date().getTime()%100000).toString()
}

// RUST_BACKTRACE=1 TEST_POOL_IP=127.0.0.1 node create_pool_demo.js
(async () => {
    try {
        // activamos el modo debug para tener más información de los errores que ocurran
        // indy.setRuntimeConfig({ collect_backtrace: true })
        // indy.setDefaultLogger("debug");

        // creamos la configuracion para conectarnos a la red (pool)
        console.log("creando conexion con pool...");
        const poolName = "pool_config_demo"
        try {
            const path = await util.getPoolGenesisTxnPath(poolName)
            console.log("path value: ", path);
            const config = {
                "genesis_txn": path,
            }
            await indy.createPoolLedgerConfig(poolName, config);
        } catch (err) {
            console.log("pool already exist detected!!")
            // console.error(err)
        }
        // ajustamos la version del protocolo a usar. A partir de indy 1.4 se usa el 2
        await indy.setProtocolVersion(2);

        // nos conectamos a la red (pool)
        console.log("opening pool ledger connection with pool name: ", poolName)
        let poolHandle = await indy.openPoolLedger(poolName);
        console.log("pool handler id: ", poolHandle);

        // create issuer wallet
        let issuer = await user.createWalletDid("issuer", "pass000");
        let issuerWallet = issuer.wh;
        let stewardDidInfo = {
            'seed': '000000000000000000000000Steward1'
        };
        const [issuerDid, verkey] = await indy.createAndStoreMyDid(issuerWallet, stewardDidInfo);
        console.log("DID: " + issuerDid);
        console.log("VERKEY: " + verkey)

        console.log("CREANDO SCHEMA EN LOCAL")
        const version = randomVersion();
        const [schemaId, schema] = await indy.issuerCreateSchema(
            issuerDid,
            'Job-Certificate',
            version,
            [
                'first_name',
                'last_name',
                'salary',
                'employee_status',
                'experience'
            ]
        );
        console.log(schemaId);
        console.log(schema);

        let readedSchema = undefined;
        // register the schema
        try {
            console.log("REGISTRANDO SCHEMA EN LA RED")
            const response = await connection.sendSchema(poolHandle, issuerWallet, issuerDid, schema);
            console.log(response);
            // create credential definition
            const [, readed] = await connection.getSchema(poolHandle, issuerDid, schemaId);
            console.log("SCHEMA LEIDO DE LA RED");
            console.log(readed);
            readedSchema = readed;
        } catch (err) {
            console.error("FALLO AL REGISTRAR EL SCHEMA");
            console.error(err);
            console.error(JSON.stringify(err, null, 4));
            return;
        }
        // register the credential definition
        let credDefId;
        let defJson;
        try {
            console.log("CREANDO LA CREDENTIAL DEFINITION");
            const [id, def] = await indy.issuerCreateAndStoreCredentialDef(
                issuerWallet,
                issuerDid,
                readedSchema,
                'TAG1',
                'CL',
                '{"support_revocation": false}'
            );
            console.log("CREDENTIAL DEFINITION CREADA");
            console.log(id);
            console.log(def);
            console.log("sending credential definition to ledger")
            const credDefRegResponse = await connection.sendCredDef(
                poolHandle,
                issuerWallet,
                issuerDid,
                def
            );
            console.log("CREDENTIAL DEFINITION REGISTRATION");
            console.log(credDefRegResponse);
            credDefId = id;
            defJson = def;
        } catch (err) {
            console.error("FALLO AL REGISTRAR LA CREDENTIAL DEFINITION")
            console.error(JSON.stringify(err, null, 4))
            return;
        }

        // Ahora creamos la representacion del usuario final
        const holder = await user.createWalletDid("holder", "pass000");
        console.log("HOLDER DATA")
        console.log(holder);
        console.log("CREANDO LA OFERTA DEL CREDENCIAL PARA EL USUARIO")
        const credOffer = await indy.issuerCreateCredentialOffer(
            issuerWallet,
            credDefId
        );
        console.log("OFERTA DE CREDENCIAL CREADA")
        console.log(credOffer);
        // como usuario, proceso la oferta y creo una rerpuesta
        // prerequisito: crear un master secret
        console.log("HOLDER: CREANDO MASTER SECRET")
        const masterSecretId = await indy.proverCreateMasterSecret(
            holder.wh,
            null
        );
        console.log("HOLDER: MASTER SECRET ID")
        console.log(masterSecretId);
        console.log("HOLDER: ACEPTANDO LA OFERTA DEL CREDENTIAL Y GENERANDO RESPUESTA");
        const [credReq, credReqMetadata] = await indy.proverCreateCredentialReq(
            holder.wh,
            holder.did,
            credOffer,
            defJson,
            masterSecretId);
        console.log("HOLDER: RESPUESTA A LA OFERTA")
        console.log(credReq);
        console.log("HOLDER: RESPUESTA METADATA")
        console.log(credReqMetadata);
        // ahora que el usuario A ya ha aceptado la oferta, 
        // se envia la respuesta de vuelta al issuer, para que este la procese y emita la credencial

        // credential values tiene que tener la misma informacion que nuestro schema
        // 'first_name', 'last_name', 'salary', 'employee_status', 'experience'
        let credentialValues = {
            "first_name": { "raw": "Jhon", "encoded": encoder.encodeCredValue("Jhon") },
            "last_name": { "raw": "Doe", "encoded": encoder.encodeCredValue("Doe") },
            "salary": { "raw": "20000", "encoded": encoder.encodeCredValue(20000) },
            "employee_status": { "raw": "hired", "encoded": encoder.encodeCredValue("hired") },
            "experience": { "raw": "2", "encoded": encoder.encodeCredValue(2) },
        };
        console.log("ISSUER: CREANDO CREDENCIAL CON LOS DATOS")
        console.log(JSON.stringify(credentialValues, null, 4));
        let [credentialData] = await indy.issuerCreateCredential(
            issuerWallet,
            credOffer,
            credReq,
            credentialValues,
            null,
            -1
        );
        console.log("ISSUER: CREDENCIAL CREADO")
        console.log(JSON.stringify(credentialData));
        // ahora que la credencial esta creada, se le envia al usuario para que la verifique y la guarde en su wallet
        console.log("HOLDER: GUARDANDO CREDENCIAL EN WALLET")
        const id = await indy.proverStoreCredential(
            holder.wh,
            null,
            credReqMetadata,
            credentialData,
            defJson,
            null
        );
        console.log("HOLDER: CREDENCIAL GUARDADO CON EL ID")
        console.log(id);
        // ahora que el HOLDER ya lo tiene en su wallet, puede recibir solicitudes de pruebas

        // Ahora creamos la representacion del usuario verificador
        const userVerifier = await user.createWalletDid("verifier", "pass000");
        console.log("USER VERIFIER DATA")
        console.log(userVerifier);
        // este usuario, lo primero que tiene que hacer es solicitar una prueba
        // para ello genera un proof request
        nonce = await indy.generateNonce();
        let proofRequest = {
            'nonce': nonce,
            'name': 'Proof-Request',
            'version': '0.2',
            'ver': '1.0',
            'requested_attributes': {
                'attr1_referent': {
                    'name': 'first_name',
                    'restrictions': [{ 'cred_def_id': credDefId }]
                },
                'attr2_referent': {
                    'name': 'last_name',
                    'restrictions': [{ 'cred_def_id': credDefId }]
                }
            },
            'requested_predicates': {
                /*'predicate1_referent': {
                    'name': 'salary',
                    'p_type': '>=',
                    'p_value': 5000,
                    restrictions': [{ 'cred_def_id': credDefId }]
                }*/
            }
        };
        
        console.log("VERIFIER: DATOS DEL PROOF REQUEST")
        console.log(JSON.stringify(proofRequest, null, 4))
        // el verifier, le hace llegar el contenido del proof request
        // al holder
        console.log("HOLDER: BUSCANDO EN LA WALLET CREDENCIALES QUE PRUEBEN LA SOLICITUD RECIBIDA")
        const proofData = await user.buildProof(
            holder.wh,
            holder.did,
            poolHandle,
            proofRequest,
            masterSecretId,
        )
        console.log("HOLDER: PRUEBA CREADA")
        console.log(JSON.stringify(proofData, null, 4))
        // una vez creada, se enviara la prueba al verifier para que la procese
        
        // el verifier, la recibe y empieza a verificar su validez
        console.log("VERIFIER: CONTENIDO VISIBLE DE LA PRUEBA")
        console.log(JSON.stringify(proofData['requested_proof'], null, 4))

        console.log("VERIFIER: OBTENIENDO INFORMACION ADICIONAL DE LA RED ANTES DE VERIFICAR PRUEBA")
        console.log(JSON.stringify(proofData['identifiers'], null, 4))
        const [schemasJson, credDefsJson, revocRefDefsJson, revocRegsJson] = await connection.verifierGetEntitiesFromLedger(
            poolHandle,
            userVerifier.did,
            proofData['identifiers'],
            'VERIFIER',
        );
        const isValid = await indy.verifierVerifyProof(
            proofRequest,
            proofData,
            schemasJson,
            credDefsJson,
            revocRefDefsJson,
            revocRegsJson
        );
        console.log("VERIFIER: PRUEBA VERIFICADA?");
        console.log(isValid);
    } catch (err) {
        console.error("FALLO GENERAL DEL SCRIPT");
        console.error(err);
        console.error(JSON.stringify(err, null, 4));
        return;
    }
})();