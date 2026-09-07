/* =========================================================
   FRIENDZONE — STABLE FINAL SCRIPT
   Auth • Friends • Best Friends • Games • Game Arena
   XP • Leaderboard • Thoughts • Rooms • Profile
   Theme • Sound • Confetti • Self-Healing Database
   ========================================================= */

"use strict";

/* =========================================================
   STORAGE
========================================================= */

const STORAGE_KEY = "friendzone_database_v6";
const CURRENT_USER_KEY = "friendzone_current_user_v6";
const THEME_KEY = "friendzone_theme_v6";
const SOUND_KEY = "friendzone_sound_v6";

const OLD_STORAGE_KEYS = [
    "friendzone_database_v5",
    "friendzone_database_v4",
    "friendzone_database_v3"
];

let db;
let currentUserId = safeStorageGet(CURRENT_USER_KEY);

let currentLeaderboardType = "daily";
let captchaAnswer = null;

let selectedGame = null;
let selectedBotDifficulty = "medium";

let currentArenaMode = null;
let currentArenaRoom = null;

let tapGame = null;
let memoryGame = null;
let numberGame = null;

let toastTimer = null;
let audioContext = null;

let roomRefreshTimer = null;

let appInitialized = false;


/* =========================================================
   BASIC HELPERS
========================================================= */

function $(id) {
    return document.getElementById(id);
}

function $all(selector) {
    return Array.from(document.querySelectorAll(selector));
}

function show(element) {
    if (!element) return;
    element.classList.remove("hidden");
}

function hide(element) {
    if (!element) return;
    element.classList.add("hidden");
}

function safeStorageGet(key) {
    try {
        return localStorage.getItem(key);
    } catch (error) {
        console.error("Storage read error:", error);
        return null;
    }
}

function safeStorageSet(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch (error) {
        console.error("Storage write error:", error);
        return false;
    }
}

function safeStorageRemove(key) {
    try {
        localStorage.removeItem(key);
    } catch (error) {
        console.error("Storage remove error:", error);
    }
}

function makeId(prefix = "id") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 9)
    );
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getInitials(name) {
    const value = String(name || "User").trim();

    if (!value) {
        return "U";
    }

    const parts = value.split(/\s+/);

    if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
    }

    return (
        parts[0][0] +
        parts[parts.length - 1][0]
    ).toUpperCase();
}

function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        String(email || "").trim()
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

function formatTime(timestamp) {
    if (!timestamp) return "Just now";

    const diff = Date.now() - Number(timestamp);

    if (diff < 60000) {
        return "Just now";
    }

    if (diff < 3600000) {
        return Math.floor(diff / 60000) + "m ago";
    }

    if (diff < 86400000) {
        return Math.floor(diff / 3600000) + "h ago";
    }

    if (diff < 604800000) {
        return Math.floor(diff / 86400000) + "d ago";
    }

    return new Date(timestamp).toLocaleDateString();
}

function localDateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function getWeekKey(date = new Date()) {
    const copy = new Date(date);
    copy.setHours(0, 0, 0, 0);

    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    copy.setDate(copy.getDate() + diff);

    return localDateKey(copy);
}


/* =========================================================
   DATABASE
========================================================= */

function defaultDatabase() {
    return {
        version: 6,
        users: [],
        friendRequests: [],
        rooms: [],
        thoughts: [],
        settings: {
            createdAt: Date.now()
        }
    };
}

function isObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}

function toSafeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
}

function normalizeArray(value) {
    return Array.isArray(value)
        ? value
        : [];
}

function loadDatabase() {
    let parsed = null;
    let sourceKey = STORAGE_KEY;

    const currentRaw = safeStorageGet(STORAGE_KEY);

    if (currentRaw) {
        try {
            parsed = JSON.parse(currentRaw);
        } catch (error) {
            console.warn(
                "Current FriendZone database is damaged. Trying backup..."
            );
        }
    }

    /*
     * IMPORTANT:
     * If v6 is broken, don't immediately create an empty DB.
     * Try older versions first so existing data is preserved.
     */
    if (!isObject(parsed)) {
        for (const key of OLD_STORAGE_KEYS) {
            const raw = safeStorageGet(key);

            if (!raw) continue;

            try {
                const oldData = JSON.parse(raw);

                if (isObject(oldData)) {
                    parsed = oldData;
                    sourceKey = key;
                    break;
                }
            } catch (error) {
                console.warn(
                    "Could not read old database:",
                    key
                );
            }
        }
    }

    if (!isObject(parsed)) {
        parsed = defaultDatabase();
    }

    const normalized = normalizeDatabase(parsed);

    /*
     * If data came from an old version, immediately save the
     * repaired version into v6.
     */
    if (sourceKey !== STORAGE_KEY) {
        safeStorageSet(
            STORAGE_KEY,
            JSON.stringify(normalized)
        );
    }

    return normalized;
}

function normalizeDatabase(data) {
    const clean = defaultDatabase();

    if (!isObject(data)) {
        return clean;
    }

    clean.version = 6;

    clean.users = normalizeArray(data.users)
        .map(user => normalizeUser(user))
        .filter(Boolean);

    clean.friendRequests = normalizeArray(
        data.friendRequests
    )
        .map(request => normalizeFriendRequest(request))
        .filter(Boolean);

    clean.rooms = normalizeArray(data.rooms)
        .map(room => normalizeRoom(room))
        .filter(Boolean);

    clean.thoughts = normalizeArray(data.thoughts)
        .map(thought => normalizeThought(thought))
        .filter(Boolean);

    clean.settings = isObject(data.settings)
        ? data.settings
        : {};

    return clean;
}

function normalizeUser(user) {
    if (!isObject(user)) {
        return null;
    }

    const clean = {
        id:
            typeof user.id === "string" &&
            user.id.trim()
                ? user.id
                : makeId("user"),

        name:
            typeof user.name === "string" &&
            user.name.trim()
                ? user.name.trim()
                : "FriendZone User",

        email:
            typeof user.email === "string"
                ? user.email.trim().toLowerCase()
                : "",

        password:
            typeof user.password === "string"
                ? user.password
                : "",

        friendId:
            typeof user.friendId === "string"
                ? user.friendId.trim().toUpperCase()
                : "",

        friends: normalizeArray(user.friends)
            .filter(id => typeof id === "string"),

        bestFriends: normalizeArray(user.bestFriends)
            .filter(id => typeof id === "string"),

        achievements: normalizeArray(user.achievements)
            .filter(id => typeof id === "string"),

        xp: Math.max(
            0,
            toSafeNumber(user.xp, 0)
        ),

        dailyXP: Math.max(
            0,
            toSafeNumber(user.dailyXP, 0)
        ),

        weeklyXP: Math.max(
            0,
            toSafeNumber(user.weeklyXP, 0)
        ),

        dailyXPDate:
            typeof user.dailyXPDate === "string"
                ? user.dailyXPDate
                : "",

        weeklyXPWeek:
            typeof user.weeklyXPWeek === "string"
                ? user.weeklyXPWeek
                : "",

        streak: Math.max(
            1,
            toSafeNumber(user.streak, 1)
        ),

        lastActiveDate:
            typeof user.lastActiveDate === "string"
                ? user.lastActiveDate
                : "",

        gamesPlayed: Math.max(
            0,
            toSafeNumber(user.gamesPlayed, 0)
        ),

        createdAt:
            toSafeNumber(
                user.createdAt,
                Date.now()
            )
    };

    return clean;
}

function normalizeFriendRequest(request) {
    if (!isObject(request)) {
        return null;
    }

    if (
        typeof request.fromId !== "string" ||
        typeof request.toId !== "string"
    ) {
        return null;
    }

    return {
        id:
            typeof request.id === "string"
                ? request.id
                : makeId("request"),

        fromId: request.fromId,
        toId: request.toId,

        status:
            request.status === "accepted" ||
            request.status === "rejected"
                ? request.status
                : "pending",

        createdAt:
            toSafeNumber(
                request.createdAt,
                Date.now()
            )
    };
}

function normalizeRoom(room) {
    if (!isObject(room)) {
        return null;
    }

    if (
        typeof room.code !== "string" ||
        typeof room.hostId !== "string"
    ) {
        return null;
    }

    return {
        id:
            typeof room.id === "string"
                ? room.id
                : makeId("room"),

        code: room.code
            .trim()
            .toUpperCase(),

        hostId: room.hostId,

        members: normalizeArray(room.members)
            .filter(id => typeof id === "string"),

        createdAt:
            toSafeNumber(
                room.createdAt,
                Date.now()
            ),

        game:
            typeof room.game === "string"
                ? room.game
                : null,

        gameStarted:
            Boolean(room.gameStarted)
    };
}

function normalizeThought(thought) {
    if (!isObject(thought)) {
        return null;
    }

    if (typeof thought.userId !== "string") {
        return null;
    }

    return {
        id:
            typeof thought.id === "string"
                ? thought.id
                : makeId("thought"),

        userId: thought.userId,

        text:
            typeof thought.text === "string"
                ? thought.text.slice(0, 160)
                : "",

        createdAt:
            toSafeNumber(
                thought.createdAt,
                Date.now()
            )
    };
}


/* =========================================================
   DATABASE REPAIR
========================================================= */

function friendIdExists(friendId, exceptUserId = null) {
    return db.users.some(user => {
        if (!user) return false;

        if (
            exceptUserId &&
            user.id === exceptUserId
        ) {
            return false;
        }

        return (
            typeof user.friendId === "string" &&
            user.friendId.toUpperCase() ===
                friendId.toUpperCase()
        );
    });
}

function generateFriendId() {
    let id;

    do {
        const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        const first =
            letters[Math.floor(Math.random() * letters.length)];

        const second =
            letters[Math.floor(Math.random() * letters.length)];

        const numbers =
            Math.floor(
                100000 +
                Math.random() * 900000
            );

        id = `FZ-${first}${second}${numbers}`;
    } while (friendIdExists(id));

    return id;
}

