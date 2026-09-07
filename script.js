/* =========================================================
   FRIENDZONE — FINAL SCRIPT
   Auth • Friends • Best Friends • Games • XP • Leaderboard
   Thoughts • Rooms • Profile • Theme • Sound • Confetti
   ========================================================= */

"use strict";

/* =========================================================
   STORAGE
   ========================================================= */

const STORAGE_KEY = "friendzone_database_v5";
const CURRENT_USER_KEY = "friendzone_current_user_v4";
const THEME_KEY = "friendzone_theme_v4";
const SOUND_KEY = "friendzone_sound_v4";

let db = loadDatabase();
let currentUserId = localStorage.getItem(CURRENT_USER_KEY);
let currentLeaderboardType = "daily";
let captchaAnswer = null;
let tapGame = null;
let memoryGame = null;
let numberGame = null;
let toastTimer = null;
let audioContext = null;

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
            users: Array.isArray(parsed.users) ? parsed.users : [],
            friendRequests: Array.isArray(parsed.friendRequests)
                ? parsed.friendRequests
                : [],
            bestFriendRequests: Array.isArray(parsed.bestFriendRequests)
                ? parsed.bestFriendRequests
                : [],
            rooms: Array.isArray(parsed.rooms) ? parsed.rooms : [],
            activities: Array.isArray(parsed.activities)
                ? parsed.activities
                : [],
            settings: parsed.settings || {}
        };
    } catch (error) {
        console.error("Database load error:", error);
        return defaultDatabase();
    }
}

function saveDatabase() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function saveCurrentUser() {
    if (currentUserId) {
        localStorage.setItem(CURRENT_USER_KEY, currentUserId);
    } else {
        localStorage.removeItem(CURRENT_USER_KEY);
    }
}

/* =========================================================
   DOM HELPERS
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
    return db.users.find(user => user.id === currentUserId) || null;
}

function getUserById(id) {
    return db.users.find(user => user.id === id) || null;
}

function getUserByFriendId(friendId) {
    if (!friendId) return null;

    return db.users.find(
        user => user.friendId.toUpperCase() === friendId.trim().toUpperCase()
    ) || null;
}

/* =========================================================
   ID / DATE HELPERS
   ========================================================= */

function makeId(prefix = "fz") {
    return (
        prefix +
        "_" +
        Date.now().toString(36) +
        "_" +
        Math.random().toString(36).slice(2, 10)
    );
}

function generateFriendId() {
    let id;

    do {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        let part = "";

        for (let i = 0; i < 2; i++) {
            part += letters[Math.floor(Math.random() * letters.length)];
        }

        const numbers = Math.floor(100000 + Math.random() * 900000);

        id = `FZ-${part}${numbers}`;
    } while (getUserByFriendId(id));

    return id;
}

function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
}

function getWeekKey(date = new Date()) {
    const temp = new Date(date);
    temp.setHours(0, 0, 0, 0);

    const day = temp.getDay() || 7;
    temp.setDate(temp.getDate() - day + 1);

    return localDateKey(temp);
}

function formatTime(timestamp) {
    if (!timestamp) return "";

    const date = new Date(timestamp);

    return date.toLocaleString([], {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit"
    });
}

/* =========================================================
   VALIDATION
   ========================================================= */

function validEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    if (!name) return "?";

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(part => part[0])
        .join("")
        .toUpperCase();
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "success") {
    const toast = $("toast");

    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

/* =========================================================
   SOUND
   ========================================================= */

function soundEnabled() {
    return localStorage.getItem(SOUND_KEY) !== "off";
}

function playSound(type = "click") {
    if (!soundEnabled()) return;

    try {
        audioContext =
            audioContext ||
            new (window.AudioContext || window.webkitAudioContext)();

        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

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

        const chosen = settings[type] || settings.click;

        oscillator.frequency.value = chosen.frequency;
        oscillator.type = "sine";

        gain.gain.setValueAtTime(0.0001, audioContext.currentTime);
        gain.gain.exponentialRampToValueAtTime(
            0.07,
            audioContext.currentTime + 0.01
        );
        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            audioContext.currentTime + chosen.duration
        );

        oscillator.connect(gain);
        gain.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + chosen.duration);
    } catch (error) {
        console.warn("Audio unavailable.");
    }
}

function updateSoundButton() {
    const button = $("soundButton");

    if (!button) return;

    button.textContent = soundEnabled() ? "🔊" : "🔇";
    button.title = soundEnabled() ? "Turn sound off" : "Turn sound on";
}

/* =========================================================
   THEME
   ========================================================= */

function setupTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || "dark";

    document.documentElement.dataset.theme = savedTheme;

    const button = $("themeButton");

    if (button) {
        button.textContent = savedTheme === "dark" ? "☀️" : "🌙";
    }
}

function toggleTheme() {
    const current =
        document.documentElement.dataset.theme === "light"
            ? "light"
            : "dark";

    const next = current === "dark" ? "light" : "dark";

    document.documentElement.dataset.theme = next;
    localStorage.setItem(THEME_KEY, next);

    const button = $("themeButton");

    if (button) {
        button.textContent = next === "dark" ? "☀️" : "🌙";
    }

    playSound("click");
}

/* =========================================================
   AUTH
   ========================================================= */

function setupAuthentication() {
    const signInTab = $("signInTab");
    const signUpTab = $("signUpTab");

    const signInForm = $("signInForm");
    const signUpForm = $("signUpForm");

    if (!signInTab || !signUpTab || !signInForm || !signUpForm) {
        console.error("Authentication elements missing.");
        return;
    }

    signInTab.addEventListener("click", event => {
        event.preventDefault();

        signInTab.classList.add("active");
        signUpTab.classList.remove("active");

        signInForm.classList.remove("hidden");
        signUpForm.classList.add("hidden");

        if ($("authTitle")) {
            $("authTitle").textContent = "Welcome Back";
        }

        if ($("authSubtitle")) {
            $("authSubtitle").textContent =
                "Sign in to continue your FriendZone journey.";
        }

        playSound("click");
    });

    signUpTab.addEventListener("click", event => {
        event.preventDefault();

        signUpTab.classList.add("active");
        signInTab.classList.remove("active");

        signUpForm.classList.remove("hidden");
        signInForm.classList.add("hidden");

        if ($("authTitle")) {
            $("authTitle").textContent = "Create Account";
        }

        if ($("authSubtitle")) {
            $("authSubtitle").textContent =
                "Create your account and start connecting.";
        }

        generateCaptcha();
        playSound("click");
    });

    signInForm.addEventListener("submit", event => {
        event.preventDefault();
        signIn();
    });

    signUpForm.addEventListener("submit", event => {
        event.preventDefault();
        signUp();
    });

    $("forgotPassword")?.addEventListener("click", event => {
        event.preventDefault();
        openForgotPassword();
    });

    $("refreshCaptcha")?.addEventListener("click", event => {
        event.preventDefault();
        generateCaptcha();
        playSound("click");
    });

    generateCaptcha();
}

