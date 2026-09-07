/* =========================================================
   FRIENDZONE — FINAL SCRIPT
   Auth • Friends • Best Friends • Games • Game Arena
   XP • Leaderboard • Thoughts • Rooms • Profile
   Theme • Sound • Confetti • Bot Mode
   ========================================================= */

"use strict";


/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY = "friendzone_database_v6";
const CURRENT_USER_KEY = "friendzone_current_user_v6";
const THEME_KEY = "friendzone_theme_v6";
const SOUND_KEY = "friendzone_sound_v6";


let db = loadDatabase();
let currentUserId = localStorage.getItem(CURRENT_USER_KEY);

let currentLeaderboardType = "daily";

let captchaAnswer = null;

let tapGame = null;
let memoryGame = null;
let numberGame = null;

let toastTimer = null;
let audioContext = null;

let selectedGame = null;
let selectedBotDifficulty = "medium";

let currentArenaMode = null;
let currentArenaRoom = null;


/* =========================================================
   DEFAULT DATABASE
   ========================================================= */

function defaultDatabase() {
    return {
        users: [],
        friendRequests: [],
        bestFriendRequests: [],
        rooms: [],
        activities: [],
        settings: {}
    };
}


function loadDatabase() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return defaultDatabase();
        }

        const parsed = JSON.parse(saved);

        return {
            users: Array.isArray(parsed.users)
                ? parsed.users
                : [],

            friendRequests: Array.isArray(parsed.friendRequests)
                ? parsed.friendRequests
                : [],

            bestFriendRequests: Array.isArray(parsed.bestFriendRequests)
                ? parsed.bestFriendRequests
                : [],

            rooms: Array.isArray(parsed.rooms)
                ? parsed.rooms
                : [],

            activities: Array.isArray(parsed.activities)
                ? parsed.activities
                : [],

            settings:
                parsed.settings &&
                typeof parsed.settings === "object"
                    ? parsed.settings
                    : {}
        };
    } catch (error) {
        console.error("Database load error:", error);

        return defaultDatabase();
    }
}


function repairDatabase() {
    if (!Array.isArray(db.users)) {
        db.users = [];
    }

    if (!Array.isArray(db.friendRequests)) {
        db.friendRequests = [];
    }

    if (!Array.isArray(db.bestFriendRequests)) {
        db.bestFriendRequests = [];
    }

    if (!Array.isArray(db.rooms)) {
        db.rooms = [];
    }

    if (!Array.isArray(db.activities)) {
        db.activities = [];
    }

    db.users.forEach(user => {
        if (!user || typeof user !== "object") {
            return;
        }

        if (!Array.isArray(user.friends)) {
            user.friends = [];
        }

        if (!Array.isArray(user.bestFriends)) {
            user.bestFriends = [];
        }

        if (!Array.isArray(user.thoughts)) {
            user.thoughts = [];
        }

        if (!Array.isArray(user.achievements)) {
            user.achievements = [];
        }

        if (typeof user.name !== "string") {
            user.name = "FriendZone User";
        }

        if (typeof user.email !== "string") {
            user.email = "";
        }

        if (typeof user.friendId !== "string") {
            user.friendId = generateFriendId();
        }

        if (typeof user.xp !== "number") {
            user.xp = 0;
        }

        if (typeof user.xpDaily !== "number") {
            user.xpDaily = 0;
        }

        if (typeof user.xpWeekly !== "number") {
            user.xpWeekly = 0;
        }

        if (typeof user.level !== "number") {
            user.level = 1;
        }

        if (typeof user.gamesPlayed !== "number") {
            user.gamesPlayed = 0;
        }

        if (typeof user.gamesWon !== "number") {
            user.gamesWon = 0;
        }

        if (typeof user.streak !== "number") {
            user.streak = 1;
        }

        if (!user.lastActiveDate) {
            user.lastActiveDate = localDateKey();
        }

        if (!user.dailyDate) {
            user.dailyDate = localDateKey();
        }

        if (!user.weeklyDate) {
            user.weeklyDate = getWeekKey();
        }
    });
}


function saveDatabase() {
    repairDatabase();

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(db)
    );
}


function saveCurrentUser() {
    if (currentUserId) {
        localStorage.setItem(
            CURRENT_USER_KEY,
            currentUserId
        );
    } else {
        localStorage.removeItem(CURRENT_USER_KEY);
    }
}


/* =========================================================
   HELPERS
   ========================================================= */

function $(id) {
    return document.getElementById(id);
}


function $all(selector) {
    return [...document.querySelectorAll(selector)];
}


function show(element) {
    if (!element) return;

    element.classList.remove("hidden");
}


function hide(element) {
    if (!element) return;

    element.classList.add("hidden");
}


function getCurrentUser() {
    return (
        db.users.find(
            user =>
                user &&
                user.id === currentUserId
        ) || null
    );
}


function getUserById(id) {
    return (
        db.users.find(
            user =>
                user &&
                user.id === id
        ) || null
    );
}


function getUserByFriendId(friendId) {
    if (!friendId) {
        return null;
    }

    const wanted =
        String(friendId)
            .trim()
            .toUpperCase();

    return (
        db.users.find(user => {
            if (
                !user ||
                typeof user.friendId !== "string"
            ) {
                return false;
            }

            return (
                user.friendId
                    .trim()
                    .toUpperCase() === wanted
            );
        }) || null
    );
}


function makeId(prefix = "fz") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random()
            .toString(36)
            .slice(2, 10)
    );
}


function generateFriendId() {
    let id;

    do {
        const letters =
            "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

        let part = "";

        for (let i = 0; i < 2; i++) {
            part +=
                letters[
                    Math.floor(
                        Math.random() *
                        letters.length
                    )
                ];
        }

        const numbers =
            Math.floor(
                100000 +
                Math.random() * 900000
            );

        id = `FZ-${part}${numbers}`;

    } while (getUserByFriendId(id));

    return id;
}


function localDateKey(date = new Date()) {
    const y = date.getFullYear();

    const m = String(
        date.getMonth() + 1
    ).padStart(2, "0");

    const d = String(
        date.getDate()
    ).padStart(2, "0");

    return `${y}-${m}-${d}`;
}


function getWeekKey(date = new Date()) {
    const temp = new Date(date);

    temp.setHours(
        0,
        0,
        0,
        0
    );

    const day =
        temp.getDay() || 7;

    temp.setDate(
        temp.getDate() -
        day +
        1
    );

    return localDateKey(temp);
}


function formatTime(timestamp) {
    if (!timestamp) {
        return "";
    }

    const date = new Date(timestamp);

    return date.toLocaleString([], {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit"
    });
}


function validEmail(email) {
    return (
        typeof email === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
            email
        )
    );
}