function repairUser(user) {
    if (!user) {
        return null;
    }

    /*
     * Repair all basic fields without deleting useful data.
     */

    if (
        typeof user.id !== "string" ||
        !user.id.trim()
    ) {
        user.id = makeId("user");
    }

    if (
        typeof user.name !== "string" ||
        !user.name.trim()
    ) {
        user.name = "FriendZone User";
    }

    user.name = user.name.trim();

    if (typeof user.email !== "string") {
        user.email = "";
    }

    user.email = user.email
        .trim()
        .toLowerCase();

    if (typeof user.password !== "string") {
        user.password = "";
    }

    if (
        typeof user.friendId !== "string" ||
        !user.friendId.trim() ||
        friendIdExists(
            user.friendId,
            user.id
        )
    ) {
        user.friendId =
            generateFriendIdForUser(
                user.id
            );
    }

    user.friendId =
        user.friendId
            .trim()
            .toUpperCase();

    user.friends = normalizeArray(user.friends)
        .filter(id =>
            typeof id === "string"
        );

    user.bestFriends =
        normalizeArray(user.bestFriends)
            .filter(id =>
                typeof id === "string"
            );

    user.achievements =
        normalizeArray(user.achievements)
            .filter(id =>
                typeof id === "string"
            );

    user.xp = Math.max(
        0,
        toSafeNumber(user.xp, 0)
    );

    user.dailyXP = Math.max(
        0,
        toSafeNumber(user.dailyXP, 0)
    );

    user.weeklyXP = Math.max(
        0,
        toSafeNumber(user.weeklyXP, 0)
    );

    user.streak = Math.max(
        1,
        toSafeNumber(user.streak, 1)
    );

    user.gamesPlayed = Math.max(
        0,
        toSafeNumber(user.gamesPlayed, 0)
    );

    if (typeof user.dailyXPDate !== "string") {
        user.dailyXPDate = "";
    }

    if (typeof user.weeklyXPWeek !== "string") {
        user.weeklyXPWeek = "";
    }

    if (typeof user.lastActiveDate !== "string") {
        user.lastActiveDate = "";
    }

    user.createdAt = toSafeNumber(
        user.createdAt,
        Date.now()
    );

    return user;
}

function generateFriendIdForUser(exceptUserId) {
    let id;

    do {
        const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";

        const first =
            letters[
                Math.floor(
                    Math.random() *
                    letters.length
                )
            ];

        const second =
            letters[
                Math.floor(
                    Math.random() *
                    letters.length
                )
            ];

        const numbers =
            Math.floor(
                100000 +
                Math.random() * 900000
            );

        id = `FZ-${first}${second}${numbers}`;
    } while (
        db.users.some(
            user =>
                user &&
                user.id !== exceptUserId &&
                typeof user.friendId === "string" &&
                user.friendId === id
        )
    );

    return id;
}

function repairDatabase() {
    if (!isObject(db)) {
        db = defaultDatabase();
    }

    db.version = 6;

    if (!Array.isArray(db.users)) {
        db.users = [];
    }

    db.users = db.users
        .map(user => repairUser(user))
        .filter(Boolean);

    if (!Array.isArray(db.friendRequests)) {
        db.friendRequests = [];
    }

    if (!Array.isArray(db.rooms)) {
        db.rooms = [];
    }

    if (!Array.isArray(db.thoughts)) {
        db.thoughts = [];
    }

    /*
     * Remove references to users that no longer exist.
     * This repairs broken old data without wiping the database.
     */

    const validUserIds = new Set(
        db.users.map(user => user.id)
    );

    db.users.forEach(user => {
        user.friends = user.friends.filter(
            id =>
                validUserIds.has(id) &&
                id !== user.id
        );

        user.bestFriends =
            user.bestFriends.filter(
                id =>
                    user.friends.includes(id)
            );
    });

    db.friendRequests =
        db.friendRequests.filter(
            request =>
                request &&
                validUserIds.has(request.fromId) &&
                validUserIds.has(request.toId) &&
                request.fromId !== request.toId
        );

    db.rooms = db.rooms.filter(
        room =>
            room &&
            validUserIds.has(room.hostId)
    );

    db.rooms.forEach(room => {
        room.members = room.members.filter(
            id => validUserIds.has(id)
        );

        if (
            !room.members.includes(
                room.hostId
            )
        ) {
            room.members.unshift(
                room.hostId
            );
        }
    });

    db.thoughts =
        db.thoughts.filter(
            thought =>
                thought &&
                validUserIds.has(
                    thought.userId
                ) &&
                typeof thought.text === "string" &&
                thought.text.trim()
        );

    return db;
}

function saveDatabase() {
    repairDatabase();

    const success = safeStorageSet(
        STORAGE_KEY,
        JSON.stringify(db)
    );

    if (!success) {
        showToast(
            "Could not save data on this device.",
            "error"
        );
    }

    return success;
}

function saveCurrentUser() {
    const user = getCurrentUser();

    if (user) {
        safeStorageSet(
            CURRENT_USER_KEY,
            user.id
        );
        currentUserId = user.id;
    }
}


/* =========================================================
   USER LOOKUPS
========================================================= */

function getCurrentUser() {
    if (!currentUserId) {
        return null;
    }

    const user = db.users.find(
        item =>
            item &&
            item.id === currentUserId
    );

    if (!user) {
        safeStorageRemove(
            CURRENT_USER_KEY
        );

        currentUserId = null;

        return null;
    }

    repairUser(user);

    return user;
}

function getUserById(id) {
    if (!id) return null;

    return db.users.find(
        user =>
            user &&
            user.id === id
    ) || null;
}

function getUserByFriendId(friendId) {
    if (
        typeof friendId !== "string" ||
        !friendId.trim()
    ) {
        return null;
    }

    const target =
        friendId.trim().toUpperCase();

    return db.users.find(
        user =>
            user &&
            typeof user.friendId === "string" &&
            user.friendId.toUpperCase() ===
                target
    ) || null;
}


/* =========================================================
   TOAST
========================================================= */

function showToast(
    message,
    type = "normal"
) {
    const toast = $("toast");

    if (!toast) return;

    clearTimeout(toastTimer);

    toast.textContent = String(
        message || ""
    );

    toast.className = "toast";

    if (type === "error") {
        toast.classList.add("error");
    }

    if (type === "success") {
        toast.classList.add("success");
    }

    requestAnimationFrame(() => {
        toast.classList.add("show");
    });

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}


/* =========================================================
   SOUND
========================================================= */

function soundEnabled() {
    return (
        safeStorageGet(SOUND_KEY) !==
        "off"
    );
}

function playSound(type = "click") {
    if (!soundEnabled()) {
        return;
    }

    try {
        if (!audioContext) {
            const AudioCtx =
                window.AudioContext ||
                window.webkitAudioContext;

            if (!AudioCtx) return;

            audioContext =
                new AudioCtx();
        }

        if (
            audioContext.state ===
            "suspended"
        ) {
            audioContext.resume();
        }

        const oscillator =
            audioContext.createOscillator();

        const gain =
            audioContext.createGain();

        const frequencies = {
            click: 420,
            success: 720,
            error: 180,
            pop: 560,
            win: 880
        };

        oscillator.frequency.value =
            frequencies[type] ||
            frequencies.click;

        oscillator.type =
            type === "error"
                ? "sawtooth"
                : "sine";

        gain.gain.setValueAtTime(
            0.0001,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.045,
            audioContext.currentTime + 0.01
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + 0.12
        );

        oscillator.connect(gain);
        gain.connect(
            audioContext.destination
        );

        oscillator.start();
        oscillator.stop(
            audioContext.currentTime + 0.13
        );
    } catch (error) {
        console.warn(
            "Sound unavailable:",
            error
        );
    }
}

function setupSound() {
    const button = $("soundButton");

    if (!button) return;

    function refresh() {
        button.textContent =
            soundEnabled()
                ? "🔊"
                : "🔇";
    }

    button.addEventListener(
        "click",
        () => {
            if (soundEnabled()) {
                safeStorageSet(
                    SOUND_KEY,
                    "off"
                );
            } else {
                safeStorageSet(
                    SOUND_KEY,
                    "on"
                );

                playSound("click");
            }

            refresh();
        }
    );

    refresh();
}


/* =========================================================
   THEME
========================================================= */

function setupTheme() {
    const button = $("themeButton");

    let theme =
        safeStorageGet(THEME_KEY) ||
        "dark";

    if (
        theme !== "dark" &&
        theme !== "light"
    ) {
        theme = "dark";
    }

    applyTheme(theme);

    if (!button) return;

    button.addEventListener(
        "click",
        () => {
            theme =
                document.documentElement
                    .getAttribute("data-theme") ===
                "light"
                    ? "dark"
                    : "light";

            applyTheme(theme);
            playSound("click");
        }
    );
}

function applyTheme(theme) {
    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

    safeStorageSet(
        THEME_KEY,
        theme
    );

    const button = $("themeButton");

    if (button) {
        button.textContent =
            theme === "light"
                ? "🌙"
                : "☀️";
    }
}


/* =========================================================
   CAPTCHA
========================================================= */

function generateCaptcha() {
    const first =
        Math.floor(
            Math.random() * 20
        ) + 1;

    const second =
        Math.floor(
            Math.random() * 20
        ) + 1;

    captchaAnswer =
        first + second;

    const question =
        $("captchaQuestion");

    if (question) {
        question.textContent =
            `${first} + ${second} = ?`;
    }

    const input =
        $("captchaInput");

    if (input) {
        input.value = "";
    }
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

    if (signInTab) {
        signInTab.addEventListener(
            "click",
            () => {
                showSignIn();
                playSound("click");
            }
        );
    }

    if (signUpTab) {
        signUpTab.addEventListener(
            "click",
            () => {
                showSignUp();
                playSound("click");
            }
        );
    }

    if (signInForm) {
        signInForm.addEventListener(
            "submit",
            event => {
                event.preventDefault();
                signIn();
            }
        );
    }

    if (signUpForm) {
        signUpForm.addEventListener(
            "submit",
            event => {
                event.preventDefault();
                signUp();
            }
        );
    }

    const refresh =
        $("refreshCaptcha");

    if (refresh) {
        refresh.addEventListener(
            "click",
            () => {
                generateCaptcha();
                playSound("click");
            }
        );
    }

    const forgot =
        $("forgotPassword");

    if (forgot) {
        forgot.addEventListener(
            "click",
            openForgotPassword
        );
    }

    generateCaptcha();
}

function showSignIn() {
    const signInForm =
        $("signInForm");

    const signUpForm =
        $("signUpForm");

    const signInTab =
        $("signInTab");

    const signUpTab =
        $("signUpTab");

    show(signInForm);
    hide(signUpForm);

    signInTab?.classList.add("active");
    signUpTab?.classList.remove("active");

    const title =
        $("authTitle");

    const subtitle =
        $("authSubtitle");

    if (title) {
        title.textContent =
            "Welcome Back";
    }

    if (subtitle) {
        subtitle.textContent =
            "Sign in to continue your FriendZone journey.";
    }
}

function showSignUp() {
    const signInForm =
        $("signInForm");

    const signUpForm =
        $("signUpForm");

    const signInTab =
        $("signInTab");

    const signUpTab =
        $("signUpTab");

    hide(signInForm);
    show(signUpForm);

    signInTab?.classList.remove("active");
    signUpTab?.classList.add("active");

    const title =
        $("authTitle");

    const subtitle =
        $("authSubtitle");

    if (title) {
        title.textContent =
            "Create Account";
    }

    if (subtitle) {
        subtitle.textContent =
            "Create your FriendZone identity and start connecting.";
    }

    generateCaptcha();
}

