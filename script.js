/* =========================================================
   FRIENDZONE - PART 3
   script.js
   ========================================================= */

/* =========================================================
   1. GLOBAL STATE & STORAGE
   ========================================================= */

const STORAGE_KEY = "friendzone_data_v1";
const CURRENT_USER_KEY = "friendzone_current_user";
const THEME_KEY = "friendzone_theme";
const SOUND_KEY = "friendzone_sound";

let data = loadData();
let currentUserId = localStorage.getItem(CURRENT_USER_KEY);
let captchaAnswer = 0;
let currentGame = null;
let tapRushTimer = null;
let tapRushCount = 0;
let tapRushTime = 10;
let memoryCards = [];
let memoryFirst = null;
let memorySecond = null;
let memoryLock = false;
let numberTarget = 0;
let numberAttempts = 0;


/* =========================================================
   2. DEFAULT DATA
   ========================================================= */

function defaultData() {
    return {
        users: [],
        friendRequests: [],
        bestFriendRequests: [],
        rooms: [],
        activities: [],
        settings: {}
    };
}

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return defaultData();
        }

        const parsed = JSON.parse(saved);

        return {
            ...defaultData(),
            ...parsed
        };
    } catch (error) {
        console.error("Could not load FriendZone data:", error);
        return defaultData();
    }
}

function saveData() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getCurrentUser() {
    if (!currentUserId) return null;

    return data.users.find(user => user.id === currentUserId) || null;
}

function updateCurrentUser(callback) {
    const user = getCurrentUser();

    if (!user) return;

    callback(user);
    saveData();
    renderEverything();
}


/* =========================================================
   3. DOM HELPERS
   ========================================================= */

function $(selector) {
    return document.querySelector(selector);
}

function $$(selector) {
    return document.querySelectorAll(selector);
}

function showElement(element) {
    if (element) {
        element.classList.remove("hidden");
    }
}

