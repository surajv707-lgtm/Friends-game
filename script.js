/* =========================================================
   FRIENDZONE — SCRIPT.JS
   Stable Supabase + Authentication + Friends
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE
   ========================================================= */

const SUPABASE_URL =
  window.FRIENDZONE_CONFIG?.SUPABASE_URL ||
  "https://hjdevuoxuoyenzmawwnb.supabase.co";

const SUPABASE_ANON_KEY =
  window.FRIENDZONE_CONFIG?.SUPABASE_ANON_KEY || "";

if (!SUPABASE_ANON_KEY) {
  console.error("Supabase API key is missing.");
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

let supabaseClient = null;

let currentUser = null;
let currentProfile = null;

let receivedRequests = [];
let sentRequests = [];
let friendships = [];
let bestFriends = [];

let realtimeChannel = null;
let currentRequestTab = "received";
let confirmCallback = null;
let openingApp = false;

/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  [...document.querySelectorAll(selector)];

function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getInitials(name) {
  const text =
    String(name || "Friend").trim();

  if (!text) return "F";

  const parts = text.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .substring(0, 2)
      .toUpperCase();
  }

  return (
    (parts[0][0] || "") +
    (parts[parts.length - 1][0] || "")
  ).toUpperCase();
}

function formatDate(date) {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return "";
  }

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "info") {
  const container =
    $("#toastContainer");

  if (!container) {
    console.log(message);
    return;
  }

  const toast =
    document.createElement("div");

  toast.className =
    `toast toast-${type}`;

  const icon =
    type === "success"
      ? "✓"
      : type === "error"
      ? "!"
      : type === "warning"
      ? "!"
      : "i";

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">
      ${escapeHTML(message)}
    </span>
    <button
      type="button"
      class="toast-close"
      aria-label="Close notification"
    >×</button>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  const remove = () => {
    toast.classList.remove("show");

    setTimeout(() => {
      toast.remove();
    }, 250);
  };

  toast
    .querySelector(".toast-close")
    ?.addEventListener("click", remove);

  setTimeout(remove, 4000);
}

/* =========================================================
   AUTH ERROR
   ========================================================= */

function friendlyAuthError(error) {
  const message =
    String(error?.message || "").toLowerCase();

  if (
    message.includes(
      "invalid login credentials"
    )
  ) {
    return "Email or password is incorrect.";
  }

  if (
    message.includes(
      "email not confirmed"
    )
  ) {
    return "Please confirm your email before signing in.";
  }

  if (
    message.includes(
      "user already registered"
    )
  ) {
    return "This email is already registered. Try signing in.";
  }

  if (
    message.includes(
      "password should be at least"
    )
  ) {
    return "Password must contain at least 6 characters.";
  }

  if (
    message.includes("invalid email")
  ) {
    return "Please enter a valid email address.";
  }

  if (
    message.includes("rate limit")
  ) {
    return "Too many attempts. Please wait a little and try again.";
  }

  if (
    message.includes(
      "email address is invalid"
    )
  ) {
    return "Please enter a valid email address.";
  }

  return (
    error?.message ||
    "Something went wrong. Please try again."
  );
}

/* =========================================================
   FIELD ERRORS
   ========================================================= */

function clearAuthErrors() {
  $$(".field-error").forEach(
    (element) => {
      element.textContent = "";
      element.classList.remove("show");
    }
  );

  $$(".auth-message").forEach(
    (element) => {
      element.textContent = "";
      element.classList.remove(
        "show",
        "success",
        "error",
        "warning"
      );
    }
  );
}

function setFieldError(id, message) {
  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent =
    message || "";

  element.classList.toggle(
    "show",
    Boolean(message)
  );
}

function setAuthMessage(
  id,
  message,
  type = "info"
) {
  const element =
    document.getElementById(id);

  if (!element) return;

  element.textContent =
    message || "";

  element.className =
    `auth-message ${type} ${
      message ? "show" : ""
    }`;
}

/* =========================================================
   BUTTON LOADING
   ========================================================= */

function setButtonLoading(
  button,
  loading,
  loadingText
) {
  if (!button) return;

  if (loading) {
    button.dataset.originalHTML =
      button.innerHTML;

    button.disabled = true;
    button.classList.add("loading");

    const content =
      button.querySelector(".btn-content");

    const loader =
      button.querySelector(".btn-loader");

    if (content) {
      content.style.visibility =
        "hidden";
    }

    if (loader) {
      loader.style.display =
        "flex";
    }

    if (loadingText) {
      button.setAttribute(
        "aria-label",
        loadingText
      );
    }

  } else {
    button.disabled = false;
    button.classList.remove("loading");

    const content =
      button.querySelector(".btn-content");

    const loader =
      button.querySelector(".btn-loader");

    if (content) {
      content.style.visibility =
        "visible";
    }

    if (loader) {
      loader.style.display =
        "none";
    }

    button.removeAttribute(
      "aria-label"
    );
  }
}

/* =========================================================
   SUPABASE INITIALIZATION
   ========================================================= */

function initializeSupabase() {
  if (
    !window.supabase ||
    typeof window.supabase.createClient !==
      "function"
  ) {
    showToast(
      "Supabase library could not be loaded.",
      "error"
    );

    return false;
  }

  if (!SUPABASE_URL ||
      !SUPABASE_ANON_KEY) {
    showToast(
      "Supabase configuration is missing.",
      "error"
    );

    return false;
  }

  try {
    supabaseClient =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );

    return true;

  } catch (error) {
    console.error(
      "Supabase initialization:",
      error
    );

    showToast(
      "Could not connect to Supabase.",
      "error"
    );

    return false;
  }
}

/* =========================================================
   AUTH SCREENS
   ========================================================= */

function showAuthScreen() {
  $("#authScreen")
    ?.classList.remove("hidden");

  $("#mainApp")
    ?.classList.add("hidden");
}

function showMainApp() {
  $("#authScreen")
    ?.classList.add("hidden");

  $("#mainApp")
    ?.classList.remove("hidden");
}

function hideAllAuthPanels() {
  $("#loginPanel")
    ?.classList.add("hidden");

  $("#signupPanel")
    ?.classList.add("hidden");

  $("#forgotPasswordPanel")
    ?.classList.add("hidden");
}

function showLoginPanel() {
  hideAllAuthPanels();

  $("#loginPanel")
    ?.classList.remove("hidden");

  clearAuthErrors();

  setTimeout(() => {
    $("#loginEmail")?.focus();
  }, 100);
}

function showSignupPanel() {
  hideAllAuthPanels();

  $("#signupPanel")
    ?.classList.remove("hidden");

  clearAuthErrors();

  setTimeout(() => {
    $("#signupName")?.focus();
  }, 100);
}

function showForgotPasswordPanel() {
  hideAllAuthPanels();

  $("#forgotPasswordPanel")
    ?.classList.remove("hidden");

  clearAuthErrors();

  const loginEmail =
    $("#loginEmail")?.value.trim();

  if (
    loginEmail &&
    $("#forgotEmail")
  ) {
    $("#forgotEmail").value =
      loginEmail;
  }

  setTimeout(() => {
    $("#forgotEmail")?.focus();
  }, 100);
}

/* =========================================================
   PASSWORD EYE
   ========================================================= */

function updatePasswordIcon(button, visible) {
  const icon =
    button.querySelector("i");

  if (!icon) return;

  icon.className = visible
    ? "fa-regular fa-eye-slash"
    : "fa-regular fa-eye";

  button.setAttribute(
    "aria-label",
    visible
      ? "Hide password"
      : "Show password"
  );

  button.setAttribute(
    "title",
    visible
      ? "Hide password"
      : "Show password"
  );

  button.classList.toggle(
    "password-visible",
    visible
  );
}