function signIn() {
    /*
     * THIS IS THE IMPORTANT FIX.
     *
     * Never do:
     * user.email.toLowerCase()
     *
     * without checking that email exists.
     */

    repairDatabase();

    const emailInput =
        $("signinEmail");

    const passwordInput =
        $("signinPassword");

    if (!emailInput || !passwordInput) {
        showToast(
            "Sign In form is unavailable.",
            "error"
        );
        return;
    }

    const email =
        emailInput.value
            .trim()
            .toLowerCase();

    const password =
        passwordInput.value;

    if (!validEmail(email)) {
        showToast(
            "Please enter a valid email.",
            "error"
        );
        return;
    }

    if (!password) {
        showToast(
            "Please enter your password.",
            "error"
        );
        return;
    }

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
            "Account not found. Please check your email.",
            "error"
        );
        return;
    }

    if (
        typeof user.password !== "string" ||
        user.password !== password
    ) {
        showToast(
            "Incorrect password.",
            "error"
        );
        return;
    }

    repairUser(user);

    currentUserId = user.id;

    saveCurrentUser();

    updateStreak();
    saveDatabase();

    showApp();

    playSound("success");

    showToast(
        `Welcome back, ${user.name}!`,
        "success"
    );
}

function signUp() {
    repairDatabase();

    const nameInput =
        $("signupName");

    const emailInput =
        $("signupEmail");

    const passwordInput =
        $("signupPassword");

    const captchaInput =
        $("captchaInput");

    if (
        !nameInput ||
        !emailInput ||
        !passwordInput ||
        !captchaInput
    ) {
        showToast(
            "Sign Up form is unavailable.",
            "error"
        );
        return;
    }

    const name =
        nameInput.value.trim();

    const email =
        emailInput.value
            .trim()
            .toLowerCase();

    const password =
        passwordInput.value;

    const captchaValue =
        Number(captchaInput.value);

    if (name.length < 2) {
        showToast(
            "Please enter your name.",
            "error"
        );
        return;
    }

    if (!validEmail(email)) {
        showToast(
            "Please enter a valid email.",
            "error"
        );
        return;
    }

    if (!validPassword(password)) {
        showToast(
            "Password must be 8+ characters with 1 capital letter and 1 number.",
            "error"
        );
        return;
    }

    if (
        captchaAnswer === null ||
        captchaValue !== captchaAnswer
    ) {
        showToast(
            "CAPTCHA answer is incorrect.",
            "error"
        );

        generateCaptcha();
        return;
    }

    /*
     * Safe email comparison.
     * This fixes old users with missing email values.
     */

    const alreadyExists =
        db.users.some(
            user =>
                user &&
                typeof user.email === "string" &&
                user.email
                    .trim()
                    .toLowerCase() ===
                    email
        );

    if (alreadyExists) {
        showToast(
            "An account with this email already exists.",
            "error"
        );
        return;
    }

    const user = {
        id: makeId("user"),
        name,
        email,
        password,
        friendId: "",
        friends: [],
        bestFriends: [],
        achievements: [],
        xp: 0,
        dailyXP: 0,
        weeklyXP: 0,
        dailyXPDate: "",
        weeklyXPWeek: "",
        streak: 1,
        lastActiveDate: localDateKey(),
        gamesPlayed: 0,
        createdAt: Date.now()
    };

    user.friendId =
        generateFriendIdForUser(
            user.id
        );

    db.users.push(user);

    currentUserId = user.id;

    saveCurrentUser();

    updateStreak();

    saveDatabase();

    showApp();

    playSound("success");

    confetti();

    showToast(
        "Account created successfully!",
        "success"
    );
}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

function openForgotPassword() {
    const modal =
        $("generalModal");

    if (!modal) return;

    const title =
        modal.querySelector(
            ".modal-title"
        );

    const body =
        modal.querySelector(
            ".modal-body"
        );

    if (title) {
        title.textContent =
            "Forgot Password";
    }

    if (body) {
        body.innerHTML = `
            <p>
                Enter the registered email address
                linked to your FriendZone account.
            </p>

            <input
                id="resetEmailInput"
                class="input"
                type="email"
                placeholder="Registered email"
                autocomplete="email"
                style="margin-top:12px;"
            >

            <button
                id="verifyResetEmail"
                class="btn btn-primary"
                type="button"
                style="width:100%;margin-top:10px;"
            >
                Verify Email
            </button>
        `;
    }

    showModal("generalModal");

    setTimeout(() => {
        $("verifyResetEmail")?.addEventListener(
            "click",
            verifyResetEmail
        );
    }, 0);
}

function verifyResetEmail() {
    repairDatabase();

    const input =
        $("resetEmailInput");

    if (!input) return;

    const email =
        input.value
            .trim()
            .toLowerCase();

    if (!validEmail(email)) {
        showToast(
            "Enter a valid email.",
            "error"
        );
        return;
    }

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
            "No FriendZone account was found with this email.",
            "error"
        );
        return;
    }

    const modal =
        $("generalModal");

    const title =
        modal?.querySelector(
            ".modal-title"
        );

    const body =
        modal?.querySelector(
            ".modal-body"
        );

    if (title) {
        title.textContent =
            "Reset Password";
    }

    if (body) {
        body.innerHTML = `
            <p>
                Email verified. Create a new password.
            </p>

            <input
                id="newResetPassword"
                class="input"
                type="password"
                placeholder="New password"
                style="margin-top:12px;"
            >

            <input
                id="confirmResetPassword"
                class="input"
                type="password"
                placeholder="Confirm password"
                style="margin-top:8px;"
            >

            <button
                id="resetPasswordButton"
                class="btn btn-primary"
                type="button"
                style="width:100%;margin-top:10px;"
            >
                Reset Password
            </button>
        `;
    }

    setTimeout(() => {
        $("resetPasswordButton")?.addEventListener(
            "click",
            () => {
                const password =
                    $("newResetPassword")?.value || "";

                const confirm =
                    $("confirmResetPassword")?.value || "";

                if (!validPassword(password)) {
                    showToast(
                        "Password must be 8+ characters with 1 capital letter and 1 number.",
                        "error"
                    );
                    return;
                }

                if (password !== confirm) {
                    showToast(
                        "Passwords do not match.",
                        "error"
                    );
                    return;
                }

                user.password = password;

                saveDatabase();

                closeModal(
                    "generalModal"
                );

                showSignIn();

                const signInEmail =
                    $("signinEmail");

                if (signInEmail) {
                    signInEmail.value =
                        user.email;
                }

                showToast(
                    "Password reset successfully.",
                    "success"
                );

                playSound("success");
            }
        );
    }, 0);
}


/* =========================================================
   APP SCREEN
========================================================= */

function showApp() {
    repairDatabase();

    const current =
        getCurrentUser();

    if (!current) {
        showAuth();

        return;
    }

    updateStreak();

    const auth =
        $("authScreen");

    const app =
        $("appShell");

    hide(auth);
    show(app);

    renderEverything();

    navigateTo(
        "homeSection",
        false
    );
}

function showAuth() {
    const auth =
        $("authScreen");

    const app =
        $("appShell");

    show(auth);
    hide(app);

    closeAllModals();

    const arena =
        $("gameArena");

    hide(arena);

    document.body.classList.remove(
        "no-scroll"
    );
}

function logout() {
    const current =
        getCurrentUser();

    if (current) {
        saveDatabase();
    }

    currentUserId = null;

    safeStorageRemove(
        CURRENT_USER_KEY
    );

    currentArenaMode = null;
    currentArenaRoom = null;

    clearGameTimers();

    stopRoomRefresh();

    showAuth();

    const email =
        $("signinEmail");

    const password =
        $("signinPassword");

    if (email) email.value = "";
    if (password) password.value = "";

    showSignIn();

    playSound("click");

    showToast(
        "You have been logged out."
    );
}


/* =========================================================
   NAVIGATION
========================================================= */

function setupNavigation() {
    $all(
        "[data-section]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const section =
                    button.getAttribute(
                        "data-section"
                    );

                navigateTo(section);
            }
        );
    });

    $all(
        "[data-go]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const section =
                    button.getAttribute(
                        "data-go"
                    );

                navigateTo(section);
            }
        );
    });

    const menu =
        $("menuButton");

    if (menu) {
        menu.addEventListener(
            "click",
            () => {
                $("mainNav")
                    ?.classList.toggle(
                        "open"
                    );

                playSound("click");
            }
        );
    }

    document.addEventListener(
        "click",
        event => {
            const nav =
                $("mainNav");

            const menuButton =
                $("menuButton");

            if (
                !nav ||
                !nav.classList.contains(
                    "open"
                )
            ) {
                return;
            }

            if (
                !nav.contains(
                    event.target
                ) &&
                event.target !==
                    menuButton
            ) {
                nav.classList.remove(
                    "open"
                );
            }
        }
    );
}

function navigateTo(
    sectionId,
    play = true
) {
    if (!sectionId) {
        return;
    }

    const section =
        $(sectionId);

    if (!section) {
        console.warn(
            "Section not found:",
            sectionId
        );
        return;
    }

    $all(
        ".app-section"
    ).forEach(sectionItem => {
        sectionItem.classList.remove(
            "active"
        );
    });

    section.classList.add(
        "active"
    );

    $all(
        ".nav-link"
    ).forEach(button => {
        button.classList.toggle(
            "active",
            button.getAttribute(
                "data-section"
            ) === sectionId
        );
    });

    $("mainNav")
        ?.classList.remove(
            "open"
        );

    if (sectionId === "homeSection") {
        renderHome();
    }

    if (sectionId === "friendsSection") {
        renderFriends();
    }

    if (sectionId === "gamesSection") {
        renderGames();
    }

    if (
        sectionId ===
        "leaderboardSection"
    ) {
        renderLeaderboard();
    }

    if (sectionId === "thoughtsSection") {
        renderThoughts();
    }

    if (sectionId === "roomSection") {
        renderCurrentRoom();
        startRoomRefresh();
    } else {
        stopRoomRefresh();
    }

    if (sectionId === "profileSection") {
        renderProfile();
    }

    if (play) {
        playSound("click");
    }

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
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
            request.status === "pending" &&
            request.fromId === fromId &&
            request.toId === toId
    );
}

