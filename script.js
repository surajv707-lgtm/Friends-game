
/* =========================================
   FRIENDZONE
   AUTH + FRIEND SYSTEM FOUNDATION
========================================= */


/* =========================================
   GLOBAL DATA
========================================= */

let player = {

    name: "",

    email: "",

    friendId: "",

    games: 0,

    score: 0,

    wins: 0

};


/*
    IMPORTANT:
    There are NO fake/default friends.
*/

let bestFriends = [];

let friendRequests = [];


/* =========================================
   FUN THOUGHTS
========================================= */

const thoughts = [

    {
        text: "Whoever loses has to buy snacks.",
        author: "Your Squad 😂"
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
        text: "Nobody tell him he's losing.",
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


/* =========================================
   CAPTCHA
========================================= */

let captchaCorrectAnswer = 0;


function generateCaptcha() {

    const first =
        Math.floor(
            Math.random() * 10
        ) + 1;


    const second =
        Math.floor(
            Math.random() * 10
        ) + 1;


    captchaCorrectAnswer =
        first + second;


    const question =
        document.getElementById(
            "captchaQuestion"
        );


    if (question) {

        question.textContent =
            `${first} + ${second}`;

    }


    const answer =
        document.getElementById(
            "captchaAnswer"
        );


    if (answer) {

        answer.value = "";

    }

}


/* =========================================
   PASSWORD VALIDATION
========================================= */

function validatePassword(password) {

    const length =
        password.length >= 8;

    const capital =
        /[A-Z]/.test(password);

    const number =
        /[0-9]/.test(password);


    return {

        length: length,

        capital: capital,

        number: number,

        valid:
            length &&
            capital &&
            number

    };

}


/* =========================================
   UPDATE SIGNUP PASSWORD RULES
========================================= */

function updateSignupPasswordRules() {

    const input =
        document.getElementById(
            "signupPassword"
        );


    if (!input) return;


    const rules =
        validatePassword(
            input.value
        );


    updateRule(
        "signupRuleLength",
        rules.length,
        "At least 8 characters"
    );


    updateRule(
        "signupRuleCapital",
        rules.capital,
        "At least 1 capital letter"
    );


    updateRule(
        "signupRuleNumber",
        rules.number,
        "At least 1 number"
    );

}


/* =========================================
   UPDATE RESET PASSWORD RULES
========================================= */

function updateResetPasswordRules() {

    const input =
        document.getElementById(
            "newPassword"
        );


    if (!input) return;


    const rules =
        validatePassword(
            input.value
        );


    updateRule(
        "ruleLength",
        rules.length,
        "At least 8 characters"
    );


    updateRule(
        "ruleCapital",
        rules.capital,
        "At least 1 capital letter"
    );


    updateRule(
        "ruleNumber",
        rules.number,
        "At least 1 number"
    );

}


/* =========================================
   RULE UI
========================================= */

function updateRule(
    id,
    valid,
    text
) {

    const element =
        document.getElementById(id);


    if (!element) return;


    if (valid) {

        element.textContent =
            `✓ ${text}`;

        element.classList.add(
            "valid"
        );

    } else {

        element.textContent =
            `○ ${text}`;

        element.classList.remove(
            "valid"
        );

    }

}


/* =========================================
   AUTH SCREEN
========================================= */

function showSignup() {

    document
        .getElementById("signupForm")
        .classList.remove("hidden");

    document
        .getElementById("loginForm")
        .classList.add("hidden");

    document
        .getElementById("forgotForm")
        .classList.add("hidden");

}


function showLogin() {

    document
        .getElementById("signupForm")
        .classList.add("hidden");

    document
        .getElementById("loginForm")
        .classList.remove("hidden");

    document
        .getElementById("forgotForm")
        .classList.add("hidden");

}


function showForgotPassword() {

    document
        .getElementById("signupForm")
        .classList.add("hidden");

    document
        .getElementById("loginForm")
        .classList.add("hidden");

    document
        .getElementById("forgotForm")
        .classList.remove("hidden");


    document
        .getElementById("forgotStep1")
        .classList.remove("hidden");


    document
        .getElementById("forgotStep2")
        .classList.add("hidden");


    document
        .getElementById("forgotEmail")
        .value = "";

}


/* =========================================
   PASSWORD VISIBILITY
========================================= */

function togglePassword(id) {

    const input =
        document.getElementById(id);


    if (!input) return;


    if (
        input.type === "password"
    ) {

        input.type = "text";

    } else {

        input.type = "password";

    }

}


/* =========================================
   GENERATE FRIEND ID
========================================= */

function generateFriendId() {

    const number =
        Math.floor(
            100000 +
            Math.random() * 900000
        );


    return `FZ-${number}`;

}


/* =========================================
   CREATE ACCOUNT
========================================= */

function createAccount() {

    const name =
        document
            .getElementById("signupName")
            .value
            .trim();


    const email =
        document
            .getElementById("signupEmail")
            .value
            .trim()
            .toLowerCase();


    const password =
        document
            .getElementById("signupPassword")
            .value;


    const captcha =
        Number(
            document
                .getElementById("captchaAnswer")
                .value
        );


    /* NAME */

    if (!name) {

        showToast(
            "Please enter your name 😭"
        );

        return;

    }


    /* EMAIL */

    const validEmail =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            .test(email);


    if (!validEmail) {

        showToast(
            "Enter a valid email 📧"
        );

        return;

    }


    /* PASSWORD */

    const passwordRules =
        validatePassword(password);


    if (!passwordRules.valid) {

        showToast(
            "Password doesn't meet the requirements 🔐"
        );

        return;

    }


    /* CAPTCHA */

    if (
        captcha !==
        captchaCorrectAnswer
    ) {

        showToast(
            "CAPTCHA is incorrect 🤖"
        );

        generateCaptcha();

        return;

    }


    /* EXISTING ACCOUNT */

    const existing =
        getAccount();


    if (
        existing &&
        existing.email === email
    ) {

        showToast(
            "This email is already registered."
        );

        return;

    }


    /* ACCOUNT */

    const account = {

        name: name,

        email: email,

        password: password,

        friendId:
            generateFriendId(),

        createdAt:
            new Date().toISOString()

    };


    localStorage.setItem(
        "fz_account",
        JSON.stringify(account)
    );


    localStorage.setItem(
        "fz_logged_in",
        "true"
    );


    /* PLAYER */

    player.name =
        account.name;

    player.email =
        account.email;

    player.friendId =
        account.friendId;


    savePlayerStats();


    showToast(
        "Account created! Welcome 🎉"
    );


    setTimeout(
        enterApp,
        800
    );

}


/* =========================================
   LOGIN
========================================= */

function login() {

    const email =
        document
            .getElementById("loginEmail")
            .value
            .trim()
            .toLowerCase();


    const password =
        document
            .getElementById("loginPassword")
            .value;


    if (!email || !password) {

        showToast(
            "Enter email and password."
        );

        return;

    }


    const account =
        getAccount();


    if (!account) {

        showToast(
            "No account found. Please sign up first."
        );

        return;

    }


    if (
        account.email !== email
    ) {

        showToast(
            "Email is not registered ❌"
        );

        return;

    }


    if (
        account.password !== password
    ) {

        showToast(
            "Incorrect password ❌"
        );

        return;

    }


    localStorage.setItem(
        "fz_logged_in",
        "true"
    );


    player.name =
        account.name;

    player.email =
        account.email;

    player.friendId =
        account.friendId;


    loadPlayerStats();


    showToast(
        `Welcome back ${account.name}! 👋`
    );


    setTimeout(
        enterApp,
        700
    );

}


/* =========================================
   GET ACCOUNT
========================================= */

function getAccount() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "fz_account"
            )
        );

    } catch {

        return null;

    }

}


