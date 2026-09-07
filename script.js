/* =========================================================
   FRIENDZONE — SCRIPT.JS
   Supabase + Authentication + Friends System
   ========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIG
   ========================================================= */

const SUPABASE_URL =
  "https://hjdevuoxuoyenzmawwnb.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmxlIiwicmVmIjoiaGpkZXZ1b3h1b3llbnptYXd3bmIiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc4ODc4ODM2NiwiZXhwIjoyMTA0MzY0MzY2fQ.-ER4x0hqUYss521B_FWAHnfWjtxg9YJIaWNXjQJPPhI";

let supabaseClient = null;
let currentUser = null;
let currentProfile = null;

let receivedRequests = [];
let sentRequests = [];
let friendships = [];
let bestFriends = [];

let realtimeChannel = null;
let currentRequestTab = "received";

/* =========================================================
   HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getInitials(name) {
  const text = String(name || "Friend").trim();

  if (!text) return "F";

  const parts = text.split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function formatDate(date) {
  if (!date) return "";

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function setImage(element, url, name = "Friend") {
  if (!element) return;

  if (url) {
    element.innerHTML = `
      <img
        src="${escapeHTML(url)}"
        alt="${escapeHTML(name)}"
        loading="lazy"
      >
    `;
  } else {
    element.textContent = getInitials(name);
  }
}

/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "info") {
  const container = $("#toastContainer");

  if (!container) {
    alert(message);
    return;
  }

  const toast = document.createElement("div");

  toast.className = `toast toast-${type}`;

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
    <span class="toast-message">${escapeHTML(message)}</span>
    <button class="toast-close" type="button">×</button>
  `;

  container.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  const removeToast = () => {
    toast.classList.remove("show");

    setTimeout(() => {
      toast.remove();
    }, 250);
  };

  toast
    .querySelector(".toast-close")
    ?.addEventListener("click", removeToast);

  setTimeout(removeToast, 3500);
}

/* =========================================================
   AUTH ERROR
   ========================================================= */

function friendlyAuthError(error) {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }

  if (message.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }

  if (message.includes("user already registered")) {
    return "This email is already registered.";
  }

  if (message.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }

  if (message.includes("invalid email")) {
    return "Please enter a valid email address.";
  }

  if (message.includes("rate limit")) {
    return "Too many attempts. Please wait a little and try again.";
  }

  return error?.message || "Something went wrong. Please try again.";
}

/* =========================================================
   SUPABASE INITIALIZATION
   ========================================================= */

function initializeSupabase() {
  if (
    typeof window.supabase === "undefined" ||
    typeof window.supabase.createClient !== "function"
  ) {
    console.error("Supabase library was not loaded.");

    showToast(
      "Supabase could not be loaded. Check your internet connection.",
      "error"
    );

    return false;
  }

  try {
    supabaseClient = window.supabase.createClient(
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
    console.error("Supabase initialization error:", error);

    showToast(
      "Unable to connect to Supabase.",
      "error"
    );

    return false;
  }
}

/* =========================================================
   AUTH SCREEN
   ========================================================= */

function showAuthScreen() {
  const auth = $("#authScreen");
  const app = $("#mainApp");

  if (auth) auth.classList.remove("hidden");
  if (app) app.classList.add("hidden");
}

function showMainApp() {
  const auth = $("#authScreen");
  const app = $("#mainApp");

  if (auth) auth.classList.add("hidden");
  if (app) app.classList.remove("hidden");
}

/* =========================================================
   AUTH PANEL SWITCHING
   ========================================================= */

function showLoginPanel() {
  $("#loginPanel")?.classList.remove("hidden");
  $("#signupPanel")?.classList.add("hidden");
}

function showSignupPanel() {
  $("#signupPanel")?.classList.remove("hidden");
  $("#loginPanel")?.classList.add("hidden");
}

/* =========================================================
   PASSWORD EYE BUTTON
   ========================================================= */

function setupPasswordToggles() {
  $$(".password-toggle").forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;

      if (!targetId) return;

      const input = document.getElementById(targetId);

      if (!input) return;

      const isPassword = input.type === "password";

      input.type = isPassword ? "text" : "password";

      /*
       * The button uses an eye icon instead of
       * writing "Show / Hide".
       */

      button.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
      );

      button.setAttribute(
        "title",
        isPassword ? "Hide password" : "Show password"
      );

      button.classList.toggle("password-visible", isPassword);

      const icon = button.querySelector("i");

      if (icon) {
        icon.className = isPassword
          ? "fa-solid fa-eye-slash"
          : "fa-solid fa-eye";
      }

      /*
       * If Font Awesome isn't available,
       * use Unicode eye icons as fallback.
       */

      if (!icon && !button.querySelector("svg")) {
        button.textContent = isPassword ? "◉" : "◉";
      }
    });
  });
}