function setupFriendSystem() {
    const send =
        $("sendFriendRequest");

    if (send) {
        send.addEventListener(
            "click",
            sendFriendRequest
        );
    }

    const input =
        $("friendIdInput");

    if (input) {
        input.addEventListener(
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
    }
}

function sendFriendRequest() {
    const current =
        getCurrentUser();

    if (!current) {
        showAuth();
        return;
    }

    const input =
        $("friendIdInput");

    if (!input) return;

    const friendId =
        input.value
            .trim()
            .toUpperCase();

    if (!friendId) {
        showToast(
            "Enter a Friend ID.",
            "error"
        );
        return;
    }

    if (
        friendId ===
        current.friendId
    ) {
        showToast(
            "You cannot add yourself.",
            "error"
        );
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
        return;
    }

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
        return;
    }

    if (
        pendingFriendRequest(
            target.id,
            current.id
        )
    ) {
        showToast(
            "This person already sent you a request.",
            "error"
        );
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

    input.value = "";

    renderFriends();

    showToast(
        `Request sent to ${target.name}.`,
        "success"
    );

    playSound("success");
}

function acceptFriendRequest(
    requestId
) {
    const current =
        getCurrentUser();

    if (!current) return;

    const request =
        db.friendRequests.find(
            item =>
                item &&
                item.id === requestId &&
                item.toId === current.id &&
                item.status === "pending"
        );

    if (!request) {
        showToast(
            "Request no longer exists.",
            "error"
        );
        return;
    }

    const sender =
        getUserById(
            request.fromId
        );

    if (!sender) {
        request.status = "rejected";
        saveDatabase();
        renderFriends();
        return;
    }

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

    saveDatabase();

    updateStreak();

    renderEverything();

    confetti();

    showToast(
        `${sender.name} is now your friend!`,
        "success"
    );

    playSound("success");
}

function rejectFriendRequest(
    requestId
) {
    const current =
        getCurrentUser();

    if (!current) return;

    const request =
        db.friendRequests.find(
            item =>
                item &&
                item.id === requestId &&
                item.toId === current.id &&
                item.status === "pending"
        );

    if (!request) {
        return;
    }

    request.status =
        "rejected";

    saveDatabase();

    renderFriends();

    showToast(
        "Friend request rejected."
    );

    playSound("click");
}

function removeFriend(
    userId
) {
    const current =
        getCurrentUser();

    const other =
        getUserById(userId);

    if (!current || !other) {
        return;
    }

    current.friends =
        current.friends.filter(
            id => id !== other.id
        );

    other.friends =
        other.friends.filter(
            id => id !== current.id
        );

    current.bestFriends =
        current.bestFriends.filter(
            id => id !== other.id
        );

    other.bestFriends =
        other.bestFriends.filter(
            id => id !== current.id
        );

    saveDatabase();

    renderEverything();

    showToast(
        `${other.name} removed from your friends.`
    );
}


/* =========================================================
   BEST FRIENDS
========================================================= */

function toggleBestFriend(
    userId
) {
    const current =
        getCurrentUser();

    if (!current) return;

    if (
        !current.friends.includes(
            userId
        )
    ) {
        showToast(
            "Only accepted friends can become Best Friends.",
            "error"
        );
        return;
    }

    const index =
        current.bestFriends.indexOf(
            userId
        );

    if (index >= 0) {
        current.bestFriends.splice(
            index,
            1
        );

        showToast(
            "Removed from Best Friends."
        );
    } else {
        current.bestFriends.push(
            userId
        );

        showToast(
            "Added to Best Friends! 💖",
            "success"
        );

        playSound("success");
    }

    saveDatabase();

    renderEverything();
}

function openFriendDetails(
    userId
) {
    const current =
        getCurrentUser();

    const friend =
        getUserById(userId);

    if (
        !current ||
        !friend ||
        !areFriends(
            current,
            friend
        )
    ) {
        showToast(
            "Friend details are only available after accepting the request.",
            "error"
        );
        return;
    }

    const modal =
        $("generalModal");

    const title =
        modal?.querySelector(
            ".modal-title"
        );

    const body =
        modal?.querySelector(
            ".modal-body"
        );

    if (!modal || !title || !body) {
        return;
    }

    title.textContent =
        friend.name;

    body.innerHTML = `
        <div style="text-align:center;">
            <div class="profile-avatar" style="margin:0 auto 12px;">
                ${escapeHTML(
                    getInitials(
                        friend.name
                    )
                )}
            </div>

            <h3>
                ${escapeHTML(
                    friend.name
                )}
            </h3>

            <p style="margin-top:5px;">
                ${escapeHTML(
                    friend.email ||
                    "FriendZone member"
                )}
            </p>

            <div class="profile-id" style="margin-top:15px;">
                <span>Friend ID</span>
                <strong>
                    ${escapeHTML(
                        friend.friendId
                    )}
                </strong>
            </div>

            <div style="margin-top:12px;">
                ⚡ ${friend.xp} XP
                &nbsp; • &nbsp;
                🔥 ${friend.streak} streak
            </div>
        </div>
    `;

    showModal(
        "generalModal"
    );
}


/* =========================================================
   XP
========================================================= */

function refreshXPPeriods(
    user
) {
    if (!user) return;

    const today =
        localDateKey();

    const week =
        getWeekKey();

    if (
        user.dailyXPDate !==
        today
    ) {
        user.dailyXP = 0;
        user.dailyXPDate =
            today;
    }

    if (
        user.weeklyXPWeek !==
        week
    ) {
        user.weeklyXP = 0;
        user.weeklyXPWeek =
            week;
    }
}

function addXP(
    amount
) {
    const current =
        getCurrentUser();

    if (!current) return;

    const safeAmount =
        Math.max(
            0,
            Math.floor(
                Number(amount) || 0
            )
        );

    refreshXPPeriods(
        current
    );

    current.xp += safeAmount;
    current.dailyXP += safeAmount;
    current.weeklyXP += safeAmount;

    checkAchievements();

    saveDatabase();
}


/* =========================================================
   STREAK
========================================================= */

function updateStreak() {
    const current =
        getCurrentUser();

    if (!current) return;

    const today =
        localDateKey();

    if (
        !current.lastActiveDate
    ) {
        current.lastActiveDate =
            today;

        current.streak = 1;

        return;
    }

    if (
        current.lastActiveDate ===
        today
    ) {
        return;
    }

    const last =
        new Date(
            current.lastActiveDate +
            "T00:00:00"
        );

    const now =
        new Date(
            today +
            "T00:00:00"
        );

    const diff =
        Math.round(
            (now - last) /
            86400000
        );

    if (diff === 1) {
        current.streak += 1;
    } else if (diff > 1) {
        current.streak = 1;
    }

    current.lastActiveDate =
        today;

    saveDatabase();
}


/* =========================================================
   ACHIEVEMENTS
========================================================= */

const ACHIEVEMENTS = [
    {
        id: "first_friend",
        icon: "👥",
        title: "First Friend",
        description:
            "Make your first friend."
    },

    {
        id: "five_friends",
        icon: "🤝",
        title: "Friend Circle",
        description:
            "Reach 5 friends."
    },

    {
        id: "best_friend",
        icon: "💖",
        title: "Bestie",
        description:
            "Choose a Best Friend."
    },

    {
        id: "first_game",
        icon: "🎮",
        title: "Player One",
        description:
            "Play your first game."
    },

    {
        id: "xp_500",
        icon: "⚡",
        title: "XP Hunter",
        description:
            "Earn 500 XP."
    },

    {
        id: "xp_1000",
        icon: "🏆",
        title: "XP Master",
        description:
            "Earn 1000 XP."
    },

    {
        id: "streak_7",
        icon: "🔥",
        title: "On Fire",
        description:
            "Reach a 7-day streak."
    }
];

function addAchievement(
    achievementId
) {
    const current =
        getCurrentUser();

    if (!current) return false;

    if (
        current.achievements.includes(
            achievementId
        )
    ) {
        return false;
    }

    current.achievements.push(
        achievementId
    );

    const achievement =
        ACHIEVEMENTS.find(
            item =>
                item.id ===
                achievementId
        );

    if (achievement) {
        showToast(
            `Achievement unlocked: ${achievement.title}`,
            "success"
        );

        playSound("win");
        confetti();
    }

    return true;
}

function checkAchievements() {
    const current =
        getCurrentUser();

    if (!current) return;

    let changed = false;

    if (
        current.friends.length >= 1
    ) {
        changed =
            addAchievement(
                "first_friend"
            ) || changed;
    }

    if (
        current.friends.length >= 5
    ) {
        changed =
            addAchievement(
                "five_friends"
            ) || changed;
    }

    if (
        current.bestFriends.length >= 1
    ) {
        changed =
            addAchievement(
                "best_friend"
            ) || changed;
    }

    if (
        current.gamesPlayed >= 1
    ) {
        changed =
            addAchievement(
                "first_game"
            ) || changed;
    }

    if (
        current.xp >= 500
    ) {
        changed =
            addAchievement(
                "xp_500"
            ) || changed;
    }

    if (
        current.xp >= 1000
    ) {
        changed =
            addAchievement(
                "xp_1000"
            ) || changed;
    }

    if (
        current.streak >= 7
    ) {
        changed =
            addAchievement(
                "streak_7"
            ) || changed;
    }

    if (changed) {
        saveDatabase();
    }
}


/* =========================================================
   GAMES
========================================================= */

function setupGames() {
    $all(
        ".game-card"
    ).forEach(card => {
        card.addEventListener(
            "click",
            () => {
                const game =
                    card.getAttribute(
                        "data-game"
                    );

                openGameModeSelector(
                    game
                );
            }
        );
    });

    const friends =
        $("playWithFriends");

    if (friends) {
        friends.addEventListener(
            "click",
            () => {
                startFriendsGame();
            }
        );
    }

    const bot =
        $("playWithBot");

    if (bot) {
        bot.addEventListener(
            "click",
            () => {
                closeGameModeModal();
                openBotDifficultySelector();
            }
        );
    }

    $all(
        "[data-difficulty]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                selectedBotDifficulty =
                    button.getAttribute(
                        "data-difficulty"
                    ) ||
                    "medium";

                closeBotDifficultyModal();

                startBotGame();
            }
        );
    });
}

function gameInformation(
    game
) {
    const games = {
        tapRush: {
            title: "Tap Rush",
            icon: "⚡",
            description:
                "Tap as fast as you can before time runs out."
        },

        memoryMatch: {
            title: "Memory Match",
            icon: "🧠",
            description:
                "Match all the hidden pairs."
        },

        numberGuess: {
            title: "Number Guess",
            icon: "🎯",
            description:
                "Find the hidden number from 1 to 100."
        }
    };

    return (
        games[game] ||
        games.tapRush
    );
}

function openGameModeSelector(
    game
) {
    if (!game) return;

    selectedGame = game;

    const info =
        gameInformation(
            game
        );

    const icon =
        $("gameModeIcon");

    const title =
        $("gameModeTitle");

    const description =
        $("gameModeDescription");

    if (icon) {
        icon.textContent =
            info.icon;
    }

    if (title) {
        title.textContent =
            `Play ${info.title}`;
    }

    if (description) {
        description.textContent =
            info.description;
    }

    showModal(
        "gameModeModal"
    );

    playSound("click");
}

function closeGameModeModal() {
    closeModal(
        "gameModeModal"
    );
}

function openBotDifficultySelector() {
    showModal(
        "botDifficultyModal"
    );
}