/* =========================================
   FORGOT PASSWORD
========================================= */

function verifyResetEmail() {

    const email =
        document
            .getElementById("forgotEmail")
            .value
            .trim()
            .toLowerCase();


    if (!email) {

        showToast(
            "Enter your email 📧"
        );

        return;

    }


    const account =
        getAccount();


    /*
        IMPORTANT:
        Only a registered email
        can continue.
    */

    if (!account) {

        showToast(
            "No account exists with this email ❌"
        );

        return;

    }


    if (
        account.email !== email
    ) {

        showToast(
            "This email is not registered ❌"
        );

        return;

    }


    /*
        Email is verified for this
        prototype.
    */

    document
        .getElementById("forgotStep1")
        .classList.add("hidden");


    document
        .getElementById("forgotStep2")
        .classList.remove("hidden");


    document
        .getElementById("newPassword")
        .value = "";


    document
        .getElementById("confirmPassword")
        .value = "";


    updateResetPasswordRules();


    showToast(
        "Email verified! ✅"
    );

}


/* =========================================
   RESET PASSWORD
========================================= */

function resetPassword() {

    const newPassword =
        document
            .getElementById("newPassword")
            .value;


    const confirmPassword =
        document
            .getElementById("confirmPassword")
            .value;


    const rules =
        validatePassword(
            newPassword
        );


    if (!rules.valid) {

        showToast(
            "Password doesn't meet the requirements ❌"
        );

        return;

    }


    if (
        newPassword !==
        confirmPassword
    ) {

        showToast(
            "Passwords don't match ❌"
        );

        return;

    }


    const account =
        getAccount();


    if (!account) {

        showToast(
            "Account not found ❌"
        );

        return;

    }


    /*
        Update password.
    */

    account.password =
        newPassword;


    localStorage.setItem(
        "fz_account",
        JSON.stringify(account)
    );


    showToast(
        "Password renewed successfully! 🎉"
    );


    document
        .getElementById("newPassword")
        .value = "";


    document
        .getElementById("confirmPassword")
        .value = "";


    setTimeout(
        showLogin,
        1000
    );

}