function signIn() {
    const email = $("signinEmail")?.value.trim().toLowerCase();
    const password = $("signinPassword")?.value;

    if (!email || !password) {
        showToast("Please enter email and password.", "error");
        playSound("error");
        return;
    }

    const user = db.users.find(
        item => item.email.toLowerCase() === email
    );

    if (!user) {
        showToast("No account found with this email.", "error");
        playSound("error");
        return;
    }

    if (user.password !== password) {
        showToast("Incorrect password.", "error");
        playSound("error");
        return;
    }

    currentUserId = user.id;
    saveCurrentUser();

    updateStreak(user);

    saveDatabase();

    showApp();

    showToast(`Welcome back, ${user.name}!`);
    playSound("success");
}

function signUp() {
    const name = $("signupName")?.value.trim();
    const email = $("signupEmail")?.value.trim().toLowerCase();
    const password = $("signupPassword")?.value;
    const captchaInput = $("captchaInput")?.value.trim();

    if (!name || name.length < 2) {
        showToast("Please enter a valid name.", "error");
        playSound("error");
        return;
    }

    if (!validEmail(email)) {
        showToast("Please enter a valid email address.", "error");
        playSound("error");
        return;
    }

    if (db.users.some(user => user.email.toLowerCase() === email)) {
        showToast("An account with this email already exists.", "error");
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

    if (Number(captchaInput) !== captchaAnswer) {
        showToast("Incorrect CAPTCHA answer.", "error");
        generateCaptcha();
        playSound("error");
        return;
    }

    const user = {
        id: makeId("user"),
        name,
        email,
        password,
        friendId: generateFriendId(),
        avatar: "",
        friends: [],
        bestFriends: [],
        xp: 0,
        xpDaily: 0,
        xpWeekly: 0,
        dailyDate: localDateKey(),
        weeklyDate: getWeekKey(),
        level: 1,
        gamesPlayed: 0,
        gamesWon: 0,
        streak: 1,
        lastActiveDate: localDateKey(),
        thoughts: [],
        achievements: [],
        createdAt: Date.now()
    };

    db.users.push(user);

    currentUserId = user.id;
    saveCurrentUser();

    saveDatabase();

    showApp();

    showToast(
        `Account created! Your Friend ID is ${user.friendId}`
    );

    playSound("win");
    launchConfetti();
}

/* =========================================================
   CAPTCHA
   ========================================================= */

function generateCaptcha() {
    const a = Math.floor(Math.random() * 9) + 2;
    const b = Math.floor(Math.random() * 9) + 2;

    captchaAnswer = a + b;

    if ($("captchaQuestion")) {
        $("captchaQuestion").textContent = `${a} + ${b} = ?`;
    }

    if ($("captchaInput")) {
        $("captchaInput").value = "";
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

    $("verifyResetEmail")?.addEventListener("click", verifyResetEmail);
}

function verifyResetEmail() {
    const email = $("resetEmail")?.value.trim().toLowerCase();

    const user = db.users.find(
        item => item.email.toLowerCase() === email
    );

    if (!user) {
        showToast("That email is not registered.", "error");
        playSound("error");
        return;
    }

    showToast("Email verified.");

    const area = $("resetPasswordArea");

    if (area) {
        area.classList.remove("hidden");
    }

    $("saveNewPassword")?.addEventListener("click", () => {
        const newPassword = $("newResetPassword")?.value || "";

        if (!validPassword(newPassword)) {
            showToast(
                "Password needs 8+ characters, 1 capital letter and 1 number.",
                "error"
            );
            playSound("error");
            return;
        }

        user.password = newPassword;

        saveDatabase();

        closeModal();

        showToast("Password changed successfully.");
        playSound("success");
    });
}

/* =========================================================
   APP SHOW / LOGOUT
   ========================================================= */

function showApp() {
    const authScreen = $("authScreen");
    const appShell = $("appShell");

    if (!currentUserId || !getCurrentUser()) {
        show(authScreen);
        hide(appShell);
        return;
    }

    hide(authScreen);
    show(appShell);

    updateStreak(getCurrentUser());
    renderEverything();
}

function logout() {
    currentUserId = null;
    localStorage.removeItem(CURRENT_USER_KEY);

    closeModal();

    show($("authScreen"));
    hide($("appShell"));

    if ($("signinForm")) {
        $("signinForm").reset();
    }

    if ($("signInTab")) {
        $("signInTab").click();
    }

    showToast("You have been logged out.");
    playSound("click");
}

/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
    $all(".nav-link[data-section]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            const section = button.dataset.section;

            navigateTo(section);

            $("mainNav")?.classList.remove("open");
        });
    });

    $all("[data-go]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();

            const section = button.dataset.go;

            if (section) {
                navigateTo(section);
            }
        });
    });

    $("menuButton")?.addEventListener("click", event => {
        event.preventDefault();

        $("mainNav")?.classList.toggle("open");
        playSound("click");
    });
}

function navigateTo(sectionId) {
    const section = $(sectionId);

    if (!section) {
        console.warn(`Section "${sectionId}" does not exist.`);
        return;
    }

    $all(".app-section").forEach(item => {
        item.classList.remove("active");
    });

    section.classList.add("active");

    $all(".nav-link").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.section === sectionId
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

function areFriends(userA, userB) {
    if (!userA || !userB) return false;

    return (
        userA.friends.includes(userB.id) &&
        userB.friends.includes(userA.id)
    );
}

function pendingFriendRequest(fromId, toId) {
    return db.friendRequests.find(
        request =>
            request.fromId === fromId &&
            request.toId === toId &&
            request.status === "pending"
    );
}

function setupFriendSystem() {
    $("sendFriendRequest")?.addEventListener(
        "click",
        sendFriendRequest
    );

    $("copyFriendId")?.addEventListener("click", () => {
        copyText(getCurrentUser()?.friendId || "");
    });

    $("friendIdInput")?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            sendFriendRequest();
        }
    });

    $("createRoom")?.addEventListener("click", createRoom);
    $("joinRoom")?.addEventListener("click", joinRoom);

    $("joinRoomInput")?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            joinRoom();
        }
    });

    $("copyRoomCode")?.addEventListener("click", () => {
        copyText($("roomCode")?.textContent || "");
    });
}