function setupPasswordToggles() {
  $$(".password-toggle").forEach(
    (button) => {

      if (
        button.dataset.passwordReady
      ) {
        return;
      }

      button.dataset.passwordReady =
        "true";

      button.addEventListener(
        "click",
        (event) => {
          event.preventDefault();
          event.stopPropagation();

          const targetId =
            button.dataset.target;

          const input =
            document.getElementById(
              targetId
            );

          if (!input) return;

          const visible =
            input.type === "password";

          input.type =
            visible
              ? "text"
              : "password";

          updatePasswordIcon(
            button,
            visible
          );

          input.focus();
        }
      );
    }
  );
}

/* =========================================================
   PASSWORD STRENGTH
   ========================================================= */

function updatePasswordStrength() {
  const input =
    $("#signupPassword");

  const bar =
    $("#strengthBar");

  const text =
    $("#strengthText");

  if (!input || !bar || !text) {
    return;
  }

  const password =
    input.value || "";

  if (!password) {
    bar.style.width = "0%";
    text.textContent =
      "Password strength";
    return;
  }

  let score = 0;

  if (password.length >= 6)
    score++;

  if (password.length >= 10)
    score++;

  if (/[A-Z]/.test(password))
    score++;

  if (/[0-9]/.test(password))
    score++;

  if (/[^A-Za-z0-9]/.test(password))
    score++;

  if (score <= 1) {
    bar.style.width = "20%";
    text.textContent = "Weak";
  } else if (score <= 3) {
    bar.style.width = "55%";
    text.textContent = "Good";
  } else {
    bar.style.width = "100%";
    text.textContent = "Strong";
  }
}

/* =========================================================
   LOGIN VALIDATION
   ========================================================= */

function validateLogin() {
  let valid = true;

  const email =
    $("#loginEmail")?.value.trim() ||
    "";

  const password =
    $("#loginPassword")?.value ||
    "";

  setFieldError(
    "loginEmailError",
    ""
  );

  setFieldError(
    "loginPasswordError",
    ""
  );

  if (!email) {
    setFieldError(
      "loginEmailError",
      "Please enter your email address."
    );

    valid = false;

  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    setFieldError(
      "loginEmailError",
      "Please enter a valid email address."
    );

    valid = false;
  }

  if (!password) {
    setFieldError(
      "loginPasswordError",
      "Please enter your password."
    );

    valid = false;

  } else if (password.length < 6) {
    setFieldError(
      "loginPasswordError",
      "Password must be at least 6 characters."
    );

    valid = false;
  }

  return valid;
}

/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(event) {
  event.preventDefault();

  clearAuthErrors();

  if (!supabaseClient) {
    showToast(
      "Supabase is not connected.",
      "error"
    );
    return;
  }

  if (!validateLogin()) {
    return;
  }

  const email =
    $("#loginEmail").value.trim();

  const password =
    $("#loginPassword").value;

  const button =
    $("#loginSubmitBtn");

  setButtonLoading(
    button,
    true,
    "Signing in"
  );

  try {
    const {
      data,
      error
    } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });

    if (error) {
      throw error;
    }

    if (!data?.user) {
      throw new Error(
        "Login completed but no user was returned."
      );
    }

    currentUser =
      data.user;

    setAuthMessage(
      "loginMessage",
      "Signed in successfully.",
      "success"
    );

    await openMainApp(
      data.user
    );

    $("#loginPassword").value =
      "";

    showToast(
      "Welcome back to FriendZone! 💜",
      "success"
    );

  } catch (error) {
    console.error(
      "SIGN IN ERROR:",
      error
    );

    const message =
      friendlyAuthError(error);

    setAuthMessage(
      "loginMessage",
      message,
      "error"
    );

    showToast(
      message,
      "error"
    );

  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}

/* =========================================================
   SIGNUP VALIDATION
   ========================================================= */

function validateSignup() {
  let valid = true;

  const name =
    $("#signupName")?.value.trim() ||
    "";

  const username =
    $("#signupUsername")?.value.trim() ||
    "";

  const email =
    $("#signupEmail")?.value.trim() ||
    "";

  const password =
    $("#signupPassword")?.value ||
    "";

  const confirmPassword =
    $("#signupConfirmPassword")?.value ||
    "";

  const terms =
    $("#acceptTerms")?.checked;

  [
    "signupNameError",
    "signupUsernameError",
    "signupEmailError",
    "signupPasswordError",
    "signupConfirmPasswordError"
  ].forEach((id) =>
    setFieldError(id, "")
  );

  if (!name) {
    setFieldError(
      "signupNameError",
      "Please enter your name."
    );
    valid = false;
  }

  if (!username) {
    setFieldError(
      "signupUsernameError",
      "Please choose a username."
    );
    valid = false;

  } else if (
    username.length < 3
  ) {
    setFieldError(
      "signupUsernameError",
      "Username must be at least 3 characters."
    );
    valid = false;

  } else if (
    username.length > 30
  ) {
    setFieldError(
      "signupUsernameError",
      "Username cannot exceed 30 characters."
    );
    valid = false;

  } else if (
    !/^[a-zA-Z0-9_.]+$/.test(
      username
    )
  ) {
    setFieldError(
      "signupUsernameError",
      "Use only letters, numbers, underscores and dots."
    );
    valid = false;
  }

  if (!email) {
    setFieldError(
      "signupEmailError",
      "Please enter your email address."
    );
    valid = false;

  } else if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    setFieldError(
      "signupEmailError",
      "Please enter a valid email address."
    );
    valid = false;
  }

  if (!password) {
    setFieldError(
      "signupPasswordError",
      "Please create a password."
    );
    valid = false;

  } else if (
    password.length < 6
  ) {
    setFieldError(
      "signupPasswordError",
      "Password must be at least 6 characters."
    );
    valid = false;
  }

  if (!confirmPassword) {
    setFieldError(
      "signupConfirmPasswordError",
      "Please confirm your password."
    );
    valid = false;

  } else if (
    password !== confirmPassword
  ) {
    setFieldError(
      "signupConfirmPasswordError",
      "Passwords do not match."
    );
    valid = false;
  }

  if (!terms) {
    showToast(
      "Please accept the FriendZone terms.",
      "warning"
    );

    valid = false;
  }

  return valid;
}

/* =========================================================
   SIGNUP
   ========================================================= */

async function handleSignup(event) {
  event.preventDefault();

  clearAuthErrors();

  if (!supabaseClient) {
    showToast(
      "Supabase is not connected.",
      "error"
    );
    return;
  }

  if (!validateSignup()) {
    return;
  }

  const name =
    $("#signupName").value.trim();

  const username =
    $("#signupUsername")
      .value.trim()
      .toLowerCase();

  const email =
    $("#signupEmail")
      .value.trim()
      .toLowerCase();

  const password =
    $("#signupPassword").value;

  const button =
    $("#signupSubmitBtn");

  setButtonLoading(
    button,
    true,
    "Creating account"
  );

  try {
    /*
     * Username is kept in auth metadata.
     * Name is also included there.
     */

    const {
      data,
      error
    } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            username,
            full_name: name
          }
        }
      });

    if (error) {
      throw error;
    }

    /*
     * Email confirmation enabled.
     */

    if (!data.session) {
      $("#signupForm")?.reset();

      updatePasswordStrength();

      showLoginPanel();

      setAuthMessage(
        "loginMessage",
        "Account created! Check your email and confirm your account before signing in.",
        "success"
      );

      showToast(
        "Account created! Check your email 📧",
        "success"
      );

      return;
    }

    currentUser =
      data.user;

    await openMainApp(
      data.user
    );

    $("#signupForm")?.reset();

    updatePasswordStrength();

    showToast(
      "Account created successfully! 🎉",
      "success"
    );

  } catch (error) {
    console.error(
      "SIGN UP ERROR:",
      error
    );

    const message =
      friendlyAuthError(error);

    setAuthMessage(
      "signupMessage",
      message,
      "error"
    );

    showToast(
      message,
      "error"
    );

  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}