function hideElement(element) {
    if (element) {
        element.classList.add("hidden");
    }
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================================
   4. TOAST
   ========================================================= */

function showToast(message, type = "info") {
    let toast = $("#toast");

    if (!toast) {
        toast = document.createElement("div");
        toast.id = "toast";
        toast.className = "toast";
        document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.className = `toast show ${type}`;

    clearTimeout(toast._timer);

    toast._timer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}


/* =========================================================
   5. MODALS
   ========================================================= */

function openModal(modal) {
    if (!modal) return;

    modal.classList.add("active");
    modal.classList.remove("hidden");
    document.body.classList.add("modal-open");
}

function closeModal(modal) {
    if (!modal) return;

    modal.classList.remove("active");

    setTimeout(() => {
        modal.classList.add("hidden");
    }, 180);

    document.body.classList.remove("modal-open");
}

function showGeneralModal(title, content) {
    const modal = $("#generalModal");

    if (!modal) return;

    const titleElement = modal.querySelector(".modal-title");
    const bodyElement = modal.querySelector(".modal-body");

    if (titleElement) {
        titleElement.textContent = title;
    }

    if (bodyElement) {
        bodyElement.innerHTML = content;
    }

    openModal(modal);
}


/* =========================================================
   6. CAPTCHA
   ========================================================= */

function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;

    captchaAnswer = num1 + num2;

    const question = $("#captchaQuestion");

    if (question) {
        question.textContent = `${num1} + ${num2} = ?`;
    }

    const input = $("#captchaInput");

    if (input) {
        input.value = "";
    }
}

function verifyCaptcha() {
    const input = $("#captchaInput");

    if (!input) return false;

    return Number(input.value) === captchaAnswer;
}


/* =========================================================
   7. PASSWORD VALIDATION
   ========================================================= */

function validatePassword(password) {
    const errors = [];

    if (password.length < 8) {
        errors.push("at least 8 characters");
    }

    if (!/[A-Z]/.test(password)) {
        errors.push("one capital letter");
    }

    if (!/[0-9]/.test(password)) {
        errors.push("one number");
    }

    return errors;
}


/* =========================================================
   8. FRIEND ID
   ========================================================= */

function generateFriendID() {
    let friendID;

    do {
        const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        const first =
            letters[Math.floor(Math.random() * letters.length)] +
            letters[Math.floor(Math.random() * letters.length)];

        const numbers = Math.floor(100000 + Math.random() * 900000);

        friendID = `FZ-${first}${numbers}`;
    } while (data.users.some(user => user.friendId === friendID));

    return friendID;
}


/* =========================================================
   9. USER HELPERS
   ========================================================= */

function findUserByEmail(email) {
    return data.users.find(
        user => user.email.toLowerCase() === email.toLowerCase()
    );
}

function findUserByFriendID(friendId) {
    return data.users.find(
        user => user.friendId.toLowerCase() === friendId.toLowerCase()
    );
}

function getUserById(id) {
    return data.users.find(user => user.id === id);
}

function createUser(name, email, password) {
    const now = Date.now();

    const user = {
        id: crypto.randomUUID ? crypto.randomUUID() : `user_${now}_${Math.random()}`,
        name,
        email: email.toLowerCase(),
        password,
        friendId: generateFriendID(),

        avatar: name.charAt(0).toUpperCase(),

        friends: [],
        bestFriends: [],

        xp: 0,
        level: 1,

        gamesPlayed: 0,
        gamesWon: 0,

        streak: 0,
        lastActiveDate: null,

        thoughts: [],

        achievements: [],

        createdAt: now
    };

    data.users.push(user);

    saveData();

    return user;
}


/* =========================================================
   10. AUTHENTICATION - FIXED VERSION
   ========================================================= */

function setupAuthentication() {

    // -----------------------------
    // SIGN IN / SIGN UP TABS
    // -----------------------------

    const signInTab =
        document.getElementById("signInTab");

    const signUpTab =
        document.getElementById("signUpTab");

    const signInForm =
        document.getElementById("signInForm");

    const signUpForm =
        document.getElementById("signUpForm");


    // SIGN IN TAB
    if (signInTab) {
        signInTab.addEventListener("click", function (e) {

            e.preventDefault();

            signInTab.classList.add("active");

            if (signUpTab) {
                signUpTab.classList.remove("active");
            }

            if (signInForm) {
                signInForm.classList.remove("hidden");
                signInForm.style.display = "";
            }

            if (signUpForm) {
                signUpForm.classList.add("hidden");
                signUpForm.style.display = "none";
            }
        });
    }


    // SIGN UP TAB
    if (signUpTab) {
        signUpTab.addEventListener("click", function (e) {

            e.preventDefault();

            signUpTab.classList.add("active");

            if (signInTab) {
                signInTab.classList.remove("active");
            }

            if (signUpForm) {
                signUpForm.classList.remove("hidden");
                signUpForm.style.display = "";
            }

            if (signInForm) {
                signInForm.classList.add("hidden");
                signInForm.style.display = "none";
            }

            generateCaptcha();
        });
    }


    // -----------------------------
    // SIGN IN FORM
    // -----------------------------

    if (signInForm) {

        signInForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                const emailElement =
                    document.getElementById("signinEmail");

                const passwordElement =
                    document.getElementById("signinPassword");

                if (!emailElement || !passwordElement) {
                    showToast(
                        "Login fields are missing from the page.",
                        "error"
                    );

                    console.error(
                        "signinEmail or signinPassword not found."
                    );

                    return;
                }

                const email =
                    emailElement.value.trim().toLowerCase();

                const password =
                    passwordElement.value;


                if (!email) {
                    showToast(
                        "Please enter your email.",
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
                    data.users.find(
                        function (item) {
                            return (
                                item.email.toLowerCase() ===
                                email
                            );
                        }
                    );


                if (!user) {
                    showToast(
                        "No account found with this email.",
                        "error"
                    );
                    return;
                }


                if (user.password !== password) {
                    showToast(
                        "Incorrect password.",
                        "error"
                    );
                    return;
                }


                // LOGIN SUCCESS
                currentUserId = user.id;

                localStorage.setItem(
                    CURRENT_USER_KEY,
                    user.id
                );

                updateStreak(user);

                showApp();

                showToast(
                    `Welcome back, ${user.name}!`,
                    "success"
                );

                playSound("success");
            }
        );
    }


    // -----------------------------
    // SIGN UP FORM
    // -----------------------------

    if (signUpForm) {

        signUpForm.addEventListener(
            "submit",
            function (event) {

                event.preventDefault();

                const nameElement =
                    document.getElementById("signupName");

                const emailElement =
                    document.getElementById("signupEmail");

                const passwordElement =
                    document.getElementById("signupPassword");


                if (
                    !nameElement ||
                    !emailElement ||
                    !passwordElement
                ) {
                    showToast(
                        "Signup fields are missing from the page.",
                        "error"
                    );

                    console.error(
                        "Signup input IDs are missing."
                    );

                    return;
                }


                const name =
                    nameElement.value.trim();

                const email =
                    emailElement.value
                        .trim()
                        .toLowerCase();

                const password =
                    passwordElement.value;


                // NAME
                if (name.length < 2) {
                    showToast(
                        "Please enter your name.",
                        "error"
                    );
                    return;
                }


                // EMAIL
                if (
                    !email ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
                ) {
                    showToast(
                        "Please enter a valid email.",
                        "error"
                    );
                    return;
                }


                // EXISTING ACCOUNT
                if (findUserByEmail(email)) {
                    showToast(
                        "This email is already registered.",
                        "error"
                    );
                    return;
                }


                // PASSWORD
                const passwordErrors =
                    validatePassword(password);


                if (passwordErrors.length > 0) {

                    showToast(
                        "Password needs " +
                        passwordErrors.join(", ") +
                        ".",
                        "error"
                    );

                    return;
                }


                // CAPTCHA
                if (!verifyCaptcha()) {

                    showToast(
                        "Incorrect CAPTCHA answer.",
                        "error"
                    );

                    generateCaptcha();

                    return;
                }


                // CREATE USER
                const user =
                    createUser(
                        name,
                        email,
                        password
                    );


                currentUserId =
                    user.id;


                localStorage.setItem(
                    CURRENT_USER_KEY,
                    user.id
                );


                updateStreak(user);

                showApp();


                showToast(
                    `Welcome to FriendZone, ${user.name}!`,
                    "success"
                );


                playSound("success");

                launchConfetti();
            }
        );
    }


    // -----------------------------
    // FORGOT PASSWORD
    // -----------------------------

    const forgotButton =
        document.getElementById("forgotPassword");


    if (forgotButton) {

        forgotButton.addEventListener(
            "click",
            function (event) {

                event.preventDefault();

                openForgotPasswordModal();
            }
        );
    }


    // Generate CAPTCHA initially
    generateCaptcha();
}


/* =========================================================
   CAPTCHA - FIXED
   ========================================================= */

function generateCaptcha() {

    const number1 =
        Math.floor(Math.random() * 9) + 1;

    const number2 =
        Math.floor(Math.random() * 9) + 1;


    captchaAnswer =
        number1 + number2;


    const question =
        document.getElementById(
            "captchaQuestion"
        );


    if (question) {
        question.textContent =
            `${number1} + ${number2} = ?`;
    }


    const input =
        document.getElementById(
            "captchaInput"
        );


    if (input) {
        input.value = "";
    }
}


function verifyCaptcha() {

    const input =
        document.getElementById(
            "captchaInput"
        );


    if (!input) {

        console.error(
            "captchaInput was not found."
        );

        return false;
    }


    return (
        Number(input.value) ===
        Number(captchaAnswer)
    );
}


/* =========================================================
   PASSWORD VALIDATION
   ========================================================= */

function validatePassword(password) {

    const errors = [];


    if (password.length < 8) {
        errors.push(
            "at least 8 characters"
        );
    }


    if (!/[A-Z]/.test(password)) {
        errors.push(
            "one capital letter"
        );
    }


    if (!/[0-9]/.test(password)) {
        errors.push(
            "one number"
        );
    }


    return errors;
}


/* =========================================================
   FORGOT PASSWORD - COMPLETELY FIXED
   ========================================================= */

function openForgotPasswordModal() {

    const modal =
        document.getElementById(
            "generalModal"
        );


    if (!modal) {

        showToast(
            "Password reset window is missing.",
            "error"
        );

        console.error(
            "generalModal not found."
        );

        return;
    }


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
            "Reset Password";
    }


    if (body) {

        body.innerHTML = `

            <div class="reset-password-box">

                <p>
                    Enter your registered email address.
                </p>

                <input
                    id="resetEmail"
                    class="input"
                    type="email"
                    placeholder="Registered email"
                    autocomplete="email"
                >

                <button
                    type="button"
                    class="btn btn-primary full-width"
                    id="verifyResetEmail"
                >
                    Verify Email
                </button>


                <div
                    id="resetStepTwo"
                    class="hidden"
                    style="display:none;"
                >

                    <br>

                    <input
                        id="newResetPassword"
                        class="input"
                        type="password"
                        placeholder="New password"
                        autocomplete="new-password"
                    >

                    <br>

                    <button
                        type="button"
                        class="btn btn-primary full-width"
                        id="resetPasswordBtn"
                    >
                        Reset Password
                    </button>

                </div>

            </div>
        `;
    }


    openModal(modal);


    // VERIFY EMAIL
    const verifyButton =
        document.getElementById(
            "verifyResetEmail"
        );


    if (verifyButton) {

        verifyButton.onclick =
            function () {

                const emailElement =
                    document.getElementById(
                        "resetEmail"
                    );


                const email =
                    emailElement.value
                        .trim()
                        .toLowerCase();


                if (!email) {

                    showToast(
                        "Please enter your email.",
                        "error"
                    );

                    return;
                }


                const user =
                    findUserByEmail(email);


                if (!user) {

                    showToast(
                        "This email is not registered.",
                        "error"
                    );

                    return;
                }


                // EMAIL FOUND
                const stepTwo =
                    document.getElementById(
                        "resetStepTwo"
                    );


                if (stepTwo) {

                    stepTwo.classList.remove(
                        "hidden"
                    );

                    stepTwo.style.display =
                        "block";
                }


                verifyButton.disabled =
                    true;

                verifyButton.textContent =
                    "Email Verified ✓";


                showToast(
                    "Email verified. Enter your new password.",
                    "success"
                );
            };
    }


    // RESET PASSWORD
    const resetButton =
        document.getElementById(
            "resetPasswordBtn"
        );


    if (resetButton) {

        resetButton.onclick =
            function () {

                const emailElement =
                    document.getElementById(
                        "resetEmail"
                    );


                const passwordElement =
                    document.getElementById(
                        "newResetPassword"
                    );


                const email =
                    emailElement.value
                        .trim()
                        .toLowerCase();


                const newPassword =
                    passwordElement.value;


                const user =
                    findUserByEmail(email);


                if (!user) {

                    showToast(
                        "Please verify your registered email first.",
                        "error"
                    );

                    return;
                }


                const errors =
                    validatePassword(
                        newPassword
                    );


                if (errors.length > 0) {

                    showToast(
                        "Password needs " +
                        errors.join(", ") +
                        ".",
                        "error"
                    );

                    return;
                }


                user.password =
                    newPassword;


                saveData();


                closeModal(modal);


                showToast(
                    "Password successfully reset! You can now sign in.",
                    "success"
                );


                playSound("success");
            };
    }
}


