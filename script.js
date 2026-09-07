/* =========================================================
   FRIENDZONE
   MAIN JAVASCRIPT
   SUPABASE + AUTH + FRIEND SYSTEM
   VERSION: PREMIUM / STABLE
========================================================= */

"use strict";

/* =========================================================
   SUPABASE CONFIG
========================================================= */

const CONFIG = window.FRIENDZONE_CONFIG || {};

const SUPABASE_URL =
  CONFIG.SUPABASE_URL ||
  "https://hjdevuoxuoyenzmawwnb.supabase.co";

const SUPABASE_ANON_KEY =
  CONFIG.SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IkFub24iLCJpYXQiOjE3ODg3ODgzNjYsImV4cCI6MjEwNDM2NDM2Nn0.-ER4x0hqUYss521B_FWAHnfWjtxg9YJIaWNXjQJPPhI";

let supabaseClient = null;

/* =========================================================
   GLOBAL STATE
========================================================= */

const state = {
  user: null,
  profile: null,

  friends: [],
  receivedRequests: [],
  sentRequests: [],
  bestFriends: [],

  currentPage: "homePage",
  requestTab: "received",

  realtimeChannels: [],
  initialized: false
};

/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (selector) =>
  document.querySelector(selector);

const $$ = (selector) =>
  Array.from(document.querySelectorAll(selector));

const byId = (id) =>
  document.getElementById(id);

/* =========================================================
   BASIC HELPERS
========================================================= */

function escapeHTML(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name = "Friend") {
  const clean = String(name).trim();

  if (!clean) return "FR";

  const parts = clean.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .slice(0, 2)
      .toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
}

function getDisplayName() {
  return (
    state.profile?.name ||
    state.user?.user_metadata?.name ||
    state.user?.email?.split("@")[0] ||
    "FriendZone User"
  );
}

function getUsername() {
  return (
    state.profile?.username ||
    state.user?.user_metadata?.username ||
    ""
  );
}

function getFriendID() {
  return state.profile?.friend_id || "------";
}

/* =========================================================
   TOAST
========================================================= */