/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

async function handleForgotPassword(event) {
  event.preventDefault();

  clearAuthErrors();

  if (!supabaseClient) {
    showToast(
      "Supabase is not connected.",
      "error"
    );
    return;
  }

  const email =
    $("#forgotEmail")?.value.trim() ||
    "";

  if (!email) {
    setFieldError(
      "forgotEmailError",
      "Please enter your email address."
    );
    return;
  }

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      email
    )
  ) {
    setFieldError(
      "forgotEmailError",
      "Please enter a valid email address."
    );
    return;
  }

  const button =
    $("#forgotSubmitBtn");

  setButtonLoading(
    button,
    true,
    "Sending reset link"
  );

  try {
    /*
     * IMPORTANT:
     * The reset link returns to this same website.
     */

    const redirectTo =
      window.location.origin +
      window.location.pathname;

    const {
      error
    } =
      await supabaseClient.auth
        .resetPasswordForEmail(
          email,
          {
            redirectTo
          }
        );

    if (error) {
      throw error;
    }

    setAuthMessage(
      "forgotMessage",
      "Reset link sent. Check your email.",
      "success"
    );

    showToast(
      "Password reset email sent! 📧",
      "success"
    );

  } catch (error) {
    console.error(
      "PASSWORD RESET ERROR:",
      error
    );

    const message =
      friendlyAuthError(error);

    setAuthMessage(
      "forgotMessage",
      message,
      "error"
    );

    showToast(
      message,
      "error"
    );

  } finally {
    setButtonLoading(
      button,
      false
    );
  }
}

/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile(userId) {
  if (!supabaseClient || !userId) {
    return null;
  }

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,name,friend_id,avatar_url,xp,level,streak,created_at,updated_at"
        )
        .eq("id", userId)
        .maybeSingle();

    if (error) {
      console.warn(
        "Profile load:",
        error.message
      );
      return null;
    }

    return data;

  } catch (error) {
    console.error(
      "Profile load:",
      error
    );
    return null;
  }
}

async function ensureProfile(user) {
  if (!user) return null;

  const existing =
    await loadProfile(user.id);

  if (existing) {
    return existing;
  }

  /*
   * Usually your Supabase trigger creates
   * this profile automatically.
   */

  try {
    const metadata =
      user.user_metadata || {};

    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .insert({
          id: user.id,
          name:
            metadata.name ||
            metadata.full_name ||
            "Friend"
        })
        .select(
          "id,name,friend_id,avatar_url,xp,level,streak,created_at,updated_at"
        )
        .maybeSingle();

    if (error) {
      console.warn(
        "Profile fallback:",
        error.message
      );

      return null;
    }

    return data;

  } catch (error) {
    console.error(
      "Profile fallback:",
      error
    );

    return null;
  }
}

/* =========================================================
   PROFILE UI
   ========================================================= */

function setAvatarImage(
  element,
  url,
  name
) {
  if (!element) return;

  const fallback =
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name || "Friend"
    )}&background=6d4aff&color=fff`;

  element.src =
    url || fallback;

  element.alt =
    `${name || "Friend"} profile`;
}

function updateProfileUI() {
  if (!currentUser) return;

  const metadata =
    currentUser.user_metadata || {};

  const profile =
    currentProfile || {};

  const name =
    profile.name ||
    metadata.name ||
    metadata.full_name ||
    "Friend";

  const username =
    metadata.username ||
    "";

  const friendId =
    profile.friend_id ||
    "Not assigned";

  const avatar =
    profile.avatar_url ||
    metadata.avatar_url ||
    "";

  setAvatarImage(
    $("#sidebarAvatar"),
    avatar,
    name
  );

  setAvatarImage(
    $("#headerAvatar"),
    avatar,
    name
  );

  setAvatarImage(
    $("#profileAvatar"),
    avatar,
    name
  );

  if ($("#sidebarUserName"))
    $("#sidebarUserName").textContent =
      name;

  if ($("#sidebarFriendId"))
    $("#sidebarFriendId").textContent =
      friendId;

  if ($("#profileName"))
    $("#profileName").textContent =
      name;

  if ($("#profileUsername"))
    $("#profileUsername").textContent =
      username
        ? `@${username}`
        : "@friend";

  if ($("#profileFriendId"))
    $("#profileFriendId").textContent =
      friendId;

  if ($("#homeFriendId"))
    $("#homeFriendId").textContent =
      friendId;

  if ($("#addPageMyFriendId"))
    $("#addPageMyFriendId").textContent =
      friendId;

  if ($("#profileNameInput"))
    $("#profileNameInput").value =
      name === "Friend"
        ? ""
        : name;

  if ($("#profileUsernameInput"))
    $("#profileUsernameInput").value =
      username;
}

/* =========================================================
   SAVE PROFILE
   ========================================================= */

async function saveProfile(event) {
  event.preventDefault();

  if (
    !currentUser ||
    !supabaseClient
  ) {
    return;
  }

  const name =
    $("#profileNameInput")
      ?.value.trim() || "";

  const username =
    $("#profileUsernameInput")
      ?.value.trim()
      .toLowerCase() || "";

  if (!name) {
    showToast(
      "Name cannot be empty.",
      "warning"
    );
    return;
  }

  if (
    username &&
    !/^[a-zA-Z0-9_.]+$/.test(
      username
    )
  ) {
    showToast(
      "Username contains invalid characters.",
      "warning"
    );
    return;
  }

  const button =
    $("#saveProfileBtn");

  const oldHTML =
    button?.innerHTML;

  if (button) {
    button.disabled = true;

    button.innerHTML = `
      <i class="fa-solid fa-circle-notch fa-spin"></i>
      Saving...
    `;
  }

  try {
    const {
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .update({
          name,
          updated_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          currentUser.id
        );

    if (profileError) {
      throw profileError;
    }

    const {
      data,
      error: authError
    } =
      await supabaseClient.auth
        .updateUser({
          data: {
            ...(currentUser.user_metadata || {}),
            name,
            username,
            full_name: name
          }
        });

    if (authError) {
      throw authError;
    }

    currentUser =
      data.user;

    currentProfile =
      await loadProfile(
        currentUser.id
      );

    updateProfileUI();

    showToast(
      "Profile updated successfully.",
      "success"
    );

  } catch (error) {
    console.error(
      "Profile update:",
      error
    );

    showToast(
      error?.message ||
        "Could not update your profile.",
      "error"
    );

  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML =
        oldHTML ||
        `<i class="fa-solid fa-check"></i> Save changes`;
    }
  }
}

/* =========================================================
   FRIENDS
   ========================================================= */

async function getFriends() {
  if (!currentUser) return [];

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("friendships")
        .select(
          "id,user_id,friend_id,created_at"
        )
        .or(
          `user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) {
      throw error;
    }

    const rows =
      data || [];

    const ids =
      rows.map((row) =>
        row.user_id ===
        currentUser.id
          ? row.friend_id
          : row.user_id
      );

    if (!ids.length) {
      return [];
    }

    const uniqueIds =
      [...new Set(ids)];

    const {
      data: profiles,
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,name,friend_id,avatar_url,xp,level,streak"
        )
        .in(
          "id",
          uniqueIds
        );

    if (profileError) {
      throw profileError;
    }

    return rows.map((row) => {
      const friendId =
        row.user_id ===
        currentUser.id
          ? row.friend_id
          : row.user_id;

      return {
        friendship: row,
        profile:
          (profiles || []).find(
            (p) =>
              p.id === friendId
          ) || null
      };
    });

  } catch (error) {
    console.error(
      "Friends:",
      error
    );

    return [];
  }
}