/* =========================================================
   11. FORGOT PASSWORD
   ========================================================= */

function showForgotPassword() {
    showGeneralModal(
        "Reset Password",
        `
        <div class="reset-password-box">
            <p>Enter your registered email address.</p>

            <input
                id="resetEmail"
                class="input"
                type="email"
                placeholder="Registered email"
            >

            <button class="btn btn-primary full-width" id="verifyResetEmail">
                Verify Email
            </button>

            <div id="resetStepTwo" class="hidden">
                <br>

                <input
                    id="newResetPassword"
                    class="input"
                    type="password"
                    placeholder="New password"
                >

                <button class="btn btn-primary full-width" id="resetPasswordBtn">
                    Reset Password
                </button>
            </div>
        </div>
        `
    );

    $("#verifyResetEmail")?.addEventListener("click", () => {
        const email = $("#resetEmail")?.value.trim();

        const user = findUserByEmail(email);

        if (!user) {
            showToast(
                "This email is not registered.",
                "error"
            );
            return;
        }

        $("#resetStepTwo")?.classList.remove("hidden");

        showToast(
            "Email verified. Enter your new password.",
            "success"
        );
    });

    document.addEventListener(
        "click",
        handleResetPasswordClick,
        {
            once: true
        }
    );
}

function handleResetPasswordClick(event) {
    if (!event.target.matches("#resetPasswordBtn")) return;

    const email = $("#resetEmail")?.value.trim();
    const newPassword = $("#newResetPassword")?.value;

    const user = findUserByEmail(email);

    if (!user) {
        showToast("Email verification failed.", "error");
        return;
    }

    const errors = validatePassword(newPassword);

    if (errors.length) {
        showToast(
            `Password needs ${errors.join(", ")}.`,
            "error"
        );
        return;
    }

    user.password = newPassword;

    saveData();

    closeModal($("#generalModal"));

    showToast(
        "Password successfully reset.",
        "success"
    );
}


/* =========================================================
   12. LOGOUT
   ========================================================= */

function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
    currentUserId = null;

    showAuth();

    showToast(
        "You have been logged out.",
        "success"
    );
}


/* =========================================================
   13. NAVIGATION
   ========================================================= */

function setupNavigation() {
    $$(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            const target = link.dataset.section;

            if (!target) return;

            navigateTo(target);
        });
    });

    $$("[data-go]").forEach(button => {
        button.addEventListener("click", () => {
            navigateTo(button.dataset.go);
        });
    });
}

function navigateTo(sectionName) {
    $$(".app-section").forEach(section => {
        section.classList.remove("active");
    });

    const target = $(`#${sectionName}`);

    if (target) {
        target.classList.add("active");
    }

    $$(".nav-link").forEach(link => {
        link.classList.toggle(
            "active",
            link.dataset.section === sectionName
        );
    });

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

    renderEverything();
}


/* =========================================================
   14. MOBILE NAVIGATION
   ========================================================= */

function setupMobileNavigation() {
    const menuButton = $("#menuButton");
    const nav = $("#mainNav");

    if (!menuButton || !nav) return;

    menuButton.addEventListener("click", () => {
        nav.classList.toggle("open");
    });

    $$(".nav-link").forEach(link => {
        link.addEventListener("click", () => {
            nav.classList.remove("open");
        });
    });
}


/* =========================================================
   15. THEME
   ========================================================= */

function setupTheme() {
    const savedTheme =
        localStorage.getItem(THEME_KEY) || "dark";

    applyTheme(savedTheme);

    $("#themeButton")?.addEventListener(
        "click",
        toggleTheme
    );
}

function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;

    localStorage.setItem(
        THEME_KEY,
        theme
    );

    const button = $("#themeButton");

    if (button) {
        button.innerHTML =
            theme === "dark"
                ? "☀️"
                : "🌙";
    }
}

function toggleTheme() {
    const current =
        document.documentElement.dataset.theme ||
        "dark";

    const next =
        current === "dark"
            ? "light"
            : "dark";

    applyTheme(next);

    playSound("click");
}


/* =========================================================
   16. SOUND SYSTEM
   ========================================================= */

let audioContext = null;

function isSoundEnabled() {
    return localStorage.getItem(SOUND_KEY) !== "off";
}

function setupSound() {
    updateSoundButton();

    $("#soundButton")?.addEventListener(
        "click",
        toggleSound
    );
}

function toggleSound() {
    const enabled = isSoundEnabled();

    localStorage.setItem(
        SOUND_KEY,
        enabled ? "off" : "on"
    );

    updateSoundButton();

    if (!enabled) {
        playSound("success");
    }
}

function updateSoundButton() {
    const button = $("#soundButton");

    if (!button) return;

    button.innerHTML =
        isSoundEnabled()
            ? "🔊"
            : "🔇";
}

function getAudioContext() {
    if (!audioContext) {
        const AudioCtx =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioCtx) return null;

        audioContext = new AudioCtx();
    }

    return audioContext;
}

function playSound(type = "click") {
    if (!isSoundEnabled()) return;

    const ctx = getAudioContext();

    if (!ctx) return;

    const oscillator =
        ctx.createOscillator();

    const gain =
        ctx.createGain();

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    let frequency = 500;

    if (type === "success") {
        frequency = 700;
    }

    if (type === "error") {
        frequency = 180;
    }

    if (type === "win") {
        frequency = 850;
    }

    oscillator.frequency.value = frequency;
    oscillator.type = "sine";

    gain.gain.setValueAtTime(
        0.0001,
        ctx.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.08,
        ctx.currentTime + 0.01
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        ctx.currentTime + 0.18
    );

    oscillator.start();
    oscillator.stop(
        ctx.currentTime + 0.2
    );
}


/* =========================================================
   17. STREAK SYSTEM
   ========================================================= */

function getTodayString() {
    const date = new Date();

    return date.toISOString().split("T")[0];
}

function getYesterdayString() {
    const date = new Date();

    date.setDate(date.getDate() - 1);

    return date.toISOString().split("T")[0];
}

