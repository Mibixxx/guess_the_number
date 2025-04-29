import * as fb from './firebase.js';
import { getDatabase, get, ref, onValue, update, } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";

const chooseBtn = document.querySelector('.choose-btn');
const guessBtn = document.querySelector('.guess-btn');
const num1 = document.querySelector('#num1');
const num2 = document.querySelector('#num2');
const num3 = document.querySelector('#num3');
const num4 = document.querySelector('#num4');
const guessSpan = document.querySelector('.display-guess');
const prevGuessSpan = document.querySelector('.prev-guess');
const resText1 = document.querySelector('#res-text1');
const resText3 = document.querySelector('#res-text3');
const matchDiv = document.querySelector('.match');
const resultsDiv = document.querySelector('.results');



const numbers = [];
let guess = [];

// eventi quando la pagina viene caricata
document.addEventListener('DOMContentLoaded', function () {
    num1.focus();
})

//accetto solo 1 valore per ogni input
document.addEventListener('input', function (event) {
    if (window[`${event.target.id}`].value.length > 1) {
        window[`${event.target.id}`].value = window[`${event.target.id}`].value.slice(0, 1);
    }

})

//quando valore input sposto focus su input successivo
document.addEventListener('input', function (event) {
    let inputNum = event.target.id[event.target.id.length - 1];     //prendo l'ultimo carattere del ID del input per sapere quale è stato selezionato
    if (inputNum < 4) {
        inputNum++;
        window[`num${inputNum}`].focus();
    }
})

// click sul bottone salva
chooseBtn.addEventListener('click', function () {

    let numSerie = "";

    // salvo i valori nell'array numbers
    numbers[0] = num1.value;
    numbers[1] = num2.value;
    numbers[2] = num3.value;
    numbers[3] = num4.value;

    // unisco i valori in una Stringa e controllo siano 4 cifre
    numSerie = numbers.join("");
    if (checkInput(numSerie)) {
        startGame(numSerie);
        fb.watchMatchStatus();
    }

})

guessBtn.addEventListener('click', function () {
    let numSerie = "";

    // salvo i valori nell'array guess
    guess[0] = num1.value;
    guess[1] = num2.value;
    guess[2] = num3.value;
    guess[3] = num4.value;

    numSerie = guess.join("");
    if (checkInput(numSerie)) {
        //aggiorno i valori della scommessa precedente
        prevGuessSpan.textContent = guessSpan.textContent || "placeholder";
        guessSpan.textContent = numSerie;
        for (let i = 1; i <= 5; i++) {
            let prevCoin = document.querySelector(`#prev-coin${i}`);
            let coin = document.querySelector(`#coin${i}`);
            if (coin && prevCoin) {
                prevCoin.style.backgroundColor = window.getComputedStyle(coin).backgroundColor;
            }
        }

        //controllo se la scommessa è giusta
        checkNumbers(guess);
    }

    //resetto tutti gli input e metto focus su primo
    num1.value = "";
    num2.value = "";
    num3.value = "";
    num4.value = "";
    num1.focus();
})

function checkInput(numSerie) {
    if (numSerie.length == 4) {
        return true;
    } else {
        return false;
    }
}

async function startGame(numSerie) {
    fb.saveCombo(numSerie);

    //blocco gli input e mostro messaggio di attesa
    for (let i = 1; i < 5; i++) {
        let num = document.querySelector(`#num${i}`);
        num.disabled = true;
    }
    const { matchId, playerB } = await import('./matchmaking.js');
    const database = getDatabase();
    //aspetto che il playerB abbia scelto una combo prima di procedere
    let watchCombo = null;
    watchCombo = onValue(ref(database, `match/${matchId}/player/${playerB}/combo`), (snapshot) => {
        const data = snapshot.val();
        if (data != null) {
            update(ref(database, `match/${matchId}`), {
                status: "started",
            });
            //cambio schermata e pulisco gli input
            chooseBtn.style.display = "none";
            guessBtn.style.display = "block";
            for (let i = 1; i < 5; i++) {
                let num = document.querySelector(`#num${i}`);
                num.value = "";
                num.disabled = false;
            }
            guessSpan.textContent = "Partita iniziata";
            num1.focus();
            watchCombo();
        }
    });
}

async function checkNumbers(guess) {
    let green = 0;
    let yellow = 0;
    let red = 0;

    let combo = await fb.getCombo();  //prendo la combo avversaria
    combo = combo.split(''); // converto combo in un array

    for (let index in guess) {
        if (guess[index] == combo[index]) {
            green++;
        } else if (combo.includes(guess[index])) {
            yellow++;
        } else {
            red++;
        }
    }

    for (let i = 1; i <= green; i++) {
        let coin = document.querySelector(`#coin${i}`);
        coin.style.backgroundColor = "green";
    }
    for (let i = green + 1; i <= yellow + green; i++) {
        let coin = document.querySelector(`#coin${i}`);
        coin.style.backgroundColor = "yellow";
    }
    for (let i = green + yellow + 1; i <= red + yellow + green; i++) {
        let coin = document.querySelector(`#coin${i}`);
        coin.style.backgroundColor = "red";
    }

    if (green == 4) {
        const { matchId, playerA, } = await import('./matchmaking.js');
        const database = getDatabase();
        update(ref(database, `match/${matchId}`), {
            status: "ended",
            winner: playerA,
        });
        guessSpan.textContent = "BRAVO COGLIONE!!";
    }
}

export async function endMatch(winner, playerA) {
    console.log("vincitore: " + winner);
    matchDiv.style.display = "none";
    resultsDiv.style.display = "block";
    if (winner == playerA) {
        resText1.textContent = "Hai vinto!";
        resText3.textContent = await fb.getCombo();
    } else {
        resText1.textContent = "Hai perso!";
        resText3.textContent = await fb.getCombo();
    }
}