function sendFriendRequest() {
    const current = getCurrentUser();

    if (!current) return;

    const friendId = $("friendIdInput")?.value.trim().toUpperCase();

    if (!friendId) {
        showToast("Enter a Friend ID first.", "error");
        playSound("error");
        return;
    }

    if (friendId === current.friendId.toUpperCase()) {
        showToast("You cannot add yourself.", "error");
        playSound("error");
        return;
    }

    const target = getUserByFriendId(friendId);

    if (!target) {
        showToast("Friend ID not found.", "error");
        playSound("error");
        return;
    }

    if (areFriends(current, target)) {
        showToast("You are already friends.", "error");
        playSound("error");
        return;
    }

    if (pendingFriendRequest(current.id, target.id)) {
        showToast("Friend request already sent.", "error");
        playSound("error");
        return;
    }

    if (pendingFriendRequest(target.id, current.id)) {
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

    $("friendIdInput").value = "";

    renderFriends();
    updateFriendRequestBadge();

    showToast(`Friend request sent to ${target.name}!`);
    playSound("success");
}

function acceptFriendRequest(requestId) {
    const current = getCurrentUser();

    if (!current) return;

    const request = db.friendRequests.find(
        item =>
            item.id === requestId &&
            item.toId === current.id &&
            item.status === "pending"
    );

    if (!request) return;

    const sender = getUserById(request.fromId);

    if (!sender) return;

    if (!current.friends.includes(sender.id)) {
        current.friends.push(sender.id);
    }

    if (!sender.friends.includes(current.id)) {
        sender.friends.push(current.id);
    }

    request.status = "accepted";
    request.acceptedAt = Date.now();

    addXP(current, 50, false);

    saveDatabase();

    renderEverything();

    showToast(`${sender.name} is now your friend!`);
    playSound("success");
    launchConfetti();
}

function rejectFriendRequest(requestId) {
    const current = getCurrentUser();

    if (!current) return;

    const request = db.friendRequests.find(
        item =>
            item.id === requestId &&
            item.toId === current.id &&
            item.status === "pending"
    );

    if (!request) return;

    request.status = "rejected";

    saveDatabase();

    renderEverything();

    showToast("Friend request rejected.");
    playSound("click");
}

function removeFriend(friendId) {
    const current = getCurrentUser();
    const friend = getUserById(friendId);

    if (!current || !friend) return;

    current.friends = current.friends.filter(id => id !== friend.id);
    friend.friends = friend.friends.filter(id => id !== current.id);

    current.bestFriends = current.bestFriends.filter(
        id => id !== friend.id
    );

    friend.bestFriends = friend.bestFriends.filter(
        id => id !== current.id
    );

    saveDatabase();
    renderEverything();

    showToast(`${friend.name} removed from friends.`);
}

function toggleBestFriend(friendId) {
    const current = getCurrentUser();
    const friend = getUserById(friendId);

    if (!current || !friend) return;

    if (!areFriends(current, friend)) {
        showToast("You can only add a friend to Best Friends.", "error");
        return;
    }

    const isBest = current.bestFriends.includes(friend.id);

    if (isBest) {
        current.bestFriends = current.bestFriends.filter(
            id => id !== friend.id
        );

        showToast(`${friend.name} removed from Best Friends.`);
    } else {
        current.bestFriends.push(friend.id);

        addAchievement(current, "best_friend");

        showToast(`${friend.name} added to Best Friends!`);
        launchConfetti();
    }

    saveDatabase();
    renderEverything();
}

/* =========================================================
   FRIEND DETAILS
   ========================================================= */

function openFriendDetails(friendId) {
    const current = getCurrentUser();
    const friend = getUserById(friendId);

    if (!current || !friend) return;

    if (!areFriends(current, friend)) {
        showToast(
            "Friend details are available after accepting the request.",
            "error"
        );
        return;
    }

    const best =
        current.bestFriends.includes(friend.id);

    openModal(
        friend.name,
        `
        <div style="text-align:center;">
            <div class="profile-avatar" style="width:72px;height:72px;font-size:1.1rem;">
                ${friend.avatar
                    ? `<img src="${escapeHTML(friend.avatar)}" alt="">`
                    : escapeHTML(getInitials(friend.name))}
            </div>

            <h3 style="margin-top:12px;">
                ${escapeHTML(friend.name)}
            </h3>

            <p style="margin-top:5px;">
                Friend ID: ${escapeHTML(friend.friendId)}
            </p>

            <p style="margin-top:8px;">
                Level ${friend.level} • ${friend.xp} XP
            </p>

            <p style="margin-top:6px;">
                🔥 ${friend.streak} day streak
            </p>

            ${
                best
                    ? `<p style="margin-top:10px;color:var(--pink);font-weight:800;">
                        💖 Best Friend
                       </p>`
                    : ""
            }
        </div>
        `
    );
}

/* =========================================================
   BEST FRIEND REQUESTS
   ========================================================= */

function sendBestFriendRequest(friendId) {
    const current = getCurrentUser();
    const friend = getUserById(friendId);

    if (!current || !friend) return;

    if (!areFriends(current, friend)) {
        showToast("You must be friends first.", "error");
        return;
    }

    if (current.bestFriends.includes(friend.id)) {
        showToast("Already in Best Friends.");
        return;
    }

    const exists = db.bestFriendRequests.find(
        request =>
            request.fromId === current.id &&
            request.toId === friend.id &&
            request.status === "pending"
    );

    if (exists) {
        showToast("Best Friend request already sent.", "error");
        return;
    }

    db.bestFriendRequests.push({
        id: makeId("best"),
        fromId: current.id,
        toId: friend.id,
        status: "pending",
        createdAt: Date.now()
    });

    saveDatabase();

    showToast(`Best Friend request sent to ${friend.name}!`);
}

function acceptBestFriendRequest(requestId) {
    const current = getCurrentUser();

    if (!current) return;

    const request = db.bestFriendRequests.find(
        item =>
            item.id === requestId &&
            item.toId === current.id &&
            item.status === "pending"
    );

    if (!request) return;

    const sender = getUserById(request.fromId);

    if (!sender || !areFriends(current, sender)) return;

    if (!current.bestFriends.includes(sender.id)) {
        current.bestFriends.push(sender.id);
    }

    if (!sender.bestFriends.includes(current.id)) {
        sender.bestFriends.push(current.id);
    }

    request.status = "accepted";

    addAchievement(current, "best_friend");

    saveDatabase();
    renderEverything();

    showToast(`${sender.name} is now your Best Friend!`);
    playSound("win");
    launchConfetti();
}

/* =========================================================
   XP / LEVEL
   ========================================================= */

function refreshXPPeriods(user) {
    const today = localDateKey();
    const week = getWeekKey();

    if (user.dailyDate !== today) {
        user.dailyDate = today;
        user.xpDaily = 0;
    }

    if (user.weeklyDate !== week) {
        user.weeklyDate = week;
        user.xpWeekly = 0;
    }
}

function addXP(user, amount, showMessage = true) {
    if (!user || amount <= 0) return;

    refreshXPPeriods(user);

    user.xp += amount;
    user.xpDaily += amount;
    user.xpWeekly += amount;

    const oldLevel = user.level;

    user.level = Math.max(
        1,
        Math.floor(user.xp / 250) + 1
    );

    if (user.level > oldLevel) {
        if (showMessage) {
            showToast(`🎉 Level up! You reached Level ${user.level}!`);
            launchConfetti();
            playSound("win");
        }
    }

    if (user.level >= 5) {
        addAchievement(user, "level_five");
    }

    saveDatabase();
}

/* =========================================================
   STREAK
   ========================================================= */

function updateStreak(user) {
    if (!user) return;

    const today = localDateKey();

    if (!user.lastActiveDate) {
        user.lastActiveDate = today;
        user.streak = 1;
        return;
    }

    if (user.lastActiveDate === today) {
        return;
    }

    const last = new Date(user.lastActiveDate + "T00:00:00");
    const current = new Date(today + "T00:00:00");

    const difference =
        Math.round((current - last) / 86400000);

    if (difference === 1) {
        user.streak = (user.streak || 0) + 1;
    } else {
        user.streak = 1;
    }

    user.lastActiveDate = today;

    if (user.streak >= 7) {
        addAchievement(user, "streak_seven");
    }

    saveDatabase();
}

/* =========================================================
   ACHIEVEMENTS
   ========================================================= */

const ACHIEVEMENTS = {
    first_friend: {
        title: "First Friend",
        description: "Make your first friend.",
        icon: "🤝"
    },

    five_friends: {
        title: "Social Star",
        description: "Reach 5 friends.",
        icon: "⭐"
    },

    best_friend: {
        title: "Besties",
        description: "Add someone to Best Friends.",
        icon: "💖"
    },

    first_game: {
        title: "Game Starter",
        description: "Play your first game.",
        icon: "🎮"
    },

    game_winner: {
        title: "Winner",
        description: "Win your first game.",
        icon: "🏆"
    },

    level_five: {
        title: "Level 5",
        description: "Reach Level 5.",
        icon: "🚀"
    },

    streak_seven: {
        title: "7 Day Streak",
        description: "Maintain a 7 day streak.",
        icon: "🔥"
    }
};

function addAchievement(user, key) {
    if (!user || !ACHIEVEMENTS[key]) return;

    if (!Array.isArray(user.achievements)) {
        user.achievements = [];
    }

    if (!user.achievements.includes(key)) {
        user.achievements.push(key);
        saveDatabase();
    }
}

function checkAchievements(user) {
    if (!user) return;

    if (user.friends.length >= 1) {
        addAchievement(user, "first_friend");
    }

    if (user.friends.length >= 5) {
        addAchievement(user, "five_friends");
    }

    if (user.gamesPlayed >= 1) {
        addAchievement(user, "first_game");
    }

    if (user.gamesWon >= 1) {
        addAchievement(user, "game_winner");
    }

    if (user.level >= 5) {
        addAchievement(user, "level_five");
    }

    if (user.streak >= 7) {
        addAchievement(user, "streak_seven");
    }

    if (user.bestFriends.length >= 1) {
        addAchievement(user, "best_friend");
    }
}

/* =========================================================
   GAMES
   ========================================================= */

function setupGames() {
    $all("[data-game]").forEach(card => {
        card.addEventListener("click", event => {
            event.preventDefault();

            const game = card.dataset.game;

            if (game === "tapRush") {
                openTapRush();
            }

            if (game === "memoryMatch") {
                openMemoryMatch();
            }

            if (game === "numberGuess") {
                openNumberGuess();
            }
        });
    });
}

function gamePlayed(win, xpAmount) {
    const user = getCurrentUser();

    if (!user) return;

    user.gamesPlayed++;

    if (win) {
        user.gamesWon++;
    }

    addXP(user, xpAmount, false);

    checkAchievements(user);

    saveDatabase();
    renderEverything();
}

/* =========================================================
   TAP RUSH
   ========================================================= */

function openTapRush() {
    tapGame = {
        score: 0,
        time: 10,
        running: false,
        timer: null
    };

    openGameModal(
        "⚡ Tap Rush",
        `
        <div class="game-screen">
            <div class="game-status">
                <div class="game-stat">
                    <div class="game-stat-label">SCORE</div>
                    <div id="tapScore" class="game-stat-value">0</div>
                </div>

                <div class="game-stat">
                    <div class="game-stat-label">TIME</div>
                    <div id="tapTime" class="game-stat-value">10</div>
                </div>
            </div>

            <p>
                Tap as fast as possible before the timer reaches zero!
            </p>

            <button id="tapButton" class="tap-button" type="button">
                TAP!
            </button>

            <div>
                <button id="startTapGame" class="game-action-button" type="button">
                    Start Game
                </button>
            </div>
        </div>
        `
    );

    $("startTapGame")?.addEventListener("click", startTapRush);

    $("tapButton")?.addEventListener("click", () => {
        if (!tapGame || !tapGame.running) return;

        tapGame.score++;

        if ($("tapScore")) {
            $("tapScore").textContent = tapGame.score;
        }

        playSound("click");
    });
}

function startTapRush() {
    if (!tapGame) return;

    tapGame.running = true;
    tapGame.score = 0;
    tapGame.time = 10;

    $("tapScore").textContent = "0";
    $("tapTime").textContent = "10";

    $("startTapGame").disabled = true;

    clearInterval(tapGame.timer);

    tapGame.timer = setInterval(() => {
        tapGame.time--;

        if ($("tapTime")) {
            $("tapTime").textContent = tapGame.time;
        }

        if (tapGame.time <= 0) {
            clearInterval(tapGame.timer);

            tapGame.running = false;

            const score = tapGame.score;
            const win = score >= 35;
            const xp = win ? 80 : Math.min(40, score);

            gamePlayed(win, xp);

            if (win) {
                showToast(`🏆 You won Tap Rush! +${xp} XP`);
                playSound("win");
                launchConfetti();
            } else {
                showToast(
                    `Good try! You scored ${score}. Need 35 to win.`,
                    "error"
                );
                playSound("error");
            }

            if ($("startTapGame")) {
                $("startTapGame").disabled = false;
                $("startTapGame").textContent = "Play Again";
            }
        }
    }, 1000);
}

/* =========================================================
   MEMORY MATCH
   ========================================================= */

function openMemoryMatch() {
    const symbols = ["🌟", "🚀", "🎮", "🔥", "💎", "🎯"];

    const cards = [...symbols, ...symbols]
        .sort(() => Math.random() - 0.5)
        .map((symbol, index) => ({
            id: index,
            symbol,
            flipped: false,
            matched: false
        }));

    memoryGame = {
        cards,
        first: null,
        second: null,
        lock: false,
        matches: 0
    };

    openGameModal(
        "🧠 Memory Match",
        `
        <div class="game-screen">
            <div class="game-status">
                <div class="game-stat">
                    <div class="game-stat-label">MATCHES</div>
                    <div id="memoryMatches" class="game-stat-value">0 / 6</div>
                </div>

                <div class="game-stat">
                    <div class="game-stat-label">PAIRS</div>
                    <div class="game-stat-value">6</div>
                </div>
            </div>

            <p>Find all six matching pairs.</p>

            <div id="memoryBoard" class="memory-board"></div>
        </div>
        `
    );

    renderMemoryBoard();
}

function renderMemoryBoard() {
    const board = $("memoryBoard");

    if (!board || !memoryGame) return;

    board.innerHTML = memoryGame.cards
        .map(card => {
            const visible =
                card.flipped || card.matched;

            return `
                <button
                    class="memory-card ${
                        visible ? "flipped" : ""
                    } ${card.matched ? "matched" : ""}"
                    data-memory-id="${card.id}"
                    type="button"
                >
                    ${visible ? escapeHTML(card.symbol) : "?"}
                </button>
            `;
        })
        .join("");

    $all("[data-memory-id]").forEach(button => {
        button.addEventListener("click", () => {
            flipMemoryCard(Number(button.dataset.memoryId));
        });
    });
}

function flipMemoryCard(id) {
    if (!memoryGame || memoryGame.lock) return;

    const card = memoryGame.cards.find(item => item.id === id);

    if (!card || card.flipped || card.matched) return;

    card.flipped = true;

    if (!memoryGame.first) {
        memoryGame.first = card;
        renderMemoryBoard();
        playSound("click");
        return;
    }

    memoryGame.second = card;
    memoryGame.lock = true;

    renderMemoryBoard();

    if (memoryGame.first.symbol === memoryGame.second.symbol) {
        memoryGame.first.matched = true;
        memoryGame.second.matched = true;

        memoryGame.matches++;

        if ($("memoryMatches")) {
            $("memoryMatches").textContent =
                `${memoryGame.matches} / 6`;
        }

        memoryGame.first = null;
        memoryGame.second = null;
        memoryGame.lock = false;

        playSound("success");

        renderMemoryBoard();

        if (memoryGame.matches === 6) {
            gamePlayed(true, 100);

            showToast("🏆 Memory Master! +100 XP");
            playSound("win");
            launchConfetti();
        }
    } else {
        setTimeout(() => {
            memoryGame.first.flipped = false;
            memoryGame.second.flipped = false;

            memoryGame.first = null;
            memoryGame.second = null;
            memoryGame.lock = false;

            renderMemoryBoard();
        }, 650);
    }
}

/* =========================================================
   NUMBER GUESS
   ========================================================= */

function openNumberGuess() {
    numberGame = {
        target: Math.floor(Math.random() * 100) + 1,
        attempts: 0,
        finished: false
    };

    openGameModal(
        "🎯 Number Guess",
        `
        <div class="game-screen">
            <div class="game-status">
                <div class="game-stat">
                    <div class="game-stat-label">RANGE</div>
                    <div class="game-stat-value">1–100</div>
                </div>

                <div class="game-stat">
                    <div class="game-stat-label">ATTEMPTS</div>
                    <div id="guessAttempts" class="game-stat-value">0</div>
                </div>
            </div>

            <p>Guess the hidden number between 1 and 100.</p>

            <input
                id="guessInput"
                class="input number-input"
                type="number"
                min="1"
                max="100"
                placeholder="Your guess"
            >

            <div>
                <button
                    id="guessButton"
                    class="game-action-button"
                    type="button"
                >
                    Guess
                </button>
            </div>

            <p id="guessMessage" style="margin-top:14px;"></p>
        </div>
        `
    );

    $("guessButton")?.addEventListener("click", makeGuess);

    $("guessInput")?.addEventListener("keydown", event => {
        if (event.key === "Enter") {
            event.preventDefault();
            makeGuess();
        }
    });
}

function makeGuess() {
    if (!numberGame || numberGame.finished) return;

    const input = $("guessInput");
    const message = $("guessMessage");

    const guess = Number(input?.value);

    if (!Number.isInteger(guess) || guess < 1 || guess > 100) {
        showToast("Enter a number from 1 to 100.", "error");
        return;
    }

    numberGame.attempts++;

    if ($("guessAttempts")) {
        $("guessAttempts").textContent =
            numberGame.attempts;
    }

    if (guess === numberGame.target) {
        numberGame.finished = true;

        const xp = Math.max(
            35,
            100 - numberGame.attempts * 10
        );

        gamePlayed(true, xp);

        if (message) {
            message.textContent =
                `🎉 Correct! The number was ${numberGame.target}.`;
        }

        showToast(`🏆 You won! +${xp} XP`);
        playSound("win");
        launchConfetti();

        if ($("guessButton")) {
            $("guessButton").disabled = true;
        }

        return;
    }

    if (message) {
        message.textContent =
            guess < numberGame.target
                ? "⬆️ Try a higher number."
                : "⬇️ Try a lower number.";
    }

    playSound("click");
}

/* =========================================================
   FRIEND ROOMS
   ========================================================= */

function generateRoomCode() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }

    return code;
}

