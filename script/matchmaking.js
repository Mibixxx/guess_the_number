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

//start matchmaking, save players ID in the waiting list
function startMatchmaking(playerId) {
    set(ref(database, `waiting_list/${playerId}`), {
        status: "waiting"
    }).then(() => {
        waitForContestant(playerId);
    }).catch((error) => {
        console.error('errore startMatchmaking : ' + error);
    });

    // if player disconnects, remove from waiting list
    onDisconnect(ref(database, `waiting_list/${playerId}`)).remove().catch((error) => {
        console.error('Errore onDisconnect:', error);
    });
}

//wait for other players (watch the waiting list)
function waitForContestant(playerId) {
    let watchWaitingList = null;
    watchWaitingList = onValue(ref(database, "waiting_list"), (snapshot) => {
        const waitingList = snapshot.val() || {};   // fallback if waitingList is null

        //check all players in the waiting list to find a match
        for (const contestantId of Object.keys(waitingList)) {
            if (contestantId != playerId && waitingList[contestantId].status == "waiting") {
                console.log('match trovato');

                //usa runTransaction to make sure that when a match is found, only one match is created in the database
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
                        //save the match only through the player that completes the transaction
                        fb.saveMatch(playerId, contestantId);
                        console.log('match salvato');
                    }
                }).catch((error) => {
                    console.log(error);
                });

                if (watchWaitingList) {
                    watchWaitingList();     //remove the listener
                }
                endMatchmaking(playerId, contestantId);
                break;
            }
        }
    });
}

//finish the matchmaking, remove the two players from the waiting list
function endMatchmaking(playerId1, playerId2) {
    remove(ref(database, `waiting_list/${playerId1}`)).catch((error) => {
        console.error('errore endtMatchmaking player 1: ' + error);
    });
    remove(ref(database, `waiting_list/${playerId2}`)).catch((error) => {
        console.error('errore endMatchmaking player 2: ' + error);
    });

    //save the matchID in a variable that will be passed to other files
    //use onValue() otherwise playerB will search for the match in the DB when its not created yet
    let watchMatch = null;
    watchMatch = onValue(ref(database, 'match'), (snapshot) => {
        const matches = snapshot.val() || {};
        for (const match of Object.keys(matches)) {
            if (matches[match]['player']['player1']['id'] == playerId1) {
                if (matches[match]['status'] == "waiting") {
                    matchId = match;
                    playerA = 'player1';
                    playerB = 'player2';
                    //change screen after 200ms to avoid getting stuck in the previous page
                    setTimeout(() => {
                        mainMenuDiv.style.display = "none";
                        matchDiv.style.display = "block";
                    }, 200);
                    console.log(matchId);

                    if (watchMatch) {
                        watchMatch();
                    }
                    break;
                }
            } else if (matches[match]['player']['player2']['id'] == playerId1) {
                if (matches[match]['status'] == "waiting") {
                    matchId = match;
                    playerA = 'player2';
                    playerB = 'player1';
                    //change screen after 200ms to avoid getting stuck in the previous page
                    setTimeout(() => {
                        mainMenuDiv.style.display = "none";
                        matchDiv.style.display = "block";
                    }, 200);
                    console.log(matchId);

                    if (watchMatch) {
                        watchMatch();
                    }
                    break;
                }
            }
        }
    });
}