function closeBotDifficultyModal() {
    closeModal(
        "botDifficultyModal"
    );
}

function startBotGame() {
    if (!selectedGame) {
        showToast(
            "Please choose a game first.",
            "error"
        );
        return;
    }

    const game =
        selectedGame;

    openGameArena(
        game,
        "bot"
    );
}

function startFriendsGame() {
    if (!selectedGame) {
        showToast(
            "Please choose a game first.",
            "error"
        );
        return;
    }

    closeGameModeModal();

    currentArenaMode =
        "friends";

    navigateTo(
        "roomSection"
    );

    showToast(
        `Create or join a room for ${gameInformation(selectedGame).title}.`
    );
}


/* =========================================================
   GAME ARENA
========================================================= */

function openGameArena(
    game,
    mode = "bot"
) {
    const current =
        getCurrentUser();

    if (!current) {
        showAuth();
        return;
    }

    selectedGame =
        game || selectedGame;

    if (!selectedGame) {
        return;
    }

    currentArenaMode =
        mode;

    const arena =
        $("gameArena");

    const app =
        $("appShell");

    if (!arena) {
        showToast(
            "Game Arena is unavailable.",
            "error"
        );
        return;
    }

    hide(app);
    show(arena);

    document.body.classList.add(
        "no-scroll"
    );

    const info =
        gameInformation(
            selectedGame
        );

    const icon =
        $("arenaGameIcon");

    const title =
        $("arenaGameTitle");

    const modeElement =
        $("arenaGameMode");

    const player =
        $("arenaPlayerName");

    if (icon) {
        icon.textContent =
            info.icon;
    }

    if (title) {
        title.textContent =
            info.title;
    }

    if (modeElement) {
        modeElement.textContent =
            mode === "friends"
                ? "FRIEND ROOM"
                : `BOT • ${selectedBotDifficulty.toUpperCase()}`;
    }

    if (player) {
        player.textContent =
            current.name;
    }

    clearGameTimers();

    if (selectedGame === "tapRush") {
        openTapRushArena();
    }

    if (
        selectedGame ===
        "memoryMatch"
    ) {
        openMemoryMatchArena();
    }

    if (
        selectedGame ===
        "numberGuess"
    ) {
        openNumberGuessArena();
    }

    playSound("click");
}

function closeGameArena() {
    clearGameTimers();

    const arena =
        $("gameArena");

    const app =
        $("appShell");

    hide(arena);
    show(app);

    document.body.classList.remove(
        "no-scroll"
    );

    currentArenaMode = null;

    navigateTo(
        currentArenaRoom
            ? "roomSection"
            : "gamesSection"
    );
}

function setupGameArena() {
    const exit =
        $("exitGameArena");

    if (exit) {
        exit.addEventListener(
            "click",
            closeGameArena
        );
    }
}

function clearGameTimers() {
    if (tapGame?.timerId) {
        clearInterval(
            tapGame.timerId
        );
    }

    if (memoryGame?.timeoutId) {
        clearTimeout(
            memoryGame.timeoutId
        );
    }

    tapGame = null;
    memoryGame = null;
    numberGame = null;
}


/* =========================================================
   TAP RUSH
========================================================= */

function openTapRushArena() {
    const content =
        $("gameArenaContent");

    if (!content) return;

    content.innerHTML = `
        <div class="arena-game-screen">

            <div class="arena-game-heading">
                <div class="arena-game-icon">
                    ⚡
                </div>

                <h1>Tap Rush</h1>

                <p>
                    Tap as many times as possible before time runs out.
                </p>
            </div>

            <div class="arena-status">

                <div class="arena-stat">
                    <span>TIME</span>
                    <strong id="tapTime">10</strong>
                </div>

                <div class="arena-stat">
                    <span>TAPS</span>
                    <strong id="tapScore">0</strong>
                </div>

            </div>

            <button
                id="tapMainButton"
                class="arena-main-action"
                type="button"
                disabled
            >
                START
            </button>

            <button
                id="tapStartButton"
                class="btn btn-primary arena-start-button"
                type="button"
            >
                Start Game
            </button>

            <div
                id="tapMessage"
                class="arena-message"
            >
                Ready?
            </div>

        </div>
    `;

    $("tapStartButton")?.addEventListener(
        "click",
        startTapRushArena
    );
}

function startTapRushArena() {
    clearGameTimers();

    const duration =
        selectedBotDifficulty === "easy"
            ? 12
            : selectedBotDifficulty === "hard"
                ? 8
                : 10;

    tapGame = {
        score: 0,
        time: duration,
        duration,
        running: true,
        timerId: null
    };

    const button =
        $("tapMainButton");

    const startButton =
        $("tapStartButton");

    const message =
        $("tapMessage");

    if (!button) return;

    button.disabled = false;
    button.textContent = "TAP!";

    if (startButton) {
        startButton.disabled = true;
        startButton.textContent =
            "Game Running...";
    }

    if (message) {
        message.textContent =
            "GO! GO! GO! ⚡";
    }

    updateTapRushUI();

    button.onclick =
        () => {
            if (
                !tapGame ||
                !tapGame.running
            ) {
                return;
            }

            tapGame.score += 1;

            updateTapRushUI();

            playSound("pop");
        };

    tapGame.timerId =
        setInterval(
            () => {
                if (!tapGame) return;

                tapGame.time -= 1;

                updateTapRushUI();

                if (
                    tapGame.time <= 0
                ) {
                    finishTapRushArena();
                }
            },
            1000
        );
}

function updateTapRushUI() {
    const time =
        $("tapTime");

    const score =
        $("tapScore");

    if (tapGame) {
        if (time) {
            time.textContent =
                Math.max(
                    0,
                    tapGame.time
                );
        }

        if (score) {
            score.textContent =
                tapGame.score;
        }
    }
}

function finishTapRushArena() {
    if (!tapGame) return;

    tapGame.running = false;

    if (tapGame.timerId) {
        clearInterval(
            tapGame.timerId
        );
    }

    const button =
        $("tapMainButton");

    const startButton =
        $("tapStartButton");

    const message =
        $("tapMessage");

    if (button) {
        button.disabled = true;
        button.textContent =
            "FINISHED";
    }

    if (startButton) {
        startButton.disabled = false;
        startButton.textContent =
            "Play Again";
    }

    if (message) {
        message.textContent =
            `You made ${tapGame.score} taps!`;
    }

    let xp = 20;

    if (tapGame.score >= 30) {
        xp = 80;
    } else if (tapGame.score >= 20) {
        xp = 60;
    } else if (tapGame.score >= 10) {
        xp = 40;
    }

    gamePlayed(
        "Tap Rush",
        xp
    );

    playSound("win");
}


/* =========================================================
   MEMORY MATCH
========================================================= */

function openMemoryMatchArena() {
    const content =
        $("gameArenaContent");

    if (!content) return;

    content.innerHTML = `
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

            <div class="arena-status">

                <div class="arena-stat">
                    <span>MOVES</span>
                    <strong id="memoryMoves">0</strong>
                </div>

                <div class="arena-stat">
                    <span>PAIRS</span>
                    <strong id="memoryPairs">0 / 6</strong>
                </div>

            </div>

            <div
                id="memoryBoard"
                class="arena-memory-board"
            ></div>

            <button
                id="memoryRestart"
                class="btn btn-primary arena-start-button"
                type="button"
            >
                Restart
            </button>

            <div
                id="memoryMessage"
                class="arena-message"
            >
                Find the matching pairs.
            </div>

        </div>
    `;

    $("memoryRestart")?.addEventListener(
        "click",
        openMemoryMatchArena
    );

    const symbols = [
        "🍎",
        "🍎",
        "🚀",
        "🚀",
        "🎮",
        "🎮",
        "⭐",
        "⭐",
        "🔥",
        "🔥",
        "💎",
        "💎"
    ];

    symbols.sort(
        () => Math.random() - 0.5
    );

    memoryGame = {
        cards: symbols.map(
            (symbol, index) => ({
                id: index,
                symbol,
                flipped: false,
                matched: false
            })
        ),

        first: null,
        second: null,
        moves: 0,
        pairs: 0,
        locked: false
    };

    renderMemoryArenaBoard();
}