function createRoom() {
    const current = getCurrentUser();

    if (!current) return;

    let code;

    do {
        code = generateRoomCode();
    } while (db.rooms.some(room => room.code === code));

    const room = {
        id: makeId("room"),
        code,
        hostId: current.id,
        members: [current.id],
        createdAt: Date.now()
    };

    db.rooms.push(room);

    saveDatabase();

    renderRoom(room);

    showToast(`Room created: ${code}`);
    playSound("success");
}

function joinRoom() {
    const current = getCurrentUser();

    if (!current) return;

    const input = $("joinRoomInput");

    const code = input?.value.trim().toUpperCase();

    if (!code) {
        showToast("Enter a room code.", "error");
        return;
    }

    const room = db.rooms.find(item => item.code === code);

    if (!room) {
        showToast("Room not found.", "error");
        playSound("error");
        return;
    }

    if (!room.members.includes(current.id)) {
        room.members.push(current.id);
    }

    saveDatabase();

    input.value = "";

    renderRoom(room);

    showToast("Joined the Friend Room!");
    playSound("success");
}

function renderRoom(room) {
    if (!room) {
        if ($("roomCode")) {
            $("roomCode").textContent = "------";
        }

        if ($("roomMembers")) {
            $("roomMembers").innerHTML = "";
        }

        return;
    }

    if ($("roomCode")) {
        $("roomCode").textContent = room.code;
    }

    if ($("roomMembers")) {
        $("roomMembers").innerHTML = room.members
            .map(id => {
                const user = getUserById(id);

                return `
                    <div class="room-member">
                        ${escapeHTML(user?.name || "Unknown")}
                    </div>
                `;
            })
            .join("");
    }
}