function showToast(
  message,
  type = "success",
  title = null
) {
  const container =
    byId("toastContainer");

  if (!container) {
    console.log(message);
    return;
  }

  const titles = {
    success: "Success",
    error: "Something went wrong",
    warning: "Notice",
    info: "FriendZone"
  };

  const icons = {
    success: "✓",
    error: "!",
    warning: "!",
    info: "i"
  };

  const toast =
    document.createElement("div");

  toast.className =
    `toast ${type}`;

  toast.innerHTML = `
    <div class="toast-icon">
      ${icons[type] || "i"}
    </div>

    <div class="toast-content">
      <strong>
        ${escapeHTML(
          title ||
          titles[type] ||
          "FriendZone"
        )}
      </strong>

      <p>
        ${escapeHTML(message)}
      </p>
    </div>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4300);
}

/* =========================================================
   LOADING SCREEN
========================================================= */

function hideLoader() {
  const loader =
    byId("appLoader");

  if (!loader) return;

  loader.classList.add("fade-out");

  setTimeout(() => {
    loader.classList.add("hidden");
    loader.style.display = "none";
  }, 450);
}

/* =========================================================
   SCREEN CONTROL
========================================================= */

function showAuthScreen() {
  const auth =
    byId("authScreen");

  const app =
    byId("mainApp");

  auth?.classList.remove("hidden");
  app?.classList.add("hidden");

  if (auth) auth.style.display = "";
  if (app) app.style.display = "none";
}

function showMainApp() {
  const auth =
    byId("authScreen");

  const app =
    byId("mainApp");

  auth?.classList.add("hidden");
  app?.classList.remove("hidden");

  if (auth) auth.style.display = "none";
  if (app) app.style.display = "";
}

/* =========================================================
   AUTH MODE
========================================================= */

function switchAuthMode(mode) {
  const loginPanel =
    byId("loginPanel");

  const signupPanel =
    byId("signupPanel");

  if (mode === "signup") {
    loginPanel?.classList.add("hidden");
    signupPanel?.classList.remove("hidden");
  } else {
    signupPanel?.classList.add("hidden");
    loginPanel?.classList.remove("hidden");
  }
}

/* =========================================================
   BUTTON LOADING
========================================================= */

function setButtonLoading(button, loading) {
  if (!button) return;

  if (loading) {
    button.disabled = true;
    button.classList.add("btn-loading");
  } else {
    button.disabled = false;
    button.classList.remove("btn-loading");
  }
}

/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {
  if (!state.user) return;

  try {
    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", state.user.id)
        .maybeSingle();

    if (error) {
      console.error(
        "Profile error:",
        error
      );
      return;
    }

    if (data) {
      state.profile = data;
      return;
    }

    await createMissingProfile();

  } catch (error) {
    console.error(
      "loadProfile:",
      error
    );
  }
}

async function createMissingProfile() {
  if (!state.user) return;

  const metadata =
    state.user.user_metadata || {};

  const name =
    metadata.name ||
    state.user.email?.split("@")[0] ||
    "FriendZone User";

  try {
    const { data, error } =
      await supabaseClient
        .from("profiles")
        .insert({
          id: state.user.id,
          name
        })
        .select("*")
        .single();

    if (!error && data) {
      state.profile = data;
    }

  } catch (error) {
    console.error(
      "createMissingProfile:",
      error
    );
  }
}

/* =========================================================
   PROFILE UI
========================================================= */

function renderProfile() {
  const name =
    getDisplayName();

  const username =
    getUsername();

  const friendID =
    getFriendID();

  const avatar =
    initials(name);

  const avatarURL =
    state.profile?.avatar_url;

  const profileAvatar =
    byId("profileAvatar");

  const sidebarAvatar =
    byId("sidebarAvatar");

  const profileName =
    byId("profileName");

  const profileUsername =
    byId("profileUsername");

  const profileFriendId =
    byId("profileFriendId");

  const profileNameInput =
    byId("profileNameInput");

  const profileUsernameInput =
    byId("profileUsernameInput");

  if (profileAvatar) {
    if (avatarURL) {
      profileAvatar.innerHTML =
        `<img src="${escapeHTML(avatarURL)}" alt="Profile">`;
    } else {
      profileAvatar.textContent = avatar;
    }
  }

  if (sidebarAvatar) {
    if (avatarURL) {
      sidebarAvatar.innerHTML =
        `<img src="${escapeHTML(avatarURL)}" alt="Profile">`;
    } else {
      sidebarAvatar.textContent = avatar;
    }
  }

  if (profileName) {
    profileName.textContent = name;
  }

  if (profileUsername) {
    profileUsername.textContent =
      username
        ? `@${username}`
        : "FriendZone member";
  }

  if (profileFriendId) {
    profileFriendId.textContent =
      friendID;
  }

  if (profileNameInput) {
    profileNameInput.value = name;
  }

  if (profileUsernameInput) {
    profileUsernameInput.value =
      username;
  }

  const sidebarName =
    byId("sidebarUserName");

  const sidebarID =
    byId("sidebarFriendId");

  if (sidebarName) {
    sidebarName.textContent = name;
  }

  if (sidebarID) {
    sidebarID.textContent = friendID;
  }
}

/* =========================================================
   UPDATE PROFILE
========================================================= */

async function updateProfile() {
  if (!state.user) return;

  const name =
    byId("profileNameInput")
      ?.value.trim();

  const username =
    byId("profileUsernameInput")
      ?.value.trim();

  if (!name) {
    showToast(
      "Your name cannot be empty.",
      "warning"
    );
    return;
  }

  const button =
    byId("profileForm")
      ?.querySelector(
        "button[type='submit']"
      );

  setButtonLoading(button, true);

  try {
    const { error } =
      await supabaseClient
        .from("profiles")
        .update({
          name,
          updated_at:
            new Date().toISOString()
        })
        .eq("id", state.user.id);

    if (error) {
      throw error;
    }

    const { data: authData, error: authError } =
      await supabaseClient.auth.updateUser({
        data: {
          name,
          username
        }
      });

    if (authError) {
      console.warn(
        "Metadata update:",
        authError
      );
    }

    state.user =
      authData?.user ||
      state.user;

    await loadProfile();

    renderProfile();

    showToast(
      "Profile updated successfully.",
      "success"
    );

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Unable to update your profile.",
      "error"
    );

  } finally {
    setButtonLoading(button, false);
  }
}

/* =========================================================
   FRIEND ID COPY
========================================================= */

async function copyFriendID() {
  const id =
    getFriendID();

  if (!id || id === "------") {
    showToast(
      "Your Friend ID is not available yet.",
      "warning"
    );
    return;
  }

  try {
    await navigator.clipboard.writeText(id);

    showToast(
      "Friend ID copied.",
      "success"
    );

  } catch {
    showToast(
      `Your Friend ID is ${id}`,
      "info"
    );
  }
}

/* =========================================================
   FIND PROFILE BY FRIEND ID
========================================================= */

async function findUserByFriendID(friendID) {
  const normalized =
    String(friendID || "")
      .trim()
      .toUpperCase();

  if (!normalized) {
    return null;
  }

  try {
    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select("*")
        .eq("friend_id", normalized)
        .maybeSingle();

    if (error) {
      console.error(error);
      return null;
    }

    return data;

  } catch (error) {
    console.error(error);
    return null;
  }
}

/* =========================================================
   RELATIONSHIP CHECK
========================================================= */

async function getRelationship(otherID) {
  if (!state.user || !otherID) {
    return null;
  }

  if (otherID === state.user.id) {
    return {
      type: "self"
    };
  }

  try {
    const { data: friendship } =
      await supabaseClient
        .from("friendships")
        .select("id")
        .eq("user_id", state.user.id)
        .eq("friend_id", otherID)
        .maybeSingle();

    if (friendship) {
      return {
        type: "friend",
        record: friendship
      };
    }

    const { data: outgoing } =
      await supabaseClient
        .from("friend_requests")
        .select("id,status")
        .eq("sender_id", state.user.id)
        .eq("receiver_id", otherID)
        .eq("status", "pending")
        .maybeSingle();

    if (outgoing) {
      return {
        type: "sent",
        record: outgoing
      };
    }

    const { data: incoming } =
      await supabaseClient
        .from("friend_requests")
        .select("id,status")
        .eq("sender_id", otherID)
        .eq("receiver_id", state.user.id)
        .eq("status", "pending")
        .maybeSingle();

    if (incoming) {
      return {
        type: "received",
        record: incoming
      };
    }

  } catch (error) {
    console.error(
      "Relationship:",
      error
    );
  }

  return null;
}

/* =========================================================
   SEND FRIEND REQUEST
========================================================= */

async function sendFriendRequest(receiverID) {
  if (!state.user) {
    showToast(
      "Please log in first.",
      "warning"
    );
    return;
  }

  if (
    !receiverID ||
    receiverID === state.user.id
  ) {
    showToast(
      "You cannot add yourself.",
      "warning"
    );
    return;
  }

  try {
    const relationship =
      await getRelationship(receiverID);

    if (relationship?.type === "friend") {
      showToast(
        "You are already friends.",
        "info"
      );
      return;
    }

    if (relationship?.type === "sent") {
      showToast(
        "Friend request already sent.",
        "info"
      );
      return;
    }

    if (relationship?.type === "received") {
      showToast(
        "This person has already sent you a request. Check Requests.",
        "info"
      );
      return;
    }

    const { error } =
      await supabaseClient
        .from("friend_requests")
        .insert({
          sender_id: state.user.id,
          receiver_id: receiverID,
          status: "pending"
        });

    if (error) {
      throw error;
    }

    showToast(
      "Friend request sent!",
      "success"
    );

    await loadFriendRequests();

    renderAll();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Unable to send friend request.",
      "error"
    );
  }
}

/* =========================================================
   SEARCH FRIEND
========================================================= */

async function searchFriend() {
  const input =
    byId("friendIdInput");

  const result =
    byId("friendSearchResult");

  if (!input || !result) return;

  const friendID =
    input.value
      .trim()
      .toUpperCase();

  if (!friendID) {
    showToast(
      "Enter a Friend ID.",
      "warning"
    );
    return;
  }

  if (friendID === getFriendID()) {
    showToast(
      "You cannot add yourself.",
      "warning"
    );
    return;
  }

  const user =
    await findUserByFriendID(friendID);

  if (!user) {
    result.innerHTML = `
      <div class="empty-state compact">
        <div class="empty-icon">?</div>
        <h4>User not found</h4>
        <p>
          No FriendZone account was found
          with this Friend ID.
        </p>
      </div>
    `;

    result.classList.remove("hidden");
    return;
  }

  const relationship =
    await getRelationship(user.id);

  let buttonText =
    "Add Friend";

  let disabled = false;

  if (relationship?.type === "friend") {
    buttonText = "Already Friends";
    disabled = true;
  }

  if (relationship?.type === "sent") {
    buttonText = "Request Sent";
    disabled = true;
  }

  if (relationship?.type === "received") {
    buttonText = "Request Received";
    disabled = true;
  }

  result.innerHTML = `
    <div class="search-user-result">

      <div class="friend-avatar">
        ${escapeHTML(
          initials(user.name)
        )}
      </div>

      <div class="search-user-info">

        <strong>
          ${escapeHTML(
            user.name || "FriendZone User"
          )}
        </strong>

        <span>
          Friend ID:
          ${escapeHTML(
            user.friend_id || "N/A"
          )}
        </span>

      </div>

      <button
        class="primary-btn"
        type="button"
        id="sendSearchRequestBtn"
        ${disabled ? "disabled" : ""}
      >
        ${buttonText}
      </button>

    </div>
  `;

  result.classList.remove("hidden");

  byId("sendSearchRequestBtn")
    ?.addEventListener(
      "click",
      () => sendFriendRequest(user.id)
    );
}

/* =========================================================
   LOAD FRIENDS
========================================================= */

async function loadFriends() {
  if (!state.user) return;

  try {
    const { data, error } =
      await supabaseClient
        .from("friendships")
        .select(
          "id,user_id,friend_id,created_at"
        )
        .eq(
          "user_id",
          state.user.id
        )
        .order(
          "created_at",
          { ascending: false }
        );

    if (error) {
      throw error;
    }

    const friendships =
      data || [];

    const ids =
      friendships.map(
        item => item.friend_id
      );

    const profiles =
      await getProfiles(ids);

    const profileMap =
      new Map(
        profiles.map(
          profile => [
            profile.id,
            profile
          ]
        )
      );

    state.friends =
      friendships
        .map(item => ({
          ...item,
          friend:
            profileMap.get(
              item.friend_id
            ) || null
        }))
        .filter(
          item => item.friend
        );

  } catch (error) {
    console.error(
      "Friends loading:",
      error
    );

    state.friends = [];
  }
}

/* =========================================================
   LOAD PROFILES BY IDS
========================================================= */

async function getProfiles(ids) {
  const uniqueIDs =
    [...new Set(
      (ids || [])
        .filter(Boolean)
    )];

  if (!uniqueIDs.length) {
    return [];
  }

  try {
    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select("*")
        .in("id", uniqueIDs);

    if (error) {
      throw error;
    }

    return data || [];

  } catch (error) {
    console.error(
      "Profiles:",
      error
    );

    return [];
  }
}

/* =========================================================
   LOAD REQUESTS
========================================================= */

async function loadFriendRequests() {
  if (!state.user) return;

  try {
    const [
      incomingResult,
      outgoingResult
    ] = await Promise.all([
      supabaseClient
        .from("friend_requests")
        .select("*")
        .eq(
          "receiver_id",
          state.user.id
        )
        .eq(
          "status",
          "pending"
        )
        .order(
          "created_at",
          { ascending: false }
        ),

      supabaseClient
        .from("friend_requests")
        .select("*")
        .eq(
          "sender_id",
          state.user.id
        )
        .eq(
          "status",
          "pending"
        )
        .order(
          "created_at",
          { ascending: false }
        )
    ]);

    if (incomingResult.error) {
      throw incomingResult.error;
    }

    if (outgoingResult.error) {
      throw outgoingResult.error;
    }

    const incoming =
      incomingResult.data || [];

    const outgoing =
      outgoingResult.data || [];

    const incomingIDs =
      incoming.map(
        item => item.sender_id
      );

    const outgoingIDs =
      outgoing.map(
        item => item.receiver_id
      );

    const profiles =
      await getProfiles([
        ...incomingIDs,
        ...outgoingIDs
      ]);

    const profileMap =
      new Map(
        profiles.map(
          profile => [
            profile.id,
            profile
          ]
        )
      );

    state.receivedRequests =
      incoming.map(item => ({
        ...item,
        user:
          profileMap.get(
            item.sender_id
          ) || null
      }));

    state.sentRequests =
      outgoing.map(item => ({
        ...item,
        user:
          profileMap.get(
            item.receiver_id
          ) || null
      }));

  } catch (error) {
    console.error(
      "Requests loading:",
      error
    );

    state.receivedRequests = [];
    state.sentRequests = [];
  }
}

/* =========================================================
   ACCEPT REQUEST
========================================================= */

async function acceptFriendRequest(requestID) {
  if (!state.user) return;

  try {
    const { data: request, error } =
      await supabaseClient
        .from("friend_requests")
        .select("*")
        .eq("id", requestID)
        .eq(
          "receiver_id",
          state.user.id
        )
        .eq(
          "status",
          "pending"
        )
        .single();

    if (error) {
      throw error;
    }

    const { error: updateError } =
      await supabaseClient
        .from("friend_requests")
        .update({
          status: "accepted",
          updated_at:
            new Date().toISOString()
        })
        .eq("id", requestID);

    if (updateError) {
      throw updateError;
    }

    const { error: friendshipError } =
      await supabaseClient
        .from("friendships")
        .insert([
          {
            user_id: state.user.id,
            friend_id:
              request.sender_id
          },
          {
            user_id:
              request.sender_id,
            friend_id:
              state.user.id
          }
        ]);

    if (
      friendshipError &&
      !String(
        friendshipError.message
      )
        .toLowerCase()
        .includes("duplicate")
    ) {
      throw friendshipError;
    }

    showToast(
      "Friend request accepted!",
      "success"
    );

    await refreshEverything();

  } catch (error) {
    console.error(
      "Accept request:",
      error
    );

    showToast(
      error.message ||
      "Unable to accept request.",
      "error"
    );
  }
}

/* =========================================================
   REJECT REQUEST
========================================================= */

async function rejectFriendRequest(requestID) {
  if (!state.user) return;

  try {
    const { error } =
      await supabaseClient
        .from("friend_requests")
        .update({
          status: "rejected",
          updated_at:
            new Date().toISOString()
        })
        .eq("id", requestID)
        .eq(
          "receiver_id",
          state.user.id
        )
        .eq(
          "status",
          "pending"
        );

    if (error) {
      throw error;
    }

    showToast(
      "Friend request rejected.",
      "success"
    );

    await loadFriendRequests();

    renderAll();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Unable to reject request.",
      "error"
    );
  }
}

/* =========================================================
   CANCEL REQUEST
========================================================= */

async function cancelFriendRequest(requestID) {
  if (!state.user) return;

  try {
    const { error } =
      await supabaseClient
        .from("friend_requests")
        .delete()
        .eq("id", requestID)
        .eq(
          "sender_id",
          state.user.id
        )
        .eq(
          "status",
          "pending"
        );

    if (error) {
      throw error;
    }

    showToast(
      "Friend request cancelled.",
      "success"
    );

    await loadFriendRequests();

    renderAll();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Unable to cancel request.",
      "error"
    );
  }
}

/* =========================================================
   LOAD BEST FRIENDS
========================================================= */

async function loadBestFriends() {
  if (!state.user) return;

  try {
    const { data, error } =
      await supabaseClient
        .from("best_friends")
        .select(
          "id,user_id,friend_id,created_at"
        )
        .eq(
          "user_id",
          state.user.id
        )
        .order(
          "created_at",
          { ascending: false }
        );

    if (error) {
      throw error;
    }

    const items =
      data || [];

    const profiles =
      await getProfiles(
        items.map(
          item => item.friend_id
        )
      );

    const profileMap =
      new Map(
        profiles.map(
          profile => [
            profile.id,
            profile
          ]
        )
      );

    state.bestFriends =
      items
        .map(item => ({
          ...item,
          friend:
            profileMap.get(
              item.friend_id
            ) || null
        }))
        .filter(
          item => item.friend
        );

  } catch (error) {
    console.error(
      "Best friends:",
      error
    );

    state.bestFriends = [];
  }
}

/* =========================================================
   ADD BEST FRIEND
========================================================= */

async function addBestFriend(friendID) {
  if (!state.user) return;

  const isFriend =
    state.friends.some(
      item =>
        item.friend_id === friendID
    );

  if (!isFriend) {
    showToast(
      "Only your existing Friends can be added as Best Friends.",
      "warning"
    );
    return;
  }

  const alreadyBest =
    state.bestFriends.some(
      item =>
        item.friend_id === friendID
    );

  if (alreadyBest) {
    showToast(
      "Already in Best Friends.",
      "info"
    );
    return;
  }

  try {
    const { error } =
      await supabaseClient
        .from("best_friends")
        .insert({
          user_id:
            state.user.id,
          friend_id: friendID
        });

    if (error) {
      throw error;
    }

    showToast(
      "Added to Best Friends.",
      "success"
    );

    await loadBestFriends();

    renderAll();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Unable to add Best Friend.",
      "error"
    );
  }
}

/* =========================================================
   REMOVE BEST FRIEND
========================================================= */

async function removeBestFriend(friendID) {
  if (!state.user) return;

  try {
    const { error } =
      await supabaseClient
        .from("best_friends")
        .delete()
        .eq(
          "user_id",
          state.user.id
        )
        .eq(
          "friend_id",
          friendID
        );

    if (error) {
      throw error;
    }

    showToast(
      "Removed from Best Friends.",
      "success"
    );

    await loadBestFriends();

    renderAll();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Unable to remove Best Friend.",
      "error"
    );
  }
}

/* =========================================================
   REMOVE FRIEND
========================================================= */

async function removeFriend(friendID) {
  if (!state.user) return;

  const friend =
    state.friends.find(
      item =>
        item.friend_id === friendID
    )?.friend;

  const name =
    friend?.name ||
    "this friend";

  if (
    !window.confirm(
      `Remove ${name} from your Friends?`
    )
  ) {
    return;
  }

  try {
    const first =
      await supabaseClient
        .from("friendships")
        .delete()
        .eq(
          "user_id",
          state.user.id
        )
        .eq(
          "friend_id",
          friendID
        );

    if (first.error) {
      throw first.error;
    }

    await supabaseClient
      .from("friendships")
      .delete()
      .eq(
        "user_id",
        friendID
      )
      .eq(
        "friend_id",
        state.user.id
      );

    await supabaseClient
      .from("best_friends")
      .delete()
      .eq(
        "user_id",
        state.user.id
      )
      .eq(
        "friend_id",
        friendID
      );

    showToast(
      "Friend removed.",
      "success"
    );

    await refreshEverything();

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Unable to remove friend.",
      "error"
    );
  }
}

/* =========================================================
   FRIEND CARD
========================================================= */

function createFriendCard(item, isBestPage = false) {
  const friend =
    item?.friend;

  if (!friend) return "";

  const isBest =
    state.bestFriends.some(
      best =>
        best.friend_id === friend.id
    );

  return `
    <article
      class="friend-card"
      data-friend-name="${escapeHTML(
        friend.name
      )}"
      data-friend-id="${escapeHTML(
        friend.friend_id
      )}"
    >

      ${
        isBest || isBestPage
          ? `
            <div
              class="best-mark"
              title="Best Friend"
            >
              ★
            </div>
          `
          : ""
      }

      <div class="friend-card-top">

        <div class="friend-avatar">
          ${
            friend.avatar_url
              ? `
                <img
                  src="${escapeHTML(
                    friend.avatar_url
                  )}"
                  alt="${escapeHTML(
                    friend.name
                  )}"
                >
              `
              : escapeHTML(
                  initials(friend.name)
                )
          }
        </div>

        <div class="friend-card-info">

          <h4>
            ${escapeHTML(
              friend.name ||
              "Friend"
            )}
          </h4>

          <p>
            <span class="status-dot"></span>
            Friend
          </p>

        </div>

      </div>

      <div class="friend-card-id">
        ID:
        ${escapeHTML(
          friend.friend_id ||
          "N/A"
        )}
      </div>

      <div class="friend-card-actions">

        <button
          type="button"
          class="small-action-btn"
          data-action="remove-friend"
          data-user-id="${escapeHTML(
            friend.id
          )}"
        >
          Remove
        </button>

        ${
          isBest || isBestPage
            ? `
              <button
                type="button"
                class="small-action-btn primary"
                data-action="remove-best"
                data-user-id="${escapeHTML(
                  friend.id
                )}"
              >
                ★ Best
              </button>
            `
            : `
              <button
                type="button"
                class="small-action-btn primary"
                data-action="best-friend"
                data-user-id="${escapeHTML(
                  friend.id
                )}"
              >
                ★ Best
              </button>
            `
        }

      </div>

    </article>
  `;
}

/* =========================================================
   RENDER FRIENDS
========================================================= */

function renderFriends() {
  const container =
    byId("friendsContainer");

  if (!container) return;

  if (!state.friends.length) {
    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          ♧
        </div>

        <h3>
          No friends yet
        </h3>

        <p>
          Start building your circle by
          adding someone with their Friend ID.
        </p>

        <button
          class="primary-btn"
          type="button"
          data-go-page="addFriendPage"
        >
          Add Your First Friend
        </button>

      </div>
    `;

    return;
  }

  container.innerHTML =
    state.friends
      .map(item =>
        createFriendCard(item)
      )
      .join("");
}