/* =========================================
   ENTER APP
========================================= */

function enterApp() {

    document
        .getElementById("authScreen")
        .classList.add("hidden");


    document
        .getElementById("mainApp")
        .classList.remove("hidden");


    loadPlayerStats();

    loadFriendSystem();

    updateStats();

    updateProfile();

    showHome();

}


/* =========================================
   PLAYER STATS
========================================= */

function savePlayerStats() {

    localStorage.setItem(
        "fz_player_stats",
        JSON.stringify({

            games:
                player.games,

            score:
                player.score,

            wins:
                player.wins

        })
    );

}


function loadPlayerStats() {

    const saved =
        JSON.parse(
            localStorage.getItem(
                "fz_player_stats"
            )
        );


    if (!saved) return;


    player.games =
        Number(saved.games) || 0;

    player.score =
        Number(saved.score) || 0;

    player.wins =
        Number(saved.wins) || 0;

}


/* =========================================
   UPDATE STATS
========================================= */

function updateStats() {

    const games =
        document.getElementById(
            "gamesPlayed"
        );

    const score =
        document.getElementById(
            "totalScore"
        );

    const wins =
        document.getElementById(
            "wins"
        );

    const rankName =
        document.getElementById(
            "rank1Name"
        );

    const rankScore =
        document.getElementById(
            "rank1Score"
        );


    if (games)
        games.textContent =
            player.games;


    if (score)
        score.textContent =
            player.score;


    if (wins)
        wins.textContent =
            player.wins;


    if (rankName)
        rankName.textContent =
            player.name || "You";


    if (rankScore)
        rankScore.textContent =
            player.score;

}


/* =========================================
   NAVIGATION
========================================= */