function updateStreak(user) {
    const today = getTodayString();

    if (!user.lastActiveDate) {
        user.streak = 1;
        user.lastActiveDate = today;
    } else if (user.lastActiveDate === today) {
        return;
    } else if (user.lastActiveDate === getYesterdayString()) {
        user.streak += 1;
        user.lastActiveDate = today;
    } else {
        user.streak = 1;
        user.lastActiveDate = today;
    }

    saveData();
}


/* =========================================================
   18. XP / LEVEL
   ========================================================= */

function addXP(amount) {
    const user = getCurrentUser();

    if (!user) return;

    const oldLevel = user.level;

    user.xp += amount;

    user.level =
        Math.floor(user.xp / 500) + 1;

    saveData();

    if (user.level > oldLevel) {
        playSound("win");

        launchConfetti();

        showToast(
            `🎉 Level Up! You are now Level ${user.level}!`,
            "success"
        );
    }
}


/* =========================================================
   19. FRIEND SYSTEM
   ========================================================= */

function areFriends(userA, userB) {
    if (!userA || !userB) return false;

    return (
        userA.friends.includes(userB.id) &&
        userB.friends.includes(userA.id)
    );
}

function pendingFriendRequest(fromId, toId) {
    return data.friendRequests.find(
        request =>
            request.from === fromId &&
            request.to === toId &&
            request.status === "pending"
    );
}

function sendFriendRequest(friendId) {
    const currentUser = getCurrentUser();

    if (!currentUser) {
        showToast("Please sign in first.", "error");
        return;
    }

    const targetUser =
        findUserByFriendID(friendId);

    if (!targetUser) {
        showToast(
            "Friend ID not found.",
            "error"
        );
        return;
    }

    if (targetUser.id === currentUser.id) {
        showToast(
            "You cannot add yourself.",
            "error"
        );
        return;
    }

    if (areFriends(currentUser, targetUser)) {
        showToast(
            "You are already friends.",
            "info"
        );
        return;
    }

    if (
        pendingFriendRequest(
            currentUser.id,
            targetUser.id
        )
    ) {
        showToast(
            "Friend request already sent.",
            "info"
        );
        return;
    }

    if (
        pendingFriendRequest(
            targetUser.id,
            currentUser.id
        )
    ) {
        showToast(
            "This person already sent you a request.",
            "info"
        );
        return;
    }

    data.friendRequests.push({
        id:
            crypto.randomUUID?.() ||
            `request_${Date.now()}`,
        from: currentUser.id,
        to: targetUser.id,
        status: "pending",
        createdAt: Date.now()
    });

    saveData();

    showToast(
        `Friend request sent to ${targetUser.name}!`,
        "success"
    );

    renderEverything();
}

function acceptFriendRequest(requestId) {
    const request =
        data.friendRequests.find(
            item => item.id === requestId
        );

    if (!request) return;

    const currentUser = getCurrentUser();

    if (!currentUser || request.to !== currentUser.id) {
        return;
    }

    const sender =
        getUserById(request.from);

    if (!sender) return;

    if (!currentUser.friends.includes(sender.id)) {
        currentUser.friends.push(sender.id);
    }

    if (!sender.friends.includes(currentUser.id)) {
        sender.friends.push(currentUser.id);
    }

    request.status = "accepted";

    saveData();

    addXP(30);

    showToast(
        `🎉 You and ${sender.name} are now friends!`,
        "success"
    );

    launchConfetti();

    renderEverything();
}

function rejectFriendRequest(requestId) {
    const request =
        data.friendRequests.find(
            item => item.id === requestId
        );

    if (!request) return;

    const currentUser = getCurrentUser();

    if (!currentUser || request.to !== currentUser.id) {
        return;
    }

    request.status = "rejected";

    saveData();

    showToast(
        "Friend request rejected.",
        "info"
    );

    renderEverything();
}

function removeFriend(friendId) {
    const currentUser = getCurrentUser();
    const friend = getUserById(friendId);

    if (!currentUser || !friend) return;

    currentUser.friends =
        currentUser.friends.filter(
            id => id !== friend.id
        );

    friend.friends =
        friend.friends.filter(
            id => id !== currentUser.id
        );

    currentUser.bestFriends =
        currentUser.bestFriends.filter(
            id => id !== friend.id
        );

    friend.bestFriends =
        friend.bestFriends.filter(
            id => id !== currentUser.id
        );

    saveData();

    showToast(
        `${friend.name} removed from friends.`,
        "info"
    );

    renderEverything();
}


/* =========================================================
   20. BEST FRIEND SYSTEM
   ========================================================= */

function isBestFriend(user, friendId) {
    return user.bestFriends.includes(friendId);
}

function toggleBestFriend(friendId) {
    const user = getCurrentUser();
    const friend = getUserById(friendId);

    if (!user || !friend) return;

    if (!areFriends(user, friend)) {
        showToast(
            "You can only choose a friend as Best Friend.",
            "error"
        );
        return;
    }

    if (isBestFriend(user, friendId)) {
        user.bestFriends =
            user.bestFriends.filter(
                id => id !== friendId
            );

        saveData();

        showToast(
            `${friend.name} removed from Best Friends.`,
            "info"
        );

        renderEverything();
        return;
    }

    user.bestFriends.push(friendId);

    saveData();

    addXP(20);

    showToast(
        `⭐ ${friend.name} added to Best Friends!`,
        "success"
    );

    renderEverything();
}


/* =========================================================
   21. FRIEND SEARCH
   ========================================================= */

function setupFriendSystem() {
    $("#sendFriendRequest")?.addEventListener(
        "click",
        () => {
            const input = $("#friendIdInput");

            if (!input) return;

            sendFriendRequest(
                input.value.trim()
            );

            input.value = "";
        }
    );

    $("#friendIdInput")?.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                $("#sendFriendRequest")?.click();
            }
        }
    );

    document.addEventListener(
        "click",
        event => {
            const acceptButton =
                event.target.closest(
                    "[data-accept-request]"
                );

            if (acceptButton) {
                acceptFriendRequest(
                    acceptButton.dataset.acceptRequest
                );
            }

            const rejectButton =
                event.target.closest(
                    "[data-reject-request]"
                );

            if (rejectButton) {
                rejectFriendRequest(
                    rejectButton.dataset.rejectRequest
                );
            }

            const removeButton =
                event.target.closest(
                    "[data-remove-friend]"
                );

            if (removeButton) {
                removeFriend(
                    removeButton.dataset.removeFriend
                );
            }

            const bestButton =
                event.target.closest(
                    "[data-best-friend]"
                );

            if (bestButton) {
                toggleBestFriend(
                    bestButton.dataset.bestFriend
                );
            }
        }
    );
}


/* =========================================================
   22. FRIEND THOUGHTS
   ========================================================= */

function addThought() {
    const input =
        $("#thoughtInput");

    if (!input) return;

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
            "Thought must be under 160 characters.",
            "error"
        );
        return;
    }

    const user = getCurrentUser();

    if (!user) return;

    user.thoughts.unshift({
        id:
            crypto.randomUUID?.() ||
            `thought_${Date.now()}`,
        text,
        createdAt: Date.now()
    });

    user.thoughts =
        user.thoughts.slice(0, 5);

    saveData();

    input.value = "";

    addXP(5);

    showToast(
        "Thought posted!",
        "success"
    );

    renderEverything();
}