/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(event) {
  event.preventDefault();

  if (!supabaseClient) {
    showToast("Supabase is not connected.", "error");
    return;
  }

  const email = $("#loginEmail")?.value.trim();
  const password = $("#loginPassword")?.value;

  if (!email || !password) {
    showToast("Please enter email and password.", "warning");
    return;
  }

  const button =
    $("#loginForm button[type='submit']") ||
    $("#loginForm button");

  const originalText = button?.innerHTML;

  if (button) {
    button.disabled = true;
    button.innerHTML = `
      <span class="button-spinner"></span>
      Signing in...
    `;
  }

  try {
    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    currentUser = data.user;

    showToast("Welcome back to FriendZone! 💜", "success");

    await openMainApp(currentUser);

    $("#loginForm")?.reset();

  } catch (error) {
    console.error("Login error:", error);

    showToast(
      friendlyAuthError(error),
      "error"
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML =
        originalText || "Sign In";
    }
  }
}

/* =========================================================
   SIGN UP
   ========================================================= */

async function handleSignup(event) {
  event.preventDefault();

  if (!supabaseClient) {
    showToast("Supabase is not connected.", "error");
    return;
  }

  const name = $("#signupName")?.value.trim();
  const username = $("#signupUsername")?.value.trim();
  const email = $("#signupEmail")?.value.trim();
  const password = $("#signupPassword")?.value;

  if (!name || !username || !email || !password) {
    showToast(
      "Please fill all fields.",
      "warning"
    );

    return;
  }

  if (username.length < 3) {
    showToast(
      "Username must be at least 3 characters.",
      "warning"
    );

    return;
  }

  if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
    showToast(
      "Username can contain letters, numbers, _ and . only.",
      "warning"
    );

    return;
  }

  if (password.length < 6) {
    showToast(
      "Password must be at least 6 characters.",
      "warning"
    );

    return;
  }

  const button =
    $("#signupForm button[type='submit']") ||
    $("#signupForm button");

  const originalText = button?.innerHTML;

  if (button) {
    button.disabled = true;
    button.innerHTML = `
      <span class="button-spinner"></span>
      Creating account...
    `;
  }

  try {
    /*
     * Username is stored in auth metadata because
     * the current profiles table does not require
     * a username column.
     */

    const { data, error } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            username
          }
        }
      });

    if (error) {
      throw error;
    }

    /*
     * If email confirmation is enabled,
     * Supabase won't immediately return a session.
     */

    if (!data.session) {
      showToast(
        "Account created! Check your email to confirm your account.",
        "success"
      );

      $("#signupForm")?.reset();
      showLoginPanel();

      return;
    }

    currentUser = data.user;

    showToast(
      "Account created successfully! 🎉",
      "success"
    );

    await openMainApp(currentUser);

    $("#signupForm")?.reset();

  } catch (error) {
    console.error("Signup error:", error);

    showToast(
      friendlyAuthError(error),
      "error"
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML =
        originalText || "Create Account";
    }
  }
}

/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {
  if (!supabaseClient) return;

  try {
    await stopRealtime();

    const { error } =
      await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

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
    console.error("Logout error:", error);

    showToast(
      "Could not log out. Please try again.",
      "error"
    );
  }
}

/* =========================================================
   PROFILE
   ========================================================= */