const pages = [

    "homePage",

    "gamesPage",

    "bestFriendsPage",

    "leaderboardPage",

    "gamePage"

];


function hidePages() {

    pages.forEach(
        id => {

            const page =
                document.getElementById(id);

            if (page) {

                page.classList.remove(
                    "active"
                );

            }

        }
    );

}


function showPage(id) {

    hidePages();


    const page =
        document.getElementById(id);


    if (!page) return;


    page.classList.add(
        "active"
    );


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


function showHome() {

    showPage(
        "homePage"
    );

}


function showGames() {

    showPage(
        "gamesPage"
    );

}


function showBestFriends() {

    showPage(
        "bestFriendsPage"
    );

    renderFriendSystem();

}


function showLeaderboard() {

    showPage(
        "leaderboardPage"
    );

    updateStats();

}


/* =========================================
   PROFILE
========================================= */

function updateProfile() {

    const account =
        getAccount();


    if (!account) return;


    const name =
        document.getElementById(
            "profileName"
        );


    const id =
        document.getElementById(
            "profileFriendId"
        );


    const myId =
        document.getElementById(
            "myFriendId"
        );


    if (name)
        name.textContent =
            account.name;


    if (id)
        id.textContent =
            account.friendId;


    if (myId)
        myId.textContent =
            account.friendId;

}


function openProfile() {

    updateProfile();


    document
        .getElementById(
            "profileModal"
        )
        .classList.add(
            "show"
        );

}


function closeProfile() {

    document
        .getElementById(
            "profileModal"
        )
        .classList.remove(
            "show"
        );

}


/* =========================================
   LOGOUT
========================================= */

function logout() {

    localStorage.removeItem(
        "fz_logged_in"
    );


    closeProfile();


    document
        .getElementById(
            "mainApp"
        )
        .classList.add(
            "hidden"
        );


    document
        .getElementById(
            "authScreen"
        )
        .classList.remove(
            "hidden"
        );


    showLogin();


    showToast(
        "Signed out successfully 👋"
    );

}


/* =========================================
   FRIEND ID COPY
========================================= */

function copyFriendId() {

    const account =
        getAccount();


    if (!account) return;


    if (
        navigator.clipboard
    ) {

        navigator.clipboard.writeText(
            account.friendId
        );

    }


    showToast(
        "Friend ID copied! 📋"
    );

}


/* =========================================
   BEST FRIEND SYSTEM
========================================= */

function loadFriendSystem() {

    try {

        bestFriends =
            JSON.parse(
                localStorage.getItem(
                    "fz_best_friends"
                )
            ) || [];


        friendRequests =
            JSON.parse(
                localStorage.getItem(
                    "fz_friend_requests"
                )
            ) || [];

    } catch {

        bestFriends = [];

        friendRequests = [];

    }

}


function saveFriendSystem() {

    localStorage.setItem(
        "fz_best_friends",
        JSON.stringify(
            bestFriends
        )
    );


    localStorage.setItem(
        "fz_friend_requests",
        JSON.stringify(
            friendRequests
        )
    );

}


/* =========================================
   SEND REQUEST
========================================= */

function sendBestFriendRequest() {

    const input =
        document.getElementById(
            "friendIdInput"
        );


    const friendId =
        input.value
            .trim()
            .toUpperCase();


    if (!friendId) {

        showToast(
            "Enter a Friend ID."
        );

        return;

    }


    const account =
        getAccount();


    if (!account) {

        showToast(
            "Please sign in first."
        );

        return;

    }


    if (
        friendId ===
        account.friendId
    ) {

        showToast(
            "You can't add yourself 😂"
        );

        return;

    }


    /*
        FRONTEND PROTOTYPE:
        Since there is no backend yet,
        this creates a pending request
        locally.

        Supabase will later replace this
        with a real cross-device request.
    */

    const alreadySent =
        friendRequests.some(
            request =>
                request.to === friendId
        );


    if (alreadySent) {

        showToast(
            "Request already sent 📩"
        );

        return;

    }


    friendRequests.push({

        id:
            Date.now(),

        from:
            account.friendId,

        fromName:
            account.name,

        to:
            friendId,

        status:
            "pending"

    });


    saveFriendSystem();


    input.value = "";


    renderFriendSystem();


    showToast(
        "Best Friend request sent ❤️"
    );

}


/* =========================================
   ACCEPT REQUEST
========================================= */

function acceptFriendRequest(id) {

    const request =
        friendRequests.find(
            item =>
                item.id === id
        );


    if (!request) return;


    request.status =
        "accepted";


    bestFriends.push({

        friendId:
            request.from,

        name:
            request.fromName

    });


    saveFriendSystem();


    renderFriendSystem();


    showToast(
        "You are now Best Friends! ❤️🎉"
    );

}


/* =========================================
   REJECT REQUEST
========================================= */

function rejectFriendRequest(id) {

    friendRequests =
        friendRequests.filter(
            request =>
                request.id !== id
        );


    saveFriendSystem();


    renderFriendSystem();


    showToast(
        "Request rejected."
    );

}


/* =========================================
   RENDER FRIEND SYSTEM
========================================= */

function renderFriendSystem() {

    renderRequests();

    renderBestFriends();

    renderBestFriendPreview();

}


/* =========================================
   RENDER REQUESTS
========================================= */

function renderRequests() {

    const container =
        document.getElementById(
            "friendRequests"
        );


    if (!container) return;


    const pending =
        friendRequests.filter(
            request =>
                request.status ===
                "pending"
        );


    if (!pending.length) {

        container.className =
            "empty-state";


        container.innerHTML = `

            <div>
                📭
            </div>

            <h3>
                No requests
            </h3>

            <p>
                When someone sends you a
                Best Friend request, it will
                appear here.
            </p>

        `;

        return;

    }


    container.className =
        "request-list";


    container.innerHTML = "";


    pending.forEach(
        request => {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "friend-request";


            item.innerHTML = `

                <div class="request-user">

                    <div class="mini-avatar">
                        ❤️
                    </div>

                    <div>

                        <strong>
                            ${escapeHTML(
                                request.fromName
                            )}
                        </strong>

                        <small>
                            Friend request
                        </small>

                    </div>

                </div>


                <div class="request-actions">

                    <button
                        class="accept-button"
                        onclick="acceptFriendRequest(${request.id})"
                    >
                        ✓ Accept
                    </button>

                    <button
                        class="reject-button"
                        onclick="rejectFriendRequest(${request.id})"
                    >
                        ✕
                    </button>

                </div>

            `;


            container.appendChild(
                item
            );

        }
    );

}


/* =========================================
   RENDER BEST FRIENDS
========================================= */

function renderBestFriends() {

    const container =
        document.getElementById(
            "bestFriendsList"
        );


    if (!container) return;


    if (!bestFriends.length) {

        container.className =
            "empty-state";


        container.innerHTML = `

            <div>
                ❤️
            </div>

            <h3>
                No Best Friends yet
            </h3>

            <p>
                Send a request to someone
                and wait for them to accept.
            </p>

        `;

        return;

    }


    container.className =
        "best-friends-list";


    container.innerHTML = "";


    bestFriends.forEach(
        friend => {

            const card =
                document.createElement(
                    "div"
                );


            card.className =
                "best-friend-card";


            card.innerHTML = `

                <div class="best-avatar">
                    ❤️
                </div>

                <div class="best-info">

                    <strong>
                        ${escapeHTML(
                            friend.name
                        )}
                    </strong>

                    <small>
                        Best Friend ❤️
                    </small>

                    <span>
                        ID: ${escapeHTML(
                            friend.friendId
                        )}
                    </span>

                </div>

            `;


            container.appendChild(
                card
            );

        }
    );

}


/* =========================================
   BEST FRIEND HOME PREVIEW
========================================= */

function renderBestFriendPreview() {

    const container =
        document.getElementById(
            "bestFriendsPreview"
        );


    if (!container) return;


    if (!bestFriends.length) {

        container.innerHTML = `

            <div>

                ❤️

                <br><br>

                <strong>
                    Your Best Friend circle is empty.
                </strong>

                <br>

                <small>
                    Add someone and wait for them
                    to accept your request.
                </small>

            </div>

        `;

        return;

    }


    container.innerHTML = "";


    bestFriends
        .slice(0, 4)
        .forEach(
            friend => {

                const div =
                    document.createElement(
                        "div"
                    );


                div.className =
                    "preview-friend";


                div.innerHTML = `

                    <div class="best-avatar">
                        ❤️
                    </div>

                    <strong>
                        ${escapeHTML(
                            friend.name
                        )}
                    </strong>

                `;


                container.appendChild(
                    div
                );

            }
        );

}


/* =========================================
   FRIEND SYSTEM STARTUP
========================================= */

function initializeFriendSystem() {

    loadFriendSystem();

    renderFriendSystem();

}


/* =========================================
   THOUGHT SYSTEM
========================================= */

function newThought() {

    const random =
        thoughts[
            Math.floor(
                Math.random() *
                thoughts.length
            )
        ];


    document
        .getElementById(
            "friendThought"
        )
        .textContent =
        `"${random.text}"`;


    document
        .getElementById(
            "thoughtAuthor"
        )
        .textContent =
        `— ${random.author}`;

}


/* =========================================
   GAME SYSTEM PLACEHOLDER
========================================= */

function openGame(game) {

    showPage(
        "gamePage"
    );


    const container =
        document.getElementById(
            "gameContainer"
        );


    const gameNames = {

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


    container.innerHTML = `

        <div>

            <div style="
                font-size:60px;
                margin-bottom:20px;
            ">
                🎮
            </div>

            <h2>
                ${gameNames[game] || "Game"}
            </h2>

            <p style="
                color:#9696a7;
                margin-top:10px;
            ">
                This game will be added next.
            </p>

            <button
                class="primary-button"
                style="margin-top:20px"
                onclick="showGames()"
            >
                ← Back to Games
            </button>

        </div>

    `;

}


/* =========================================
   HTML ESCAPE
========================================= */

function escapeHTML(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


/* =========================================
   TOAST
========================================= */

function showToast(message) {

    const toast =
        document.getElementById(
            "toast"
        );


    if (!toast) return;


    toast.textContent =
        message;


    toast.classList.add(
        "show"
    );


    clearTimeout(
        window.toastTimer
    );


    window.toastTimer =
        setTimeout(
            () => {

                toast.classList.remove(
                    "show"
                );

            },
            2500
        );

}


/* =========================================
   PASSWORD LIVE LISTENERS
========================================= */

document.addEventListener(
    "input",
    event => {

        if (
            event.target.id ===
            "signupPassword"
        ) {

            updateSignupPasswordRules();

        }


        if (
            event.target.id ===
            "newPassword"
        ) {

            updateResetPasswordRules();

        }

    }
);


/* =========================================
   STARTUP
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        generateCaptcha();


        const loggedIn =
            localStorage.getItem(
                "fz_logged_in"
            );


        if (loggedIn === "true") {

            const account =
                getAccount();


            if (account) {

                player.name =
                    account.name;

                player.email =
                    account.email;

                player.friendId =
                    account.friendId;


                loadPlayerStats();

                enterApp();

                return;

            }

        }


        document
            .getElementById(
                "authScreen"
            )
            .classList.remove(
                "hidden"
            );


        document
            .getElementById(
                "mainApp"
            )
            .classList.add(
                "hidden"
            );


        newThought();

    }
);