/* =========================================================
   23. ACHIEVEMENTS
   ========================================================= */

const ACHIEVEMENTS = [
    {
        id: "first_friend",
        title: "First Friend",
        description: "Make your first friend.",
        icon: "🤝"
    },
    {
        id: "five_friends",
        title: "Social Star",
        description: "Have 5 friends.",
        icon: "⭐"
    },
    {
        id: "best_friend",
        title: "Bestie",
        description: "Choose a Best Friend.",
        icon: "💜"
    },
    {
        id: "first_game",
        title: "Game On",
        description: "Play your first game.",
        icon: "🎮"
    },
    {
        id: "game_winner",
        title: "Winner",
        description: "Win a game.",
        icon: "🏆"
    },
    {
        id: "level_five",
        title: "Rising Star",
        description: "Reach Level 5.",
        icon: "🚀"
    },
    {
        id: "streak_seven",
        title: "7 Day Streak",
        description: "Maintain a 7 day streak.",
        icon: "🔥"
    }
];

function checkAchievements() {
    const user = getCurrentUser();

    if (!user) return;

    const checks = {
        first_friend:
            user.friends.length >= 1,

        five_friends:
            user.friends.length >= 5,

        best_friend:
            user.bestFriends.length >= 1,

        first_game:
            user.gamesPlayed >= 1,

        game_winner:
            user.gamesWon >= 1,

        level_five:
            user.level >= 5,

        streak_seven:
            user.streak >= 7
    };

    Object.entries(checks).forEach(
        ([achievementId, unlocked]) => {
            if (
                unlocked &&
                !user.achievements.includes(
                    achievementId
                )
            ) {
                user.achievements.push(
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
                        `${achievement.icon} Achievement unlocked: ${achievement.title}`,
                        "success"
                    );

                    launchConfetti();
                }
            }
        }
    );

    saveData();
}


/* =========================================================
   24. GAME SYSTEM
   ========================================================= */

function openGame(gameName) {
    currentGame = gameName;

    const modal =
        $("#gameModal");

    if (!modal) return;

    const title =
        modal.querySelector(".game-modal-title");

    const body =
        modal.querySelector(".game-modal-body");

    if (title) {
        title.textContent =
            getGameTitle(gameName);
    }

    if (body) {
        body.innerHTML =
            getGameHTML(gameName);
    }

    openModal(modal);

    initializeGame(gameName);
}

function getGameTitle(gameName) {
    const titles = {
        tapRush: "⚡ Tap Rush",
        memoryMatch: "🧠 Memory Match",
        numberGuess: "🔢 Number Guess"
    };

    return titles[gameName] || "FriendZone Game";
}

function getGameHTML(gameName) {
    if (gameName === "tapRush") {
        return `
            <div class="game-screen tap-rush-game">
                <p>Tap as many times as you can in 10 seconds!</p>

                <div class="game-score">
                    Score:
                    <strong id="tapScore">0</strong>
                </div>

                <div class="game-timer">
                    Time:
                    <strong id="tapTimer">10</strong>
                </div>

                <button
                    id="tapButton"
                    class="game-action-button"
                >
                    TAP!
                </button>

                <p id="tapMessage">
                    Press Start to begin.
                </p>

                <button
                    id="tapStart"
                    class="btn btn-primary"
                >
                    Start Game
                </button>
            </div>
        `;
    }

    if (gameName === "memoryMatch") {
        return `
            <div class="game-screen">
                <p>Find all matching pairs.</p>

                <div
                    id="memoryBoard"
                    class="memory-board"
                ></div>

                <p id="memoryMessage">
                    Find the matching cards!
                </p>
            </div>
        `;
    }

    if (gameName === "numberGuess") {
        return `
            <div class="game-screen">
                <p>Guess the number between 1 and 100.</p>

                <input
                    id="guessInput"
                    class="input"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Enter number"
                >

                <button
                    id="guessButton"
                    class="btn btn-primary"
                >
                    Guess
                </button>

                <p>
                    Attempts:
                    <strong id="guessAttempts">0</strong>
                </p>

                <p id="guessMessage">
                    Good luck!
                </p>

                <button
                    id="guessRestart"
                    class="btn btn-secondary"
                >
                    New Number
                </button>
            </div>
        `;
    }

    return `
        <div class="game-screen">
            <p>Game coming soon!</p>
        </div>
    `;
}

function initializeGame(gameName) {
    if (gameName === "tapRush") {
        setupTapRush();
    }

    if (gameName === "memoryMatch") {
        setupMemoryMatch();
    }

    if (gameName === "numberGuess") {
        setupNumberGuess();
    }
}


/* =========================================================
   25. TAP RUSH
   ========================================================= */

function setupTapRush() {
    tapRushCount = 0;
    tapRushTime = 10;

    $("#tapButton")?.addEventListener(
        "click",
        () => {
            if (!tapRushTimer) return;

            tapRushCount++;

            const score =
                $("#tapScore");

            if (score) {
                score.textContent =
                    tapRushCount;
            }

            playSound("click");
        }
    );

    $("#tapStart")?.addEventListener(
        "click",
        startTapRush
    );
}

function startTapRush() {
    if (tapRushTimer) return;

    tapRushCount = 0;
    tapRushTime = 10;

    $("#tapScore").textContent = "0";
    $("#tapTimer").textContent = "10";
    $("#tapMessage").textContent =
        "GO! GO! GO!";

    $("#tapStart").disabled = true;

    tapRushTimer =
        setInterval(() => {
            tapRushTime--;

            const timer =
                $("#tapTimer");

            if (timer) {
                timer.textContent =
                    tapRushTime;
            }

            if (tapRushTime <= 0) {
                finishTapRush();
            }
        }, 1000);
}

function finishTapRush() {
    clearInterval(tapRushTimer);

    tapRushTimer = null;

    const user = getCurrentUser();

    if (!user) return;

    user.gamesPlayed++;

    let won = false;

    if (tapRushCount >= 35) {
        won = true;
    }

    if (won) {
        user.gamesWon++;

        addXP(50);

        playSound("win");

        launchConfetti();

        $("#tapMessage").textContent =
            `🏆 Amazing! You scored ${tapRushCount}!`;
    } else {
        addXP(15);

        playSound("success");

        $("#tapMessage").textContent =
            `Nice! You scored ${tapRushCount}. Try beating 35!`;
    }

    saveData();

    checkAchievements();

    $("#tapStart").disabled = false;
    $("#tapStart").textContent =
        "Play Again";

    renderEverything();
}


/* =========================================================
   26. MEMORY MATCH
   ========================================================= */

function setupMemoryMatch() {
    const symbols = [
        "🔥",
        "⭐",
        "💜",
        "🎮",
        "🚀",
        "⚡"
    ];

    memoryCards =
        [...symbols, ...symbols]
            .sort(() => Math.random() - 0.5)
            .map((symbol, index) => ({
                id: index,
                symbol,
                flipped: false,
                matched: false
            }));

    memoryFirst = null;
    memorySecond = null;
    memoryLock = false;

    renderMemoryBoard();
}