/* =========================================================
   THOUGHTS
   ========================================================= */

function setupThoughts() {
    $("postThought")?.addEventListener("click", postThought);

    $("thoughtInput")?.addEventListener("keydown", event => {
        if (
            event.key === "Enter" &&
            (event.ctrlKey || event.metaKey)
        ) {
            event.preventDefault();
            postThought();
        }
    });
}

function postThought() {
    const current = getCurrentUser();

    if (!current) return;

    const input = $("thoughtInput");

    const text = input?.value.trim();

    if (!text) {
        showToast("Write something first.", "error");
        return;
    }

    if (text.length > 160) {
        showToast("Thought must be 160 characters or less.", "error");
        return;
    }

    db.activities.unshift({
        id: makeId("thought"),
        type: "thought",
        userId: current.id,
        text,
        createdAt: Date.now()
    });

    current.thoughts = current.thoughts || [];
    current.thoughts.unshift(text);

    if (current.thoughts.length > 20) {
        current.thoughts.length = 20;
    }

    saveDatabase();

    input.value = "";

    renderThoughts();

    showToast("Thought posted!");
    playSound("success");
}

function renderThoughts() {
    const list = $("thoughtsList");

    if (!list) return;

    const thoughts = db.activities
        .filter(item => item.type === "thought")
        .slice(0, 20);

    if (!thoughts.length) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💭</div>
                <h3>No thoughts yet</h3>
                <p>Be the first person to share something.</p>
            </div>
        `;

        return;
    }

    list.innerHTML = thoughts
        .map(thought => {
            const user = getUserById(thought.userId);

            if (!user) return "";

            return `
                <div class="thought-item">
                    <div class="thought-avatar">
                        ${
                            user.avatar
                                ? `<img src="${escapeHTML(user.avatar)}" alt="">`
                                : escapeHTML(getInitials(user.name))
                        }
                    </div>

                    <div class="thought-content">
                        <div class="thought-header">
                            <span class="thought-name">
                                ${escapeHTML(user.name)}
                            </span>

                            <span class="thought-time">
                                ${escapeHTML(formatTime(thought.createdAt))}
                            </span>
                        </div>

                        <div class="thought-text">
                            ${escapeHTML(thought.text)}
                        </div>
                    </div>
                </div>
            `;
        })
        .join("");
}

/* =========================================================
   LEADERBOARD
   ========================================================= */

function setupLeaderboard() {
    $all(".leaderboard-tab").forEach(tab => {
        tab.addEventListener("click", () => {
            currentLeaderboardType = tab.dataset.type || "daily";

            $all(".leaderboard-tab").forEach(item => {
                item.classList.remove("active");
            });

            tab.classList.add("active");

            renderLeaderboard();

            playSound("click");
        });
    });
}

function renderLeaderboard() {
    const list = $("leaderboardList");

    if (!list) return;

    db.users.forEach(refreshXPPeriods);

    const users = [...db.users];

    users.sort((a, b) => {
        let aXP = a.xp;
        let bXP = b.xp;

        if (currentLeaderboardType === "daily") {
            aXP = a.xpDaily || 0;
            bXP = b.xpDaily || 0;
        }

        if (currentLeaderboardType === "weekly") {
            aXP = a.xpWeekly || 0;
            bXP = b.xpWeekly || 0;
        }

        return bXP - aXP;
    });

    if (!users.length) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏆</div>
                <h3>No players yet</h3>
                <p>Create an account to enter the leaderboard.</p>
            </div>
        `;

        return;
    }

    list.innerHTML = users
        .slice(0, 20)
        .map((user, index) => {
            let xp = user.xp;

            if (currentLeaderboardType === "daily") {
                xp = user.xpDaily || 0;
            }

            if (currentLeaderboardType === "weekly") {
                xp = user.xpWeekly || 0;
            }

            const isMe = user.id === currentUserId;

            return `
                <div class="leaderboard-item">
                    <div class="leaderboard-rank">
                        #${index + 1}
                    </div>

                    <div class="friend-avatar" style="width:38px;height:38px;flex-basis:38px;">
                        ${
                            user.avatar
                                ? `<img src="${escapeHTML(user.avatar)}" alt="">`
                                : escapeHTML(getInitials(user.name))
                        }
                    </div>

                    <div class="leaderboard-user">
                        <strong>
                            ${escapeHTML(user.name)}
                            ${isMe ? " • You" : ""}
                        </strong>

                        <span>
                            Level ${user.level}
                        </span>
                    </div>

                    <div class="leaderboard-xp">
                        ${xp} XP
                    </div>
                </div>
            `;
        })
        .join("");

    saveDatabase();
}