function renderMemoryArenaBoard() {
    const board =
        $("memoryBoard");

    if (!board || !memoryGame) {
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
                        class="arena-memory-card
                        ${card.flipped ? "flipped" : ""}
                        ${card.matched ? "matched" : ""}"
                        data-card-id="${card.id}"
                        type="button"
                    >
                        ${visible
                            ? escapeHTML(
                                card.symbol
                            )
                            : "?"}
                    </button>
                `;
            })
            .join("");

    $all(
        ".arena-memory-card"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                flipMemoryArenaCard(
                    Number(
                        button.getAttribute(
                            "data-card-id"
                        )
                    )
                );
            }
        );
    });

    const moves =
        $("memoryMoves");

    const pairs =
        $("memoryPairs");

    if (moves) {
        moves.textContent =
            memoryGame.moves;
    }

    if (pairs) {
        pairs.textContent =
            `${memoryGame.pairs} / 6`;
    }
}

function flipMemoryArenaCard(
    cardId
) {
    if (
        !memoryGame ||
        memoryGame.locked
    ) {
        return;
    }

    const card =
        memoryGame.cards.find(
            item =>
                item.id === cardId
        );

    if (
        !card ||
        card.flipped ||
        card.matched
    ) {
        return;
    }

    card.flipped = true;

    playSound("pop");

    if (
        !memoryGame.first
    ) {
        memoryGame.first =
            card;

        renderMemoryArenaBoard();

        return;
    }

    memoryGame.second =
        card;

    memoryGame.moves += 1;

    memoryGame.locked = true;

    renderMemoryArenaBoard();

    if (
        memoryGame.first.symbol ===
        memoryGame.second.symbol
    ) {
        memoryGame.first.matched = true;
        memoryGame.second.matched = true;

        memoryGame.pairs += 1;

        memoryGame.first = null;
        memoryGame.second = null;

        memoryGame.locked = false;

        renderMemoryArenaBoard();

        if (
            memoryGame.pairs >= 6
        ) {
            finishMemoryGame();
        }

        return;
    }

    memoryGame.timeoutId =
        setTimeout(
            () => {
                if (!memoryGame) return;

                memoryGame.first.flipped =
                    false;

                memoryGame.second.flipped =
                    false;

                memoryGame.first = null;
                memoryGame.second = null;

                memoryGame.locked = false;

                renderMemoryArenaBoard();
            },
            700
        );
}

function finishMemoryGame() {
    const message =
        $("memoryMessage");

    if (message) {
        message.textContent =
            `Completed in ${memoryGame.moves} moves! 🧠`;
    }

    let xp = 50;

    if (
        memoryGame.moves <= 8
    ) {
        xp = 100;
    } else if (
        memoryGame.moves <= 12
    ) {
        xp = 80;
    } else {
        xp = 60;
    }

    gamePlayed(
        "Memory Match",
        xp
    );

    confetti();

    playSound("win");
}


/* =========================================================
   NUMBER GUESS
========================================================= */

function openNumberGuessArena() {
    const content =
        $("gameArenaContent");

    if (!content) return;

    const maxAttempts =
        selectedBotDifficulty === "easy"
            ? 12
            : selectedBotDifficulty === "hard"
                ? 6
                : 8;

    numberGame = {
        target:
            Math.floor(
                Math.random() * 100
            ) + 1,

        attempts: 0,
        maxAttempts,
        finished: false
    };

    content.innerHTML = `
        <div class="arena-game-screen">

            <div class="arena-game-heading">
                <div class="arena-game-icon">
                    🎯
                </div>

                <h1>Number Guess</h1>

                <p>
                    Guess the hidden number between 1 and 100.
                </p>
            </div>

            <div class="arena-status">

                <div class="arena-stat">
                    <span>ATTEMPTS</span>
                    <strong id="numberAttempts">
                        0 / ${maxAttempts}
                    </strong>
                </div>

                <div class="arena-stat">
                    <span>RANGE</span>
                    <strong>1–100</strong>
                </div>

            </div>

            <div class="arena-number-form">

                <input
                    id="numberGuessInput"
                    class="input"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Enter a number"
                >

                <button
                    id="numberGuessButton"
                    class="btn btn-primary"
                    type="button"
                >
                    Guess
                </button>

            </div>

            <div
                id="numberMessage"
                class="arena-message"
            >
                Make your first guess.
            </div>

        </div>
    `;

    $("numberGuessButton")?.addEventListener(
        "click",
        makeArenaGuess
    );

    $("numberGuessInput")?.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                "Enter"
            ) {
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
        $("numberGuessInput");

    const message =
        $("numberMessage");

    const attempts =
        $("numberAttempts");

    if (!input) return;

    const guess =
        Number(input.value);

    if (
        !Number.isInteger(guess) ||
        guess < 1 ||
        guess > 100
    ) {
        showToast(
            "Enter a number from 1 to 100.",
            "error"
        );
        return;
    }

    numberGame.attempts += 1;

    if (attempts) {
        attempts.textContent =
            `${numberGame.attempts} / ${numberGame.maxAttempts}`;
    }

    if (
        guess ===
        numberGame.target
    ) {
        numberGame.finished =
            true;

        const remaining =
            numberGame.maxAttempts -
            numberGame.attempts;

        const xp =
            50 +
            Math.max(
                0,
                remaining * 8
            );

        if (message) {
            message.textContent =
                `🎉 Correct! The number was ${numberGame.target}.`;
        }

        input.disabled = true;

        $("numberGuessButton")
            ?.setAttribute(
                "disabled",
                "disabled"
            );

        gamePlayed(
            "Number Guess",
            Math.min(
                100,
                xp
            )
        );

        confetti();

        playSound("win");

        return;
    }

    if (
        numberGame.attempts >=
        numberGame.maxAttempts
    ) {
        numberGame.finished =
            true;

        if (message) {
            message.textContent =
                `Game over! The number was ${numberGame.target}.`;
        }

        input.disabled = true;

        $("numberGuessButton")
            ?.setAttribute(
                "disabled",
                "disabled"
            );

        gamePlayed(
            "Number Guess",
            20
        );

        return;
    }

    if (message) {
        message.textContent =
            guess <
            numberGame.target
                ? "Too low! Try a higher number."
                : "Too high! Try a lower number.";
    }

    input.value = "";

    playSound("pop");
}


/* =========================================================
   GAME COMPLETION
========================================================= */

function gamePlayed(
    gameName,
    xp
) {
    const current =
        getCurrentUser();

    if (!current) return;

    current.gamesPlayed += 1;

    addXP(
        Math.max(
            0,
            Number(xp) || 0
        )
    );

    updateStreak();

    saveDatabase();

    renderEverything();

    showToast(
        `${gameName} complete! +${xp} XP`,
        "success"
    );
}


/* =========================================================
   ROOMS
========================================================= */

function generateRoomCode() {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
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

function setupRooms() {
    const create =
        $("createRoom");

    const join =
        $("joinRoom");

    const copy =
        $("copyRoomCode");

    if (create) {
        create.addEventListener(
            "click",
            createRoom
        );
    }

    if (join) {
        join.addEventListener(
            "click",
            joinRoom
        );
    }

    const input =
        $("joinRoomInput");

    if (input) {
        input.addEventListener(
            "input",
            () => {
                input.value =
                    input.value
                        .toUpperCase()
                        .replace(
                            /[^A-Z0-9]/g,
                            ""
                        )
                        .slice(0, 6);
            }
        );

        input.addEventListener(
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
    }

    if (copy) {
        copy.addEventListener(
            "click",
            copyRoomCode
        );
    }
}

function createRoom() {
    const current =
        getCurrentUser();

    if (!current) {
        showAuth();
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
        id: makeId("room"),
        code,
        hostId: current.id,
        members: [current.id],
        createdAt: Date.now(),
        game:
            selectedGame ||
            null,
        gameStarted: false
    };

    db.rooms.push(room);

    currentArenaRoom =
        room;

    currentArenaMode =
        "friends";

    saveDatabase();

    renderRoom(room);

    showToast(
        `Room created: ${code}`,
        "success"
    );

    playSound("success");
}

function joinRoom() {
    const current =
        getCurrentUser();

    if (!current) {
        showAuth();
        return;
    }

    const input =
        $("joinRoomInput");

    if (!input) return;

    const code =
        input.value
            .trim()
            .toUpperCase();

    if (code.length !== 6) {
        showToast(
            "Enter a valid 6-character room code.",
            "error"
        );
        return;
    }

    const room =
        db.rooms.find(
            item =>
                item &&
                item.code === code
        );

    if (!room) {
        showToast(
            "Room not found.",
            "error"
        );
        return;
    }

    if (
        selectedGame &&
        room.game &&
        room.game !==
            selectedGame
    ) {
        showToast(
            `This room is for ${gameInformation(room.game).title}.`,
            "error"
        );
        return;
    }

    if (
        !room.game &&
        selectedGame
    ) {
        room.game =
            selectedGame;
    }

    if (
        !room.members.includes(
            current.id
        )
    ) {
        room.members.push(
            current.id
        );
    }

    currentArenaRoom =
        room;

    currentArenaMode =
        "friends";

    saveDatabase();

    input.value = "";

    renderRoom(room);

    showToast(
        `Joined room ${room.code}.`,
        "success"
    );

    playSound("success");
}

function renderCurrentRoom() {
    const current =
        getCurrentUser();

    if (!current) return;

    if (
        currentArenaRoom
    ) {
        const latest =
            db.rooms.find(
                room =>
                    room.id ===
                    currentArenaRoom.id
            );

        if (latest) {
            currentArenaRoom =
                latest;

            renderRoom(
                latest
            );

            return;
        }
    }

    const existing =
        db.rooms.find(
            room =>
                room &&
                Array.isArray(
                    room.members
                ) &&
                room.members.includes(
                    current.id
                )
        );

    if (existing) {
        currentArenaRoom =
            existing;

        renderRoom(
            existing
        );

        return;
    }

    const code =
        $("roomCode");

    if (code) {
        code.textContent =
            "------";
    }

    const members =
        $("roomMembers");

    if (members) {
        members.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🚪</div>
                <h3>No active room</h3>
                <p>
                    Create a room or join one using a room code.
                </p>
            </div>
        `;
    }
}

function renderRoom(
    room
) {
    if (!room) {
        renderCurrentRoom();
        return;
    }

    const current =
        getCurrentUser();

    if (!current) return;

    const code =
        $("roomCode");

    if (code) {
        code.textContent =
            room.code;
    }

    const members =
        $("roomMembers");

    if (!members) return;

    const game =
        room.game
            ? gameInformation(
                room.game
            )
            : null;

    let html = "";

    if (game) {
        html += `
            <div class="room-member">
                🎮 <strong>${escapeHTML(game.title)}</strong>
                <span style="color:var(--text-muted);">
                    — ${room.members.length} player(s)
                </span>
            </div>
        `;
    }

    room.members.forEach(
        memberId => {
            const user =
                getUserById(
                    memberId
                );

            if (!user) return;

            const host =
                user.id ===
                room.hostId;

            html += `
                <div class="room-member">
                    ${host ? "👑" : "👤"}
                    ${escapeHTML(user.name)}
                    ${
                        user.id === current.id
                            ? " (You)"
                            : ""
                    }
                    ${
                        host
                            ? " • Host"
                            : ""
                    }
                </div>
            `;
        }
    );

    html += `
        <div
            id="roomGameControls"
            style="margin-top:12px;"
        >
    `;

    if (
        current.id ===
        room.hostId
    ) {
        if (!room.game) {
            html += `
                <p style="color:var(--text-muted);font-size:.7rem;">
                    Select a game from Game Zone before starting.
                </p>
            `;
        } else if (
            room.members.length < 2
        ) {
            html += `
                <p style="color:var(--text-muted);font-size:.7rem;">
                    Waiting for at least one friend to join...
                </p>
            `;
        } else {
            html += `
                <button
                    id="startRoomGame"
                    class="btn btn-primary"
                    type="button"
                    style="width:100%;"
                >
                    🎮 Start ${escapeHTML(game.title)}
                </button>
            `;
        }
    } else {
        html += `
            <p style="color:var(--text-muted);font-size:.7rem;text-align:center;">
                ${
                    room.gameStarted
                        ? "Game has started."
                        : "Waiting for the host to start the game..."
                }
            </p>
        `;
    }

    html += `
            <button
                id="leaveRoomButton"
                class="btn btn-secondary"
                type="button"
                style="width:100%;margin-top:8px;"
            >
                Leave Room
            </button>
        </div>
    `;

    members.innerHTML =
        html;

    $("startRoomGame")
        ?.addEventListener(
            "click",
            startRoomGame
        );

    $("leaveRoomButton")
        ?.addEventListener(
            "click",
            leaveRoom
        );
}

function startRoomGame() {
    const current =
        getCurrentUser();

    if (!current || !currentArenaRoom) {
        return;
    }

    const room =
        db.rooms.find(
            item =>
                item.id ===
                currentArenaRoom.id
        );

    if (!room) {
        showToast(
            "Room no longer exists.",
            "error"
        );
        return;
    }

    if (
        room.hostId !==
        current.id
    ) {
        showToast(
            "Only the room host can start the game.",
            "error"
        );
        return;
    }

    if (
        room.members.length < 2
    ) {
        showToast(
            "At least 2 players are required.",
            "error"
        );
        return;
    }

    if (!room.game) {
        showToast(
            "Choose a game first.",
            "error"
        );
        return;
    }

    room.gameStarted =
        true;

    currentArenaRoom =
        room;

    selectedGame =
        room.game;

    saveDatabase();

    /*
     * LocalStorage rooms are local to this browser.
     * The game arena opens locally for now.
     */
    openGameArena(
        room.game,
        "friends"
    );
}