function renderMemoryBoard() {
    const board =
        $("#memoryBoard");

    if (!board) return;

    board.innerHTML =
        memoryCards.map(card => `
            <button
                class="memory-card ${
                    card.flipped ||
                    card.matched
                        ? "flipped"
                        : ""
                } ${
                    card.matched
                        ? "matched"
                        : ""
                }"
                data-memory-id="${card.id}"
            >
                <span>
                    ${
                        card.flipped ||
                        card.matched
                            ? card.symbol
                            : "?"
                    }
                </span>
            </button>
        `).join("");

    $$(".memory-card").forEach(card => {
        card.addEventListener(
            "click",
            () => {
                flipMemoryCard(
                    Number(
                        card.dataset.memoryId
                    )
                );
            }
        );
    });
}

function flipMemoryCard(id) {
    if (memoryLock) return;

    const card =
        memoryCards.find(
            item => item.id === id
        );

    if (!card) return;

    if (
        card.flipped ||
        card.matched
    ) {
        return;
    }

    card.flipped = true;

    playSound("click");

    if (!memoryFirst) {
        memoryFirst = card;

        renderMemoryBoard();

        return;
    }

    memorySecond = card;

    renderMemoryBoard();

    memoryLock = true;

    setTimeout(() => {
        if (
            memoryFirst.symbol ===
            memorySecond.symbol
        ) {
            memoryFirst.matched = true;
            memorySecond.matched = true;

            playSound("success");

            $("#memoryMessage").textContent =
                "✨ Match found!";
        } else {
            memoryFirst.flipped = false;
            memorySecond.flipped = false;

            $("#memoryMessage").textContent =
                "Try again!";
        }

        memoryFirst = null;
        memorySecond = null;
        memoryLock = false;

        renderMemoryBoard();

        checkMemoryComplete();
    }, 600);
}

function checkMemoryComplete() {
    const complete =
        memoryCards.every(
            card => card.matched
        );

    if (!complete) return;

    const user = getCurrentUser();

    if (!user) return;

    user.gamesPlayed++;
    user.gamesWon++;

    addXP(60);

    saveData();

    checkAchievements();

    playSound("win");

    launchConfetti();

    $("#memoryMessage").textContent =
        "🏆 You matched everything!";
}


/* =========================================================
   27. NUMBER GUESS
   ========================================================= */

function setupNumberGuess() {
    startNumberGuess();

    $("#guessButton")?.addEventListener(
        "click",
        submitGuess
    );

    $("#guessInput")?.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                submitGuess();
            }
        }
    );

    $("#guessRestart")?.addEventListener(
        "click",
        startNumberGuess
    );
}

function startNumberGuess() {
    numberTarget =
        Math.floor(
            Math.random() * 100
        ) + 1;

    numberAttempts = 0;

    if ($("#guessAttempts")) {
        $("#guessAttempts").textContent =
            "0";
    }

    if ($("#guessMessage")) {
        $("#guessMessage").textContent =
            "Good luck!";
    }

    if ($("#guessInput")) {
        $("#guessInput").value = "";
    }
}

function submitGuess() {
    const input =
        $("#guessInput");

    if (!input) return;

    const guess =
        Number(input.value);

    if (
        !guess ||
        guess < 1 ||
        guess > 100
    ) {
        showToast(
            "Enter a number from 1 to 100.",
            "error"
        );
        return;
    }

    numberAttempts++;

    $("#guessAttempts").textContent =
        numberAttempts;

    if (guess === numberTarget) {
        const user = getCurrentUser();

        if (user) {
            user.gamesPlayed++;
            user.gamesWon++;

            const xp =
                Math.max(
                    20,
                    80 -
                    numberAttempts * 5
                );

            addXP(xp);

            saveData();

            checkAchievements();
        }

        $("#guessMessage").textContent =
            `🎉 Correct! The number was ${numberTarget}!`;

        playSound("win");

        launchConfetti();

        return;
    }

    if (guess < numberTarget) {
        $("#guessMessage").textContent =
            "📈 Too low! Try a bigger number.";
    } else {
        $("#guessMessage").textContent =
            "📉 Too high! Try a smaller number.";
    }

    playSound("click");
}


/* =========================================================
   28. GAME BUTTONS
   ========================================================= */

function setupGames() {
    $$("[data-game]").forEach(card => {
        card.addEventListener(
            "click",
            () => {
                openGame(
                    card.dataset.game
                );
            }
        );
    });
}


/* =========================================================
   29. LEADERBOARD
   ========================================================= */

function getLeaderboard(type = "daily") {
    const users = [...data.users];

    if (type === "weekly") {
        return users.sort(
            (a, b) => b.xp - a.xp
        );
    }

    return users.sort(
        (a, b) => b.xp - a.xp
    );
}