/* =========================================================
   PROFILE
   ========================================================= */

function renderProfile() {
    const user = getCurrentUser();

    if (!user) return;

    const avatar = $("profileAvatar");

    if (avatar) {
        avatar.innerHTML = user.avatar
            ? `<img src="${escapeHTML(user.avatar)}" alt="Profile avatar">`
            : escapeHTML(getInitials(user.name));
    }

    if ($("profileName")) {
        $("profileName").textContent = user.name;
    }

    if ($("profileEmail")) {
        $("profileEmail").textContent = user.email;
    }

    if ($("profileFriendId")) {
        $("profileFriendId").textContent = user.friendId;
    }

    if ($("profileLevel")) {
        $("profileLevel").textContent = user.level;
    }

    if ($("profileXP")) {
        $("profileXP").textContent = user.xp;
    }

    if ($("profileFriends")) {
        $("profileFriends").textContent = user.friends.length;
    }

    if ($("profileGames")) {
        $("profileGames").textContent = user.gamesPlayed;
    }

    if ($("profileStreak")) {
        $("profileStreak").textContent = user.streak;
    }

    if ($("currentUserThoughtAvatar")) {
        $("currentUserThoughtAvatar").innerHTML =
            user.avatar
                ? `<img src="${escapeHTML(user.avatar)}" alt="">`
                : escapeHTML(getInitials(user.name));
    }
}