function leaveRoom() {
    const current =
        getCurrentUser();

    if (!currentArenaRoom || !current) {
        return;
    }

    const room =
        db.rooms.find(
            item =>
                item.id ===
                currentArenaRoom.id
        );

    if (!room) {
        currentArenaRoom = null;
        renderCurrentRoom();
        return;
    }

    room.members =
        room.members.filter(
            id =>
                id !==
                current.id
        );

    if (
        room.hostId ===
        current.id
    ) {
        if (
            room.members.length
        ) {
            room.hostId =
                room.members[0];
        } else {
            db.rooms =
                db.rooms.filter(
                    item =>
                        item.id !==
                        room.id
                );
        }
    }

    currentArenaRoom =
        null;

    currentArenaMode =
        null;

    saveDatabase();

    renderCurrentRoom();

    showToast(
        "You left the room."
    );
}

async function copyRoomCode() {
    const code =
        $("roomCode")
            ?.textContent
            ?.trim();

    if (
        !code ||
        code === "------"
    ) {
        showToast(
            "No active room code.",
            "error"
        );
        return;
    }

    try {
        if (
            navigator.clipboard &&
            navigator.clipboard.writeText
        ) {
            await navigator.clipboard.writeText(
                code
            );
        } else {
            const textarea =
                document.createElement(
                    "textarea"
                );

            textarea.value =
                code;

            textarea.style.position =
                "fixed";

            textarea.style.opacity =
                "0";

            document.body.appendChild(
                textarea
            );

            textarea.select();

            document.execCommand(
                "copy"
            );

            textarea.remove();
        }

        showToast(
            "Room code copied!",
            "success"
        );

        playSound("success");
    } catch (error) {
        showToast(
            "Could not copy the room code.",
            "error"
        );
    }
}

function startRoomRefresh() {
    stopRoomRefresh();

    roomRefreshTimer =
        setInterval(
            () => {
                if (
                    $("roomSection")
                        ?.classList
                        .contains(
                            "active"
                        )
                ) {
                    renderCurrentRoom();
                }
            },
            2000
        );
}

function stopRoomRefresh() {
    if (roomRefreshTimer) {
        clearInterval(
            roomRefreshTimer
        );

        roomRefreshTimer =
            null;
    }
}


/* =========================================================
   THOUGHTS
========================================================= */

function setupThoughts() {
    const post =
        $("postThought");

    if (post) {
        post.addEventListener(
            "click",
            postThought
        );
    }
}

function postThought() {
    const current =
        getCurrentUser();

    const input =
        $("thoughtInput");

    if (!current || !input) {
        return;
    }

    const text =
        input.value.trim();

    if (!text) {
        showToast(
            "Write something first.",
            "error"
        );
        return;
    }

    if (text.length > 160) {
        showToast(
            "Thought is too long.",
            "error"
        );
        return;
    }

    db.thoughts.unshift({
        id: makeId("thought"),
        userId: current.id,
        text,
        createdAt: Date.now()
    });

    /*
     * Keep local database small.
     */
    if (
        db.thoughts.length >
        200
    ) {
        db.thoughts =
            db.thoughts.slice(
                0,
                200
            );
    }

    input.value = "";

    saveDatabase();

    renderThoughts();

    updateStreak();

    showToast(
        "Thought posted! 💭",
        "success"
    );

    playSound("success");
}


/* =========================================================
   LEADERBOARD
========================================================= */

function setupLeaderboard() {
    $all(
        ".leaderboard-tab"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                currentLeaderboardType =
                    button.getAttribute(
                        "data-type"
                    ) ||
                    "daily";

                $all(
                    ".leaderboard-tab"
                ).forEach(tab => {
                    tab.classList.toggle(
                        "active",
                        tab === button
                    );
                });

                renderLeaderboard();

                playSound("click");
            }
        );
    });
}

function leaderboardXP(
    user,
    type
) {
    if (!user) return 0;

    refreshXPPeriods(
        user
    );

    if (type === "daily") {
        return user.dailyXP;
    }

    if (type === "weekly") {
        return user.weeklyXP;
    }

    return user.xp;
}

function renderLeaderboard() {
    const list =
        $("leaderboardList");

    if (!list) return;

    repairDatabase();

    const sorted =
        [...db.users]
            .map(user => ({
                user,
                xp:
                    leaderboardXP(
                        user,
                        currentLeaderboardType
                    )
            }))
            .sort(
                (a, b) =>
                    b.xp - a.xp
            );

    if (!sorted.length) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    🏆
                </div>
                <h3>No players yet</h3>
                <p>
                    Create an account to appear here.
                </p>
            </div>
        `;

        return;
    }

    list.innerHTML =
        sorted
            .map(
                (item, index) => {
                    const user =
                        item.user;

                    return `
                        <div class="leaderboard-item">

                            <div class="leaderboard-rank">
                                #${index + 1}
                            </div>

                            <div class="friend-avatar">
                                ${escapeHTML(
                                    getInitials(
                                        user.name
                                    )
                                )}
                            </div>

                            <div class="leaderboard-user">
                                <strong>
                                    ${escapeHTML(
                                        user.name
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        user.friendId
                                    )}
                                </span>
                            </div>

                            <div class="leaderboard-xp">
                                ${item.xp} XP
                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   RENDER — HOME
========================================================= */

function renderHome() {
    const current =
        getCurrentUser();

    if (!current) return;

    const friendCount =
        $("friendCount");

    const bestFriendCount =
        $("bestFriendCount");

    const xpCount =
        $("xpCount");

    const streakCount =
        $("streakCount");

    if (friendCount) {
        friendCount.textContent =
            current.friends.length;
    }

    if (bestFriendCount) {
        bestFriendCount.textContent =
            current.bestFriends.length;
    }

    if (xpCount) {
        xpCount.textContent =
            current.xp;
    }

    if (streakCount) {
        streakCount.textContent =
            current.streak;
    }
}


/* =========================================================
   RENDER — FRIENDS
========================================================= */

function renderFriends() {
    const current =
        getCurrentUser();

    if (!current) return;

    const myCount =
        $("myFriendsCount");

    if (myCount) {
        myCount.textContent =
            current.friends.length;
    }

    renderFriendRequests();
    renderFriendsList();
    renderBestFriends();

    updateFriendRequestBadge();
}

function renderFriendRequests() {
    const current =
        getCurrentUser();

    const container =
        $("friendRequestsList");

    if (!current || !container) {
        return;
    }

    const requests =
        db.friendRequests.filter(
            request =>
                request &&
                request.toId === current.id &&
                request.status === "pending"
        );

    if (!requests.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    📨
                </div>

                <h3>No pending requests</h3>

                <p>
                    New friend requests will appear here.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        requests
            .map(request => {
                const sender =
                    getUserById(
                        request.fromId
                    );

                if (!sender) {
                    return "";
                }

                return `
                    <div class="friend-request">

                        <div class="friend-avatar">
                            ${escapeHTML(
                                getInitials(
                                    sender.name
                                )
                            )}
                        </div>

                        <div class="friend-user-info">

                            <div class="friend-user-name">
                                ${escapeHTML(
                                    sender.name
                                )}
                            </div>

                            <div class="friend-user-id">
                                ${escapeHTML(
                                    sender.friendId
                                )}
                            </div>

                        </div>

                        <div class="friend-actions">

                            <button
                                class="btn btn-success btn-small"
                                type="button"
                                data-accept-request="${escapeHTML(request.id)}"
                            >
                                Accept
                            </button>

                            <button
                                class="btn btn-danger btn-small"
                                type="button"
                                data-reject-request="${escapeHTML(request.id)}"
                            >
                                Reject
                            </button>

                        </div>

                    </div>
                `;
            })
            .join("");

    $all(
        "[data-accept-request]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                acceptFriendRequest(
                    button.getAttribute(
                        "data-accept-request"
                    )
                );
            }
        );
    });

    $all(
        "[data-reject-request]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                rejectFriendRequest(
                    button.getAttribute(
                        "data-reject-request"
                    )
                );
            }
        );
    });
}

function renderFriendsList() {
    const current =
        getCurrentUser();

    const container =
        $("friendsList");

    if (!current || !container) {
        return;
    }

    const friends =
        current.friends
            .map(
                id =>
                    getUserById(id)
            )
            .filter(Boolean);

    if (!friends.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    👥
                </div>

                <h3>You have 0 friends</h3>

                <p>
                    Use a Friend ID to connect with someone.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        friends
            .map(friend => {
                const best =
                    current.bestFriends.includes(
                        friend.id
                    );

                return `
                    <div class="friend-card">

                        <div class="friend-avatar">
                            ${escapeHTML(
                                getInitials(
                                    friend.name
                                )
                            )}
                        </div>

                        <div class="friend-details">

                            <h3>
                                ${escapeHTML(
                                    friend.name
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    friend.friendId
                                )}
                            </p>

                            ${
                                best
                                    ? `
                                        <div class="best-friend-badge">
                                            💖 Best Friend
                                        </div>
                                    `
                                    : ""
                            }

                        </div>

                        <div class="friend-card-actions">

                            <button
                                class="btn btn-secondary btn-small"
                                type="button"
                                data-details="${escapeHTML(friend.id)}"
                            >
                                View
                            </button>

                            <button
                                class="btn btn-secondary btn-small"
                                type="button"
                                data-best="${escapeHTML(friend.id)}"
                            >
                                ${best ? "Unbest" : "Best"}
                            </button>

                            <button
                                class="btn btn-danger btn-small"
                                type="button"
                                data-remove="${escapeHTML(friend.id)}"
                            >
                                Remove
                            </button>

                        </div>

                    </div>
                `;
            })
            .join("");

    $all(
        "[data-details]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                openFriendDetails(
                    button.getAttribute(
                        "data-details"
                    )
                );
            }
        );
    });

    $all(
        "[data-best]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                toggleBestFriend(
                    button.getAttribute(
                        "data-best"
                    )
                );
            }
        );
    });

    $all(
        "[data-remove]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                removeFriend(
                    button.getAttribute(
                        "data-remove"
                    )
                );
            }
        );
    });
}