function renderLeaderboard() {
    const container =
        $("#leaderboardList");

    if (!container) return;

    const type =
        $(".leaderboard-tab.active")
            ?.dataset.type ||
        "daily";

    const users =
        getLeaderboard(type);

    if (!users.length) {
        container.innerHTML = `
            <div class="empty-state">
                No players yet.
            </div>
        `;

        return;
    }

    container.innerHTML =
        users.slice(0, 10)
            .map((user, index) => `
                <div class="leaderboard-row ${
                    user.id === currentUserId
                        ? "current-player"
                        : ""
                }">
                    <div class="leaderboard-rank">
                        ${
                            index === 0
                                ? "🥇"
                                : index === 1
                                ? "🥈"
                                : index === 2
                                ? "🥉"
                                : `#${index + 1}`
                        }
                    </div>

                    <div class="leaderboard-user">
                        <div class="avatar">
                            ${escapeHTML(user.avatar)}
                        </div>

                        <div>
                            <strong>
                                ${escapeHTML(user.name)}
                            </strong>

                            <small>
                                Level ${user.level}
                            </small>
                        </div>
                    </div>

                    <div class="leaderboard-xp">
                        ${user.xp} XP
                    </div>
                </div>
            `)
            .join("");
}

function setupLeaderboard() {
    $$(".leaderboard-tab").forEach(tab => {
        tab.addEventListener(
            "click",
            () => {
                $$(".leaderboard-tab")
                    .forEach(item =>
                        item.classList.remove(
                            "active"
                        )
                    );

                tab.classList.add("active");

                renderLeaderboard();
            }
        );
    });
}


/* =========================================================
   30. FRIEND ROOM
   ========================================================= */

function generateRoomCode() {
    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < 6; i++) {
        code += chars[
            Math.floor(
                Math.random() *
                chars.length
            )
        ];
    }

    return code;
}

function createRoom() {
    const user = getCurrentUser();

    if (!user) return;

    const code = generateRoomCode();

    data.rooms.push({
        code,
        host: user.id,
        members: [user.id],
        createdAt: Date.now()
    });

    saveData();

    const roomCode =
        $("#roomCode");

    if (roomCode) {
        roomCode.textContent =
            code;
    }

    showToast(
        `Room ${code} created!`,
        "success"
    );

    addXP(10);
}

function joinRoom() {
    const user = getCurrentUser();

    if (!user) return;

    const input =
        $("#joinRoomInput");

    if (!input) return;

    const code =
        input.value.trim().toUpperCase();

    if (!code) {
        showToast(
            "Enter a room code.",
            "error"
        );
        return;
    }

    const room =
        data.rooms.find(
            item => item.code === code
        );

    if (!room) {
        showToast(
            "Room not found.",
            "error"
        );
        return;
    }

    if (!room.members.includes(user.id)) {
        room.members.push(user.id);
    }

    saveData();

    showToast(
        `Joined room ${code}!`,
        "success"
    );

    input.value = "";

    renderRoom(room);
}

function renderRoom(room = null) {
    const codeElement =
        $("#roomCode");

    const membersElement =
        $("#roomMembers");

    if (!codeElement) return;

    if (!room) {
        const user =
            getCurrentUser();

        room =
            data.rooms.find(
                item =>
                    item.host === user?.id &&
                    item.members.includes(
                        user?.id
                    )
            );
    }

    if (!room) {
        codeElement.textContent =
            "------";

        if (membersElement) {
            membersElement.innerHTML =
                "No active room";
        }

        return;
    }

    codeElement.textContent =
        room.code;

    if (membersElement) {
        membersElement.innerHTML =
            room.members
                .map(id => {
                    const member =
                        getUserById(id);

                    return member
                        ? `<span>${escapeHTML(member.name)}</span>`
                        : "";
                })
                .join("");
    }
}

function setupRoom() {
    $("#createRoom")?.addEventListener(
        "click",
        createRoom
    );

    $("#joinRoom")?.addEventListener(
        "click",
        joinRoom
    );

    $("#joinRoomInput")?.addEventListener(
        "keydown",
        event => {
            if (event.key === "Enter") {
                joinRoom();
            }
        }
    );

    $("#copyRoomCode")?.addEventListener(
        "click",
        async () => {
            const code =
                $("#roomCode")?.textContent;

            if (!code || code === "------") {
                showToast(
                    "Create a room first.",
                    "error"
                );
                return;
            }

            await copyText(code);

            showToast(
                "Room code copied!",
                "success"
            );
        }
    );
}


/* =========================================================
   31. PROFILE
   ========================================================= */

function renderProfile() {
    const user = getCurrentUser();

    if (!user) return;

    setText(
        "#profileName",
        user.name
    );

    setText(
        "#profileEmail",
        user.email
    );

    setText(
        "#profileFriendId",
        user.friendId
    );

    setText(
        "#profileLevel",
        user.level
    );

    setText(
        "#profileXP",
        user.xp
    );

    setText(
        "#profileStreak",
        user.streak
    );

    setText(
        "#profileFriends",
        user.friends.length
    );

    setText(
        "#profileGames",
        user.gamesPlayed
    );
}

function setText(selector, value) {
    const element =
        $(selector);

    if (element) {
        element.textContent =
            value ?? "";
    }
}

async function copyText(text) {
    try {
        await navigator.clipboard.writeText(
            text
        );
    } catch {
        const textarea =
            document.createElement("textarea");

        textarea.value = text;

        document.body.appendChild(
            textarea
        );

        textarea.select();

        document.execCommand("copy");

        textarea.remove();
    }
}

function setupProfile() {
    $("#copyFriendId")?.addEventListener(
        "click",
        async () => {
            const user =
                getCurrentUser();

            if (!user) return;

            await copyText(
                user.friendId
            );

            showToast(
                "Friend ID copied!",
                "success"
            );

            playSound("success");
        }
    );

    $("#logoutButton")?.addEventListener(
        "click",
        logout
    );
}


/* =========================================================
   32. HOME STATS
   ========================================================= */

function renderHome() {
    const user = getCurrentUser();

    if (!user) return;

    setText(
        "#welcomeName",
        user.name
    );

    setText(
        "#friendCount",
        user.friends.length
    );

    setText(
        "#bestFriendCount",
        user.bestFriends.length
    );

    setText(
        "#xpCount",
        user.xp
    );

    setText(
        "#streakCount",
        user.streak
    );

    renderThoughts();
    renderAchievements();
}

function renderThoughts() {
    const container =
        $("#thoughtsList");

    if (!container) return;

    const allThoughts = [];

    data.users.forEach(user => {
        if (!user.thoughts) return;

        user.thoughts.forEach(
            thought => {
                allThoughts.push({
                    ...thought,
                    user
                });
            }
        );
    });

    allThoughts.sort(
        (a, b) =>
            b.createdAt -
            a.createdAt
    );

    if (!allThoughts.length) {
        container.innerHTML = `
            <div class="empty-state">
                💭 No thoughts yet. Be the first!
            </div>
        `;

        return;
    }

    container.innerHTML =
        allThoughts
            .slice(0, 8)
            .map(item => `
                <div class="thought-card">
                    <div class="thought-avatar">
                        ${escapeHTML(item.user.avatar)}
                    </div>

                    <div class="thought-content">
                        <strong>
                            ${escapeHTML(item.user.name)}
                        </strong>

                        <p>
                            ${escapeHTML(item.text)}
                        </p>

                        <small>
                            ${timeAgo(item.createdAt)}
                        </small>
                    </div>
                </div>
            `)
            .join("");
}

function renderAchievements() {
    const container =
        $("#achievementsList");

    if (!container) return;

    const user = getCurrentUser();

    if (!user) return;

    container.innerHTML =
        ACHIEVEMENTS
            .map(achievement => {
                const unlocked =
                    user.achievements.includes(
                        achievement.id
                    );

                return `
                    <div class="achievement-card ${
                        unlocked
                            ? "unlocked"
                            : "locked"
                    }">

                        <div class="achievement-icon">
                            ${achievement.icon}
                        </div>

                        <div>
                            <strong>
                                ${escapeHTML(
                                    achievement.title
                                )}
                            </strong>

                            <p>
                                ${escapeHTML(
                                    achievement.description
                                )}
                            </p>
                        </div>

                    </div>
                `;
            })
            .join("");
}

function timeAgo(timestamp) {
    const seconds =
        Math.floor(
            (Date.now() - timestamp) /
            1000
        );

    if (seconds < 60) {
        return "just now";
    }

    const minutes =
        Math.floor(seconds / 60);

    if (minutes < 60) {
        return `${minutes}m ago`;
    }

    const hours =
        Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days =
        Math.floor(hours / 24);

    return `${days}d ago`;
}


/* =========================================================
   33. FRIENDS PAGE
   ========================================================= */

function renderFriends() {
    const user = getCurrentUser();

    if (!user) return;

    renderMyFriends(user);
    renderFriendRequests(user);
    renderBestFriends(user);
}

function renderMyFriends(user) {
    const container =
        $("#friendsList");

    if (!container) return;

    if (!user.friends.length) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">👥</div>

                <h3>No Friends Yet</h3>

                <p>
                    Start by sending a Friend ID request.
                </p>
            </div>
        `;

        return;
    }

    container.innerHTML =
        user.friends
            .map(friendId => {
                const friend =
                    getUserById(friendId);

                if (!friend) return "";

                return `
                    <div class="friend-card">

                        <div class="friend-avatar">
                            ${escapeHTML(friend.avatar)}
                        </div>

                        <div class="friend-info">
                            <strong>
                                ${escapeHTML(friend.name)}
                            </strong>

                            <span>
                                ${escapeHTML(friend.friendId)}
                            </span>

                            <small>
                                Level ${friend.level}
                            </small>
                        </div>

                        <div class="friend-actions">

                            <button
                                class="btn btn-small"
                                data-best-friend="${friend.id}"
                            >
                                ${
                                    isBestFriend(
                                        user,
                                        friend.id
                                    )
                                        ? "⭐ Best"
                                        : "☆ Best"
                                }
                            </button>

                            <button
                                class="btn btn-small btn-danger"
                                data-remove-friend="${friend.id}"
                            >
                                Remove
                            </button>

                        </div>

                    </div>
                `;
            })
            .join("");
}