async function loadProfile(userId) {
  if (!supabaseClient || !userId) return null;

  try {
    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,name,friend_id,avatar_url,xp,level,streak,created_at,updated_at"
        )
        .eq("id", userId)
        .maybeSingle();

    if (error) {
      console.error("Profile load error:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function ensureProfile(user) {
  if (!user) return null;

  let profile = await loadProfile(user.id);

  if (profile) {
    return profile;
  }

  /*
   * Usually the database trigger creates the profile.
   * This fallback keeps the application from breaking
   * if the trigger has not created it yet.
   */

  try {
    const metadata = user.user_metadata || {};

    const { data, error } =
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
        .single();

    if (error) {
      console.warn(
        "Could not create fallback profile:",
        error
      );

      return null;
    }

    return data;
  } catch (error) {
    console.error(error);
    return null;
  }
}

/* =========================================================
   UPDATE PROFILE UI
   ========================================================= */

function updateProfileUI() {
  if (!currentUser) return;

  const metadata =
    currentUser.user_metadata || {};

  const profile = currentProfile || {};

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

  /* Sidebar */

  setImage(
    $("#sidebarAvatar"),
    avatar,
    name
  );

  if ($("#sidebarUserName")) {
    $("#sidebarUserName").textContent = name;
  }

  if ($("#sidebarFriendId")) {
    $("#sidebarFriendId").textContent =
      friendId;
  }

  /* Profile page */

  setImage(
    $("#profileAvatar"),
    avatar,
    name
  );

  if ($("#profileName")) {
    $("#profileName").textContent =
      name;
  }

  if ($("#profileUsername")) {
    $("#profileUsername").textContent =
      username
        ? `@${username}`
        : "@friend";
  }

  if ($("#profileFriendId")) {
    $("#profileFriendId").textContent =
      friendId;
  }

  if ($("#profileNameInput")) {
    $("#profileNameInput").value =
      name === "Friend" ? "" : name;
  }

  if ($("#profileUsernameInput")) {
    $("#profileUsernameInput").value =
      username;
  }

  /* Home Friend ID */

  if ($("#homeFriendId")) {
    $("#homeFriendId").textContent =
      friendId;
  }
}

/* =========================================================
   UPDATE PROFILE
   ========================================================= */

async function saveProfile(event) {
  event.preventDefault();

  if (!currentUser || !supabaseClient) return;

  const name =
    $("#profileNameInput")?.value.trim();

  const username =
    $("#profileUsernameInput")?.value.trim();

  if (!name) {
    showToast(
      "Name cannot be empty.",
      "warning"
    );

    return;
  }

  if (
    username &&
    !/^[a-zA-Z0-9_.]+$/.test(username)
  ) {
    showToast(
      "Username contains invalid characters.",
      "warning"
    );

    return;
  }

  const button =
    $("#profileForm button[type='submit']") ||
    $("#profileForm button");

  const originalText = button?.innerHTML;

  if (button) {
    button.disabled = true;
    button.innerHTML = `
      <span class="button-spinner"></span>
      Saving...
    `;
  }

  try {
    /*
     * Name is stored in profiles.
     */

    const { error: profileError } =
      await supabaseClient
        .from("profiles")
        .update({
          name,
          updated_at: new Date().toISOString()
        })
        .eq("id", currentUser.id);

    if (profileError) {
      throw profileError;
    }

    /*
     * Username stays in auth metadata.
     */

    const { data, error: authError } =
      await supabaseClient.auth.updateUser({
        data: {
          ...(currentUser.user_metadata || {}),
          name,
          username
        }
      });

    if (authError) {
      throw authError;
    }

    currentUser = data.user;

    currentProfile =
      await loadProfile(currentUser.id);

    updateProfileUI();

    showToast(
      "Profile updated successfully.",
      "success"
    );

  } catch (error) {
    console.error("Profile update error:", error);

    showToast(
      "Could not update your profile.",
      "error"
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML =
        originalText || "Save Changes";
    }
  }
}

/* =========================================================
   FRIENDSHIP HELPERS
   ========================================================= */

async function getFriends() {
  if (!currentUser) return [];

  try {
    const { data, error } =
      await supabaseClient
        .from("friendships")
        .select(
          "id,user_id,friend_id,created_at"
        )
        .or(
          `user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`
        )
        .order("created_at", {
          ascending: false
        });

    if (error) {
      throw error;
    }

    const rows = data || [];

    const friendIds = rows.map((row) =>
      row.user_id === currentUser.id
        ? row.friend_id
        : row.user_id
    );

    if (!friendIds.length) {
      return [];
    }

    const uniqueIds =
      [...new Set(friendIds)];

    const { data: profiles, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,name,friend_id,avatar_url,xp,level,streak"
        )
        .in("id", uniqueIds);

    if (profileError) {
      throw profileError;
    }

    return rows.map((row) => {
      const friendId =
        row.user_id === currentUser.id
          ? row.friend_id
          : row.user_id;

      return {
        friendship: row,
        profile:
          (profiles || []).find(
            (profile) =>
              profile.id === friendId
          ) || null
      };
    });
  } catch (error) {
    console.error(
      "Friends loading error:",
      error
    );

    return [];
  }
}

/* =========================================================
   REQUESTS
   ========================================================= */

async function loadRequests() {
  if (!currentUser) return;

  try {
    const [
      receivedResponse,
      sentResponse
    ] = await Promise.all([
      supabaseClient
        .from("friend_requests")
        .select(
          "id,sender_id,receiver_id,status,created_at,updated_at"
        )
        .eq("receiver_id", currentUser.id)
        .eq("status", "pending")
        .order("created_at", {
          ascending: false
        }),

      supabaseClient
        .from("friend_requests")
        .select(
          "id,sender_id,receiver_id,status,created_at,updated_at"
        )
        .eq("sender_id", currentUser.id)
        .eq("status", "pending")
        .order("created_at", {
          ascending: false
        })
    ]);

    if (receivedResponse.error) {
      throw receivedResponse.error;
    }

    if (sentResponse.error) {
      throw sentResponse.error;
    }

    const received =
      receivedResponse.data || [];

    const sent =
      sentResponse.data || [];

    const receivedIds =
      received.map(
        (request) =>
          request.sender_id
      );

    const sentIds =
      sent.map(
        (request) =>
          request.receiver_id
      );

    const allIds = [
      ...new Set([
        ...receivedIds,
        ...sentIds
      ])
    ];

    let profiles = [];

    if (allIds.length) {
      const { data, error } =
        await supabaseClient
          .from("profiles")
          .select(
            "id,name,friend_id,avatar_url,xp,level,streak"
          )
          .in("id", allIds);

      if (error) {
        throw error;
      }

      profiles = data || [];
    }

    receivedRequests =
      received.map((request) => ({
        ...request,
        profile:
          profiles.find(
            (profile) =>
              profile.id ===
              request.sender_id
          ) || null
      }));

    sentRequests =
      sent.map((request) => ({
        ...request,
        profile:
          profiles.find(
            (profile) =>
              profile.id ===
              request.receiver_id
          ) || null
      }));

    renderRequests();
    updateRequestBadges();

  } catch (error) {
    console.error(
      "Request loading error:",
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

  const cleanFriendId =
    String(friendId || "")
      .trim()
      .toUpperCase();

  if (!cleanFriendId) {
    showToast(
      "Enter a Friend ID.",
      "warning"
    );

    return;
  }

  if (
    currentProfile?.friend_id &&
    cleanFriendId ===
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
    const { data: targetProfile, error } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,name,friend_id,avatar_url"
        )
        .eq("friend_id", cleanFriendId)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!targetProfile) {
      showToast(
        "No user found with this Friend ID.",
        "error"
      );

      return;
    }

    if (
      targetProfile.id ===
      currentUser.id
    ) {
      showToast(
        "You cannot add yourself.",
        "warning"
      );

      return;
    }

    const { data: existingFriend } =
      await supabaseClient
        .from("friendships")
        .select("id")
        .or(
          `and(user_id.eq.${currentUser.id},friend_id.eq.${targetProfile.id}),and(user_id.eq.${targetProfile.id},friend_id.eq.${currentUser.id})`
        )
        .limit(1)
        .maybeSingle();

    if (existingFriend) {
      showToast(
        "This person is already your friend.",
        "warning"
      );

      return;
    }

    const { data: existingRequest } =
      await supabaseClient
        .from("friend_requests")
        .select(
          "id,sender_id,receiver_id,status"
        )
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${targetProfile.id}),and(sender_id.eq.${targetProfile.id},receiver_id.eq.${currentUser.id})`
        )
        .eq("status", "pending")
        .limit(1)
        .maybeSingle();

    if (existingRequest) {
      if (
        existingRequest.sender_id ===
        currentUser.id
      ) {
        showToast(
          "Friend request already sent.",
          "warning"
        );
      } else {
        showToast(
          "This person already sent you a request. Check Requests.",
          "warning"
        );
      }

      return;
    }

    const { error: insertError } =
      await supabaseClient
        .from("friend_requests")
        .insert({
          sender_id: currentUser.id,
          receiver_id: targetProfile.id,
          status: "pending"
        });

    if (insertError) {
      throw insertError;
    }

    showToast(
      `Friend request sent to ${targetProfile.name || "your friend"}! 💜`,
      "success"
    );

    $("#addFriendForm")?.reset();

    if ($("#friendSearchResult")) {
      $("#friendSearchResult").innerHTML = "";
      $("#friendSearchResult").classList.add(
        "hidden"
      );
    }

    await loadRequests();

  } catch (error) {
    console.error(
      "Send request error:",
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
   ACCEPT REQUEST
   ========================================================= */

async function acceptFriendRequest(requestId) {
  if (!currentUser || !requestId) return;

  try {
    const { data: request, error } =
      await supabaseClient
        .from("friend_requests")
        .select(
          "id,sender_id,receiver_id,status"
        )
        .eq("id", requestId)
        .eq("receiver_id", currentUser.id)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!request) {
      showToast(
        "Friend request no longer exists.",
        "error"
      );

      return;
    }

    /*
     * Update request first.
     */

    const { error: updateError } =
      await supabaseClient
        .from("friend_requests")
        .update({
          status: "accepted",
          updated_at:
            new Date().toISOString()
        })
        .eq("id", requestId);

    if (updateError) {
      throw updateError;
    }

    /*
     * Create both sides of friendship.
     */

    const { error: friendshipError } =
      await supabaseClient
        .from("friendships")
        .insert([
          {
            user_id: request.receiver_id,
            friend_id: request.sender_id
          },
          {
            user_id: request.sender_id,
            friend_id: request.receiver_id
          }
        ]);

    if (friendshipError) {
      /*
       * If duplicate rows already exist,
       * the request is still accepted.
       */

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
      "Accept request error:",
      error
    );

    showToast(
      "Could not accept this request.",
      "error"
    );
  }
}

/* =========================================================
   REJECT REQUEST
   ========================================================= */

async function rejectFriendRequest(requestId) {
  if (!currentUser || !requestId) return;

  try {
    const { error } =
      await supabaseClient
        .from("friend_requests")
        .update({
          status: "rejected",
          updated_at:
            new Date().toISOString()
        })
        .eq("id", requestId)
        .eq("receiver_id", currentUser.id);

    if (error) {
      throw error;
    }

    showToast(
      "Friend request rejected.",
      "success"
    );

    await loadRequests();

  } catch (error) {
    console.error(
      "Reject request error:",
      error
    );

    showToast(
      "Could not reject the request.",
      "error"
    );
  }
}

/* =========================================================
   CANCEL SENT REQUEST
   ========================================================= */

async function cancelFriendRequest(requestId) {
  if (!currentUser || !requestId) return;

  try {
    const { error } =
      await supabaseClient
        .from("friend_requests")
        .delete()
        .eq("id", requestId)
        .eq("sender_id", currentUser.id);

    if (error) {
      throw error;
    }

    showToast(
      "Friend request cancelled.",
      "success"
    );

    await loadRequests();

  } catch (error) {
    console.error(
      "Cancel request error:",
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
    const { data, error } =
      await supabaseClient
        .from("best_friends")
        .select(
          "id,user_id,friend_id,created_at"
        )
        .eq("user_id", currentUser.id)
        .order("created_at", {
          ascending: false
        });

    if (error) {
      throw error;
    }

    const rows = data || [];

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

    const { data: profiles, error: profileError } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,name,friend_id,avatar_url,xp,level,streak"
        )
        .in("id", ids);

    if (profileError) {
      throw profileError;
    }

    bestFriends =
      rows.map((row) => ({
        ...row,
        profile:
          (profiles || []).find(
            (profile) =>
              profile.id ===
              row.friend_id
          ) || null
      }));

    renderBestFriends();
    updateHomeStats();

  } catch (error) {
    console.error(
      "Best friends loading error:",
      error
    );

    bestFriends = [];
    renderBestFriends();
  }
}

/* =========================================================
   ADD / REMOVE BEST FRIEND
   ========================================================= */

async function toggleBestFriend(friendId) {
  if (!currentUser || !friendId) return;

  try {
    const existing =
      bestFriends.find(
        (item) =>
          item.friend_id === friendId
      );

    if (existing) {
      const { error } =
        await supabaseClient
          .from("best_friends")
          .delete()
          .eq("id", existing.id)
          .eq("user_id", currentUser.id);

      if (error) {
        throw error;
      }

      showToast(
        "Removed from Best Friends.",
        "success"
      );
    } else {
      const { error } =
        await supabaseClient
          .from("best_friends")
          .insert({
            user_id: currentUser.id,
            friend_id: friendId
          });

      if (error) {
        throw error;
      }

      showToast(
        "Added to Best Friends ⭐",
        "success"
      );
    }

    await loadBestFriends();
    await loadFriends();

  } catch (error) {
    console.error(
      "Best friend error:",
      error
    );

    showToast(
      "Could not update Best Friends.",
      "error"
    );
  }
}

/* =========================================================
   LOAD FRIENDS
   ========================================================= */

async function loadFriends() {
  friendships =
    await getFriends();

  renderFriends();
  renderRecentFriends();
  updateHomeStats();
}

/* =========================================================
   FRIEND CARD
   ========================================================= */

function friendCardHTML(friend, compact = false) {
  const profile =
    friend.profile || {};

  const name =
    profile.name || "Friend";

  const friendId =
    profile.friend_id ||
    "Friend ID unavailable";

  const avatar =
    profile.avatar_url || "";

  const isBest =
    bestFriends.some(
      (item) =>
        item.friend_id ===
        profile.id
    );

  return `
    <article
      class="friend-card ${compact ? "compact-card" : ""}"
      data-friend-id="${escapeHTML(profile.id || "")}"
    >
      <div class="friend-card-main">

        <div class="friend-avatar-wrap">
          <div class="friend-avatar">
            ${
              avatar
                ? `<img src="${escapeHTML(
                    avatar
                  )}" alt="${escapeHTML(name)}">`
                : escapeHTML(
                    getInitials(name)
                  )
            }
          </div>

          <span class="online-dot"></span>
        </div>

        <div class="friend-info">
          <h3>${escapeHTML(name)}</h3>
          <p>${escapeHTML(friendId)}</p>
        </div>

      </div>

      <div class="friend-card-actions">

        <button
          type="button"
          class="small-action-btn best-btn ${
            isBest ? "active" : ""
          }"
          data-action="toggle-best"
          data-id="${escapeHTML(
            profile.id || ""
          )}"
          title="${
            isBest
              ? "Remove from Best Friends"
              : "Add to Best Friends"
          }"
          aria-label="${
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
          data-id="${escapeHTML(
            profile.id || ""
          )}"
          title="View profile"
          aria-label="View profile"
        >
          <span>›</span>
        </button>

      </div>
    </article>
  `;
}

/* =========================================================
   RENDER FRIENDS
   ========================================================= */

function renderFriends(searchTerm = "") {
  const container =
    $("#friendsContainer");

  if (!container) return;

  let list =
    Array.isArray(friendships)
      ? [...friendships]
      : [];

  const term =
    String(searchTerm || "")
      .trim()
      .toLowerCase();

  if (term) {
    list = list.filter((item) => {
      const profile =
        item.profile || {};

      return (
        String(
          profile.name || ""
        )
          .toLowerCase()
          .includes(term) ||
        String(
          profile.friend_id || ""
        )
          .toLowerCase()
          .includes(term)
      );
    });
  }

  if (!list.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">👥</div>
        <h3>${
          term
            ? "No friends found"
            : "No friends yet"
        }</h3>
        <p>${
          term
            ? "Try searching with another name or Friend ID."
            : "Add your first friend using their Friend ID."
        }</p>

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
        friendCardHTML(friend)
      )
      .join("");
}

/* =========================================================
   RECENT FRIENDS
   ========================================================= */

function renderRecentFriends() {
  const container =
    $("#recentFriendsContainer");

  if (!container) return;

  const recent =
    friendships.slice(0, 4);

  if (!recent.length) {
    container.innerHTML = `
      <div class="empty-state small-empty">
        <div class="empty-state-icon">✨</div>
        <h3>Your circle starts here</h3>
        <p>Add friends and they will appear here.</p>

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
        friendCardHTML(friend, true)
      )
      .join("");
}