function renderBestFriends() {
    const current =
        getCurrentUser();

    const container =
        $("bestFriendsList");

    if (!current || !container) {
        return;
    }

    const bestFriends =
        current.bestFriends
            .map(
                id =>
                    getUserById(id)
            )
            .filter(Boolean);

    if (!bestFriends.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    💖
                </div>

                <h3>No Best Friends yet</h3>

                <p>
                    Best Friends is optional.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        bestFriends
            .map(
                friend => `
                    <div class="friend-card">

                        <div class="friend-avatar">
                            ${escapeHTML(
                                getInitials(
                                    friend.name
                                )
                            )}
                        </div>

                        <div class="friend-details">

                            <h3>
                                ${escapeHTML(
                                    friend.name
                                )}
                            </h3>

                            <p>
                                ${escapeHTML(
                                    friend.friendId
                                )}
                            </p>

                            <div class="best-friend-badge">
                                💖 Best Friend
                            </div>

                        </div>

                        <button
                            class="btn btn-secondary btn-small"
                            type="button"
                            data-best-remove="${escapeHTML(friend.id)}"
                        >
                            Remove
                        </button>

                    </div>
                `
            )
            .join("");

    $all(
        "[data-best-remove]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                toggleBestFriend(
                    button.getAttribute(
                        "data-best-remove"
                    )
                );
            }
        );
    });
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
                request.toId === current.id &&
                request.status === "pending"
        ).length;

    badge.textContent =
        count;

    badge.classList.toggle(
        "hidden",
        count === 0
    );
}


/* =========================================================
   RENDER — THOUGHTS
========================================================= */

function renderThoughts() {
    const current =
        getCurrentUser();

    const list =
        $("thoughtsList");

    if (!current || !list) {
        return;
    }

    const avatar =
        $("currentUserThoughtAvatar");

    if (avatar) {
        avatar.textContent =
            getInitials(
                current.name
            );
    }

    /*
     * Only show:
     * - own thoughts
     * - thoughts of accepted friends
     */

    const visibleIds =
        new Set([
            current.id,
            ...current.friends
        ]);

    const thoughts =
        db.thoughts
            .filter(
                thought =>
                    thought &&
                    visibleIds.has(
                        thought.userId
                    )
            )
            .sort(
                (a, b) =>
                    b.createdAt -
                    a.createdAt
            );

    if (!thoughts.length) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    💭
                </div>

                <h3>No thoughts yet</h3>

                <p>
                    Share your first thought with your FriendZone.
                </p>
            </div>
        `;

        return;
    }

    list.innerHTML =
        thoughts
            .map(thought => {
                const user =
                    getUserById(
                        thought.userId
                    );

                if (!user) {
                    return "";
                }

                return `
                    <div class="thought-item">

                        <div class="thought-avatar">
                            ${escapeHTML(
                                getInitials(
                                    user.name
                                )
                            )}
                        </div>

                        <div class="thought-content">

                            <div class="thought-header">

                                <div class="thought-name">
                                    ${escapeHTML(
                                        user.name
                                    )}
                                </div>

                                <div class="thought-time">
                                    ${escapeHTML(
                                        formatTime(
                                            thought.createdAt
                                        )
                                    )}
                                </div>

                            </div>

                            <div class="thought-text">
                                ${escapeHTML(
                                    thought.text
                                )}
                            </div>

                        </div>

                    </div>
                `;
            })
            .join("");
}


/* =========================================================
   RENDER — PROFILE
========================================================= */

function renderProfile() {
    const current =
        getCurrentUser();

    if (!current) return;

    const avatar =
        $("profileAvatar");

    const name =
        $("profileName");

    const email =
        $("profileEmail");

    const friendId =
        $("profileFriendId");

    const level =
        $("profileLevel");

    const xp =
        $("profileXP");

    const friends =
        $("profileFriends");

    const games =
        $("profileGames");

    const streak =
        $("profileStreak");

    if (avatar) {
        avatar.textContent =
            getInitials(
                current.name
            );
    }

    if (name) {
        name.textContent =
            current.name;
    }

    if (email) {
        email.textContent =
            current.email;
    }

    if (friendId) {
        friendId.textContent =
            current.friendId;
    }

    if (xp) {
        xp.textContent =
            current.xp;
    }

    if (friends) {
        friends.textContent =
            current.friends.length;
    }

    if (games) {
        games.textContent =
            current.gamesPlayed;
    }

    if (streak) {
        streak.textContent =
            current.streak;
    }

    if (level) {
        level.textContent =
            Math.floor(
                current.xp / 100
            ) + 1;
    }

    renderAchievements();
}

function renderAchievements() {
    const current =
        getCurrentUser();

    const list =
        $("achievementsList");

    if (!current || !list) {
        return;
    }

    list.innerHTML =
        ACHIEVEMENTS
            .map(
                achievement => {
                    const unlocked =
                        current.achievements.includes(
                            achievement.id
                        );

                    return `
                        <div
                            class="achievement-item"
                            style="
                                opacity:${unlocked ? "1" : ".45"};
                            "
                        >

                            <div class="achievement-icon">
                                ${achievement.icon}
                            </div>

                            <div class="achievement-info">

                                <h4>
                                    ${escapeHTML(
                                        achievement.title
                                    )}
                                    ${
                                        unlocked
                                            ? " ✓"
                                            : ""
                                    }
                                </h4>

                                <p>
                                    ${escapeHTML(
                                        achievement.description
                                    )}
                                </p>

                            </div>

                        </div>
                    `;
                }
            )
            .join("");
}


/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderGames() {
    /*
     * Game cards are static HTML.
     * This function exists so renderEverything()
     * can safely call it.
     */
}

function renderEverything() {
    repairDatabase();

    const current =
        getCurrentUser();

    if (!current) {
        showAuth();
        return;
    }

    refreshXPPeriods(
        current
    );

    checkAchievements();

    renderHome();
    renderFriends();
    renderThoughts();
    renderLeaderboard();
    renderProfile();

    saveDatabase();
}


/* =========================================================
   MODALS
========================================================= */

function showModal(
    modalId
) {
    const modal =
        $(modalId);

    if (!modal) return;

    show(modal);

    modal.classList.add(
        "active"
    );

    document.body.classList.add(
        "no-scroll"
    );
}

function closeModal(
    modalId
) {
    const modal =
        $(modalId);

    if (!modal) return;

    hide(modal);

    modal.classList.remove(
        "active"
    );

    if (
        !$all(
            ".modal:not(.hidden)"
        ).length &&
        $("gameArena")?.classList.contains(
            "hidden"
        )
    ) {
        document.body.classList.remove(
            "no-scroll"
        );
    }
}

function closeAllModals() {
    $all(
        ".modal"
    ).forEach(modal => {
        hide(modal);
        modal.classList.remove(
            "active"
        );
    });

    if (
        $("gameArena")?.classList.contains(
            "hidden"
        )
    ) {
        document.body.classList.remove(
            "no-scroll"
        );
    }
}

function setupModals() {
    $all(
        "[data-close-modal]"
    ).forEach(button => {
        button.addEventListener(
            "click",
            () => {
                const modal =
                    button.closest(
                        ".modal"
                    );

                if (modal) {
                    closeModal(
                        modal.id
                    );
                }
            }
        );
    });

    $all(
        ".modal-overlay"
    ).forEach(overlay => {
        overlay.addEventListener(
            "click",
            () => {
                const modal =
                    overlay.closest(
                        ".modal"
                    );

                if (modal) {
                    closeModal(
                        modal.id
                    );
                }
            }
        );
    });

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key ===
                "Escape"
            ) {
                closeAllModals();
            }
        }
    );
}


/* =========================================================
   CONFETTI
========================================================= */

function confetti() {
    let container =
        document.querySelector(
            ".confetti-container"
        );

    if (!container) {
        container =
            document.createElement(
                "div"
            );

        container.className =
            "confetti-container";

        document.body.appendChild(
            container
        );
    }

    container.innerHTML = "";

    const symbols = [
        "●",
        "◆",
        "★",
        "✦",
        "■"
    ];

    for (
        let i = 0;
        i < 55;
        i++
    ) {
        const piece =
            document.createElement(
                "span"
            );

        piece.className =
            "confetti-piece";

        piece.textContent =
            symbols[
                Math.floor(
                    Math.random() *
                    symbols.length
                )
            ];

        piece.style.left =
            Math.random() *
                100 +
            "%";

        piece.style.fontSize =
            8 +
            Math.random() * 9 +
            "px";

        piece.style.setProperty(
            "--x",
            (
                Math.random() *
                    180 -
                90
            ) + "px"
        );

        piece.style.animationDelay =
            Math.random() *
                0.7 +
            "s";

        container.appendChild(
            piece
        );
    }

    setTimeout(
        () => {
            container.innerHTML = "";
        },
        4000
    );
}


/* =========================================================
   INITIALIZATION
========================================================= */

function safeSetup(
    name,
    callback
) {
    try {
        callback();
    } catch (error) {
        /*
         * One broken optional feature must NOT
         * break Sign In.
         */
        console.error(
            `FriendZone ${name} error:`,
            error
        );
    }
}

function initializeFriendZone() {
    /*
     * Prevent duplicate initialization if script.js
     * accidentally gets included twice.
     */
    if (appInitialized) {
        return;
    }

    appInitialized = true;

    /*
     * Load + repair BEFORE attaching UI.
     * This is what makes old/corrupt data recoverable.
     */
    db = loadDatabase();

    repairDatabase();

    saveDatabase();

    /*
     * Authentication is initialized first.
     * Even if another feature has a JS problem,
     * Sign In remains available.
     */
    safeSetup(
        "Authentication",
        setupAuthentication
    );

    safeSetup(
        "Theme",
        setupTheme
    );

    safeSetup(
        "Sound",
        setupSound
    );

    safeSetup(
        "Navigation",
        setupNavigation
    );

    safeSetup(
        "Friends",
        setupFriendSystem
    );

    safeSetup(
        "Games",
        setupGames
    );

    safeSetup(
        "Game Arena",
        setupGameArena
    );

    safeSetup(
        "Rooms",
        setupRooms
    );

    safeSetup(
        "Thoughts",
        setupThoughts
    );

    safeSetup(
        "Leaderboard",
        setupLeaderboard
    );

    safeSetup(
        "Modals",
        setupModals
    );

    /*
     * Check current session.
     * Invalid sessions are automatically cleared.
     */
    const current =
        getCurrentUser();

    if (current) {
        repairUser(current);

        saveCurrentUser();

        updateStreak();

        showApp();
    } else {
        currentUserId = null;

        safeStorageRemove(
            CURRENT_USER_KEY
        );

        showAuth();
    }
}


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeFriendZone,
        {
            once: true
        }
    );
} else {
    initializeFriendZone();
}


/* =========================================================
   EXTRA SAFETY
========================================================= */

/*
 * If browser storage becomes unavailable,
 * don't crash the complete website.
 */

window.addEventListener(
    "error",
    event => {
        console.error(
            "FriendZone runtime error:",
            event.error ||
                event.message
        );
    }
);

window.addEventListener(
    "unhandledrejection",
    event => {
        console.error(
            "FriendZone promise error:",
            event.reason
        );
    }
);