function renderFriendRequests(user) {
    const container =
        $("#friendRequestsList");

    if (!container) return;

    const requests =
        data.friendRequests.filter(
            request =>
                request.to === user.id &&
                request.status === "pending"
        );

    if (!requests.length) {
        container.innerHTML = `
            <div class="empty-state">
                📭 No pending friend requests.
            </div>
        `;

        return;
    }

    container.innerHTML =
        requests
            .map(request => {
                const sender =
                    getUserById(
                        request.from
                    );

                if (!sender) return "";

                return `
                    <div class="request-card">

                        <div class="friend-avatar">
                            ${escapeHTML(sender.avatar)}
                        </div>

                        <div class="friend-info">
                            <strong>
                                ${escapeHTML(sender.name)}
                            </strong>

                            <span>
                                ${escapeHTML(sender.friendId)}
                            </span>
                        </div>

                        <div class="request-actions">

                            <button
                                class="btn btn-primary btn-small"
                                data-accept-request="${request.id}"
                            >
                                Accept
                            </button>

                            <button
                                class="btn btn-danger btn-small"
                                data-reject-request="${request.id}"
                            >
                                Reject
                            </button>

                        </div>

                    </div>
                `;
            })
            .join("");
}

function renderBestFriends(user) {
    const container =
        $("#bestFriendsList");

    if (!container) return;

    if (!user.bestFriends.length) {
        container.innerHTML = `
            <div class="empty-state">
                ⭐ Your Best Friends circle is empty.
            </div>
        `;

        return;
    }

    container.innerHTML =
        user.bestFriends
            .map(friendId => {
                const friend =
                    getUserById(friendId);

                if (!friend) return "";

                return `
                    <div class="best-friend-card">

                        <div class="best-friend-star">
                            ⭐
                        </div>

                        <div class="friend-avatar">
                            ${escapeHTML(friend.avatar)}
                        </div>

                        <div class="friend-info">
                            <strong>
                                ${escapeHTML(friend.name)}
                            </strong>

                            <span>
                                ${escapeHTML(friend.friendId)}
                            </span>
                        </div>

                        <button
                            class="btn btn-small"
                            data-best-friend="${friend.id}"
                        >
                            Remove
                        </button>

                    </div>
                `;
            })
            .join("");
}


/* =========================================================
   34. THOUGHT INPUT
   ========================================================= */

function setupThoughts() {
    $("#postThought")?.addEventListener(
        "click",
        addThought
    );

    $("#thoughtInput")?.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {
                event.preventDefault();

                addThought();
            }
        }
    );
}


/* =========================================================
   35. COPY / GENERAL BUTTONS
   ========================================================= */

function setupGeneralButtons() {
    $$("[data-close-modal]").forEach(
        button => {
            button.addEventListener(
                "click",
                () => {
                    closeModal(
                        button.closest(".modal")
                    );
                }
            );
        }
    );

    $$(".modal").forEach(modal => {
        modal.addEventListener(
            "click",
            event => {
                if (
                    event.target === modal
                ) {
                    closeModal(modal);
                }
            }
        );
    });

    document.addEventListener(
        "keydown",
        event => {
            if (event.key === "Escape") {
                $$(".modal.active").forEach(
                    modal =>
                        closeModal(modal)
                );
            }
        }
    );
}


/* =========================================================
   36. CONFETTI
   ========================================================= */

function launchConfetti() {
    const container =
        document.createElement("div");

    container.className =
        "confetti-container";

    document.body.appendChild(
        container
    );

    const symbols = [
        "✨",
        "🎉",
        "⭐",
        "💜",
        "🔥",
        "⚡"
    ];

    for (let i = 0; i < 35; i++) {
        const piece =
            document.createElement("span");

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
            `${Math.random() * 100}%`;

        piece.style.animationDelay =
            `${Math.random() * 0.7}s`;

        piece.style.fontSize =
            `${12 + Math.random() * 16}px`;

        container.appendChild(
            piece
        );
    }

    setTimeout(() => {
        container.remove();
    }, 2500);
}


/* =========================================================
   37. ADDITIONAL CONFETTI CSS
   ========================================================= */

function injectConfettiCSS() {
    if ($("#friendzoneConfettiCSS")) {
        return;
    }

    const style =
        document.createElement("style");

    style.id =
        "friendzoneConfettiCSS";

    style.textContent = `
        .confetti-container {
            position: fixed;
            inset: 0;
            pointer-events: none;
            z-index: 99999;
            overflow: hidden;
        }

        .confetti-piece {
            position: absolute;
            top: -40px;
            animation:
                friendzoneConfettiFall
                2.2s ease-out
                forwards;
        }

        @keyframes friendzoneConfettiFall {
            0% {
                transform:
                    translateY(0)
                    rotate(0deg);
                opacity: 1;
            }

            100% {
                transform:
                    translateY(110vh)
                    rotate(720deg);
                opacity: 0;
            }
        }

        body.modal-open {
            overflow: hidden;
        }
    `;

    document.head.appendChild(
        style
    );
}


/* =========================================================
   38. GLOBAL RENDER
   ========================================================= */

function renderEverything() {
    const user = getCurrentUser();

    if (!user) return;

    checkAchievements();

    renderHome();
    renderFriends();
    renderLeaderboard();
    renderProfile();
    renderRoom();

    updateNavBadges();
}

function updateNavBadges() {
    const user = getCurrentUser();

    if (!user) return;

    const requestCount =
        data.friendRequests.filter(
            request =>
                request.to === user.id &&
                request.status === "pending"
        ).length;

    const badge =
        $("#friendRequestBadge");

    if (badge) {
        badge.textContent =
            requestCount;

        badge.classList.toggle(
            "hidden",
            requestCount === 0
        );
    }
}


/* =========================================================
   39. STARTUP
   ========================================================= */

function initializeFriendZone() {
    injectConfettiCSS();

    setupAuthentication();
    setupNavigation();
    setupMobileNavigation();

    setupTheme();
    setupSound();

    setupFriendSystem();
    setupGames();
    setupLeaderboard();

    setupRoom();
    setupProfile();

    setupThoughts();
    setupGeneralButtons();

    const user =
        getCurrentUser();

    if (user) {
        updateStreak(user);
        showApp();
    } else {
        showAuth();
    }
}


/* =========================================================
   40. DOM READY
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        initializeFriendZone
    );
} else {
    initializeFriendZone();
}
