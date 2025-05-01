import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getDatabase, get, set, ref, update, child, onValue } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyAHGmtJQOLeBPONBHZ7rMSOcm32Ct3-_ss",
    authDomain: "guess-the-number-79665.firebaseapp.com",
    projectId: "guess-the-number-79665",
    storageBucket: "guess-the-number-79665.firebasestorage.app",
    messagingSenderId: "769428633738",
    appId: "1:769428633738:web:0c04b223b7d353c0aa5573",
    databaseURL: "https://guess-the-number-79665-default-rtdb.europe-west1.firebasedatabase.app"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase();

//save match in the DB
export function saveMatch(playerId1, playerId2) {
    const matchId = Math.random().toString(36).slice(2, 9);
    set(ref(database, `match/${matchId}`), {
        id: matchId,
        player: {
            player1: { id: playerId1, },
            player2: { id: playerId2, },
        },
        status: "waiting",
        winner: "",
        turn: "player1",
    });
    return matchId;
}

//save combo in the DB
export async function saveCombo(combo) {
    const { matchId, playerA, } = await import('./matchmaking.js');

    update(ref(database, `match/${matchId}/player/${playerA}`), {
        combo: combo,
    });
}

//get the opponent's combo
export async function getCombo() {
    const { matchId, playerB, } = await import('./matchmaking.js');
    const snapshot = await get(child(ref(database), `match/${matchId}/player/${playerB}`));

    if (snapshot.exists()) {
        const data = snapshot.val();
        return data.combo;
    }
}

// watch the match status until its "ended"
export async function watchMatchStatus() {
    const { matchId, playerA, } = await import('./matchmaking.js');
    const { endMatch, } = await import('./choose.js');
    let watchMatchStatus = null;
    watchMatchStatus = onValue(ref(database, `match/${matchId}`), (snapshot) => {
        const data = snapshot.val();
        if (data.status == "ended") {
            console.log("match finito");
            watchMatchStatus();
            endMatch(data.winner, playerA);
        }
    });
}

// watch if its turn of player A or B
export async function watchTurn() {
    const { matchId, playerA, } = await import('./matchmaking.js');
    const guessBtn = document.querySelector('#guess-btn');
    const turnSpan = document.querySelector('#turn');
    let watchTurn = null;
    watchTurn = onValue(ref(database, `match/${matchId}/turn`), (snapshot) => {
        const data = snapshot.val();
        if(data == playerA) {
            guessBtn.disabled = false;
            turnSpan.textContent = "Tocca a te!";
        } else {
            guessBtn.disabled = true;
            turnSpan.textContent = "Tocca al tuo avversario...";
        }
    });
}