function validPassword(password) {
    return (
        typeof password === "string" &&
        password.length >= 8 &&
        /[A-Z]/.test(password) &&
        /\d/.test(password)
    );
}


function getInitials(name) {
    if (!name) {
        return "?";
    }

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            part =>
                part[0]
        )
        .join("")
        .toUpperCase();
}


function escapeHTML(value) {
    return String(value ?? "")
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


/* =========================================================
   TOAST
   ========================================================= */

function showToast(
    message,
    type = "success"
) {
    const toast = $("toast");

    if (!toast) {
        return;
    }

    toast.textContent = message;

    toast.className =
        `toast show ${type}`;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove(
            "show"
        );
    }, 2800);
}


/* =========================================================
   SOUND
   ========================================================= */

function soundEnabled() {
    return (
        localStorage.getItem(
            SOUND_KEY
        ) !== "off"
    );
}


function playSound(type = "click") {
    if (!soundEnabled()) {
        return;
    }

    try {
        audioContext =
            audioContext ||
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        const settings = {
            click: {
                frequency: 420,
                duration: 0.055
            },

            success: {
                frequency: 660,
                duration: 0.1
            },

            error: {
                frequency: 170,
                duration: 0.13
            },

            win: {
                frequency: 820,
                duration: 0.16
            }
        };

        const chosen =
            settings[type] ||
            settings.click;

        oscillator.frequency.value =
            chosen.frequency;

        oscillator.type = "sine";

        gain.gain.setValueAtTime(
            0.0001,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.07,
            audioContext.currentTime +
            0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime +
            chosen.duration
        );

        oscillator.connect(gain);

        gain.connect(
            audioContext.destination
        );

        oscillator.start();

        oscillator.stop(
            audioContext.currentTime +
            chosen.duration
        );

    } catch {
        console.warn(
            "Audio unavailable."
        );
    }
}


function updateSoundButton() {
    const button =
        $("soundButton");

    if (!button) {
        return;
    }

    button.textContent =
        soundEnabled()
            ? "🔊"
            : "🔇";

    button.title =
        soundEnabled()
            ? "Turn sound off"
            : "Turn sound on";
}


/* =========================================================
   THEME
   ========================================================= */

function setupTheme() {
    const savedTheme =
        localStorage.getItem(
            THEME_KEY
        ) || "dark";

    document.documentElement.dataset.theme =
        savedTheme;

    const button =
        $("themeButton");

    if (button) {
        button.textContent =
            savedTheme === "dark"
                ? "☀️"
                : "🌙";
    }
}


function toggleTheme() {
    const current =
        document.documentElement
            .dataset.theme === "light"
            ? "light"
            : "dark";

    const next =
        current === "dark"
            ? "light"
            : "dark";

    document.documentElement.dataset.theme =
        next;

    localStorage.setItem(
        THEME_KEY,
        next
    );

    const button =
        $("themeButton");

    if (button) {
        button.textContent =
            next === "dark"
                ? "☀️"
                : "🌙";
    }

    playSound("click");
}


/* =========================================================
   AUTHENTICATION
   ========================================================= */

function setupAuthentication() {
    const signInTab =
        $("signInTab");

    const signUpTab =
        $("signUpTab");

    const signInForm =
        $("signInForm");

    const signUpForm =
        $("signUpForm");

    if (
        !signInTab ||
        !signUpTab ||
        !signInForm ||
        !signUpForm
    ) {
        console.error(
            "Authentication elements missing."
        );

        return;
    }


    signInTab.addEventListener(
        "click",
        event => {
            event.preventDefault();

            signInTab.classList.add(
                "active"
            );

            signUpTab.classList.remove(
                "active"
            );

            signInForm.classList.remove(
                "hidden"
            );

            signUpForm.classList.add(
                "hidden"
            );

            if ($("authTitle")) {
                $("authTitle").textContent =
                    "Welcome Back";
            }

            if ($("authSubtitle")) {
                $("authSubtitle").textContent =
                    "Sign in to continue your FriendZone journey.";
            }

            playSound("click");
        }
    );


    signUpTab.addEventListener(
        "click",
        event => {
            event.preventDefault();

            signUpTab.classList.add(
                "active"
            );

            signInTab.classList.remove(
                "active"
            );

            signUpForm.classList.remove(
                "hidden"
            );

            signInForm.classList.add(
                "hidden"
            );

            if ($("authTitle")) {
                $("authTitle").textContent =
                    "Create Account";
            }

            if ($("authSubtitle")) {
                $("authSubtitle").textContent =
                    "Create your account and start connecting.";
            }

            generateCaptcha();

            playSound("click");
        }
    );


    signInForm.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            signIn();
        }
    );


    signUpForm.addEventListener(
        "submit",
        event => {
            event.preventDefault();

            signUp();
        }
    );


    $("forgotPassword")?.addEventListener(
        "click",
        event => {
            event.preventDefault();

            openForgotPassword();
        }
    );


    $("refreshCaptcha")?.addEventListener(
        "click",
        event => {
            event.preventDefault();

            generateCaptcha();

            playSound("click");
        }
    );


    generateCaptcha();
}


function signIn() {
    const email =
        $("signinEmail")
            ?.value
            ?.trim()
            ?.toLowerCase() || "";

    const password =
        $("signinPassword")
            ?.value || "";


    if (!email || !password) {
        showToast(
            "Please enter email and password.",
            "error"
        );

        playSound("error");

        return;
    }


   const user = db.users.find(
    item => item.email.toLowerCase() === email
); 


    if (!user) {
        showToast(
            "No account found with this email.",
            "error"
        );

        playSound("error");

        return;
    }


    if (user.password !== password) {
        showToast(
            "Incorrect password.",
            "error"
        );

        playSound("error");

        return;
    }


    currentUserId =
        user.id;

    saveCurrentUser();

    repairUser(user);

    updateStreak(user);

    saveDatabase();

    showApp();

    showToast(
        `Welcome back, ${user.name}!`
    );

    playSound("success");
}