async function loadFriends() {
  friendships =
    await getFriends();

  renderFriends();
  renderRecentFriends();
  updateHomeStats();
}

/* =========================================================
   REQUESTS
   ========================================================= */

async function loadRequests() {
  if (!currentUser) return;

  try {
    const [
      receivedResult,
      sentResult
    ] = await Promise.all([
      supabaseClient
        .from("friend_requests")
        .select(
          "id,sender_id,receiver_id,status,created_at,updated_at"
        )
        .eq(
          "receiver_id",
          currentUser.id
        )
        .eq(
          "status",
          "pending"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        ),

      supabaseClient
        .from("friend_requests")
        .select(
          "id,sender_id,receiver_id,status,created_at,updated_at"
        )
        .eq(
          "sender_id",
          currentUser.id
        )
        .eq(
          "status",
          "pending"
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        )
    ]);

    if (receivedResult.error)
      throw receivedResult.error;

    if (sentResult.error)
      throw sentResult.error;

    const received =
      receivedResult.data || [];

    const sent =
      sentResult.data || [];

    const ids = [
      ...new Set([
        ...received.map(
          (r) => r.sender_id
        ),
        ...sent.map(
          (r) => r.receiver_id
        )
      ])
    ];

    let profiles = [];

    if (ids.length) {
      const {
        data,
        error
      } =
        await supabaseClient
          .from("profiles")
          .select(
            "id,name,friend_id,avatar_url,xp,level,streak"
          )
          .in("id", ids);

      if (error) throw error;

      profiles =
        data || [];
    }

    receivedRequests =
      received.map((request) => ({
        ...request,
        profile:
          profiles.find(
            (p) =>
              p.id ===
              request.sender_id
          ) || null
      }));

    sentRequests =
      sent.map((request) => ({
        ...request,
        profile:
          profiles.find(
            (p) =>
              p.id ===
              request.receiver_id
          ) || null
      }));

    renderRequests();
    updateRequestBadges();

  } catch (error) {
    console.error(
      "Requests:",
      error
    );

    receivedRequests = [];
    sentRequests = [];

    renderRequests();
    updateRequestBadges();
  }
}

/* =========================================================
   SEND FRIEND REQUEST
   ========================================================= */