function setupProfile() {
    $("logoutButton")?.addEventListener("click", logout);

    $("copyFriendId")?.addEventListener("click", () => {
        const user = getCurrentUser();

        if (user) {
            copyText(user.friendId);
        }
    });
}

/* =========================================================
   RENDER FRIENDS
   ========================================================= */

function renderFriends() {
    const current = getCurrentUser();

    if (!current) return;

    if ($("myFriendsCount")) {
        $("myFriendsCount").textContent =
            current.friends.length;
    }

    const friendsList = $("friendsList");
    const bestList = $("bestFriendsList");
    const requestsList = $("friendRequestsList");

    if (requestsList) {
        const requests = db.friendRequests.filter(
            request =>
                request.toId === current.id &&
                request.status === "pending"
        );

        if (!requests.length) {
            requestsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">📨</div>
                    <h3>No pending requests</h3>
                    <p>New friend requests will appear here.</p>
                </div>
            `;
        } else {
            requestsList.innerHTML = requests
                .map(request => {
                    const user = getUserById(request.fromId);

                    if (!user) return "";

                    return `
                        <div class="friend-request">
                            <div class="friend-avatar">
                                ${
                                    user.avatar
                                        ? `<img src="${escapeHTML(user.avatar)}" alt="">`
                                        : escapeHTML(getInitials(user.name))
                                }
                            </div>

                            <div class="friend-user-info">
                                <div class="friend-user-name">
                                    ${escapeHTML(user.name)}
                                </div>

                                <div class="friend-user-id">
                                    ${escapeHTML(user.friendId)}
                                </div>
                            </div>

                            <div class="friend-actions">
                                <button
                                    class="btn btn-success btn-small"
                                    data-action="accept-friend"
                                    data-id="${request.id}"
                                    type="button"
                                >
                                    Accept
                                </button>

                                <button
                                    class="btn btn-danger btn-small"
                                    data-action="reject-friend"
                                    data-id="${request.id}"
                                    type="button"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    `;
                })
                .join("");
        }
    }

    if (friendsList) {
        if (!current.friends.length) {
            friendsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">👥</div>
                    <h3>You have 0 friends</h3>
                    <p>
                        FriendZone starts with zero friends.
                        Use a Friend ID to connect with someone.
                    </p>
                </div>
            `;
        } else {
            friendsList.innerHTML = current.friends
                .map(id => {
                    const friend = getUserById(id);

                    if (!friend) return "";

                    const isBest =
                        current.bestFriends.includes(friend.id);

                    return `
                        <div class="friend-card">
                            <div class="friend-avatar">
                                ${
                                    friend.avatar
                                        ? `<img src="${escapeHTML(friend.avatar)}" alt="">`
                                        : escapeHTML(getInitials(friend.name))
                                }
                            </div>

                            <div class="friend-details">
                                <h3>
                                    ${escapeHTML(friend.name)}
                                </h3>

                                <p>
                                    ${escapeHTML(friend.friendId)}
                                </p>

                                ${
                                    isBest
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
                                    data-action="friend-details"
                                    data-id="${friend.id}"
                                    type="button"
                                >
                                    View
                                </button>

                                <button
                                    class="btn btn-secondary btn-small"
                                    data-action="best-friend"
                                    data-id="${friend.id}"
                                    type="button"
                                >
                                    ${isBest ? "💖" : "♡"}
                                </button>

                                <button
                                    class="btn btn-danger btn-small"
                                    data-action="remove-friend"
                                    data-id="${friend.id}"
                                    type="button"
                                >
                                    Remove
                                </button>
                            </div>
                        </div>
                    `;
                })
                .join("");
        }
    }

    if (bestList) {
        const bestFriends = current.bestFriends
            .map(id => getUserById(id))
            .filter(Boolean);

        if (!bestFriends.length) {
            bestList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">💖</div>
                    <h3>No Best Friends yet</h3>
                    <p>
                        Best Friends is optional. Add friends here
                        when someone becomes special to you.
                    </p>
                </div>
            `;
        } else {
            bestList.innerHTML = bestFriends
                .map(friend => {
                    return `
                        <div class="friend-card best-friend-card">
                            <div class="friend-avatar">
                                ${
                                    friend.avatar
                                        ? `<img src="${escapeHTML(friend.avatar)}" alt="">`
                                        : escapeHTML(getInitials(friend.name))
                                }
                            </div>

                            <div class="friend-details">
                                <h3>${escapeHTML(friend.name)}</h3>

                                <p>${escapeHTML(friend.friendId)}</p>

                                <div class="best-friend-badge">
                                    💖 Best Friend
                                </div>
                            </div>

                            <button
                                class="btn btn-secondary btn-small"
                                data-action="friend-details"
                                data-id="${friend.id}"
                                type="button"
                            >
                                View
                            </button>
                        </div>
                    `;
                })
                .join("");
        }
    }

    updateFriendRequestBadge();
}

/* =========================================================
   FRIEND EVENTS
   ========================================================= */

function setupFriendDelegation() {
    document.addEventListener("click", event => {
        const button = event.target.closest("[data-action]");

        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;

        if (!action || !id) return;

        if (action === "accept-friend") {
            acceptFriendRequest(id);
        }

        if (action === "reject-friend") {
            rejectFriendRequest(id);
        }

        if (action === "friend-details") {
            openFriendDetails(id);
        }

        if (action === "best-friend") {
            toggleBestFriend(id);
        }

        if (action === "remove-friend") {
            removeFriend(id);
        }
    });
}

/* =========================================================
   REQUEST BADGE
   ========================================================= */

function updateFriendRequestBadge() {
    const current = getCurrentUser();

    const badge = $("friendRequestBadge");

    if (!current || !badge) return;

    const count = db.friendRequests.filter(
        request =>
            request.toId === current.id &&
            request.status === "pending"
    ).length;

    if (count > 0) {
        badge.textContent = count > 99 ? "99+" : count;
        badge.classList.remove("hidden");
    } else {
        badge.classList.add("hidden");
    }
}

/* =========================================================
   HOME
   ========================================================= */

function renderHome() {
    const user = getCurrentUser();

    if (!user) return;

    if ($("friendCount")) {
        $("friendCount").textContent = user.friends.length;
    }

    if ($("bestFriendCount")) {
        $("bestFriendCount").textContent =
            user.bestFriends.length;
    }

    if ($("xpCount")) {
        $("xpCount").textContent = user.xp;
    }

    if ($("streakCount")) {
        $("streakCount").textContent = user.streak;
    }
}

/* =========================================================
   ACHIEVEMENT RENDER
   ========================================================= */

function renderAchievements() {
    const list = $("achievementsList");
    const user = getCurrentUser();

    if (!list || !user) return;

    checkAchievements(user);

    const unlocked = user.achievements || [];

    if (!unlocked.length) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏅</div>
                <h3>No achievements yet</h3>
                <p>Play games and make friends to unlock achievements.</p>
            </div>
        `;

        return;
    }

    list.innerHTML = unlocked
        .map(key => {
            const achievement = ACHIEVEMENTS[key];

            if (!achievement) return "";

            return `
                <div class="achievement-item">
                    <div class="achievement-icon">
                        ${achievement.icon}
                    </div>

                    <div class="achievement-info">
                        <h4>${escapeHTML(achievement.title)}</h4>
                        <p>${escapeHTML(achievement.description)}</p>
                    </div>
                </div>
            `;
        })
        .join("");
}

/* =========================================================
   MODALS
   ========================================================= */

function openModal(title, body) {
    const modal = $("generalModal");

    if (!modal) return;

    const titleElement = modal.querySelector(".modal-title");
    const bodyElement = modal.querySelector(".modal-body");

    if (titleElement) {
        titleElement.textContent = title;
    }

    if (bodyElement) {
        bodyElement.innerHTML = body;
    }

    modal.classList.remove("hidden");
    modal.classList.add("active");

    document.body.classList.add("no-scroll");
}

function openGameModal(title, body) {
    const modal = $("gameModal");

    if (!modal) return;

    const titleElement =
        modal.querySelector(".game-modal-title");

    const bodyElement =
        modal.querySelector(".game-modal-body");

    if (titleElement) {
        titleElement.textContent = title;
    }

    if (bodyElement) {
        bodyElement.innerHTML = body;
    }

    modal.classList.remove("hidden");
    modal.classList.add("active");

    document.body.classList.add("no-scroll");
}

function closeModal() {
    const modals = [$("generalModal"), $("gameModal")];

    modals.forEach(modal => {
        if (!modal) return;

        modal.classList.remove("active");
        modal.classList.add("hidden");
    });

    document.body.classList.remove("no-scroll");

    if (tapGame?.timer) {
        clearInterval(tapGame.timer);
    }

    tapGame = null;
    memoryGame = null;
    numberGame = null;
}

function setupModals() {
    $all("[data-close-modal]").forEach(button => {
        button.addEventListener("click", event => {
            event.preventDefault();
            closeModal();
        });
    });

    $all(".modal-overlay").forEach(overlay => {
        overlay.addEventListener("click", closeModal);
    });

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeModal();
        }
    });
}

