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

// RUST_BACKTRACE=1 node create_proof_request.js
(async () => {
    // activamos el modo debug para tener más información de los errores que ocurran
    //indy.setRuntimeConfig({ collect_backtrace: true })
    //indy.setDefaultLogger("debug");
    nonce = await indy.generateNonce()
    const credId = "";
    let proofRequestJson = {
        'nonce': nonce,
        'name': 'Loan-Application-Basic',
        'version': '0.1',
        'requested_attributes': {
            'attr1_referent': {
                'name': 'employee_status',
                'restrictions': [{'cred_def_id': credId}]
            }
        },
        'requested_predicates': {
            'predicate1_referent': {
                'name': 'salary',
                'p_type': '>=',
                'p_value': 2000,
                'restrictions': [{'cred_def_id': credId}]
            },
            'predicate2_referent': {
                'name': 'experience',
                'p_type': '>=',
                'p_value': 1,
                'restrictions': [{'cred_def_id': credId}]
            }
        }
    };
    console.log("VERIFIER PROOF REQUEST CONTENT:");
    console.log(JSON.stringify(proofRequestJson, null, 4));
})();