async function sendFriendRequest(friendId) {
  if (!currentUser) return;

  const clean =
    String(friendId || "")
      .trim()
      .toUpperCase();

  if (!clean) {
    showToast(
      "Enter a Friend ID.",
      "warning"
    );
    return;
  }

  if (
    currentProfile?.friend_id &&
    clean ===
      String(
        currentProfile.friend_id
      ).toUpperCase()
  ) {
    showToast(
      "You cannot add yourself.",
      "warning"
    );
    return;
  }

  try {
    const {
      data: target,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,name,friend_id,avatar_url"
        )
        .eq(
          "friend_id",
          clean
        )
        .maybeSingle();

    if (error) throw error;

    if (!target) {
      showToast(
        "No user found with this Friend ID.",
        "error"
      );
      return;
    }

    if (
      target.id ===
      currentUser.id
    ) {
      showToast(
        "You cannot add yourself.",
        "warning"
      );
      return;
    }

    const {
      data: friendCheck
    } =
      await supabaseClient
        .from("friendships")
        .select("id")
        .or(
          `and(user_id.eq.${currentUser.id},friend_id.eq.${target.id}),and(user_id.eq.${target.id},friend_id.eq.${currentUser.id})`
        )
        .limit(1)
        .maybeSingle();

    if (friendCheck) {
      showToast(
        "This person is already your friend.",
        "warning"
      );
      return;
    }

    const {
      data: requestCheck
    } =
      await supabaseClient
        .from("friend_requests")
        .select(
          "id,sender_id,receiver_id,status"
        )
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${target.id}),and(sender_id.eq.${target.id},receiver_id.eq.${currentUser.id})`
        )
        .eq(
          "status",
          "pending"
        )
        .limit(1)
        .maybeSingle();

    if (requestCheck) {
      showToast(
        requestCheck.sender_id ===
          currentUser.id
          ? "Friend request already sent."
          : "This person already sent you a request. Check Requests.",
        "warning"
      );

      return;
    }

    const {
      error: insertError
    } =
      await supabaseClient
        .from("friend_requests")
        .insert({
          sender_id:
            currentUser.id,
          receiver_id:
            target.id,
          status:
            "pending"
        });

    if (insertError)
      throw insertError;

    showToast(
      `Friend request sent to ${
        target.name || "your friend"
      }! 💜`,
      "success"
    );

    $("#addFriendForm")
      ?.reset();

    $("#friendSearchResult")
      ?.classList.add("hidden");

    await loadRequests();

  } catch (error) {
    console.error(
      "Send request:",
      error
    );

    showToast(
      error?.message ||
        "Could not send friend request.",
      "error"
    );
  }
}

/* =========================================================
   ACCEPT / REJECT / CANCEL
   ========================================================= */

async function acceptFriendRequest(id) {
  if (!currentUser || !id)
    return;

  try {
    const {
      data: request,
      error
    } =
      await supabaseClient
        .from("friend_requests")
        .select(
          "id,sender_id,receiver_id,status"
        )
        .eq("id", id)
        .eq(
          "receiver_id",
          currentUser.id
        )
        .maybeSingle();

    if (error) throw error;

    if (!request) {
      showToast(
        "Friend request no longer exists.",
        "error"
      );
      return;
    }

    const {
      error: updateError
    } =
      await supabaseClient
        .from("friend_requests")
        .update({
          status:
            "accepted",
          updated_at:
            new Date().toISOString()
        })
        .eq(
          "id",
          id
        )
        .eq(
          "receiver_id",
          currentUser.id
        );

    if (updateError)
      throw updateError;

    /*
     * Insert both friendship directions.
     */

    const {
      error: friendshipError
    } =
      await supabaseClient
        .from("friendships")
        .insert([
          {
            user_id:
              request.receiver_id,
            friend_id:
              request.sender_id
          },
          {
            user_id:
              request.sender_id,
            friend_id:
              request.receiver_id
          }
        ]);

    if (friendshipError) {
      console.warn(
        "Friendship insert:",
        friendshipError
      );
    }

    showToast(
      "Friend request accepted! 🎉",
      "success"
    );

    await refreshAllData();

  } catch (error) {
    console.error(
      "Accept request:",
      error
    );

    showToast(
      error?.message ||
        "Could not accept the request.",
      "error"
    );
  }
}

async function rejectFriendRequest(id) {
  if (!currentUser || !id)
    return;

  try {
    const {
      error
    } =
      await supabaseClient
        .from("friend_requests")
        .update({
          status:
            "rejected",
          updated_at:
            new Date().toISOString()
        })
        .eq("id", id)
        .eq(
          "receiver_id",
          currentUser.id
        );

    if (error) throw error;

    showToast(
      "Friend request rejected.",
      "success"
    );

    await loadRequests();

  } catch (error) {
    console.error(
      "Reject:",
      error
    );

    showToast(
      "Could not reject the request.",
      "error"
    );
  }
}

async function cancelFriendRequest(id) {
  if (!currentUser || !id)
    return;

  try {
    const {
      error
    } =
      await supabaseClient
        .from("friend_requests")
        .delete()
        .eq(
          "id",
          id
        )
        .eq(
          "sender_id",
          currentUser.id
        );

    if (error) throw error;

    showToast(
      "Friend request cancelled.",
      "success"
    );

    await loadRequests();

  } catch (error) {
    console.error(
      "Cancel:",
      error
    );

    showToast(
      "Could not cancel the request.",
      "error"
    );
  }
}

/* =========================================================
   BEST FRIENDS
   ========================================================= */

async function loadBestFriends() {
  if (!currentUser) return;

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("best_friends")
        .select(
          "id,user_id,friend_id,created_at"
        )
        .eq(
          "user_id",
          currentUser.id
        )
        .order(
          "created_at",
          {
            ascending: false
          }
        );

    if (error) throw error;

    const rows =
      data || [];

    if (!rows.length) {
      bestFriends = [];
      renderBestFriends();
      updateHomeStats();
      return;
    }

    const ids =
      rows.map(
        (row) => row.friend_id
      );

    const {
      data: profiles,
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,name,friend_id,avatar_url,xp,level,streak"
        )
        .in(
          "id",
          ids
        );

    if (profileError)
      throw profileError;

    bestFriends =
      rows.map((row) => ({
        ...row,
        profile:
          (profiles || []).find(
            (p) =>
              p.id ===
              row.friend_id
          ) || null
      }));

    renderBestFriends();
    updateHomeStats();

  } catch (error) {
    console.error(
      "Best friends:",
      error
    );

    bestFriends = [];
    renderBestFriends();
  }
}

async function toggleBestFriend(friendId) {
  if (!currentUser || !friendId)
    return;

  try {
    const existing =
      bestFriends.find(
        (item) =>
          item.friend_id ===
          friendId
      );

    if (existing) {
      const {
        error
      } =
        await supabaseClient
          .from("best_friends")
          .delete()
          .eq(
            "id",
            existing.id
          )
          .eq(
            "user_id",
            currentUser.id
          );

      if (error) throw error;

      showToast(
        "Removed from Best Friends.",
        "success"
      );

    } else {
      const {
        error
      } =
        await supabaseClient
          .from("best_friends")
          .insert({
            user_id:
              currentUser.id,
            friend_id:
              friendId
          });

      if (error) throw error;

      showToast(
        "Added to Best Friends ⭐",
        "success"
      );
    }

    await loadBestFriends();

  } catch (error) {
    console.error(
      "Best friend:",
      error
    );

    showToast(
      error?.message ||
        "Could not update Best Friends.",
      "error"
    );
  }
}

/* =========================================================
   FRIEND CARDS
   ========================================================= */

function friendCardHTML(
  friend,
  compact = false
) {
  const profile =
    friend.profile || {};

  const name =
    profile.name ||
    "Friend";

  const id =
    profile.id || "";

  const friendId =
    profile.friend_id ||
    "Friend ID unavailable";

  const avatar =
    profile.avatar_url ||
    "";

  const isBest =
    bestFriends.some(
      (item) =>
        item.friend_id === id
    );

  return `
    <article
      class="friend-card ${
        compact
          ? "compact-card"
          : ""
      }"
      data-friend-id="${escapeHTML(id)}"
    >

      <div class="friend-card-main">

        <div class="friend-avatar-wrap">

          <div class="friend-avatar">
            ${
              avatar
                ? `
              <img
                src="${escapeHTML(
                  avatar
                )}"
                alt="${escapeHTML(
                  name
                )}"
                loading="lazy"
              >
            `
                : escapeHTML(
                    getInitials(
                      name
                    )
                  )
            }
          </div>

          <span class="online-dot"></span>

        </div>

        <div class="friend-info">
          <h3>
            ${escapeHTML(name)}
          </h3>

          <p>
            ${escapeHTML(friendId)}
          </p>
        </div>

      </div>

      <div class="friend-card-actions">

        <button
          type="button"
          class="small-action-btn best-btn ${
            isBest
              ? "active"
              : ""
          }"
          data-action="toggle-best"
          data-id="${escapeHTML(id)}"
          title="${
            isBest
              ? "Remove from Best Friends"
              : "Add to Best Friends"
          }"
        >
          <span>★</span>
        </button>

        <button
          type="button"
          class="small-action-btn view-friend-btn"
          data-action="view-friend"
          data-id="${escapeHTML(id)}"
          title="View profile"
        >
          <span>›</span>
        </button>

      </div>

    </article>
  `;
}

function renderFriends(
  searchTerm = ""
) {
  const container =
    $("#friendsContainer");

  if (!container) return;

  let list =
    [...friendships];

  const term =
    String(searchTerm || "")
      .trim()
      .toLowerCase();

  if (term) {
    list =
      list.filter(
        (item) => {
          const p =
            item.profile || {};

          return (
            String(
              p.name || ""
            )
              .toLowerCase()
              .includes(term) ||
            String(
              p.friend_id || ""
            )
              .toLowerCase()
              .includes(term)
          );
        }
      );
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-state-icon">
          👥
        </div>

        <h3>
          ${
            term
              ? "No friends found"
              : "No friends yet"
          }
        </h3>

        <p>
          ${
            term
              ? "Try another name or Friend ID."
              : "Add your first friend using their Friend ID."
          }
        </p>

        ${
          !term
            ? `
          <button
            type="button"
            class="primary-btn"
            data-go-page="addFriendPage"
          >
            Add Friend
          </button>
        `
            : ""
        }

      </div>
    `;

    return;
  }

  container.innerHTML =
    list
      .map((friend) =>
        friendCardHTML(
          friend
        )
      )
      .join("");
}

function renderRecentFriends() {
  const container =
    $("#recentFriendsContainer");

  if (!container) return;

  const recent =
    friendships.slice(0, 4);

  if (!recent.length) {
    container.innerHTML = `
      <div class="empty-state small-empty">
        <div class="empty-state-icon">
          ✨
        </div>

        <h3>
          Your circle starts here
        </h3>

        <p>
          Add friends and they will appear here.
        </p>

        <button
          type="button"
          class="primary-btn"
          data-go-page="addFriendPage"
        >
          Add Your First Friend
        </button>
      </div>
    `;

    return;
  }

  container.innerHTML =
    recent
      .map((friend) =>
        friendCardHTML(
          friend,
          true
        )
      )
      .join("");
}

