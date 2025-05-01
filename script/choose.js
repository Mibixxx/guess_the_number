import * as fb from './firebase.js';
import { getDatabase, get, ref, onValue, update, } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-database.js";
import { database, matchId, playerB } from './matchmaking.js';

const chooseBtnDiv = document.querySelector('.choose-btn');
const guessBtnDiv = document.querySelector('.guess-btn');
const matchDiv = document.querySelector('.match');
const matchInfoDiv = document.querySelector('.match-info');
const resultsDiv = document.querySelector('.results');
const chooseBtn = document.querySelector('#choose-btn');
const guessBtn = document.querySelector('#guess-btn');
const num1 = document.querySelector('#num1');
const num2 = document.querySelector('#num2');
const num3 = document.querySelector('#num3');
const num4 = document.querySelector('#num4');
const guessSpan = document.querySelector('.display-guess');
const turnSpan = document.querySelector('#turn');
const prevGuessSpan = document.querySelector('.prev-guess');
const resText1 = document.querySelector('#res-text1');
const resText3 = document.querySelector('#res-text3');




const numbers = [];
let guess = [];

// events on page load
document.addEventListener('DOMContentLoaded', function () {
    num1.focus();
})

// keeps only the first char of the input
document.addEventListener('input', function (event) {
    if (window[`${event.target.id}`].value.length > 1) {
        window[`${event.target.id}`].value = window[`${event.target.id}`].value.slice(0, 1);
    }

})

//when input change, move focus to the next input
document.addEventListener('input', function (event) {
    let inputNum = event.target.id[event.target.id.length - 1];     //get the last char of the input name to know which input is selected currently
    if (inputNum < 4) {
        inputNum++;
        window[`num${inputNum}`].focus();
    }
})

// click on save button
chooseBtn.addEventListener('click', function () {

    let numSerie = "";

    // save values in array "numbers"
    numbers[0] = num1.value;
    numbers[1] = num2.value;
    numbers[2] = num3.value;
    numbers[3] = num4.value;

    // convert array in a string and check that lenght = 4
    numSerie = numbers.join("");
    if (checkInput(numSerie)) {
        startGame(numSerie);
        fb.watchMatchStatus();
        fb.watchTurn();
    }

})

guessBtn.addEventListener('click', function () {
    let numSerie = "";

    // save values in array "guess"
    guess[0] = num1.value;
    guess[1] = num2.value;
    guess[2] = num3.value;
    guess[3] = num4.value;

    numSerie = guess.join("");
    if (checkInput(numSerie)) {
        //update numbers of the previous guess
        if (guessSpan.textContent != "Match started") {
            prevGuessSpan.textContent = guessSpan.textContent || "placeholder";
            for (let i = 1; i <= 5; i++) {
                let prevCoin = document.querySelector(`#prev-coin${i}`);
                let coin = document.querySelector(`#coin${i}`);
                if (coin && prevCoin) {
                    prevCoin.style.backgroundColor = window.getComputedStyle(coin).backgroundColor;
                }
            }
        }

        guessSpan.textContent = numSerie;
        
        //pass the turn to the opponent by updating the BD => onWatch will be called
        update(ref(database, `match/${matchId}`), {
            turn: playerB,
        });


        //check how many numbers of the guess are correct
        checkNumbers(guess);
    }

    //reset all inputs and set focus on the first one
    num1.value = "";
    num2.value = "";
    num3.value = "";
    num4.value = "";
    num1.focus();
})

//check if the lenght of the input is = 4
function checkInput(numSerie) {
    if (numSerie.length == 4) {
        return true;
    } else {
        return false;
    }
}

async function startGame(numSerie) {
    fb.saveCombo(numSerie);

    //disable all inputs and show "waiting" message
    chooseBtn.disabled = true;
    for (let i = 1; i < 5; i++) {
        let num = document.querySelector(`#num${i}`);
        num.disabled = true;
    }
    const { matchId, playerB } = await import('./matchmaking.js');
    const database = getDatabase();
    //wait for the player B to choose a combo and then start the match
    let watchCombo = null;
    watchCombo = onValue(ref(database, `match/${matchId}/player/${playerB}/combo`), (snapshot) => {
        const data = snapshot.val();
        if (data != null) {
            update(ref(database, `match/${matchId}`), {
                status: "started",
            });
            //go to the next screen and reset the inputs
            chooseBtnDiv.style.display = "none";
            guessBtnDiv.style.display = "block";
            matchInfoDiv.style.display = "block";
            for (let i = 1; i < 5; i++) {
                let num = document.querySelector(`#num${i}`);
                num.value = "";
                num.disabled = false;
            }
            guessSpan.textContent = "Match started";
            num1.focus();
            watchCombo();
        }
    });
}

//check how many numbers of the guess combo are correct
async function checkNumbers(guess) {
    let green = 0;
    let yellow = 0;
    let red = 0;

    let combo = await fb.getCombo();  //get opponents combo
    combo = combo.split(''); // convert in a array

    //check how many numbers are green, yellow or red
    //green: correct number and correct position
    //yellow: correct number in wrong position
    //red: wrong number
    for (let index in guess) {
        if (guess[index] == combo[index]) {
            green++;
        } else if (combo.includes(guess[index])) {
            yellow++;
        } else {
            red++;
        }
    }

    //change coins color based on values green, yellow and red
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

    //when its 4 greens, end the match (win)
    if (green == 4) {
        const { matchId, playerA, } = await import('./matchmaking.js');
        const database = getDatabase();
        update(ref(database, `match/${matchId}`), {
            status: "ended",
            winner: playerA,
        });
    }
}

export async function endMatch(winner, playerA) {
    console.log("winner: " + winner);
    matchDiv.style.display = "none";
    resultsDiv.style.display = "block";
    if (winner == playerA) {
        resText1.textContent = "You won! Yee-aah!!";
        resText3.textContent = await fb.getCombo();
    } else {
        resText1.textContent = "You lost! Ah-ah!!";
        resText3.textContent = await fb.getCombo();
    }
}