function signUp() {
    const name =
        $("signupName")
            ?.value
            ?.trim() || "";

    const email =
        $("signupEmail")
            ?.value
            ?.trim()
            ?.toLowerCase() || "";

    const password =
        $("signupPassword")
            ?.value || "";

    const captchaInput =
        $("captchaInput")
            ?.value
            ?.trim() || "";


    if (
        !name ||
        name.length < 2
    ) {
        showToast(
            "Please enter a valid name.",
            "error"
        );

        playSound("error");

        return;
    }


    if (!validEmail(email)) {
        showToast(
            "Please enter a valid email address.",
            "error"
        );

        playSound("error");

        return;
    }


    if (db.users.some(user => user.email.toLowerCase() === email)) {
        showToast(
            "An account with this email already exists.",
            "error"
        );

        playSound("error");

        return;
    }


    if (!validPassword(password)) {
        showToast(
            "Password needs 8+ characters, 1 capital letter and 1 number.",
            "error"
        );

        playSound("error");

        return;
    }


    if (
        Number(captchaInput) !==
        captchaAnswer
    ) {
        showToast(
            "Incorrect CAPTCHA answer.",
            "error"
        );

        generateCaptcha();

        playSound("error");

        return;
    }


    const user = {
        id: makeId("user"),

        name,

        email,

        password,

        friendId:
            generateFriendId(),

        avatar: "",

        friends: [],

        bestFriends: [],

        xp: 0,

        xpDaily: 0,

        xpWeekly: 0,

        dailyDate:
            localDateKey(),

        weeklyDate:
            getWeekKey(),

        level: 1,

        gamesPlayed: 0,

        gamesWon: 0,

        streak: 1,

        lastActiveDate:
            localDateKey(),

        thoughts: [],

        achievements: [],

        createdAt: Date.now()
    };


    db.users.push(user);

    currentUserId =
        user.id;

    saveCurrentUser();

    saveDatabase();

    showApp();

    showToast(
        `Account created! Your Friend ID is ${user.friendId}`
    );

    playSound("win");

    launchConfetti();
}


function repairUser(user) {
    if (!user) {
        return;
    }

    if (!Array.isArray(user.friends)) {
        user.friends = [];
    }

    if (!Array.isArray(user.bestFriends)) {
        user.bestFriends = [];
    }

    if (!Array.isArray(user.thoughts)) {
        user.thoughts = [];
    }

    if (!Array.isArray(user.achievements)) {
        user.achievements = [];
    }
}


function generateCaptcha() {
    const a =
        Math.floor(
            Math.random() * 9
        ) + 2;

    const b =
        Math.floor(
            Math.random() * 9
        ) + 2;

    captchaAnswer =
        a + b;

    if ($("captchaQuestion")) {
        $("captchaQuestion").textContent =
            `${a} + ${b} = ?`;
    }

    if ($("captchaInput")) {
        $("captchaInput").value =
            "";
    }
}


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

function openForgotPassword() {
    openModal(
        "Reset Password",
        `
        <div>
            <p>
                Enter the email address registered with your FriendZone account.
            </p>

            <input
                id="resetEmail"
                class="input"
                type="email"
                placeholder="Registered email"
                autocomplete="email"
            >

            <button
                id="verifyResetEmail"
                class="btn btn-primary"
                type="button"
                style="width:100%;margin-top:12px;"
            >
                Verify Email
            </button>

            <div id="resetPasswordArea" class="hidden">

                <input
                    id="newResetPassword"
                    class="input"
                    type="password"
                    placeholder="New password"
                    autocomplete="new-password"
                    style="margin-top:10px;"
                >

                <p style="margin-top:7px;font-size:.7rem;">
                    Minimum 8 characters, 1 capital letter and 1 number.
                </p>

                <button
                    id="saveNewPassword"
                    class="btn btn-primary"
                    type="button"
                    style="width:100%;margin-top:12px;"
                >
                    Save New Password
                </button>

            </div>
        </div>
        `
    );

    $("verifyResetEmail")
        ?.addEventListener(
            "click",
            verifyResetEmail
        );
}


function verifyResetEmail() {
    const email =
        $("resetEmail")
            ?.value
            ?.trim()
            ?.toLowerCase() || "";


    const user =
        db.users.find(
            item =>
                item &&
                typeof item.email === "string" &&
                item.email
                    .trim()
                    .toLowerCase() ===
                    email
        );


    if (!user) {
        showToast(
            "That email is not registered.",
            "error"
        );

        playSound("error");

        return;
    }


    showToast(
        "Email verified."
    );


    const area =
        $("resetPasswordArea");


    if (area) {
        area.classList.remove(
            "hidden"
        );
    }


    $("saveNewPassword")
        ?.addEventListener(
            "click",
            () => {
                const newPassword =
                    $("newResetPassword")
                        ?.value || "";


                if (
                    !validPassword(
                        newPassword
                    )
                ) {
                    showToast(
                        "Password needs 8+ characters, 1 capital letter and 1 number.",
                        "error"
                    );

                    playSound(
                        "error"
                    );

                    return;
                }


                user.password =
                    newPassword;

                saveDatabase();

                closeModal();

                showToast(
                    "Password changed successfully."
                );

                playSound(
                    "success"
                );
            }
        );
}


/* =========================================================
   APP
   ========================================================= */

function showApp() {
    const authScreen =
        $("authScreen");

    const appShell =
        $("appShell");


    if (
        !currentUserId ||
        !getCurrentUser()
    ) {
        show(authScreen);
        hide(appShell);

        return;
    }


    hide(authScreen);
    show(appShell);

    const user =
        getCurrentUser();

    repairUser(user);

    updateStreak(user);

    renderEverything();
}


function logout() {
    currentUserId = null;

    localStorage.removeItem(
        CURRENT_USER_KEY
    );

    closeModal();

    closeGameArena();

    show($("authScreen"));

    hide($("appShell"));


    if ($("signInForm")) {
        $("signInForm").reset();
    }


    if ($("signInTab")) {
        $("signInTab").click();
    }


    showToast(
        "You have been logged out."
    );

    playSound("click");
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
    $all(
        ".nav-link[data-section]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            event => {

                event.preventDefault();

                const section =
                    button.dataset.section;

                navigateTo(section);

                $("mainNav")
                    ?.classList
                    .remove("open");
            }
        );
    });


    $all("[data-go]")
        .forEach(button => {

            button.addEventListener(
                "click",
                event => {

                    event.preventDefault();

                    const section =
                        button.dataset.go;

                    if (section) {
                        navigateTo(
                            section
                        );
                    }
                }
            );
        });


    $("menuButton")
        ?.addEventListener(
            "click",
            event => {

                event.preventDefault();

                $("mainNav")
                    ?.classList
                    .toggle("open");

                playSound("click");
            }
        );
}


function navigateTo(sectionId) {
    const section =
        $(sectionId);


    if (!section) {
        console.warn(
            `Section "${sectionId}" does not exist.`
        );

        return;
    }


    $all(".app-section")
        .forEach(item => {
            item.classList.remove(
                "active"
            );
        });


    section.classList.add(
        "active"
    );


    $all(".nav-link")
        .forEach(link => {

            link.classList.toggle(
                "active",
                link.dataset.section ===
                    sectionId
            );
        });


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    playSound("click");
}


/* =========================================================
   FRIEND SYSTEM
   ========================================================= */