function renderBestFriends() {
  const container =
    $("#bestFriendsContainer");

  if (!container) return;

  if (!bestFriends.length) {
    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-state-icon">
          ⭐
        </div>

        <h3>
          No Best Friends yet
        </h3>

        <p>
          Choose friends to keep in your special list.
        </p>

        <button
          type="button"
          class="primary-btn"
          data-go-page="friendsPage"
        >
          View Friends
        </button>

      </div>
    `;

    return;
  }

  container.innerHTML =
    bestFriends
      .map((item) =>
        friendCardHTML({
          friendship: item,
          profile:
            item.profile
        })
      )
      .join("");
}

/* =========================================================
   REQUEST RENDERING
   ========================================================= */

function requestCardHTML(
  request,
  type
) {
  const p =
    request.profile || {};

  const name =
    p.name || "Friend";

  const friendId =
    p.friend_id ||
    "Friend ID unavailable";

  const avatar =
    p.avatar_url || "";

  const received =
    type === "received";

  return `
    <article
      class="request-card"
      data-request-id="${escapeHTML(
        request.id
      )}"
    >

      <div class="request-main">

        <div class="friend-avatar">
          ${
            avatar
              ? `
            <img
              src="${escapeHTML(
                avatar
              )}"
              alt="${escapeHTML(
                name
              )}"
            >
          `
              : escapeHTML(
                  getInitials(
                    name
                  )
                )
          }
        </div>

        <div class="request-info">

          <h3>
            ${escapeHTML(name)}
          </h3>

          <p>
            ${escapeHTML(friendId)}
          </p>

          <span>
            ${formatDate(
              request.created_at
            )}
          </span>

        </div>

      </div>

      <div class="request-actions">

        ${
          received
            ? `
          <button
            type="button"
            class="request-action accept"
            data-action="accept-request"
            data-id="${escapeHTML(
              request.id
            )}"
            title="Accept request"
          >
            ✓
          </button>

          <button
            type="button"
            class="request-action reject"
            data-action="reject-request"
            data-id="${escapeHTML(
              request.id
            )}"
            title="Reject request"
          >
            ×
          </button>
        `
            : `
          <button
            type="button"
            class="request-action cancel"
            data-action="cancel-request"
            data-id="${escapeHTML(
              request.id
            )}"
            title="Cancel request"
          >
            ×
          </button>
        `
        }

      </div>

    </article>
  `;
}

function renderRequests() {
  const received =
    $("#receivedRequestsContainer");

  const sent =
    $("#sentRequestsContainer");

  if (received) {
    received.innerHTML =
      receivedRequests.length
        ? receivedRequests
            .map((r) =>
              requestCardHTML(
                r,
                "received"
              )
            )
            .join("")
        : `
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
  }

  if (sent) {
    sent.innerHTML =
      sentRequests.length
        ? sentRequests
            .map((r) =>
              requestCardHTML(
                r,
                "sent"
              )
            )
            .join("")
        : `
          <div class="empty-state">
            <div class="empty-state-icon">
              📤
            </div>
            <h3>No sent requests</h3>
            <p>
              Friend requests you send will appear here.
            </p>
          </div>
        `;
  }

  switchRequestTab(
    currentRequestTab
  );
}

function switchRequestTab(tab) {
  currentRequestTab =
    tab === "sent"
      ? "sent"
      : "received";

  $$(".request-tab")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.requestTab ===
          currentRequestTab
      );
    });

  $("#receivedRequestsContainer")
    ?.classList.toggle(
      "hidden",
      currentRequestTab !==
        "received"
    );

  $("#sentRequestsContainer")
    ?.classList.toggle(
      "hidden",
      currentRequestTab !==
        "sent"
    );
}

/* =========================================================
   STATS
   ========================================================= */

function updateRequestBadges() {
  const received =
    receivedRequests.length;

  const friendCount =
    friendships.length;

  $("#requestsBadge").textContent =
    received;

  $("#requestsBadge")
    .classList.toggle(
      "hidden",
      received === 0
    );

  $("#headerRequestBadge")
    .textContent =
      received;

  $("#headerRequestBadge")
    .classList.toggle(
      "hidden",
      received === 0
    );

  $("#receivedCount")
    .textContent =
      received;

  $("#sentCount")
    .textContent =
      sentRequests.length;

  $("#friendsBadge")
    .textContent =
      friendCount;

  $("#friendsBadge")
    .classList.toggle(
      "hidden",
      friendCount === 0
    );
}

function updateHomeStats() {
  $("#homeFriendsCount")
    .textContent =
      friendships.length;

  $("#homeRequestsCount")
    .textContent =
      receivedRequests.length;

  $("#homeBestFriendsCount")
    .textContent =
      bestFriends.length;

  updateRequestBadges();
}

/* =========================================================
   ADD FRIEND SEARCH
   ========================================================= */

async function searchFriend() {
  const input =
    $("#friendIdInput");

  const result =
    $("#friendSearchResult");

  if (!input || !result)
    return;

  const id =
    input.value
      .trim()
      .toUpperCase();

  if (!id) {
    result.innerHTML = "";
    result.classList.add(
      "hidden"
    );

    showToast(
      "Enter a Friend ID.",
      "warning"
    );

    return;
  }

  result.classList.remove(
    "hidden"
  );

  result.innerHTML = `
    <div class="search-loading">
      <span class="button-spinner"></span>
      Searching...
    </div>
  `;

  try {
    const {
      data: profile,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,name,friend_id,avatar_url,xp,level,streak"
        )
        .eq(
          "friend_id",
          id
        )
        .maybeSingle();

    if (error) throw error;

    if (!profile) {
      result.innerHTML = `
        <div class="search-empty">
          <div class="empty-state-icon">
            🔎
          </div>
          <h3>No user found</h3>
          <p>
            Check the Friend ID and try again.
          </p>
        </div>
      `;
      return;
    }

    if (
      profile.id ===
      currentUser?.id
    ) {
      result.innerHTML = `
        <div class="search-empty">
          <div class="empty-state-icon">
            👋
          </div>
          <h3>That's you!</h3>
          <p>
            You cannot send a request to yourself.
          </p>
        </div>
      `;
      return;
    }

    const alreadyFriend =
      friendships.some(
        (f) =>
          f.profile?.id ===
          profile.id
      );

    if (alreadyFriend) {
      result.innerHTML = `
        <div class="search-result-card">

          <div class="friend-avatar">
            ${
              profile.avatar_url
                ? `<img
                    src="${escapeHTML(
                      profile.avatar_url
                    )}"
                    alt="${escapeHTML(
                      profile.name
                    )}"
                  >`
                : escapeHTML(
                    getInitials(
                      profile.name
                    )
                  )
            }
          </div>

          <div class="search-result-info">

            <h3>
              ${escapeHTML(
                profile.name ||
                  "Friend"
              )}
            </h3>

            <p>
              ${escapeHTML(
                profile.friend_id
              )}
            </p>

            <span>
              Already your friend ✓
            </span>

          </div>

        </div>
      `;

      return;
    }

    result.innerHTML = `
      <div class="search-result-card">

        <div class="friend-avatar">
          ${
            profile.avatar_url
              ? `
            <img
              src="${escapeHTML(
                profile.avatar_url
              )}"
              alt="${escapeHTML(
                profile.name
              )}"
            >
          `
              : escapeHTML(
                  getInitials(
                    profile.name
                  )
                )
          }
        </div>

        <div class="search-result-info">

          <h3>
            ${escapeHTML(
              profile.name ||
                "Friend"
            )}
          </h3>

          <p>
            ${escapeHTML(
              profile.friend_id ||
                ""
            )}
          </p>

        </div>

        <button
          type="button"
          class="primary-btn small-btn"
          id="sendFoundFriendBtn"
        >
          Add Friend
        </button>

      </div>
    `;

    $("#sendFoundFriendBtn")
      ?.addEventListener(
        "click",
        () =>
          sendFriendRequest(
            profile.friend_id
          )
      );

  } catch (error) {
    console.error(
      "Search:",
      error
    );

    result.innerHTML = `
      <div class="search-empty">
        <div class="empty-state-icon">
          ⚠️
        </div>
        <h3>Search failed</h3>
        <p>
          Please try again.
        </p>
      </div>
    `;
  }
}

/* =========================================================
   NAVIGATION
   ========================================================= */

const pageInfo = {
  homePage: {
    title: "Home",
    subtitle:
      "Welcome back to your circle."
  },

  friendsPage: {
    title: "My Friends",
    subtitle:
      "Everyone in your circle."
  },

  requestsPage: {
    title: "Friend Requests",
    subtitle:
      "Manage your friend requests."
  },

  bestFriendsPage: {
    title: "Best Friends",
    subtitle:
      "Your special circle."
  },

  addFriendPage: {
    title: "Add Friend",
    subtitle:
      "Find friends using their Friend ID."
  },

  chatPage: {
    title: "Chat",
    subtitle:
      "Talk with your friends."
  },

  gamesPage: {
    title: "Game Hub",
    subtitle:
      "Play and compete with friends."
  },

  leaderboardPage: {
    title: "Leaderboard",
    subtitle:
      "See how you rank."
  },

  profilePage: {
    title: "My Profile",
    subtitle:
      "Manage your FriendZone profile."
  }
};