/* =========================================================
   RENDER BEST FRIENDS
   ========================================================= */

function renderBestFriends() {
  const container =
    $("#bestFriendsContainer");

  if (!container) return;

  if (!bestFriends.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">⭐</div>
        <h3>No Best Friends yet</h3>
        <p>
          Choose friends you want to keep
          in your special Best Friends list.
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
          profile: item.profile
        })
      )
      .join("");
}

/* =========================================================
   REQUEST CARD
   ========================================================= */

function requestCardHTML(
  request,
  type
) {
  const profile =
    request.profile || {};

  const name =
    profile.name || "Friend";

  const friendId =
    profile.friend_id ||
    "Friend ID unavailable";

  const avatar =
    profile.avatar_url || "";

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
              ? `<img
                  src="${escapeHTML(
                    avatar
                  )}"
                  alt="${escapeHTML(
                    name
                  )}"
                >`
              : escapeHTML(
                  getInitials(name)
                )
          }
        </div>

        <div class="request-info">
          <h3>${escapeHTML(name)}</h3>
          <p>${escapeHTML(friendId)}</p>
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
            aria-label="Accept request"
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
            aria-label="Reject request"
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
            aria-label="Cancel request"
          >
            ×
          </button>
        `
        }

      </div>

    </article>
  `;
}