function areFriends(
    userA,
    userB
) {
    if (!userA || !userB) {
        return false;
    }

    repairUser(userA);
    repairUser(userB);

    return (
        userA.friends.includes(
            userB.id
        ) &&
        userB.friends.includes(
            userA.id
        )
    );
}


function pendingFriendRequest(
    fromId,
    toId
) {
    return db.friendRequests.find(
        request =>
            request &&
            request.fromId === fromId &&
            request.toId === toId &&
            request.status ===
                "pending"
    );
}


function setupFriendSystem() {
    $("sendFriendRequest")
        ?.addEventListener(
            "click",
            sendFriendRequest
        );


    $("friendIdInput")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {
                    event.preventDefault();

                    sendFriendRequest();
                }
            }
        );


    $("createRoom")
        ?.addEventListener(
            "click",
            createRoom
        );


    $("joinRoom")
        ?.addEventListener(
            "click",
            joinRoom
        );


    $("joinRoomInput")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {
                    event.preventDefault();

                    joinRoom();
                }
            }
        );


    $("copyRoomCode")
        ?.addEventListener(
            "click",
            () => {

                copyText(
                    $("roomCode")
                        ?.textContent || ""
                );
            }
        );
}


function sendFriendRequest() {
    const current =
        getCurrentUser();

    if (!current) {
        return;
    }

    repairUser(current);


    const friendId =
        $("friendIdInput")
            ?.value
            ?.trim()
            ?.toUpperCase() || "";


    if (!friendId) {
        showToast(
            "Enter a Friend ID first.",
            "error"
        );

        playSound("error");

        return;
    }


    if (
        typeof current.friendId ===
            "string" &&
        friendId ===
            current.friendId
                .toUpperCase()
    ) {
        showToast(
            "You cannot add yourself.",
            "error"
        );

        playSound("error");

        return;
    }


    const target =
        getUserByFriendId(
            friendId
        );


    if (!target) {
        showToast(
            "Friend ID not found.",
            "error"
        );

        playSound("error");

        return;
    }


    repairUser(target);


    if (
        areFriends(
            current,
            target
        )
    ) {
        showToast(
            "You are already friends.",
            "error"
        );

        playSound("error");

        return;
    }


    if (
        pendingFriendRequest(
            current.id,
            target.id
        )
    ) {
        showToast(
            "Friend request already sent.",
            "error"
        );

        playSound("error");

        return;
    }


    if (
        pendingFriendRequest(
            target.id,
            current.id
        )
    ) {
        showToast(
            "This person already sent you a request. Check requests.",
            "error"
        );

        playSound("error");

        return;
    }


    db.friendRequests.push({
        id: makeId("request"),

        fromId: current.id,

        toId: target.id,

        status: "pending",

        createdAt: Date.now()
    });


    saveDatabase();


    if ($("friendIdInput")) {
        $("friendIdInput").value =
            "";
    }


    renderFriends();

    updateFriendRequestBadge();


    showToast(
        `Friend request sent to ${target.name}!`
    );

    playSound("success");
}


function acceptFriendRequest(
    requestId
) {
    const current =
        getCurrentUser();

    if (!current) {
        return;
    }

    repairUser(current);


    const request =
        db.friendRequests.find(
            item =>
                item &&
                item.id === requestId &&
                item.toId ===
                    current.id &&
                item.status ===
                    "pending"
        );


    if (!request) {
        return;
    }


    const sender =
        getUserById(
            request.fromId
        );


    if (!sender) {
        return;
    }

    repairUser(sender);


    if (
        !current.friends.includes(
            sender.id
        )
    ) {
        current.friends.push(
            sender.id
        );
    }


    if (
        !sender.friends.includes(
            current.id
        )
    ) {
        sender.friends.push(
            current.id
        );
    }


    request.status =
        "accepted";

    request.acceptedAt =
        Date.now();


    addXP(
        current,
        50,
        false
    );


    saveDatabase();

    renderEverything();


    showToast(
        `${sender.name} is now your friend!`
    );

    playSound("success");

    launchConfetti();
}


function rejectFriendRequest(
    requestId
) {
    const current =
        getCurrentUser();

    if (!current) {
        return;
    }


    const request =
        db.friendRequests.find(
            item =>
                item &&
                item.id === requestId &&
                item.toId ===
                    current.id &&
                item.status ===
                    "pending"
        );


    if (!request) {
        return;
    }


    request.status =
        "rejected";


    saveDatabase();

    renderEverything();


    showToast(
        "Friend request rejected."
    );

    playSound("click");
}


function removeFriend(friendId) {
    const current =
        getCurrentUser();

    const friend =
        getUserById(
            friendId
        );


    if (!current || !friend) {
        return;
    }


    repairUser(current);
    repairUser(friend);


    current.friends =
        current.friends.filter(
            id =>
                id !== friend.id
        );


    friend.friends =
        friend.friends.filter(
            id =>
                id !== current.id
        );


    current.bestFriends =
        current.bestFriends.filter(
            id =>
                id !== friend.id
        );


    friend.bestFriends =
        friend.bestFriends.filter(
            id =>
                id !== current.id
        );


    saveDatabase();

    renderEverything();


    showToast(
        `${friend.name} removed from friends.`
    );
}


/* =========================================================
   BEST FRIENDS
   ========================================================= */

function toggleBestFriend(
    friendId
) {
    const current =
        getCurrentUser();

    const friend =
        getUserById(
            friendId
        );


    if (!current || !friend) {
        return;
    }


    repairUser(current);
    repairUser(friend);


    if (
        !areFriends(
            current,
            friend
        )
    ) {
        showToast(
            "You can only add a friend to Best Friends.",
            "error"
        );

        return;
    }


    const isBest =
        current.bestFriends.includes(
            friend.id
        );


    if (isBest) {

        current.bestFriends =
            current.bestFriends.filter(
                id =>
                    id !== friend.id
            );

        showToast(
            `${friend.name} removed from Best Friends.`
        );

    } else {

        current.bestFriends.push(
            friend.id
        );

        addAchievement(
            current,
            "best_friend"
        );

        showToast(
            `${friend.name} added to Best Friends!`
        );

        launchConfetti();
    }


    saveDatabase();

    renderEverything();
}