function navigateTo(pageId) {
  const page =
    document.getElementById(
      pageId
    );

  if (!page) return;

  $$(".page").forEach(
    (item) =>
      item.classList.remove(
        "active-page"
      )
  );

  page.classList.add(
    "active-page"
  );

  $$(".nav-item").forEach(
    (item) => {
      item.classList.toggle(
        "active",
        item.dataset.page ===
          pageId
      );
    }
  );

  const info =
    pageInfo[pageId];

  if (info) {
    $("#currentPageTitle")
      .textContent =
      info.title;

    $("#currentPageSubtitle")
      .textContent =
      info.subtitle;
  }

  closeSidebar();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* =========================================================
   SIDEBAR
   ========================================================= */

function openSidebar() {
  $("#sidebar")
    ?.classList.add("open");

  $("#sidebarOverlay")
    ?.classList.add("active");

  document.body.classList.add(
    "sidebar-open"
  );
}

function closeSidebar() {
  $("#sidebar")
    ?.classList.remove("open");

  $("#sidebarOverlay")
    ?.classList.remove("active");

  document.body.classList.remove(
    "sidebar-open"
  );
}

/* =========================================================
   FRIEND MODAL
   ========================================================= */

function closeModal(id) {
  const modal =
    document.getElementById(id);

  if (!modal) return;

  modal.classList.remove(
    "active"
  );

  modal.classList.add(
    "hidden"
  );
}

function openFriendModal(id) {
  const modal =
    $("#friendModal");

  const content =
    $("#modalFriendContent");

  if (!modal || !content)
    return;

  const friend =
    friendships.find(
      (item) =>
        item.profile?.id ===
        id
    );

  if (!friend?.profile) {
    showToast(
      "Friend profile not found.",
      "error"
    );
    return;
  }

  const profile =
    friend.profile;

  const isBest =
    bestFriends.some(
      (item) =>
        item.friend_id ===
        profile.id
    );

  content.innerHTML = `
    <div class="modal-friend-profile">

      <div class="friend-avatar large-avatar">
        ${
          profile.avatar_url
            ? `
          <img
            src="${escapeHTML(
              profile.avatar_url
            )}"
            alt="${escapeHTML(
              profile.name ||
                "Friend"
            )}"
          >
        `
            : escapeHTML(
                getInitials(
                  profile.name
                )
              )
        }
      </div>

      <h2>
        ${escapeHTML(
          profile.name ||
            "Friend"
        )}
      </h2>

      <p class="modal-friend-id">
        ${escapeHTML(
          profile.friend_id ||
            "Friend ID unavailable"
        )}
      </p>

      <button
        type="button"
        class="primary-btn"
        data-action="modal-best"
        data-id="${escapeHTML(
          profile.id
        )}"
      >
        ${
          isBest
            ? "★ Remove Best Friend"
            : "☆ Add to Best Friends"
        }
      </button>

    </div>
  `;

  modal.classList.remove(
    "hidden"
  );

  modal.classList.add(
    "active"
  );
}

/* =========================================================
   CONFIRM
   ========================================================= */

function showConfirm(
  title,
  message,
  callback
) {
  const modal =
    $("#confirmModal");

  if (!modal) {
    if (
      window.confirm(
        message
      )
    ) {
      callback?.();
    }
    return;
  }

  confirmCallback =
    callback;

  $("#confirmTitle")
    .textContent =
    title;

  $("#confirmMessage")
    .textContent =
    message;

  modal.classList.remove(
    "hidden"
  );

  modal.classList.add(
    "active"
  );
}

function closeConfirm() {
  confirmCallback = null;

  $("#confirmModal")
    ?.classList.remove(
      "active"
    );

  $("#confirmModal")
    ?.classList.add(
      "hidden"
    );
}

/* =========================================================
   REFRESH
   ========================================================= */

async function refreshAllData() {
  if (!currentUser) return;

  await Promise.all([
    loadRequests(),
    loadFriends(),
    loadBestFriends()
  ]);

  updateProfileUI();
  updateHomeStats();
}

/* =========================================================
   REALTIME
   ========================================================= */

async function stopRealtime() {
  if (
    realtimeChannel &&
    supabaseClient
  ) {
    try {
      await supabaseClient
        .removeChannel(
          realtimeChannel
        );
    } catch (error) {
      console.warn(
        "Realtime cleanup:",
        error
      );
    }
  }

  realtimeChannel =
    null;
}

async function startRealtime() {
  if (
    !supabaseClient ||
    !currentUser
  ) {
    return;
  }

  await stopRealtime();

  realtimeChannel =
    supabaseClient
      .channel(
        `friendzone-${currentUser.id}`
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter:
            `receiver_id=eq.${currentUser.id}`
        },
        () =>
          loadRequests()
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter:
            `sender_id=eq.${currentUser.id}`
        },
        () =>
          loadRequests()
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friendships",
          filter:
            `user_id=eq.${currentUser.id}`
        },
        () => {
          loadFriends();
          loadBestFriends();
        }
      )

      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "best_friends",
          filter:
            `user_id=eq.${currentUser.id}`
        },
        () =>
          loadBestFriends()
      )

      .subscribe();
}

/* =========================================================
   OPEN MAIN APP
   ========================================================= */