/* =========================================================
   RENDER REQUESTS
   ========================================================= */

function renderRequests() {
  const receivedContainer =
    $("#receivedRequestsContainer");

  const sentContainer =
    $("#sentRequestsContainer");

  if (receivedContainer) {
    if (!receivedRequests.length) {
      receivedContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📨</div>
          <h3>No pending requests</h3>
          <p>New friend requests will appear here.</p>
        </div>
      `;
    } else {
      receivedContainer.innerHTML =
        receivedRequests
          .map((request) =>
            requestCardHTML(
              request,
              "received"
            )
          )
          .join("");
    }
  }

  if (sentContainer) {
    if (!sentRequests.length) {
      sentContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📤</div>
          <h3>No sent requests</h3>
          <p>Friend requests you send will appear here.</p>
        </div>
      `;
    } else {
      sentContainer.innerHTML =
        sentRequests
          .map((request) =>
            requestCardHTML(
              request,
              "sent"
            )
          )
          .join("");
    }
  }

  switchRequestTab(
    currentRequestTab
  );
}

/* =========================================================
   REQUEST TABS
   ========================================================= */

function switchRequestTab(tab) {
  currentRequestTab =
    tab === "sent"
      ? "sent"
      : "received";

  $$(".request-tab").forEach(
    (button) => {
      const active =
        button.dataset.requestTab ===
        currentRequestTab;

      button.classList.toggle(
        "active",
        active
      );
    }
  );

  const received =
    $("#receivedRequestsContainer");

  const sent =
    $("#sentRequestsContainer");

  if (received) {
    received.classList.toggle(
      "hidden",
      currentRequestTab !==
        "received"
    );
  }

  if (sent) {
    sent.classList.toggle(
      "hidden",
      currentRequestTab !== "sent"
    );
  }
}

