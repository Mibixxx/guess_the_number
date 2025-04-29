import { getDatabase, runTransaction, set, ref, remove, onValue, onDisconnect } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import * as fb from './firebase.js';

const srcBtn = document.querySelector('#src-btn');
const mainMenuDiv = document.querySelector('.main-menu');
const matchDiv = document.querySelector('.match');
const waitingText = document.querySelector('.waiting-text');

export const database = getDatabase();
export let matchId = null;
export let playerA = null, playerB = null;

srcBtn.addEventListener('click', function () {
    const playerId = Math.random().toString(36).slice(2, 9);
    startMatchmaking(playerId);
    waitingText.style.display = "block";
});

//avvia matchmaking, salva player nella waiting list
function startMatchmaking(playerId) {

    // Quando il player si disconnette, rimuovilo dalla waiting list
    onDisconnect(ref(database, `waiting_list/${playerId}`)).remove().catch((error) => {
        console.error('Errore onDisconnect:', error);
    });

    set(ref(database, `waiting_list/${playerId}`), {
        status: "waiting"
    }).then(() => {
        waitForContestant(playerId);
    }).catch((error) => {
        console.error('errore startMatchmaking : ' + error);
    });
}

//resta in attesa di altri player guardando cambiamenti nella waiting list
function waitForContestant(playerId) {

    //ogni volta che un dato viene creato/eliminato dal DB questa funzione viene chiamata
    let watchWaitingList = null;
    watchWaitingList = onValue(ref(database, "waiting_list"), (snapshot) => {
        const waitingList = snapshot.val() || {};   // fallback se waitingList è null

        //controlla tutti i player nella waiting list per trovare un match
        for (const contestantId of Object.keys(waitingList)) {
            if (contestantId != playerId && waitingList[contestantId].status == "waiting") {
                console.log('match trovato');

                runTransaction(ref(database, 'waiting_list'), (data) => {
                    if (data[playerId]['status'] == 'waiting' && data[contestantId]['status'] == 'waiting') {
                        data[playerId]['status'] = 'matched';
                        data[contestantId]['status'] = 'matched';
                        return data;
                    } else if (data == null) {
                        return undefined;
                    } else {
                        return;
                    }
                }).then((result) => {
                    if (result.committed) {
                        //salvo il match solo tramite il player che ha completato la transaction
                        fb.saveMatch(playerId, contestantId);
                        console.log('match salvato');
                    }
                }).catch((error) => {
                    console.log(error);
                })

                if (watchWaitingList) {
                    watchWaitingList();     //stacca il listener
                }
                endMatchmaking(playerId, contestantId);
                break;
            }
        }
    });
}

//termina matchmaking, rimuove player dalla waiting list
function endMatchmaking(playerId1, playerId2) {
    remove(ref(database, `waiting_list/${playerId1}`)).catch((error) => {
        console.error('errore endtMatchmaking player 1: ' + error);
    });
    remove(ref(database, `waiting_list/${playerId2}`)).catch((error) => {
        console.error('errore endMatchmaking player 2: ' + error);
    });

    //salva il matchId in una variabile da passare agli altri file
    //uso onValue() altrimenti il playerB cerca il match nel DB quando ancora non esiste
    let watchMatch = null;
    watchMatch = onValue(ref(database, 'match'), (snapshot) => {
        const matches = snapshot.val() || {};
        for (const match of Object.keys(matches)) {
            if (matches[match]['player']['player1']['id'] == playerId1) {
                if (matches[match]['status'] == "waiting") {
                    matchId = match;
                    playerA = 'player1';
                    playerB = 'player2';
                    console.log(matchId);
                    if (watchMatch) {
                        watchMatch();
                    }
                }
            } else if (matches[match]['player']['player2']['id'] == playerId1) {
                if (matches[match]['status'] == "waiting") {
                    matchId = match;
                    playerA = 'player2';
                    playerB = 'player1';
                    console.log(matchId);
                    if (watchMatch) {
                        watchMatch();
                    }
                }
            }
        }
    })

    //cambio schermata
    mainMenuDiv.style.display = "none";
    matchDiv.style.display = "block";
}