async function openMainApp(user) {
  if (!user) return;

  if (openingApp) return;

  openingApp = true;

  try {
    currentUser =
      user;

    /*
     * Show the application FIRST.
     * Database problems must never create
     * a blank screen.
     */

    showMainApp();

    navigateTo(
      "homePage"
    );

    currentProfile =
      await ensureProfile(
        user
      );

    updateProfileUI();

    /*
     * Database data loads after UI appears.
     */

    await refreshAllData();

    await startRealtime();

  } catch (error) {
    console.error(
      "Open app:",
      error
    );

    showMainApp();

    navigateTo(
      "homePage"
    );

    showToast(
      "FriendZone opened, but some data could not be loaded.",
      "warning"
    );

  } finally {
    openingApp = false;
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {
  if (!supabaseClient)
    return;

  try {
    await stopRealtime();

    const {
      error
    } =
      await supabaseClient.auth
        .signOut();

    if (error) throw error;

    currentUser = null;
    currentProfile = null;

    receivedRequests = [];
    sentRequests = [];
    friendships = [];
    bestFriends = [];

    showAuthScreen();
    showLoginPanel();

    showToast(
      "You have been logged out.",
      "success"
    );

  } catch (error) {
    console.error(
      "Logout:",
      error
    );

    showToast(
      "Could not log out. Please try again.",
      "error"
    );
  }
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

  /* -----------------------------------------
     AUTH
  ----------------------------------------- */

  $("#loginForm")
    ?.addEventListener(
      "submit",
      handleLogin
    );

  $("#signupForm")
    ?.addEventListener(
      "submit",
      handleSignup
    );

  $("#forgotPasswordForm")
    ?.addEventListener(
      "submit",
      handleForgotPassword
    );

  $("#showSignupBtn")
    ?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        showSignupPanel();
      }
    );

  $("#showLoginBtn")
    ?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        showLoginPanel();
      }
    );

  $("#forgotPasswordBtn")
    ?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        showForgotPasswordPanel();
      }
    );

  $("#backToLoginFromForgot")
    ?.addEventListener(
      "click",
      (event) => {
        event.preventDefault();
        showLoginPanel();
      }
    );

  /* -----------------------------------------
     PASSWORDS
  ----------------------------------------- */

  setupPasswordToggles();

  $("#signupPassword")
    ?.addEventListener(
      "input",
      updatePasswordStrength
    );

  /* -----------------------------------------
     LOGOUT
  ----------------------------------------- */

  $("#logoutBtn")
    ?.addEventListener(
      "click",
      () => {
        showConfirm(
          "Log out?",
          "Are you sure you want to log out of FriendZone?",
          logout
        );
      }
    );

  /* -----------------------------------------
     SIDEBAR
  ----------------------------------------- */

  $("#openSidebarBtn")
    ?.addEventListener(
      "click",
      openSidebar
    );

  $("#closeSidebarBtn")
    ?.addEventListener(
      "click",
      closeSidebar
    );

  $("#sidebarOverlay")
    ?.addEventListener(
      "click",
      closeSidebar
    );

  /* -----------------------------------------
     NAVIGATION
  ----------------------------------------- */

  $$(".nav-item")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () =>
          navigateTo(
            button.dataset.page
          )
      );
    });

  $("#headerRequestBtn")
    ?.addEventListener(
      "click",
      () =>
        navigateTo(
          "requestsPage"
        )
    );

  $("#headerProfileBtn")
    ?.addEventListener(
      "click",
      () =>
        navigateTo(
          "profilePage"
        )
    );

  /* -----------------------------------------
     ADD FRIEND
  ----------------------------------------- */

  $("#addFriendForm")
    ?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        await searchFriend();
      }
    );

  /* -----------------------------------------
     PROFILE
  ----------------------------------------- */

  $("#profileForm")
    ?.addEventListener(
      "submit",
      saveProfile
    );

  $("#copyFriendIdBtn")
    ?.addEventListener(
      "click",
      async () => {
        const id =
          currentProfile?.friend_id;

        if (!id) {
          showToast(
            "Friend ID is not available.",
            "warning"
          );
          return;
        }

        try {
          await navigator.clipboard
            .writeText(id);

          showToast(
            "Friend ID copied! 📋",
            "success"
          );

        } catch {
          showToast(
            `Your Friend ID is ${id}`,
            "info"
          );
        }
      }
    );

  /* -----------------------------------------
     FRIEND SEARCH
  ----------------------------------------- */

  $("#friendsSearch")
    ?.addEventListener(
      "input",
      (event) =>
        renderFriends(
          event.target.value
        )
    );

  /* -----------------------------------------
     REQUEST TABS
  ----------------------------------------- */

  $$(".request-tab")
    .forEach((button) => {
      button.addEventListener(
        "click",
        () =>
          switchRequestTab(
            button.dataset
              .requestTab
          )
      );
    });

  /* -----------------------------------------
     CONFIRM MODAL
  ----------------------------------------- */

  $("#confirmCancelBtn")
    ?.addEventListener(
      "click",
      closeConfirm
    );

  $("#confirmActionBtn")
    ?.addEventListener(
      "click",
      async () => {
        const callback =
          confirmCallback;

        closeConfirm();

        if (callback) {
          await callback();
        }
      }
    );

  /* -----------------------------------------
     GLOBAL CLICK HANDLER
  ----------------------------------------- */

  document.addEventListener(
    "click",
    async (event) => {

      /*
       * Page navigation buttons
       */

      const pageButton =
        event.target.closest(
          "[data-go-page]"
        );

      if (pageButton) {
        navigateTo(
          pageButton.dataset
            .goPage
        );
        return;
      }

      /*
       * Actions
       */

      const actionButton =
        event.target.closest(
          "[data-action]"
        );

      if (!actionButton)
        return;

      const action =
        actionButton.dataset
          .action;

      const id =
        actionButton.dataset
          .id;

      switch (action) {

        case "accept-request":
          await acceptFriendRequest(
            id
          );
          break;

        case "reject-request":
          showConfirm(
            "Reject request?",
            "Are you sure you want to reject this friend request?",
            () =>
              rejectFriendRequest(
                id
              )
          );
          break;

        case "cancel-request":
          showConfirm(
            "Cancel request?",
            "Are you sure you want to cancel this friend request?",
            () =>
              cancelFriendRequest(
                id
              )
          );
          break;

        case "toggle-best":
          await toggleBestFriend(
            id
          );
          break;

        case "view-friend":
          openFriendModal(
            id
          );
          break;

        case "modal-best":
          await toggleBestFriend(
            id
          );

          closeModal(
            "friendModal"
          );

          break;
      }
    }
  );

  /* -----------------------------------------
     MODAL CLOSE
  ----------------------------------------- */

  $$(".modal-overlay")
    .forEach((overlay) => {

      overlay.addEventListener(
        "click",
        (event) => {

          if (
            event.target ===
            overlay
          ) {
            overlay.classList.remove(
              "active"
            );

            overlay.classList.add(
              "hidden"
            );
          }
        }
      );
    });

  $$(".modal-close")
    .forEach((button) => {

      button.addEventListener(
        "click",
        (event) => {

          event.preventDefault();

          const modal =
            button.closest(
              ".modal-overlay"
            );

          if (modal) {
            modal.classList.remove(
              "active"
            );

            modal.classList.add(
              "hidden"
            );
          }
        }
      );
    });

  /* -----------------------------------------
     KEYBOARD
  ----------------------------------------- */

  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key ===
        "Escape"
      ) {
        closeSidebar();

        $("#friendModal")
          ?.classList.remove(
            "active"
          );

        $("#confirmModal")
          ?.classList.remove(
            "active"
          );
      }
    }
  );
}

/* =========================================================
   AUTH STATE
   ========================================================= */

function setupAuthStateListener() {
  if (!supabaseClient)
    return;

  supabaseClient.auth
    .onAuthStateChange(
      async (
        event,
        session
      ) => {

        console.log(
          "Auth event:",
          event
        );

        if (
          event ===
          "SIGNED_OUT"
        ) {
          await stopRealtime();

          currentUser = null;
          currentProfile = null;

          receivedRequests = [];
          sentRequests = [];
          friendships = [];
          bestFriends = [];

          showAuthScreen();
          showLoginPanel();

          return;
        }

        /*
         * PASSWORD_RECOVERY means Supabase
         * returned from the reset link.
         *
         * The reset page can later be expanded
         * with a new-password panel.
         */

        if (
          event ===
          "PASSWORD_RECOVERY"
        ) {
          showToast(
            "You can now set a new password.",
            "info"
          );

          return;
        }

        if (
          session?.user &&
          (
            event ===
              "SIGNED_IN" ||
            event ===
              "INITIAL_SESSION"
          )
        ) {
          if (
            !currentUser ||
            currentUser.id !==
              session.user.id
          ) {
            await openMainApp(
              session.user
            );
          }
        }
      }
    );
}

/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeApp() {

  /*
   * Authentication screen is visible immediately.
   * No loading page.
   */

  showAuthScreen();
  showLoginPanel();

  const connected =
    initializeSupabase();

  if (!connected) {
    return;
  }

  setupAuthStateListener();

  try {
    const {
      data,
      error
    } =
      await supabaseClient.auth
        .getSession();

    if (error) {
      throw error;
    }

    if (data?.session?.user) {

      currentUser =
        data.session.user;

      await openMainApp(
        data.session.user
      );

    } else {

      showAuthScreen();
      showLoginPanel();

    }

  } catch (error) {

    console.error(
      "Startup:",
      error
    );

    showAuthScreen();
    showLoginPanel();

    showToast(
      "Please sign in to continue.",
      "info"
    );
  }
}

/* =========================================================
   START
   ========================================================= */

function startFriendZone() {
  setupEventListeners();

  initializeApp();
}

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    startFriendZone,
    {
      once: true
    }
  );
} else {
  startFriendZone();
}