function openFriendDetails(
    friendId
) {
    const current =
        getCurrentUser();

    const friend =
        getUserById(
            friendId
        );


    if (!current || !friend) {
        return;
    }


    if (
        !areFriends(
            current,
            friend
        )
    ) {
        showToast(
            "Friend details are available after accepting the request.",
            "error"
        );

        return;
    }


    const best =
        current.bestFriends.includes(
            friend.id
        );


    openModal(
        friend.name,
        `
        <div style="text-align:center;">

            <div
                class="profile-avatar"
                style="width:72px;height:72px;font-size:1.1rem;"
            >
                ${
                    friend.avatar
                        ? `
                            <img
                                src="${escapeHTML(friend.avatar)}"
                                alt=""
                            >
                          `
                        : escapeHTML(
                              getInitials(
                                  friend.name
                              )
                          )
                }
            </div>

            <h3 style="margin-top:12px;">
                ${escapeHTML(
                    friend.name
                )}
            </h3>

            <p style="margin-top:5px;">
                Friend ID:
                ${escapeHTML(
                    friend.friendId
                )}
            </p>

            <p style="margin-top:8px;">
                Level ${friend.level}
                • ${friend.xp} XP
            </p>

            <p style="margin-top:6px;">
                🔥 ${friend.streak}
                day streak
            </p>

            ${
                best
                    ? `
                        <p
                            style="
                                margin-top:10px;
                                color:var(--pink);
                                font-weight:800;
                            "
                        >
                            💖 Best Friend
                        </p>
                      `
                    : ""
            }

        </div>
        `
    );
}


function setupFriendDelegation() {
    document.addEventListener(
        "click",
        event => {

            const button =
                event.target.closest(
                    "[data-action]"
                );


            if (!button) {
                return;
            }


            const action =
                button.dataset.action;

            const id =
                button.dataset.id;


            if (!action || !id) {
                return;
            }


            if (
                action ===
                "accept-friend"
            ) {
                acceptFriendRequest(
                    id
                );
            }


            if (
                action ===
                "reject-friend"
            ) {
                rejectFriendRequest(
                    id
                );
            }


            if (
                action ===
                "friend-details"
            ) {
                openFriendDetails(
                    id
                );
            }


            if (
                action ===
                "best-friend"
            ) {
                toggleBestFriend(
                    id
                );
            }


            if (
                action ===
                "remove-friend"
            ) {
                removeFriend(
                    id
                );
            }
        }
    );
}


function updateFriendRequestBadge() {
    const current =
        getCurrentUser();

    const badge =
        $("friendRequestBadge");


    if (!current || !badge) {
        return;
    }


    const count =
        db.friendRequests.filter(
            request =>
                request &&
                request.toId ===
                    current.id &&
                request.status ===
                    "pending"
        ).length;


    if (count > 0) {

        badge.textContent =
            count > 99
                ? "99+"
                : count;

        badge.classList.remove(
            "hidden"
        );

    } else {

        badge.classList.add(
            "hidden"
        );
    }
}


/* =========================================================
   XP
   ========================================================= */

function refreshXPPeriods(
    user
) {
    if (!user) {
        return;
    }


    const today =
        localDateKey();

    const week =
        getWeekKey();


    if (
        user.dailyDate !==
        today
    ) {
        user.dailyDate =
            today;

        user.xpDaily =
            0;
    }


    if (
        user.weeklyDate !==
        week
    ) {
        user.weeklyDate =
            week;

        user.xpWeekly =
            0;
    }
}


function addXP(
    user,
    amount,
    showMessage = true
) {
    if (
        !user ||
        amount <= 0
    ) {
        return;
    }


    refreshXPPeriods(user);


    user.xp += amount;

    user.xpDaily += amount;

    user.xpWeekly += amount;


    const oldLevel =
        user.level;


    user.level =
        Math.max(
            1,
            Math.floor(
                user.xp / 250
            ) + 1
        );


    if (
        user.level >
        oldLevel
    ) {

        if (showMessage) {

            showToast(
                `🎉 Level up! You reached Level ${user.level}!`
            );

            launchConfetti();

            playSound("win");
        }
    }


    if (
        user.level >= 5
    ) {
        addAchievement(
            user,
            "level_five"
        );
    }


    saveDatabase();
}


/* =========================================================
   STREAK
   ========================================================= */

function updateStreak(
    user
) {
    if (!user) {
        return;
    }


    const today =
        localDateKey();


    if (!user.lastActiveDate) {

        user.lastActiveDate =
            today;

        user.streak =
            1;

        return;
    }


    if (
        user.lastActiveDate ===
        today
    ) {
        return;
    }


    const last =
        new Date(
            user.lastActiveDate +
            "T00:00:00"
        );


    const current =
        new Date(
            today +
            "T00:00:00"
        );


    const difference =
        Math.round(
            (
                current -
                last
            ) / 86400000
        );


    if (
        difference === 1
    ) {
        user.streak =
            (user.streak || 0) +
            1;
    } else {
        user.streak =
            1;
    }


    user.lastActiveDate =
        today;


    if (
        user.streak >= 7
    ) {
        addAchievement(
            user,
            "streak_seven"
        );
    }


    saveDatabase();
}


/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

const ACHIEVEMENTS = {

    first_friend: {
        title: "First Friend",
        description:
            "Make your first friend.",
        icon: "🤝"
    },

    five_friends: {
        title: "Social Star",
        description:
            "Reach 5 friends.",
        icon: "⭐"
    },

    best_friend: {
        title: "Besties",
        description:
            "Add someone to Best Friends.",
        icon: "💖"
    },

    first_game: {
        title: "Game Starter",
        description:
            "Play your first game.",
        icon: "🎮"
    },

    game_winner: {
        title: "Winner",
        description:
            "Win your first game.",
        icon: "🏆"
    },

    level_five: {
        title: "Level 5",
        description:
            "Reach Level 5.",
        icon: "🚀"
    },

    streak_seven: {
        title: "7 Day Streak",
        description:
            "Maintain a 7 day streak.",
        icon: "🔥"
    }
};


function addAchievement(
    user,
    key
) {
    if (
        !user ||
        !ACHIEVEMENTS[key]
    ) {
        return;
    }


    if (
        !Array.isArray(
            user.achievements
        )
    ) {
        user.achievements =
            [];
    }


    if (
        !user.achievements.includes(
            key
        )
    ) {
        user.achievements.push(
            key
        );

        saveDatabase();
    }
}


function checkAchievements(
    user
) {
    if (!user) {
        return;
    }

    repairUser(user);


    if (
        user.friends.length >=
        1
    ) {
        addAchievement(
            user,
            "first_friend"
        );
    }


    if (
        user.friends.length >=
        5
    ) {
        addAchievement(
            user,
            "five_friends"
        );
    }


    if (
        user.gamesPlayed >=
        1
    ) {
        addAchievement(
            user,
            "first_game"
        );
    }


    if (
        user.gamesWon >=
        1
    ) {
        addAchievement(
            user,
            "game_winner"
        );
    }


    if (
        user.level >=
        5
    ) {
        addAchievement(
            user,
            "level_five"
        );
    }


    if (
        user.streak >=
        7
    ) {
        addAchievement(
            user,
            "streak_seven"
        );
    }


    if (
        user.bestFriends.length >=
        1
    ) {
        addAchievement(
            user,
            "best_friend"
        );
    }
}