/* =========================================================
   COPY
   ========================================================= */

async function copyText(text) {
    if (!text) return;

    try {
        await navigator.clipboard.writeText(text);
        showToast("Copied to clipboard!");
        playSound("success");
    } catch (error) {
        const temporary = document.createElement("textarea");

        temporary.value = text;
        temporary.style.position = "fixed";
        temporary.style.opacity = "0";

        document.body.appendChild(temporary);

        temporary.select();

        try {
            document.execCommand("copy");
            showToast("Copied to clipboard!");
        } catch {
            showToast("Could not copy automatically.", "error");
        }

        temporary.remove();
    }
}

/* =========================================================
   CONFETTI
   ========================================================= */

function launchConfetti() {
    const container = document.createElement("div");

    container.className = "confetti-container";

    const symbols = ["●", "◆", "★", "■", "✦"];

    for (let i = 0; i < 70; i++) {
        const piece = document.createElement("div");

        piece.className = "confetti-piece";

        piece.textContent =
            symbols[Math.floor(Math.random() * symbols.length)];

        piece.style.left =
            Math.random() * 100 + "%";

        piece.style.setProperty(
            "--x",
            `${(Math.random() - 0.5) * 300}px`
        );

        piece.style.animationDelay =
            Math.random() * 0.35 + "s";

        piece.style.fontSize =
            `${7 + Math.random() * 9}px`;

        piece.style.color = [
            "#7c5cff",
            "#25d9ff",
            "#ff4fd8",
            "#3ee88b",
            "#ffd45a"
        ][Math.floor(Math.random() * 5)];

        container.appendChild(piece);
    }

    document.body.appendChild(container);

    setTimeout(() => {
        container.remove();
    }, 3500);
}

/* =========================================================
   ESCAPE HTML
   ========================================================= */

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================================
   RENDER EVERYTHING
   ========================================================= */

function renderEverything() {
    const user = getCurrentUser();

    if (!user) return;

    refreshXPPeriods(user);
    updateStreak(user);

    renderHome();
    renderFriends();
    renderThoughts();
    renderAchievements();
    renderLeaderboard();
    renderProfile();

    updateFriendRequestBadge();
    updateSoundButton();

    saveDatabase();
}

/* =========================================================
   GENERAL EVENT SETUP
   ========================================================= */

function setupGeneralEvents() {
    $("themeButton")?.addEventListener(
        "click",
        toggleTheme
    );

    $("soundButton")?.addEventListener("click", () => {
        const enabled = soundEnabled();

        localStorage.setItem(
            SOUND_KEY,
            enabled ? "off" : "on"
        );

        updateSoundButton();

        playSound("click");
    });

    document.addEventListener("click", event => {
        const button = event.target.closest("button");

        if (!button) return;

        if (
            button.id !== "soundButton" &&
            button.id !== "themeButton"
        ) {
            if (
                !button.closest(".modal") ||
                button.classList.contains("game-action-button") ||
                button.classList.contains("btn")
            ) {
                playSound("click");
            }
        }
    });
}

/* =========================================================
   STARTUP
   ========================================================= */

function initialize() {
    setupTheme();
    updateSoundButton();

    setupAuthentication();
    setupNavigation();
    setupFriendSystem();
    setupFriendDelegation();
    setupThoughts();
    setupLeaderboard();
    setupGames();
    setupModals();
    setupProfile();
    setupGeneralEvents();

    const current = getCurrentUser();

    if (current) {
        updateStreak(current);
        saveDatabase();
        showApp();
    } else {
        hide($("appShell"));
        show($("authScreen"));
    }
}

/* =========================================================
   RUN
   ========================================================= */

document.addEventListener("DOMContentLoaded", initialize);