/* =========================================================
   BADGES / STATS
   ========================================================= */

function updateRequestBadges() {
  const count =
    receivedRequests.length;

  const friendsBadge =
    $("#friendsBadge");

  const requestsBadge =
    $("#requestsBadge");

  const headerBadge =
    $("#headerRequestBadge");

  const receivedCount =
    $("#receivedCount");

  const sentCount =
    $("#sentCount");

  if (requestsBadge) {
    requestsBadge.textContent =
      count;
    requestsBadge.classList.toggle(
      "hidden",
      count === 0
    );
  }

  if (headerBadge) {
    headerBadge.textContent =
      count;
    headerBadge.classList.toggle(
      "hidden",
      count === 0
    );
  }

  if (receivedCount) {
    receivedCount.textContent =
      count;
  }

  if (sentCount) {
    sentCount.textContent =
      sentRequests.length;
  }

  if (friendsBadge) {
    const friendCount =
      friendships.length;

    friendsBadge.textContent =
      friendCount;

    friendsBadge.classList.toggle(
      "hidden",
      friendCount === 0
    );
  }

  const homeRequests =
    $("#homeRequestsCount");

  if (homeRequests) {
    homeRequests.textContent =
      count;
  }
}

function updateHomeStats() {
  if ($("#homeFriendsCount")) {
    $("#homeFriendsCount").textContent =
      friendships.length;
  }

  if ($("#homeBestFriendsCount")) {
    $("#homeBestFriendsCount").textContent =
      bestFriends.length;
  }

  if ($("#homeRequestsCount")) {
    $("#homeRequestsCount").textContent =
      receivedRequests.length;
  }

  updateRequestBadges();
}

/* =========================================================
   FRIEND SEARCH
   ========================================================= */

async function searchFriend() {
  const input =
    $("#friendIdInput");

  const result =
    $("#friendSearchResult");

  if (!input || !result) return;

  const friendId =
    input.value.trim().toUpperCase();

  if (!friendId) {
    result.innerHTML = "";
    result.classList.add("hidden");

    showToast(
      "Enter a Friend ID.",
      "warning"
    );

    return;
  }

  result.classList.remove("hidden");

  result.innerHTML = `
    <div class="search-loading">
      <span class="button-spinner"></span>
      Searching...
    </div>
  `;

  try {
    const { data: profile, error } =
      await supabaseClient
        .from("profiles")
        .select(
          "id,name,friend_id,avatar_url,xp,level,streak"
        )
        .eq("friend_id", friendId)
        .maybeSingle();

    if (error) {
      throw error;
    }

    if (!profile) {
      result.innerHTML = `
        <div class="search-empty">
          <div class="empty-state-icon">🔎</div>
          <h3>No user found</h3>
          <p>
            Check the Friend ID and try again.
          </p>
        </div>
      `;

      return;
    }

    if (
      currentUser &&
      profile.id === currentUser.id
    ) {
      result.innerHTML = `
        <div class="search-empty">
          <div class="empty-state-icon">👋</div>
          <h3>That's you!</h3>
          <p>You cannot send a request to yourself.</p>
        </div>
      `;

      return;
    }

    const alreadyFriend =
      friendships.some(
        (friend) =>
          friend.profile?.id ===
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
            <h3>${escapeHTML(
              profile.name ||
                "Friend"
            )}</h3>
            <p>${escapeHTML(
              profile.friend_id
            )}</p>
            <span>Already your friend ✓</span>
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
          <h3>${escapeHTML(
            profile.name ||
              "Friend"
          )}</h3>

          <p>${escapeHTML(
            profile.friend_id ||
              ""
          )}</p>
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
      "Friend search error:",
      error
    );

    result.innerHTML = `
      <div class="search-empty">
        <div class="empty-state-icon">⚠️</div>
        <h3>Search failed</h3>
        <p>Please try again.</p>
      </div>
    `;
  }
}