/* =========================================================
   GAMES — NEW SYSTEM
   ========================================================= */

function setupGames() {

    $all(
        "[data-game]"
    ).forEach(card => {

        card.addEventListener(
            "click",
            event => {

                event.preventDefault();

                const game =
                    card.dataset.game;

                if (!game) {
                    return;
                }

                openGameModeSelector(
                    game
                );
            }
        );
    });


    $("playWithFriends")
        ?.addEventListener(
            "click",
            () => {

                if (!selectedGame) {
                    return;
                }

                closeGameModeModal();

                currentArenaMode =
                    "friends";

                navigateTo(
                    "roomSection"
                );

                prepareGameRoom(
                    selectedGame
                );

                playSound("success");
            }
        );


    $("playWithBot")
        ?.addEventListener(
            "click",
            () => {

                if (!selectedGame) {
                    return;
                }

                closeGameModeModal();

                openBotDifficultySelector();

                playSound("click");
            }
        );


    $all(
        "[data-difficulty]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            () => {

                selectedBotDifficulty =
                    button.dataset.difficulty ||
                    "medium";

                closeBotDifficultyModal();

                startBotGame(
                    selectedGame,
                    selectedBotDifficulty
                );

                playSound("success");
            }
        );
    });
}


/* =========================================================
   GAME MODE MODAL
   ========================================================= */

function gameInformation(
    game
) {
    const data = {

        tapRush: {
            icon: "⚡",
            title: "Tap Rush",
            description:
                "Tap as fast as possible before the timer ends."
        },

        memoryMatch: {
            icon: "🧠",
            title: "Memory Match",
            description:
                "Match every hidden pair."
        },

        numberGuess: {
            icon: "🎯",
            title: "Number Guess",
            description:
                "Find the hidden number from 1 to 100."
        }

    };


    return (
        data[game] || {
            icon: "🎮",
            title: "Game",
            description:
                "Choose how you want to play."
        }
    );
}


function openGameModeSelector(
    game
) {
    selectedGame =
        game;


    const info =
        gameInformation(game);


    if ($("gameModeIcon")) {
        $("gameModeIcon").textContent =
            info.icon;
    }


    if ($("gameModeTitle")) {
        $("gameModeTitle").textContent =
            info.title;
    }


    if ($("gameModeDescription")) {
        $("gameModeDescription").textContent =
            info.description;
    }


    const modal =
        $("gameModeModal");


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "hidden"
    );

    modal.classList.add(
        "active"
    );

    document.body.classList.add(
        "no-scroll"
    );
}


function closeGameModeModal() {
    const modal =
        $("gameModeModal");


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "active"
    );

    modal.classList.add(
        "hidden"
    );


    if (
        !$("generalModal")?.classList.contains(
            "active"
        ) &&
        !$("botDifficultyModal")?.classList.contains(
            "active"
        )
    ) {
        document.body.classList.remove(
            "no-scroll"
        );
    }
}


/* =========================================================
   BOT DIFFICULTY
   ========================================================= */

function openBotDifficultySelector() {
    const modal =
        $("botDifficultyModal");


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "hidden"
    );

    modal.classList.add(
        "active"
    );

    document.body.classList.add(
        "no-scroll"
    );
}


function closeBotDifficultyModal() {
    const modal =
        $("botDifficultyModal");


    if (!modal) {
        return;
    }


    modal.classList.remove(
        "active"
    );

    modal.classList.add(
        "hidden"
    );

    document.body.classList.remove(
        "no-scroll"
    );
}


/* =========================================================
   BOT GAME
   ========================================================= */

function startBotGame(
    game,
    difficulty
) {
    if (!game) {
        return;
    }


    currentArenaMode =
        "bot";


    if (game === "tapRush") {
        openTapRushArena(
            difficulty
        );
    }


    if (game === "memoryMatch") {
        openMemoryMatchArena(
            difficulty
        );
    }


    if (game === "numberGuess") {
        openNumberGuessArena(
            difficulty
        );
    }
}


/* =========================================================
   GAME ARENA
   ========================================================= */

function openGameArena(
    game,
    mode,
    content
) {
    const arena =
        $("gameArena");


    if (!arena) {
        showToast(
            "Game Arena is unavailable.",
            "error"
        );

        return;
    }


    const info =
        gameInformation(game);


    currentArenaMode =
        mode;


    if ($("arenaGameIcon")) {
        $("arenaGameIcon").textContent =
            info.icon;
    }


    if ($("arenaGameTitle")) {
        $("arenaGameTitle").textContent =
            info.title;
    }


    if ($("arenaGameMode")) {
        $("arenaGameMode").textContent =
            mode === "friends"
                ? "FRIEND ROOM"
                : "BOT MODE";
    }


    const user =
        getCurrentUser();


    if ($("arenaPlayerName")) {
        $("arenaPlayerName").textContent =
            user?.name ||
            "Player";
    }


    if ($("gameArenaContent")) {
        $("gameArenaContent").innerHTML =
            content;
    }


    hide($("appShell"));

    show(arena);

    document.body.classList.add(
        "no-scroll"
    );
}


function closeGameArena() {
    const arena =
        $("gameArena");


    if (!arena) {
        return;
    }


    hide(arena);

    show($("appShell"));

    document.body.classList.remove(
        "no-scroll"
    );


    if (
        tapGame?.timer
    ) {
        clearInterval(
            tapGame.timer
        );
    }


    tapGame = null;
    memoryGame = null;
    numberGame = null;

    currentArenaMode = null;
}


function setupGameArena() {
    $("exitGameArena")
        ?.addEventListener(
            "click",
            () => {

                closeGameArena();

                navigateTo(
                    "gamesSection"
                );

                playSound("click");
            }
        );
}


/* =========================================================
   GAME RESULT
   ========================================================= */

function gamePlayed(
    win,
    xpAmount
) {
    const user =
        getCurrentUser();


    if (!user) {
        return;
    }


    repairUser(user);


    user.gamesPlayed++;


    if (win) {
        user.gamesWon++;
    }


    addXP(
        user,
        xpAmount,
        false
    );


    checkAchievements(
        user
    );


    saveDatabase();

    renderEverything();
}


/* =========================================================
   TAP RUSH
   ========================================================= */