/* =========================================================
   RENDER HOME RECENT FRIENDS
========================================================= */

function renderRecentFriends() {
  const container =
    byId("recentFriendsContainer");

  if (!container) return;

  if (!state.friends.length) {
    container.innerHTML = `
      <div class="empty-state compact">

        <div class="empty-icon">
          ♧
        </div>

        <h4>
          Your circle is empty
        </h4>

        <p>
          Add your first friend using a Friend ID.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML =
    state.friends
      .slice(0, 4)
      .map(item =>
        createFriendCard(item)
      )
      .join("");
}

/* =========================================================
   RENDER BEST FRIENDS
========================================================= */

function renderBestFriends() {
  const container =
    byId("bestFriendsContainer");

  if (!container) return;

  if (!state.bestFriends.length) {
    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          ★
        </div>

        <h3>
          No Best Friends yet
        </h3>

        <p>
          Best Friends are completely optional.
          Add your closest Friends whenever you want.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML =
    state.bestFriends
      .map(item =>
        createFriendCard(
          item,
          true
        )
      )
      .join("");
}

/* =========================================================
   REQUEST CARD
========================================================= */

function createRequestCard(
  request,
  incoming
) {
  const user =
    request.user;

  if (!user) return "";

  return `
    <article class="request-card">

      <div class="request-user">

        <div class="friend-avatar">
          ${
            user.avatar_url
              ? `
                <img
                  src="${escapeHTML(
                    user.avatar_url
                  )}"
                  alt="${escapeHTML(
                    user.name
                  )}"
                >
              `
              : escapeHTML(
                  initials(user.name)
                )
          }
        </div>

        <div class="request-user-info">

          <strong>
            ${escapeHTML(
              user.name ||
              "Friend"
            )}
          </strong>

          <span>
            Friend ID:
            ${escapeHTML(
              user.friend_id ||
              "N/A"
            )}
          </span>

        </div>

      </div>

      <div class="request-actions">

        ${
          incoming
            ? `
              <button
                class="primary-btn"
                type="button"
                data-action="accept-request"
                data-request-id="${escapeHTML(
                  request.id
                )}"
              >
                Accept
              </button>

              <button
                class="secondary-btn"
                type="button"
                data-action="reject-request"
                data-request-id="${escapeHTML(
                  request.id
                )}"
              >
                Reject
              </button>
            `
            : `
              <button
                class="secondary-btn"
                type="button"
                data-action="cancel-request"
                data-request-id="${escapeHTML(
                  request.id
                )}"
              >
                Cancel Request
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
  const received =
    byId("receivedRequestsContainer");

  const sent =
    byId("sentRequestsContainer");

  if (received) {
    if (!state.receivedRequests.length) {
      received.innerHTML = `
        <div class="empty-state compact">

          <div class="empty-icon">
            ✓
          </div>

          <h4>
            No incoming requests
          </h4>

          <p>
            New friend requests will appear here.
          </p>

        </div>
      `;
    } else {
      received.innerHTML =
        state.receivedRequests
          .map(request =>
            createRequestCard(
              request,
              true
            )
          )
          .join("");
    }
  }

  if (sent) {
    if (!state.sentRequests.length) {
      sent.innerHTML = `
        <div class="empty-state compact">

          <div class="empty-icon">
            →
          </div>

          <h4>
            No sent requests
          </h4>

          <p>
            Friend requests you send will appear here.
          </p>

        </div>
      `;
    } else {
      sent.innerHTML =
        state.sentRequests
          .map(request =>
            createRequestCard(
              request,
              false
            )
          )
          .join("");
    }
  }
}

/* =========================================================
   COUNTS
========================================================= */

function updateCounts() {
  const friends =
    state.friends.length;

  const requests =
    state.receivedRequests.length;

  const best =
    state.bestFriends.length;

  const sent =
    state.sentRequests.length;

  const values = {
    friendsBadge: requests,
    requestsBadge: requests,
    headerRequestBadge: requests,

    homeFriendsCount: friends,
    homeRequestsCount: requests,
    homeBestFriendsCount: best,

    receivedCount: requests,
    sentCount: sent
  };

  Object.entries(values)
    .forEach(
      ([id, value]) => {
        const element =
          byId(id);

        if (element) {
          element.textContent =
            value;
        }
      }
    );

  [
    "friendsBadge",
    "requestsBadge",
    "headerRequestBadge"
  ].forEach(id => {
    const element =
      byId(id);

    if (!element) return;

    element.classList.toggle(
      "hidden",
      Number(element.textContent) === 0
    );
  });
}

/* =========================================================
   UPDATE UI
========================================================= */

function updateUI() {
  if (!state.user) return;

  renderProfile();
  updateCounts();

  const homeFriendID =
    byId("homeFriendId");

  if (homeFriendID) {
    homeFriendID.textContent =
      getFriendID();
  }

  const homeFriends =
    byId("homeFriendsCount");

  if (homeFriends) {
    homeFriends.textContent =
      state.friends.length;
  }

  const homeRequests =
    byId("homeRequestsCount");

  if (homeRequests) {
    homeRequests.textContent =
      state.receivedRequests.length;
  }

  const homeBest =
    byId("homeBestFriendsCount");

  if (homeBest) {
    homeBest.textContent =
      state.bestFriends.length;
  }
}

/* =========================================================
   RENDER EVERYTHING
========================================================= */

function renderAll() {
  renderProfile();
  renderFriends();
  renderRecentFriends();
  renderBestFriends();
  renderRequests();
  updateCounts();
  updateUI();
}

/* =========================================================
   NAVIGATION
========================================================= */

const PAGE_INFO = {
  homePage: {
    title: "Home",
    subtitle: "Your FriendZone dashboard"
  },

  friendsPage: {
    title: "Friends",
    subtitle: "Manage your friends"
  },

  requestsPage: {
    title: "Friend Requests",
    subtitle: "Manage incoming and sent requests"
  },

  bestFriendsPage: {
    title: "Best Friends",
    subtitle: "Your optional closest-friend list"
  },

  addFriendPage: {
    title: "Add Friend",
    subtitle: "Connect using a Friend ID"
  },

  profilePage: {
    title: "Profile",
    subtitle: "Manage your FriendZone account"
  }
};

function showPage(pageID) {
  if (!pageID) return;

  const page =
    byId(pageID);

  if (!page) return;

  $$(".page")
    .forEach(item => {
      item.classList.remove(
        "active-page"
      );
    });

  page.classList.add(
    "active-page"
  );

  $$(".nav-item")
    .forEach(item => {
      item.classList.toggle(
        "active",
        item.dataset.page === pageID
      );
    });

  state.currentPage =
    pageID;

  const info =
    PAGE_INFO[pageID];

  if (info) {
    const title =
      byId("currentPageTitle");

    const subtitle =
      byId("currentPageSubtitle");

    if (title) {
      title.textContent =
        info.title;
    }

    if (subtitle) {
      subtitle.textContent =
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
  byId("sidebar")
    ?.classList.add("open");

  byId("sidebarOverlay")
    ?.classList.add("show");
}

function closeSidebar() {
  byId("sidebar")
    ?.classList.remove("open");

  byId("sidebarOverlay")
    ?.classList.remove("show");
}

/* =========================================================
   PASSWORD TOGGLE
========================================================= */

function setupPasswordToggles() {
  $$(".password-toggle")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const target =
            button.dataset.target;

          const input =
            byId(target);

          if (!input) return;

          if (
            input.type === "password"
          ) {
            input.type = "text";
            button.textContent = "◉";
          } else {
            input.type = "password";
            button.textContent = "○";
          }
        }
      );

    });
}

/* =========================================================
   LOGIN
========================================================= */

async function login() {
  if (!supabaseClient) return;

  const email =
    byId("loginEmail")
      ?.value.trim();

  const password =
    byId("loginPassword")
      ?.value;

  if (!email || !password) {
    showToast(
      "Enter your email and password.",
      "warning"
    );
    return;
  }

  const button =
    byId("loginForm")
      ?.querySelector(
        "button[type='submit']"
      );

  setButtonLoading(button, true);

  try {
    const { data, error } =
      await supabaseClient.auth
        .signInWithPassword({
          email,
          password
        });

    if (error) {
      throw error;
    }

    state.user =
      data.user;

    await loadApplication(
      data.user
    );

    showToast(
      "Welcome back to FriendZone!",
      "success"
    );

  } catch (error) {
    console.error(
      "Login:",
      error
    );

    showToast(
      error.message ||
      "Login failed.",
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
   SIGN UP
========================================================= */

async function signUp() {
  if (!supabaseClient) return;

  const name =
    byId("signupName")
      ?.value.trim();

  const username =
    byId("signupUsername")
      ?.value.trim();

  const email =
    byId("signupEmail")
      ?.value.trim();

  const password =
    byId("signupPassword")
      ?.value;

  if (!name || !email || !password) {
    showToast(
      "Please fill all required fields.",
      "warning"
    );
    return;
  }

  if (password.length < 6) {
    showToast(
      "Password must contain at least 6 characters.",
      "warning"
    );
    return;
  }

  const button =
    byId("signupForm")
      ?.querySelector(
        "button[type='submit']"
      );

  setButtonLoading(
    button,
    true
  );

  try {
    const { data, error } =
      await supabaseClient.auth
        .signUp({
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

    if (data.session) {

      state.user =
        data.user;

      await loadApplication(
        data.user
      );

      showToast(
        "Welcome to FriendZone!",
        "success"
      );

    } else {

      showToast(
        "Account created. Please verify your email if verification is enabled.",
        "success"
      );

      switchAuthMode(
        "login"
      );
    }

  } catch (error) {
    console.error(
      "Signup:",
      error
    );

    showToast(
      error.message ||
      "Unable to create account.",
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
   LOGOUT
========================================================= */

async function logout() {
  try {
    if (supabaseClient) {
      await supabaseClient.auth
        .signOut();
    }
  } catch (error) {
    console.error(error);
  }

  cleanupRealtime();

  state.user = null;
  state.profile = null;
  state.friends = [];
  state.receivedRequests = [];
  state.sentRequests = [];
  state.bestFriends = [];

  showAuthScreen();
  switchAuthMode("login");

  showToast(
    "You have been logged out.",
    "success"
  );
}

/* =========================================================
   LOAD APPLICATION
========================================================= */

async function loadApplication(user) {
  if (!user) return;

  state.user = user;

  showMainApp();

  try {
    await loadProfile();

    await Promise.all([
      loadFriends(),
      loadFriendRequests(),
      loadBestFriends()
    ]);

    renderAll();

    setupRealtime();

  } catch (error) {
    console.error(
      "Application:",
      error
    );
  }
}

/* =========================================================
   REFRESH EVERYTHING
========================================================= */

async function refreshEverything() {
  if (!state.user) return;

  await loadProfile();

  await Promise.all([
    loadFriends(),
    loadFriendRequests(),
    loadBestFriends()
  ]);

  renderAll();
}

/* =========================================================
   FRIEND SEARCH FILTER
========================================================= */

function filterFriends(value) {
  const search =
    String(value || "")
      .trim()
      .toLowerCase();

  $$(".friend-card")
    .forEach(card => {

      const name =
        (
          card.dataset.friendName ||
          ""
        ).toLowerCase();

      const id =
        (
          card.dataset.friendId ||
          ""
        ).toLowerCase();

      const matches =
        !search ||
        name.includes(search) ||
        id.includes(search);

      card.style.display =
        matches ? "" : "none";
    });
}

/* =========================================================
   REQUEST TABS
========================================================= */

function setupRequestTabs() {
  $$(".request-tab")
    .forEach(tab => {

      tab.addEventListener(
        "click",
        () => {

          const target =
            tab.dataset.requestTab;

          if (!target) return;

          state.requestTab =
            target;

          $$(".request-tab")
            .forEach(item => {
              item.classList.toggle(
                "active",
                item === tab
              );
            });

          const received =
            byId(
              "receivedRequestsContainer"
            );

          const sent =
            byId(
              "sentRequestsContainer"
            );

          if (received) {
            received.classList.toggle(
              "hidden",
              target !== "received"
            );
          }

          if (sent) {
            sent.classList.toggle(
              "hidden",
              target !== "sent"
            );
          }
        }
      );

    });
}

/* =========================================================
   REALTIME
========================================================= */

function cleanupRealtime() {
  if (!supabaseClient) return;

  state.realtimeChannels
    .forEach(channel => {
      try {
        supabaseClient.removeChannel(
          channel
        );
      } catch {}
    });

  state.realtimeChannels = [];
}

function setupRealtime() {
  if (!supabaseClient || !state.user) {
    return;
  }

  cleanupRealtime();

  try {
    const channel =
      supabaseClient
        .channel(
          `friendzone-${state.user.id}`
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friend_requests",
            filter:
              `receiver_id=eq.${state.user.id}`
          },
          async () => {
            await loadFriendRequests();
            renderAll();
          }
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friend_requests",
            filter:
              `sender_id=eq.${state.user.id}`
          },
          async () => {
            await loadFriendRequests();
            renderAll();
          }
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "friendships",
            filter:
              `user_id=eq.${state.user.id}`
          },
          async () => {
            await loadFriends();
            renderAll();
          }
        )

        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "best_friends",
            filter:
              `user_id=eq.${state.user.id}`
          },
          async () => {
            await loadBestFriends();
            renderAll();
          }
        )

        .subscribe();

    state.realtimeChannels
      .push(channel);

  } catch (error) {
    console.warn(
      "Realtime unavailable:",
      error
    );
  }
}

/* =========================================================
   EVENT SETUP
========================================================= */

function setupEvents() {

  /* LOGIN */

  byId("loginForm")
    ?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        login();
      }
    );

  /* SIGNUP */

  byId("signupForm")
    ?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        signUp();
      }
    );

  /* AUTH SWITCH */

  byId("showSignupBtn")
    ?.addEventListener(
      "click",
      () => switchAuthMode("signup")
    );

  byId("showLoginBtn")
    ?.addEventListener(
      "click",
      () => switchAuthMode("login")
    );

  /* LOGOUT */

  byId("logoutBtn")
    ?.addEventListener(
      "click",
      logout
    );

  /* SIDEBAR */

  byId("openSidebarBtn")
    ?.addEventListener(
      "click",
      openSidebar
    );

  byId("closeSidebarBtn")
    ?.addEventListener(
      "click",
      closeSidebar
    );

  byId("sidebarOverlay")
    ?.addEventListener(
      "click",
      closeSidebar
    );

  /* HEADER REQUEST */

  byId("headerRequestBtn")
    ?.addEventListener(
      "click",
      () => showPage("requestsPage")
    );

  /* HEADER PROFILE */

  byId("headerProfileBtn")
    ?.addEventListener(
      "click",
      () => showPage("profilePage")
    );

  /* COPY FRIEND ID */

  byId("copyFriendIdBtn")
    ?.addEventListener(
      "click",
      copyFriendID
    );

  /* ADD FRIEND */

  byId("addFriendForm")
    ?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        searchFriend();
      }
    );

  /* PROFILE */

  byId("profileForm")
    ?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        updateProfile();
      }
    );

  /* FRIEND SEARCH */

  byId("friendsSearch")
    ?.addEventListener(
      "input",
      event => {
        filterFriends(
          event.target.value
        );
      }
    );

  /* GO PAGE BUTTONS */

  $$("[data-go-page]")
    .forEach(button => {
      button.addEventListener(
        "click",
        () => {
          showPage(
            button.dataset.goPage
          );
        }
      );
    });

  /* MODAL CLOSE */

  $$("[data-close-modal]")
    .forEach(element => {
      element.addEventListener(
        "click",
        () => {
          const modal =
            element.closest(".modal");

          modal?.classList.add(
            "hidden"
          );
        }
      );
    });
}

/* =========================================================
   CLICK DELEGATION
========================================================= */

document.addEventListener(
  "click",
  async event => {

    /* NAVIGATION */

    const nav =
      event.target.closest(
        ".nav-item"
      );

    if (nav?.dataset.page) {
      showPage(
        nav.dataset.page
      );
      return;
    }

    /* QUICK PAGE */

    const go =
      event.target.closest(
        "[data-go-page]"
      );

    if (go?.dataset.goPage) {
      showPage(
        go.dataset.goPage
      );
      return;
    }

    /* ACTION */

    const action =
      event.target.closest(
        "[data-action]"
      );

    if (!action) return;

    const type =
      action.dataset.action;

    const userID =
      action.dataset.userId;

    const requestID =
      action.dataset.requestId;

    if (
      type === "remove-friend"
    ) {
      await removeFriend(
        userID
      );
      return;
    }

    if (
      type === "best-friend"
    ) {
      await addBestFriend(
        userID
      );
      return;
    }

    if (
      type === "remove-best"
    ) {
      await removeBestFriend(
        userID
      );
      return;
    }

    if (
      type === "accept-request"
    ) {
      await acceptFriendRequest(
        requestID
      );
      return;
    }

    if (
      type === "reject-request"
    ) {
      await rejectFriendRequest(
        requestID
      );
      return;
    }

    if (
      type === "cancel-request"
    ) {
      await cancelFriendRequest(
        requestID
      );
    }
  }
);

/* =========================================================
   MODAL BACKDROP
========================================================= */

document.addEventListener(
  "click",
  event => {

    const modal =
      event.target.closest(
        ".modal"
      );

    if (
      modal &&
      event.target === modal
    ) {
      modal.classList.add(
        "hidden"
      );
    }
  }
);

/* =========================================================
   ESCAPE KEY
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (event.key !== "Escape") {
      return;
    }

    closeSidebar();

    $$(".modal")
      .forEach(modal => {
        modal.classList.add(
          "hidden"
        );
      });
  }
);

/* =========================================================
   AUTH STATE LISTENER
========================================================= */

function setupAuthListener() {
  if (!supabaseClient) return;

  supabaseClient.auth
    .onAuthStateChange(
      async (
        event,
        session
      ) => {

        if (
          event === "INITIAL_SESSION"
        ) {
          return;
        }

        if (session?.user) {

          state.user =
            session.user;

          await loadApplication(
            session.user
          );

        } else {

          cleanupRealtime();

          state.user = null;
          state.profile = null;

          state.friends = [];
          state.receivedRequests = [];
          state.sentRequests = [];
          state.bestFriends = [];

          showAuthScreen();
        }
      }
    );
}

/* =========================================================
   SAFE SESSION WITH TIMEOUT
========================================================= */

async function getInitialSession() {
  if (!supabaseClient) {
    return null;
  }

  try {

    const sessionPromise =
      supabaseClient.auth
        .getSession();

    const timeoutPromise =
      new Promise(
        (_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  "Supabase connection timeout"
                )
              ),
            10000
          );
        }
      );

    const result =
      await Promise.race([
        sessionPromise,
        timeoutPromise
      ]);

    return (
      result?.data?.session ||
      null
    );

  } catch (error) {

    console.error(
      "Session:",
      error
    );

    return null;
  }
}

/* =========================================================
   INITIALIZATION
========================================================= */

async function initializeApp() {

  try {

    /* Check Supabase */

    if (
      !window.supabase ||
      typeof window.supabase.createClient !==
        "function"
    ) {

      console.error(
        "Supabase JS library was not loaded."
      );

      showAuthScreen();

      showToast(
        "Supabase library could not be loaded. Check your internet connection.",
        "error"
      );

      return;
    }

    /* Create client */

    supabaseClient =
      window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );

    /* Setup UI events */

    setupEvents();
    setupPasswordToggles();
    setupRequestTabs();

    /* Auth listener */

    setupAuthListener();

    /* Get session */

    const session =
      await getInitialSession();

    if (session?.user) {

      state.user =
        session.user;

      await loadApplication(
        session.user
      );

    } else {

      showAuthScreen();

      switchAuthMode("login");
    }

    state.initialized = true;

  } catch (error) {

    console.error(
      "FriendZone startup error:",
      error
    );

    showAuthScreen();

    showToast(
      "FriendZone could not connect right now. Please refresh and try again.",
      "error"
    );

  } finally {

    /*
      IMPORTANT:
      The loader is ALWAYS removed.
      This prevents the website from getting
      permanently stuck on "Connecting your circle..."
    */

    hideLoader();
  }
}

/* =========================================================
   GLOBAL API
========================================================= */

window.FriendZone = {
  login,
  signUp,
  logout,

  showPage,

  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,

  removeFriend,

  addBestFriend,
  removeBestFriend,

  searchFriend,

  copyFriendID,

  updateProfile,

  refreshEverything,

  getFriendID,

  showToast
};

/* =========================================================
   START
========================================================= */

if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    initializeApp,
    { once: true }
  );

} else {

  initializeApp();
}

/* =========================================================
   GLOBAL ERROR PROTECTION
========================================================= */

window.addEventListener(
  "unhandledrejection",
  event => {
    console.error(
      "FriendZone Promise Error:",
      event.reason
    );
  }
);

window.addEventListener(
  "error",
  event => {
    console.error(
      "FriendZone Error:",
      event.error || event.message
    );
  }
);

/* =========================================================
   END FRIENDZONE
========================================================= */