/* =========================================================
   PAGE NAVIGATION
   ========================================================= */

const pageInfo = {
  homePage: {
    title: "Home",
    subtitle: "Welcome back to your circle"
  },

  friendsPage: {
    title: "My Friends",
    subtitle: "Everyone in your circle"
  },

  requestsPage: {
    title: "Friend Requests",
    subtitle: "Manage your friend requests"
  },

  bestFriendsPage: {
    title: "Best Friends",
    subtitle: "Your special circle"
  },

  addFriendPage: {
    title: "Add Friend",
    subtitle: "Find friends using their Friend ID"
  },

  profilePage: {
    title: "My Profile",
    subtitle: "Manage your FriendZone profile"
  }
};

function navigateTo(pageId) {
  const page =
    document.getElementById(pageId);

  if (!page) return;

  $$(".page").forEach((item) => {
    item.classList.remove(
      "active-page"
    );
  });

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
    if ($("#currentPageTitle")) {
      $("#currentPageTitle").textContent =
        info.title;
    }

    if ($("#currentPageSubtitle")) {
      $("#currentPageSubtitle").textContent =
        info.subtitle;
    }
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
   MODALS
   ========================================================= */

function closeModal(modalId) {
  const modal =
    document.getElementById(modalId);

  if (!modal) return;

  modal.classList.remove("active");
}

function openFriendModal(friendId) {
  const modal =
    $("#friendModal");

  const content =
    $("#modalFriendContent");

  if (!modal || !content) return;

  const friend =
    friendships.find(
      (item) =>
        item.profile?.id ===
        friendId
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
            ? `<img
                src="${escapeHTML(
                  profile.avatar_url
                )}"
                alt="${escapeHTML(
                  profile.name ||
                    "Friend"
                )}"
              >`
            : escapeHTML(
                getInitials(
                  profile.name
                )
              )
        }
      </div>

      <h2>${escapeHTML(
        profile.name ||
          "Friend"
      )}</h2>

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

  modal.classList.add("active");
}

/* =========================================================
   CONFIRM MODAL
   ========================================================= */

let confirmCallback = null;

function showConfirm(
  title,
  message,
  callback
) {
  const modal =
    $("#confirmModal");

  if (!modal) {
    if (confirm(message)) {
      callback?.();
    }

    return;
  }

  confirmCallback =
    callback;

  if ($("#confirmTitle")) {
    $("#confirmTitle").textContent =
      title;
  }

  if ($("#confirmMessage")) {
    $("#confirmMessage").textContent =
      message;
  }

  modal.classList.add("active");
}

function closeConfirm() {
  confirmCallback = null;

  $("#confirmModal")
    ?.classList.remove("active");
}

/* =========================================================
   REFRESH EVERYTHING
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

  realtimeChannel = null;
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
        async () => {
          await loadRequests();
        }
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
        async () => {
          await loadRequests();
        }
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
        async () => {
          await loadFriends();
          await loadBestFriends();
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
        async () => {
          await loadBestFriends();
        }
      )

      .subscribe();
}

/* =========================================================
   OPEN MAIN APP
   ========================================================= */

let openingApp = false;

async function openMainApp(user) {
  if (!user) return;

  if (openingApp) return;

  openingApp = true;

  try {
    currentUser = user;

    showMainApp();

    currentProfile =
      await ensureProfile(
        currentUser
      );

    updateProfileUI();

    /*
     * Render a useful interface immediately.
     */

    navigateTo("homePage");

    /*
     * Load data after the interface is visible.
     */

    await refreshAllData();

    await startRealtime();

  } catch (error) {
    console.error(
      "Opening app error:",
      error
    );

    /*
     * Don't leave the screen blank
     * if a database request fails.
     */

    showMainApp();

    navigateTo("homePage");

    showToast(
      "FriendZone opened, but some data could not be loaded.",
      "warning"
    );

  } finally {
    openingApp = false;
  }
}

/* =========================================================
   EVENT LISTENERS
   ========================================================= */

function setupEventListeners() {

  /* Login / Signup */

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

  $("#showSignupBtn")
    ?.addEventListener(
      "click",
      showSignupPanel
    );

  $("#showLoginBtn")
    ?.addEventListener(
      "click",
      showLoginPanel
    );

  /* Password eye */

  setupPasswordToggles();

  /* Logout */

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

  /* Sidebar */

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

  /* Navigation */

  $$(".nav-item").forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          navigateTo(
            button.dataset.page
          );
        }
      );
    }
  );

  /* Header request */

  $("#headerRequestBtn")
    ?.addEventListener(
      "click",
      () => {
        navigateTo(
          "requestsPage"
        );
      }
    );

  /* Header profile */

  $("#headerProfileBtn")
    ?.addEventListener(
      "click",
      () => {
        navigateTo(
          "profilePage"
        );
      }
    );

  /* Home / general page buttons */

  document.addEventListener(
    "click",
    async (event) => {

      const goButton =
        event.target.closest(
          "[data-go-page]"
        );

      if (goButton) {
        navigateTo(
          goButton.dataset.goPage
        );

        return;
      }

      const actionButton =
        event.target.closest(
          "[data-action]"
        );

      if (!actionButton) {
        return;
      }

      const action =
        actionButton.dataset.action;

      const id =
        actionButton.dataset.id;

      switch (action) {

        case "accept-request":
          await acceptFriendRequest(id);
          break;

        case "reject-request":
          showConfirm(
            "Reject request?",
            "Are you sure you want to reject this friend request?",
            () =>
              rejectFriendRequest(id)
          );
          break;

        case "cancel-request":
          showConfirm(
            "Cancel request?",
            "Are you sure you want to cancel this friend request?",
            () =>
              cancelFriendRequest(id)
          );
          break;

        case "toggle-best":
          await toggleBestFriend(id);
          break;

        case "view-friend":
          openFriendModal(id);
          break;

        case "modal-best":
          await toggleBestFriend(id);
          closeModal(
            "friendModal"
          );
          break;
      }
    }
  );

  /* Request tabs */

  $$(".request-tab").forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          switchRequestTab(
            button.dataset.requestTab
          );
        }
      );
    }
  );

  /* Add Friend */

  $("#addFriendForm")
    ?.addEventListener(
      "submit",
      async (event) => {
        event.preventDefault();

        const value =
          $("#friendIdInput")
            ?.value.trim();

        await sendFriendRequest(
          value
        );
      }
    );

  /* Profile */

  $("#profileForm")
    ?.addEventListener(
      "submit",
      saveProfile
    );

  /* Copy Friend ID */

  $("#copyFriendIdBtn")
    ?.addEventListener(
      "click",
      async () => {

        const friendId =
          currentProfile?.friend_id;

        if (!friendId) {
          showToast(
            "Friend ID is not available yet.",
            "warning"
          );

          return;
        }

        try {
          await navigator.clipboard.writeText(
            friendId
          );

          showToast(
            "Friend ID copied! 📋",
            "success"
          );

        } catch {
          showToast(
            `Your Friend ID is ${friendId}`,
            "info"
          );
        }
      }
    );

  /* Friends search */

  $("#friendsSearch")
    ?.addEventListener(
      "input",
      (event) => {
        renderFriends(
          event.target.value
        );
      }
    );

  /* Confirm modal */

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

  /* Modal close */

  $$(".modal-overlay").forEach(
    (overlay) => {
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
          }
        }
      );
    }
  );

  $$(".modal-close").forEach(
    (button) => {
      button.addEventListener(
        "click",
        () => {
          const modalId =
            button.dataset.closeModal;

          if (modalId) {
            closeModal(
              modalId
            );
          }
        }
      );
    }
  );

  /* Keyboard */

  document.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Escape"
      ) {
        closeSidebar();
        closeModal(
          "friendModal"
        );
        closeConfirm();
      }
    }
  );
}