function openTapRushArena(
    difficulty = "medium"
) {
    tapGame = {
        score: 0,

        time:
            difficulty === "hard"
                ? 8
                : difficulty === "easy"
                    ? 12
                    : 10,

        running: false,

        timer: null,

        difficulty
    };


    openGameArena(
        "tapRush",
        currentArenaMode,
        `
        <div class="arena-game-screen">

            <div class="arena-game-heading">

                <div class="arena-game-icon">
                    ⚡
                </div>

                <h1>Tap Rush</h1>

                <p>
                    ${
                        currentArenaMode ===
                        "friends"
                            ? "Beat your friends!"
                            : `Bot difficulty: ${difficulty}`
                    }
                </p>

            </div>


            <div class="arena-opponents">

                <div class="opponent-pill active">
                    👤 You
                </div>

                ${
                    currentArenaMode ===
                    "bot"
                        ? `
                            <div class="opponent-pill">
                                🤖 Bot
                            </div>
                          `
                        : `
                            <div class="opponent-pill">
                                👥 Friend Room
                            </div>
                          `
                }

            </div>


            <div class="arena-status">

                <div class="arena-stat">

                    <span>SCORE</span>

                    <strong id="arenaTapScore">
                        0
                    </strong>

                </div>


                <div class="arena-stat">

                    <span>TIME</span>

                    <strong id="arenaTapTime">
                        ${tapGame.time}
                    </strong>

                </div>

            </div>


            <button
                id="arenaTapButton"
                class="arena-main-action"
                type="button"
            >
                TAP!
            </button>


            <button
                id="arenaTapStart"
                class="btn btn-primary arena-start-button"
                type="button"
            >
                Start Game
            </button>


            <div
                id="arenaTapMessage"
                class="arena-message"
            >
                Tap the button as quickly as possible!
            </div>

        </div>
        `
    );


    $("arenaTapStart")
        ?.addEventListener(
            "click",
            startTapRushArena
        );


    $("arenaTapButton")
        ?.addEventListener(
            "click",
            () => {

                if (
                    !tapGame ||
                    !tapGame.running
                ) {
                    return;
                }


                tapGame.score++;


                if (
                    $("arenaTapScore")
                ) {
                    $("arenaTapScore")
                        .textContent =
                        tapGame.score;
                }


                playSound("click");
            }
        );
}


function startTapRushArena() {
    if (!tapGame) {
        return;
    }


    tapGame.running =
        true;


    tapGame.score =
        0;


    if (
        $("arenaTapScore")
    ) {
        $("arenaTapScore")
            .textContent =
            "0";
    }


    if (
        $("arenaTapStart")
    ) {
        $("arenaTapStart")
            .disabled =
            true;
    }


    clearInterval(
        tapGame.timer
    );


    tapGame.timer =
        setInterval(
            () => {

                tapGame.time--;


                if (
                    $("arenaTapTime")
                ) {
                    $("arenaTapTime")
                        .textContent =
                        tapGame.time;
                }


                if (
                    tapGame.time <=
                    0
                ) {

                    clearInterval(
                        tapGame.timer
                    );


                    tapGame.running =
                        false;


                    finishTapRushArena();
                }

            },
            1000
        );
}


function finishTapRushArena() {
    if (!tapGame) {
        return;
    }


    const score =
        tapGame.score;


    let target =
        35;


    if (
        tapGame.difficulty ===
        "easy"
    ) {
        target = 28;
    }


    if (
        tapGame.difficulty ===
        "hard"
    ) {
        target = 42;
    }


    const win =
        score >= target;


    const xp =
        win
            ? 80
            : Math.min(
                  40,
                  score
              );


    gamePlayed(
        win,
        xp
    );


    if (
        $("arenaTapMessage")
    ) {

        $("arenaTapMessage")
            .textContent =
            win
                ? `🏆 You won! +${xp} XP`
                : `Good try! You scored ${score}. Need ${target} to win.`;
    }


    if (win) {
        showToast(
            `🏆 You won Tap Rush! +${xp} XP`
        );

        playSound("win");

        launchConfetti();
    } else {
        showToast(
            `Good try! ${score} taps.`,
            "error"
        );

        playSound("error");
    }


    if (
        $("arenaTapStart")
    ) {
        $("arenaTapStart")
            .disabled =
            false;

        $("arenaTapStart")
            .textContent =
            "Play Again";
    }
}


/* =========================================================
   MEMORY MATCH
   ========================================================= */

function openMemoryMatchArena(
    difficulty = "medium"
) {
    const symbols = [
        "🌟",
        "🚀",
        "🎮",
        "🔥",
        "💎",
        "🎯"
    ];


    const cards =
        [
            ...symbols,
            ...symbols
        ]
            .sort(
                () =>
                    Math.random() -
                    0.5
            )
            .map(
                (
                    symbol,
                    index
                ) => ({
                    id: index,

                    symbol,

                    flipped: false,

                    matched: false
                })
            );


    memoryGame = {
        cards,

        first: null,

        second: null,

        lock: false,

        matches: 0,

        difficulty
    };


    openGameArena(
        "memoryMatch",
        currentArenaMode,
        `
        <div class="arena-game-screen">

            <div class="arena-game-heading">

                <div class="arena-game-icon">
                    🧠
                </div>

                <h1>Memory Match</h1>

                <p>
                    Match all six pairs.
                </p>

            </div>


            <div class="arena-opponents">

                <div class="opponent-pill active">
                    👤 You
                </div>

                ${
                    currentArenaMode ===
                    "bot"
                        ? `
                            <div class="opponent-pill">
                                🤖 Bot
                            </div>
                          `
                        : `
                            <div class="opponent-pill">
                                👥 Friend Room
                            </div>
                          `
                }

            </div>


            <div class="arena-status">

                <div class="arena-stat">

                    <span>MATCHES</span>

                    <strong id="arenaMemoryMatches">
                        0 / 6
                    </strong>

                </div>


                <div class="arena-stat">

                    <span>MODE</span>

                    <strong>
                        ${
                            currentArenaMode ===
                            "bot"
                                ? "BOT"
                                : "FRIENDS"
                        }
                    </strong>

                </div>

            </div>


            <div
                id="arenaMemoryBoard"
                class="arena-memory-board"
            ></div>


            <div
                id="arenaMemoryMessage"
                class="arena-message"
            >
                Find all matching pairs.
            </div>

        </div>
        `
    );


    renderMemoryArenaBoard();
}


function renderMemoryArenaBoard() {
    const board =
        $("arenaMemoryBoard");


    if (
        !board ||
        !memoryGame
    ) {
        return;
    }


    board.innerHTML =
        memoryGame.cards
            .map(card => {

                const visible =
                    card.flipped ||
                    card.matched;


                return `
                    <button
                        class="arena-memory-card ${
                            visible
                                ? "flipped"
                                : ""
                        } ${
                            card.matched
                                ? "matched"
                                : ""
                        }"
                        data-arena-memory-id="${card.id}"
                        type="button"
                    >
                        ${
                            visible
                                ? escapeHTML(
                                      card.symbol
                                  )
                                : "?"
                        }
                    </button>
                `;
            })
            .join("");


    $all(
        "[data-arena-memory-id]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            () => {

                flipMemoryArenaCard(
                    Number(
                        button.dataset
                            .arenaMemoryId
                    )
                );
            }
        );
    });
}


