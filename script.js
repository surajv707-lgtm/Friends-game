/* ========================================
   FRIENDZONE JAVASCRIPT
======================================== */


/* ========================================
   DATA
======================================== */

const thoughts = [

    {
        text: "Bro said he'll play for 5 minutes...",
        author: "Your Friend 😂"
    },

    {
        text: "I came here to win. Friendship can wait.",
        author: "Competitive Friend 🔥"
    },

    {
        text: "If I lose, the game is definitely broken.",
        author: "That One Friend 💀"
    },

    {
        text: "Nobody tell him he is losing.",
        author: "The Group Chat 👀"
    },

    {
        text: "I don't need luck. I need my friends to lose.",
        author: "Certified Villain 😈"
    },

    {
        text: "We are not fighting. We are competing aggressively.",
        author: "Best Friend 🤝"
    }

];


/* ========================================
   DEFAULT FRIENDS
======================================== */

let friends = [

    {
        name: "Rahul",
        avatar: "😎"
    },

    {
        name: "Aman",
        avatar: "😂"
    },

    {
        name: "Sameer",
        avatar: "🗿"
    },

    {
        name: "Priya",
        avatar: "🔥"
    }

];


/* ========================================
   PLAYER DATA
======================================== */

let player = {

    name:
        localStorage.getItem("fz_player")
        || "You",

    games:
        Number(
            localStorage.getItem("fz_games")
        ) || 0,

    score:
        Number(
            localStorage.getItem("fz_score")
        ) || 0,

    wins:
        Number(
            localStorage.getItem("fz_wins")
        ) || 0

};


/* ========================================
   PAGE SYSTEM
======================================== */

const pages = [

    "homePage",
    "gamesPage",
    "friendsPage",
    "leaderboardPage",
    "gamePage"

];


function hideAllPages() {

    pages.forEach(id => {

        const page =
            document.getElementById(id);

        if (page) {

            page.classList.remove("active");

        }

    });

}


function showPage(id) {

    hideAllPages();

    document
        .getElementById(id)
        .classList.add("active");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

}


/* ========================================
   NAVIGATION
======================================== */

function showHome() {

    showPage("homePage");

}


function showGames() {

    showPage("gamesPage");

}


function showFriends() {

    showPage("friendsPage");

    renderFriends();

}


function showLeaderboard() {

    showPage("leaderboardPage");

    updateStats();

}


/* ========================================
   PROFILE
======================================== */

function openProfile() {

    document
        .getElementById("profileModal")
        .classList.add("show");

    document
        .getElementById("playerName")
        .value =
        player.name === "You"
        ? ""
        : player.name;

}


function closeProfile() {

    document
        .getElementById("profileModal")
        .classList.remove("show");

}


function saveProfile() {

    const input =
        document.getElementById("playerName");

    const name =
        input.value.trim();

    if (!name) {

        showToast(
            "Please enter your name 😭"
        );

        return;
    }

    player.name = name;

    localStorage.setItem(
        "fz_player",
        name
    );

    closeProfile();

    updateStats();

    renderSquad();

    showToast(
        `Welcome ${name}! 🎮`
    );

}


/* ========================================
   THOUGHT SYSTEM
======================================== */

function newThought() {

    const random =
        thoughts[
            Math.floor(
                Math.random() *
                thoughts.length
            )
        ];

    document
        .getElementById("friendThought")
        .textContent =
        `"${random.text}"`;

    document
        .getElementById("thoughtAuthor")
        .textContent =
        `— ${random.author}`;

}


/* ========================================
   FRIENDS
======================================== */

function renderSquad() {

    const container =
        document.getElementById(
            "squadContainer"
        );

    if (!container) return;

    container.innerHTML = "";


    const allFriends = [

        {
            name: player.name,
            avatar: "😎"
        },

        ...friends

    ];


    allFriends.forEach(friend => {

        const div =
            document.createElement("div");

        div.className = "friend";

        div.innerHTML = `

            <div class="friend-avatar">
                ${friend.avatar}
            </div>

            <strong>
                ${escapeHTML(friend.name)}
            </strong>

            <small>
                ● Online
            </small>

        `;

        container.appendChild(div);

    });

}


/* ========================================
   FRIEND PAGE
======================================== */

function renderFriends() {

    const container =
        document.getElementById(
            "friendsList"
        );

    if (!container) return;

    container.innerHTML = "";


    friends.forEach((friend, index) => {

        const div =
            document.createElement("div");

        div.className = "leader";

        div.innerHTML = `

            <span>
                ${friend.avatar}
            </span>

            <strong>
                ${escapeHTML(friend.name)}
            </strong>

            <small>
                Online
            </small>

        `;

        container.appendChild(div);

    });

}


/* ========================================
   STATS
======================================== */

function updateStats() {

    document
        .getElementById("gamesPlayed")
        .textContent =
        player.games;

    document
        .getElementById("totalScore")
        .textContent =
        player.score;

    document
        .getElementById("wins")
        .textContent =
        player.wins;


    document
        .getElementById("rank1Name")
        .textContent =
        player.name;


    document
        .getElementById("rank1Score")
        .textContent =
        player.score;

}


/* ========================================
   GAME STATS
======================================== */

function addGameScore(
    points = 0,
    won = false
) {

    player.games++;

    player.score += points;

    if (won) {

        player.wins++;

    }


    localStorage.setItem(
        "fz_games",
        player.games
    );

    localStorage.setItem(
        "fz_score",
        player.score
    );

    localStorage.setItem(
        "fz_wins",
        player.wins
    );


    updateStats();

}


/* ========================================
   GAME SYSTEM
======================================== */

function openGame(game) {

    showPage("gamePage");

    const container =
        document.getElementById(
            "gameContainer"
        );


    container.innerHTML = `

        <div>

            <div style="
                font-size:60px;
                margin-bottom:20px;
            ">
                🎮
            </div>

            <h2>
                ${formatGameName(game)}
            </h2>

            <p style="
                color:#9898a8;
                margin-top:10px;
            ">
                Game module coming next...
            </p>

            <button
                class="primary-button"
                style="margin-top:20px"
                onclick="showGames()"
            >
                ← Choose Another Game
            </button>

        </div>

    `;


    /*
        In the next step,
        this function will load
        the actual game.
    */

}


/* ========================================
   GAME NAMES
======================================== */

function formatGameName(game) {

    const names = {

        tictactoe:
            "❌⭕ Tic Tac Toe",

        rps:
            "✊ Rock Paper Scissors",

        reaction:
            "🎯 Reaction Test",

        memory:
            "🧠 Memory Master",

        guess:
            "🔢 Guess Number",

        snake:
            "🐍 Snake",

        dice:
            "🎲 Dice Battle",

        roast:
            "😂 Roast Me",

        friendship:
            "❤️ Friendship Test",

        future:
            "🔮 Future Generator"

    };


    return names[game] || "Game";

}


/* ========================================
   TOAST
======================================== */

function showToast(message) {

    const toast =
        document.getElementById("toast");

    toast.textContent = message;

    toast.classList.add("show");


    setTimeout(() => {

        toast.classList.remove("show");

    }, 2500);

}


/* ========================================
   SIMPLE SECURITY
======================================== */

function escapeHTML(text) {

    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


/* ========================================
   STARTUP
======================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        renderSquad();

        updateStats();

        newThought();

    }
);