/* =========================================================
   INITIALIZATION
   ========================================================= */

async function initializeApp() {
  /*
   * IMPORTANT:
   * There is NO loading page here.
   * The authentication screen is shown immediately.
   */

  showAuthScreen();

  const connected =
    initializeSupabase();

  if (!connected) {
    return;
  }

  try {
    const {
      data: {
        session
      }
    } =
      await supabaseClient.auth.getSession();

    if (session?.user) {
      currentUser =
        session.user;

      await openMainApp(
        session.user
      );
    } else {
      showAuthScreen();
      showLoginPanel();
    }

  } catch (error) {
    console.error(
      "Startup session error:",
      error
    );

    /*
     * Never leave the page blank.
     */

    showAuthScreen();
    showLoginPanel();

    showToast(
      "Please sign in to continue.",
      "info"
    );
  }

  /*
   * Listen for future authentication changes.
   */

  supabaseClient.auth.onAuthStateChange(
    async (event, session) => {

      if (
        event ===
        "SIGNED_OUT"
      ) {
        currentUser = null;
        currentProfile = null;

        await stopRealtime();

        showAuthScreen();
        showLoginPanel();

        return;
      }

      if (
        session?.user &&
        (
          event ===
            "SIGNED_IN" ||
          event ===
            "TOKEN_REFRESHED"
        )
      ) {
        /*
         * Avoid unnecessarily reopening
         * the same session.
         */

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
   START
   ========================================================= */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => {
      setupEventListeners();
      initializeApp();
    },
    {
      once: true
    }
  );
} else {
  setupEventListeners();
  initializeApp();
}