function flipMemoryArenaCard(
    id
) {
    if (
        !memoryGame ||
        memoryGame.lock
    ) {
        return;
    }


    const card =
        memoryGame.cards.find(
            item =>
                item.id === id
        );


    if (
        !card ||
        card.flipped ||
        card.matched
    ) {
        return;
    }


    card.flipped =
        true;


    if (
        !memoryGame.first
    ) {

        memoryGame.first =
            card;

        renderMemoryArenaBoard();

        playSound("click");

        return;
    }


    memoryGame.second =
        card;

    memoryGame.lock =
        true;


    renderMemoryArenaBoard();


    if (
        memoryGame.first.symbol ===
        memoryGame.second.symbol
    ) {

        memoryGame.first.matched =
            true;

        memoryGame.second.matched =
            true;

        memoryGame.matches++;


        if (
            $("arenaMemoryMatches")
        ) {
            $("arenaMemoryMatches")
                .textContent =
                `${memoryGame.matches} / 6`;
        }


        memoryGame.first =
            null;

        memoryGame.second =
            null;

        memoryGame.lock =
            false;


        playSound("success");

        renderMemoryArenaBoard();


        if (
            memoryGame.matches ===
            6
        ) {

            gamePlayed(
                true,
                100
            );


            if (
                $("arenaMemoryMessage")
            ) {
                $("arenaMemoryMessage")
                    .textContent =
                    "🏆 Memory Master! +100 XP";
            }


            showToast(
                "🏆 Memory Master! +100 XP"
            );

            playSound("win");

            launchConfetti();
        }

    } else {

        setTimeout(
            () => {

                if (!memoryGame) {
                    return;
                }


                memoryGame.first.flipped =
                    false;

                memoryGame.second.flipped =
                    false;


                memoryGame.first =
                    null;

                memoryGame.second =
                    null;

                memoryGame.lock =
                    false;


                renderMemoryArenaBoard();

            },
            650
        );
    }
}


/* =========================================================
   NUMBER GUESS
   ========================================================= */

function openNumberGuessArena(
    difficulty = "medium"
) {
    numberGame = {
        target:
            Math.floor(
                Math.random() * 100
            ) + 1,

        attempts: 0,

        finished: false,

        difficulty
    };


    openGameArena(
        "numberGuess",
        currentArenaMode,
        `
        <div class="arena-game-screen">

            <div class="arena-game-heading">

                <div class="arena-game-icon">
                    🎯
                </div>

                <h1>Number Guess</h1>

                <p>
                    Find the hidden number from 1 to 100.
                </p>

            </div>


            <div class="arena-opponents">

                <div class="opponent-pill active">
                    👤 You
                </div>

                ${
                    currentArenaMode ===
                    "bot"
                        ? `
                            <div class="opponent-pill">
                                🤖 Bot
                            </div>
                          `
                        : `
                            <div class="opponent-pill">
                                👥 Friend Room
                            </div>
                          `
                }

            </div>


            <div class="arena-status">

                <div class="arena-stat">

                    <span>ATTEMPTS</span>

                    <strong id="arenaGuessAttempts">
                        0
                    </strong>

                </div>


                <div class="arena-stat">

                    <span>RANGE</span>

                    <strong>
                        1–100
                    </strong>

                </div>

            </div>


            <div class="arena-number-form">

                <input
                    id="arenaGuessInput"
                    class="input"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Enter your guess"
                >


                <button
                    id="arenaGuessButton"
                    class="btn btn-primary"
                    type="button"
                >
                    🎯 Guess
                </button>

            </div>


            <div
                id="arenaGuessMessage"
                class="arena-message"
            >
                Good luck!
            </div>

        </div>
        `
    );


    $("arenaGuessButton")
        ?.addEventListener(
            "click",
            makeArenaGuess
        );


    $("arenaGuessInput")
        ?.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Enter"
                ) {
                    event.preventDefault();

                    makeArenaGuess();
                }
            }
        );
}


function makeArenaGuess() {
    if (
        !numberGame ||
        numberGame.finished
    ) {
        return;
    }


    const input =
        $("arenaGuessInput");


    const message =
        $("arenaGuessMessage");


    const guess =
        Number(
            input?.value
        );


    if (
        !Number.isInteger(
            guess
        ) ||
        guess < 1 ||
        guess > 100
    ) {

        showToast(
            "Enter a number from 1 to 100.",
            "error"
        );

        playSound("error");

        return;
    }


    numberGame.attempts++;


    if (
        $("arenaGuessAttempts")
    ) {
        $("arenaGuessAttempts")
            .textContent =
            numberGame.attempts;
    }


    if (
        guess ===
        numberGame.target
    ) {

        numberGame.finished =
            true;


        const xp =
            Math.max(
                35,
                100 -
                    numberGame.attempts *
                        10
            );


        gamePlayed(
            true,
            xp
        );


        if (message) {
            message.textContent =
                `🎉 Correct! The number was ${numberGame.target}. +${xp} XP`;
        }


        showToast(
            `🏆 You won! +${xp} XP`
        );


        playSound("win");

        launchConfetti();


        if (
            $("arenaGuessButton")
        ) {
            $("arenaGuessButton")
                .disabled =
                true;
        }


        return;
    }


    if (message) {

        message.textContent =
            guess <
            numberGame.target
                ? "⬆️ Try a higher number."
                : "⬇️ Try a lower number.";
    }


    playSound("click");
}


/* =========================================================
   ROOMS
   ========================================================= */

function generateRoomCode() {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let code = "";


    for (
        let i = 0;
        i < 6;
        i++
    ) {
        code +=
            chars[
                Math.floor(
                    Math.random() *
                    chars.length
                )
            ];
    }


    return code;
}


function createRoom() {
    const current =
        getCurrentUser();


    if (!current) {
        return;
    }


    let code;


    do {
        code =
            generateRoomCode();

    } while (
        db.rooms.some(
            room =>
                room &&
                room.code === code
        )
    );


    const room = {

        id:
            makeId("room"),

        code,

        hostId:
            current.id,

        members: [
            current.id
        ],

        createdAt:
            Date.now(),

        game:
            selectedGame ||
            null,

        gameStarted:
            false
    };


    db.rooms.push(room);

    saveDatabase();


    currentArenaRoom =
        room;


    renderRoom(room);


    showToast(
        `Room created: ${code}`
    );


    playSound("success");
}


function joinRoom() {
    const current =
        getCurrentUser();


    if (!current) {
       
