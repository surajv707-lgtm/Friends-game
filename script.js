/* =========================================================
   FRIENDZONE
   MAIN JAVASCRIPT
   SUPABASE + AUTH + FRIEND SYSTEM
========================================================= */


/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL = "https://hjdevuoxuoyenzmawwnb.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IkFub24iLCJpYXQiOjE3ODg3ODgzNjYsImV4cCI6MjEwNDM2NDM2Nn0.-ER4x0hqUYss521B_FWAHnfWjtxg9YJIaWNXjQJPPhI";


/*
   Your supplied key is a public/anon Supabase key.
   NEVER put a Supabase service_role key in frontend JS.
*/


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );

window.FRIENDZONE_CONFIG = {
  SUPABASE_URL,
  SUPABASE_ANON_KEY
};


/* =========================================================
   GLOBAL STATE
========================================================= */

let currentUser = null;
let currentProfile = null;

let allFriends = [];
let allIncomingRequests = [];
let allOutgoingRequests = [];
let allBestFriends = [];

let currentRequestTab = "incoming";


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) =>
  Array.from(document.querySelectorAll(selector));


function byId(id) {
  return document.getElementById(id);
}


function escapeHTML(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}


function initials(name = "User") {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }

  return (
    parts[0][0] +
    parts[parts.length - 1][0]
  ).toUpperCase();
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
    byId("toastContainer") ||
    $(".toast-container");

  if (!container) {
    alert(message);
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

  const toast = document.createElement("div");

  toast.className = `toast ${type}`;

  toast.innerHTML = `
    <div class="toast-icon">
      ${icons[type] || "i"}
    </div>

    <div class="toast-content">
      <strong>${escapeHTML(title || titles[type] || "FriendZone")}</strong>
      <p>${escapeHTML(message)}</p>
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
    byId("appLoader") ||
    $(".app-loader");

  if (loader) {
    loader.classList.add("fade-out");

    setTimeout(() => {
      loader.style.display = "none";
    }, 400);
  }
}


/* =========================================================
   AUTH SCREEN HELPERS
========================================================= */

function showAuthScreen() {
  const auth =
    byId("authScreen") ||
    $(".auth-screen");

  const app =
    byId("mainApp") ||
    $(".main-app");

  if (auth) {
    auth.classList.remove("hidden");
    auth.style.display = "";
  }

  if (app) {
    app.classList.add("hidden");
    app.style.display = "none";
  }
}


function showMainApp() {
  const auth =
    byId("authScreen") ||
    $(".auth-screen");

  const app =
    byId("mainApp") ||
    $(".main-app");

  if (auth) {
    auth.classList.add("hidden");
    auth.style.display = "none";
  }

  if (app) {
    app.classList.remove("hidden");
    app.style.display = "";
  }
}


/* =========================================================
   AUTH MODE
========================================================= */

function switchAuthMode(mode) {
  const loginForm =
    byId("loginForm") ||
    $("#loginForm");

  const signupForm =
    byId("signupForm") ||
    $("#signupForm");

  const loginTab =
    byId("loginTab");

  const signupTab =
    byId("signupTab");

  if (mode === "signup") {
    loginForm?.classList.add("hidden");
    signupForm?.classList.remove("hidden");

    loginTab?.classList.remove("active");
    signupTab?.classList.add("active");

    return;
  }

  signupForm?.classList.add("hidden");
  loginForm?.classList.remove("hidden");

  signupTab?.classList.remove("active");
  loginTab?.classList.add("active");
}


/* =========================================================
   SIGN UP
========================================================= */

async function signUp() {
  const email =
    byId("signupEmail")?.value.trim();

  const password =
    byId("signupPassword")?.value;

  const name =
    byId("signupName")?.value.trim();

  if (!email || !password || !name) {
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
    byId("signupBtn");

  setButtonLoading(button, true);

  try {
    const {
      data,
      error
    } = await supabaseClient.auth.signUp({
      email,
      password,
      options: {
        data: {
          name
        }
      }
    });

    if (error) {
      throw error;
    }

    if (data.session) {
      showToast(
        "Your FriendZone account has been created.",
        "success"
      );

      await loadApplication(data.user);
    } else {
      showToast(
        "Account created. Please verify your email if email verification is enabled.",
        "success"
      );

      switchAuthMode("login");
    }

  } catch (error) {
    console.error("Signup error:", error);

    showToast(
      error.message || "Unable to create account.",
      "error"
    );
  }

  setButtonLoading(button, false);
}


/* =========================================================
   LOGIN
========================================================= */

async function login() {
  const email =
    byId("loginEmail")?.value.trim();

  const password =
    byId("loginPassword")?.value;

  if (!email || !password) {
    showToast(
      "Enter your email and password.",
      "warning"
    );

    return;
  }

  const button =
    byId("loginBtn");

  setButtonLoading(button, true);

  try {
    const {
      data,
      error
    } = await supabaseClient.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    showToast(
      "Welcome back to FriendZone!",
      "success"
    );

    await loadApplication(data.user);

  } catch (error) {
    console.error("Login error:", error);

    showToast(
      error.message || "Login failed.",
      "error"
    );
  }

  setButtonLoading(button, false);
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
  try {
    const {
      error
    } = await supabaseClient.auth.signOut();

    if (error) {
      throw error;
    }

    currentUser = null;
    currentProfile = null;

    allFriends = [];
    allIncomingRequests = [];
    allOutgoingRequests = [];
    allBestFriends = [];

    showAuthScreen();

    switchAuthMode("login");

    showToast(
      "You have been logged out.",
      "success"
    );

  } catch (error) {
    console.error(error);

    showToast(
      "Unable to log out.",
      "error"
    );
  }
}


/* =========================================================
   LOAD APPLICATION
========================================================= */

async function loadApplication(user) {
  if (!user) {
    return;
  }

  currentUser = user;

  showMainApp();

  await loadProfile();

  await Promise.all([
    loadFriends(),
    loadFriendRequests(),
    loadBestFriends()
  ]);

  updateUI();

  hideLoader();
}


/* =========================================================
   PROFILE
========================================================= */

async function loadProfile() {
  if (!currentUser) {
    return;
  }

  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      throw error;
    }

    currentProfile = data;

    if (!data) {
      await createMissingProfile();
    }

  } catch (error) {
    console.error(
      "Profile loading error:",
      error
    );

    showToast(
      "Unable to load your profile.",
      "error"
    );
  }
}


async function createMissingProfile() {
  if (!currentUser) {
    return;
  }

  const metadata =
    currentUser.user_metadata || {};

  const name =
    metadata.name ||
    currentUser.email?.split("@")[0] ||
    "FriendZone User";

  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .insert({
        id: currentUser.id,
        name
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    currentProfile = data;

  } catch (error) {
    console.error(
      "Create profile error:",
      error
    );
  }
}


/* =========================================================
   UPDATE PROFILE
========================================================= */

async function updateProfile() {
  if (!currentUser) {
    return;
  }

  const name =
    byId("profileNameInput")?.value.trim();

  const avatarUrl =
    byId("profileAvatarInput")?.value.trim();

  if (!name) {
    showToast(
      "Name cannot be empty.",
      "warning"
    );

    return;
  }

  const button =
    byId("saveProfileBtn");

  setButtonLoading(button, true);

  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .update({
        name,
        avatar_url: avatarUrl || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", currentUser.id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    currentProfile = data;

    updateUI();

    showToast(
      "Profile updated successfully.",
      "success"
    );

  } catch (error) {
    console.error(error);

    showToast(
      error.message || "Could not update profile.",
      "error"
    );
  }

  setButtonLoading(button, false);
}


/* =========================================================
   FRIEND ID
========================================================= */

function getFriendID() {
  return currentProfile?.friend_id || "------";
}


async function copyFriendID() {
  const id = getFriendID();

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
      "Friend ID copied to clipboard.",
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
   FIND USER BY FRIEND ID
========================================================= */

async function findUserByFriendID(friendID) {
  friendID =
    String(friendID || "")
      .trim()
      .toUpperCase();

  if (!friendID) {
    return null;
  }

  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("profiles")
      .select("id,name,friend_id,avatar_url")
      .eq("friend_id", friendID)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data;

  } catch (error) {
    console.error(error);

    return null;
  }
}


/* =========================================================
   SEARCH FRIEND ID
========================================================= */

async function searchFriendID() {
  const input =
    byId("friendIDInput");

  if (!input) {
    return;
  }

  const friendID =
    input.value.trim().toUpperCase();

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

  const button =
    byId("searchFriendBtn");

  setButtonLoading(button, true);

  const user =
    await findUserByFriendID(friendID);

  setButtonLoading(button, false);

  const result =
    byId("friendSearchResult");

  if (!result) {
    return;
  }

  if (!user) {
    result.innerHTML = `
      <div class="empty-state compact">
        <div class="empty-icon">?</div>
        <h4>User not found</h4>
        <p>
          No FriendZone account was found with
          this Friend ID.
        </p>
      </div>
    `;

    result.classList.remove("hidden");

    return;
  }

  result.innerHTML = `
    <div class="search-user-result">

      <div class="friend-avatar">
        ${escapeHTML(initials(user.name))}
      </div>

      <div class="search-user-info">
        <strong>
          ${escapeHTML(user.name)}
        </strong>

        <span>
          Friend ID: ${escapeHTML(user.friend_id)}
        </span>
      </div>

      <button
        class="primary-btn"
        id="sendSearchRequestBtn"
        type="button"
      >
        Add Friend
      </button>

    </div>
  `;

  result.classList.remove("hidden");

  byId("sendSearchRequestBtn")
    ?.addEventListener("click", () => {
      sendFriendRequest(user.id);
    });
}


/* =========================================================
   CHECK EXISTING RELATIONSHIP
========================================================= */

async function getFriendshipStatus(otherUserID) {
  if (!currentUser || !otherUserID) {
    return null;
  }

  try {
    const {
      data: friendship
    } = await supabaseClient
      .from("friendships")
      .select("id")
      .eq("user_id", currentUser.id)
      .eq("friend_id", otherUserID)
      .maybeSingle();

    if (friendship) {
      return {
        type: "friend",
        record: friendship
      };
    }

    const {
      data: outgoing
    } = await supabaseClient
      .from("friend_requests")
      .select("id,status")
      .eq("sender_id", currentUser.id)
      .eq("receiver_id", otherUserID)
      .eq("status", "pending")
      .maybeSingle();

    if (outgoing) {
      return {
        type: "outgoing",
        record: outgoing
      };
    }

    const {
      data: incoming
    } = await supabaseClient
      .from("friend_requests")
      .select("id,status")
      .eq("sender_id", otherUserID)
      .eq("receiver_id", currentUser.id)
      .eq("status", "pending")
      .maybeSingle();

    if (incoming) {
      return {
        type: "incoming",
        record: incoming
      };
    }

    return null;

  } catch (error) {
    console.error(error);

    return null;
  }
}


/* =========================================================
   SEND FRIEND REQUEST
========================================================= */

async function sendFriendRequest(receiverID) {
  if (!currentUser) {
    return;
  }

  if (receiverID === currentUser.id) {
    showToast(
      "You cannot send a request to yourself.",
      "warning"
    );

    return;
  }

  try {
    const relationship =
      await getFriendshipStatus(receiverID);

    if (relationship?.type === "friend") {
      showToast(
        "You are already friends.",
        "info"
      );

      return;
    }

    if (relationship?.type === "outgoing") {
      showToast(
        "Friend request already sent.",
        "info"
      );

      return;
    }

    if (relationship?.type === "incoming") {
      showToast(
        "This person has already sent you a request.",
        "info"
      );

      return;
    }

    const {
      error
    } = await supabaseClient
      .from("friend_requests")
      .insert({
        sender_id: currentUser.id,
        receiver_id: receiverID,
        status: "pending"
      });

    if (error) {
      throw error;
    }

    showToast(
      "Friend request sent successfully.",
      "success"
    );

    await loadFriendRequests();

    updateRequestCounts();

  } catch (error) {
    console.error(
      "Send request error:",
      error
    );

    showToast(
      error.message ||
      "Unable to send friend request.",
      "error"
    );
  }
}


/* =========================================================
   LOAD FRIEND REQUESTS
========================================================= */

async function loadFriendRequests() {
  if (!currentUser) {
    return;
  }

  try {
    const {
      data: incoming,
      error: incomingError
    } = await supabaseClient
      .from("friend_requests")
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        sender:profiles!friend_requests_sender_id_fkey(
          id,
          name,
          friend_id,
          avatar_url
        )
      `)
      .eq("receiver_id", currentUser.id)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false
      });

    if (incomingError) {
      throw incomingError;
    }

    const {
      data: outgoing,
      error: outgoingError
    } = await supabaseClient
      .from("friend_requests")
      .select(`
        id,
        sender_id,
        receiver_id,
        status,
        created_at,
        receiver:profiles!friend_requests_receiver_id_fkey(
          id,
          name,
          friend_id,
          avatar_url
        )
      `)
      .eq("sender_id", currentUser.id)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false
      });

    if (outgoingError) {
      throw outgoingError;
    }

    allIncomingRequests = incoming || [];
    allOutgoingRequests = outgoing || [];

    renderIncomingRequests();
    renderOutgoingRequests();

    updateRequestCounts();

  } catch (error) {
    console.error(
      "Request loading error:",
      error
    );

    /*
      If your generated foreign-key names differ,
      the fallback loader below still attempts to
      retrieve the requests.
    */

    await loadRequestsFallback();
  }
}


/* =========================================================
   REQUEST FALLBACK
========================================================= */

async function loadRequestsFallback() {
  try {
    const {
      data: incoming,
      error: incomingError
    } = await supabaseClient
      .from("friend_requests")
      .select("*")
      .eq("receiver_id", currentUser.id)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false
      });

    if (incomingError) {
      throw incomingError;
    }

    const {
      data: outgoing,
      error: outgoingError
    } = await supabaseClient
      .from("friend_requests")
      .select("*")
      .eq("sender_id", currentUser.id)
      .eq("status", "pending")
      .order("created_at", {
        ascending: false
      });

    if (outgoingError) {
      throw outgoingError;
    }

    allIncomingRequests = [];

    for (const request of incoming || []) {
      const {
        data: profile
      } = await supabaseClient
        .from("profiles")
        .select("id,name,friend_id,avatar_url")
        .eq("id", request.sender_id)
        .maybeSingle();

      allIncomingRequests.push({
        ...request,
        sender: profile
      });
    }

    allOutgoingRequests = [];

    for (const request of outgoing || []) {
      const {
        data: profile
      } = await supabaseClient
        .from("profiles")
        .select("id,name,friend_id,avatar_url")
        .eq("id", request.receiver_id)
        .maybeSingle();

      allOutgoingRequests.push({
        ...request,
        receiver: profile
      });
    }

    renderIncomingRequests();
    renderOutgoingRequests();

    updateRequestCounts();

  } catch (error) {
    console.error(error);
  }
}


/* =========================================================
   ACCEPT FRIEND REQUEST
========================================================= */

async function acceptFriendRequest(requestID) {
  if (!currentUser) {
    return;
  }

  try {
    const {
      data: request,
      error: requestError
    } = await supabaseClient
      .from("friend_requests")
      .select("*")
      .eq("id", requestID)
      .eq("receiver_id", currentUser.id)
      .eq("status", "pending")
      .single();

    if (requestError) {
      throw requestError;
    }

    /*
      Update request first.
    */

    const {
      error: updateError
    } = await supabaseClient
      .from("friend_requests")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString()
      })
      .eq("id", requestID);

    if (updateError) {
      throw updateError;
    }

    /*
      Friendships are stored in both directions.
    */

    const {
      error: friendshipError
    } = await supabaseClient
      .from("friendships")
      .insert([
        {
          user_id: currentUser.id,
          friend_id: request.sender_id
        },
        {
          user_id: request.sender_id,
          friend_id: currentUser.id
        }
      ]);

    if (friendshipError) {
      /*
        If duplicate rows already exist,
        don't make the UI fail unnecessarily.
      */

      if (!String(friendshipError.message)
        .toLowerCase()
        .includes("duplicate")) {
        throw friendshipError;
      }
    }

    showToast(
      "Friend request accepted!",
      "success"
    );

    await Promise.all([
      loadFriends(),
      loadFriendRequests()
    ]);

    updateUI();

  } catch (error) {
    console.error(
      "Accept request error:",
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
   REJECT FRIEND REQUEST
========================================================= */

async function rejectFriendRequest(requestID) {
  try {
    const {
      error
    } = await supabaseClient
      .from("friend_requests")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString()
      })
      .eq("id", requestID)
      .eq("receiver_id", currentUser.id)
      .eq("status", "pending");

    if (error) {
      throw error;
    }

    showToast(
      "Friend request rejected.",
      "success"
    );

    await loadFriendRequests();

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
   CANCEL OUTGOING REQUEST
========================================================= */

async function cancelFriendRequest(requestID) {
  try {
    const {
      error
    } = await supabaseClient
      .from("friend_requests")
      .delete()
      .eq("id", requestID)
      .eq("sender_id", currentUser.id)
      .eq("status", "pending");

    if (error) {
      throw error;
    }

    showToast(
      "Friend request cancelled.",
      "success"
    );

    await loadFriendRequests();

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
   LOAD FRIENDS
========================================================= */

async function loadFriends() {
  if (!currentUser) {
    return;
  }

  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("friendships")
      .select(`
        id,
        user_id,
        friend_id,
        created_at,
        friend:profiles!friendships_friend_id_fkey(
          id,
          name,
          friend_id,
          avatar_url,
          xp,
          level,
          streak
        )
      `)
      .eq("user_id", currentUser.id)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    allFriends = data || [];

    renderFriends();
    renderFriendsPreview();

  } catch (error) {
    console.error(
      "Friends loading error:",
      error
    );

    await loadFriendsFallback();
  }
}


/* =========================================================
   FRIENDS FALLBACK
========================================================= */

async function loadFriendsFallback() {
  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("friendships")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    allFriends = [];

    for (const friendship of data || []) {
      const {
        data: profile
      } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", friendship.friend_id)
        .maybeSingle();

      allFriends.push({
        ...friendship,
        friend: profile
      });
    }

    renderFriends();
    renderFriendsPreview();

  } catch (error) {
    console.error(error);
  }
}


/* =========================================================
   REMOVE FRIEND
========================================================= */

async function removeFriend(friendID) {
  if (!currentUser || !friendID) {
    return;
  }

  const confirmed =
    confirm(
      "Are you sure you want to remove this friend?"
    );

  if (!confirmed) {
    return;
  }

  try {
    /*
      Remove both directions.
    */

    const {
      error: firstError
    } = await supabaseClient
      .from("friendships")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("friend_id", friendID);

    if (firstError) {
      throw firstError;
    }

    const {
      error: secondError
    } = await supabaseClient
      .from("friendships")
      .delete()
      .eq("user_id", friendID)
      .eq("friend_id", currentUser.id);

    if (secondError) {
      throw secondError;
    }

    /*
      Also remove Best Friend relation
      in both directions.
    */

    await supabaseClient
      .from("best_friends")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("friend_id", friendID);

    await supabaseClient
      .from("best_friends")
      .delete()
      .eq("user_id", friendID)
      .eq("friend_id", currentUser.id);

    showToast(
      "Friend removed.",
      "success"
    );

    await Promise.all([
      loadFriends(),
      loadBestFriends()
    ]);

    updateUI();

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
   BEST FRIENDS
========================================================= */

async function loadBestFriends() {
  if (!currentUser) {
    return;
  }

  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("best_friends")
      .select(`
        id,
        user_id,
        friend_id,
        created_at,
        friend:profiles!best_friends_friend_id_fkey(
          id,
          name,
          friend_id,
          avatar_url
        )
      `)
      .eq("user_id", currentUser.id)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    allBestFriends = data || [];

    renderBestFriends();

  } catch (error) {
    console.error(
      "Best friends loading error:",
      error
    );

    await loadBestFriendsFallback();
  }
}


/* =========================================================
   BEST FRIEND FALLBACK
========================================================= */

async function loadBestFriendsFallback() {
  try {
    const {
      data,
      error
    } = await supabaseClient
      .from("best_friends")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    allBestFriends = [];

    for (const item of data || []) {
      const {
        data: profile
      } = await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", item.friend_id)
        .maybeSingle();

      allBestFriends.push({
        ...item,
        friend: profile
      });
    }

    renderBestFriends();

  } catch (error) {
    console.error(error);
  }
}


/* =========================================================
   ADD BEST FRIEND
========================================================= */

async function addBestFriend(friendID) {
  if (!currentUser) {
    return;
  }

  if (!allFriends.some(
    item => item.friend_id === friendID
  )) {
    showToast(
      "You can only add an existing friend as a Best Friend.",
      "warning"
    );

    return;
  }

  if (allBestFriends.some(
    item => item.friend_id === friendID
  )) {
    showToast(
      "This person is already a Best Friend.",
      "info"
    );

    return;
  }

  try {
    const {
      error
    } = await supabaseClient
      .from("best_friends")
      .insert({
        user_id: currentUser.id,
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

    renderFriends();

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
  try {
    const {
      error
    } = await supabaseClient
      .from("best_friends")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("friend_id", friendID);

    if (error) {
      throw error;
    }

    showToast(
      "Removed from Best Friends.",
      "success"
    );

    await loadBestFriends();

    renderFriends();

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
   FRIEND CARD
========================================================= */

function createFriendCard(item, best = false) {
  const friend = item.friend;

  if (!friend) {
    return "";
  }

  const isBest =
    allBestFriends.some(
      bestFriend =>
        bestFriend.friend_id === friend.id
    );

  return `
    <div
      class="friend-card"
      data-friend-name="${escapeHTML(friend.name)}"
      data-friend-id="${escapeHTML(friend.friend_id)}"
    >

      ${isBest || best ? `
        <div class="best-mark" title="Best Friend">
          ★
        </div>
      ` : ""}

      <div class="friend-card-top">

        <div class="friend-avatar">
          ${escapeHTML(initials(friend.name))}
        </div>

        <div class="friend-card-info">

          <h4>
            ${escapeHTML(friend.name)}
          </h4>

          <p>
            <span class="status-dot"></span>
            Friend
          </p>

        </div>

      </div>

      <div class="friend-card-id">
        ID: ${escapeHTML(friend.friend_id || "N/A")}
      </div>

      <div class="friend-card-actions">

        <button
          class="small-action-btn"
          type="button"
          data-action="remove-friend"
          data-user-id="${escapeHTML(friend.id)}"
        >
          Remove
        </button>

        ${
          !isBest && !best
          ? `
            <button
              class="small-action-btn primary"
              type="button"
              data-action="best-friend"
              data-user-id="${escapeHTML(friend.id)}"
            >
              ★ Best
            </button>
          `
          : `
            <button
              class="small-action-btn primary"
              type="button"
              data-action="remove-best"
              data-user-id="${escapeHTML(friend.id)}"
            >
              ★ Best
            </button>
          `
        }

      </div>

    </div>
  `;
}


/* =========================================================
   RENDER FRIENDS
========================================================= */

function renderFriends() {
  const container =
    byId("friendsGrid") ||
    $(".friends-grid");

  if (!container) {
    return;
  }

  if (!allFriends.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">♧</div>
        <h3>No friends yet</h3>
        <p>
          Start by using a Friend ID to send
          your first friend request.
        </p>

        <button
          class="primary-btn"
          type="button"
          data-page="add-friend"
        >
          Add Your First Friend
        </button>
      </div>
    `;

    return;
  }

  container.innerHTML =
    allFriends
      .map(item => createFriendCard(item))
      .join("");
}


/* =========================================================
   RENDER FRIEND PREVIEW
========================================================= */

function renderFriendsPreview() {
  const container =
    byId("friendsPreviewGrid") ||
    $(".friends-preview-grid");

  if (!container) {
    return;
  }

  if (!allFriends.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <div class="empty-icon">♧</div>
        <h4>No friends yet</h4>
        <p>
          Add people using their Friend ID.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    allFriends
      .slice(0, 6)
      .map(item => createFriendCard(item))
      .join("");
}


/* =========================================================
   RENDER BEST FRIENDS
========================================================= */

function renderBestFriends() {
  const container =
    byId("bestFriendsGrid") ||
    $(".best-friends-grid");

  if (!container) {
    return;
  }

  if (!allBestFriends.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">★</div>
        <h3>No Best Friends yet</h3>
        <p>
          Best Friends are optional. Add your
          closest friends whenever you want.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    allBestFriends
      .map(item =>
        createFriendCard(item, true)
      )
      .join("");
}


/* =========================================================
   REQUEST CARD
========================================================= */

function requestUserCard(
  user,
  request,
  incoming = true
) {
  if (!user) {
    return "";
  }

  return `
    <div class="request-card">

      <div class="request-user">

        <div class="friend-avatar">
          ${escapeHTML(initials(user.name))}
        </div>

        <div class="request-user-info">

          <strong>
            ${escapeHTML(user.name)}
          </strong>

          <span>
            Friend ID:
            ${escapeHTML(user.friend_id || "N/A")}
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
              data-request-id="${escapeHTML(request.id)}"
            >
              Accept
            </button>

            <button
              class="secondary-btn"
              type="button"
              data-action="reject-request"
              data-request-id="${escapeHTML(request.id)}"
            >
              Reject
            </button>
          `
          : `
            <button
              class="secondary-btn"
              type="button"
              data-action="cancel-request"
              data-request-id="${escapeHTML(request.id)}"
            >
              Cancel Request
            </button>
          `
        }

      </div>

    </div>
  `;
}


/* =========================================================
   RENDER INCOMING
========================================================= */

function renderIncomingRequests() {
  const container =
    byId("incomingRequests") ||
    $(".incoming-requests");

  if (!container) {
    return;
  }

  if (!allIncomingRequests.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <div class="empty-icon">✓</div>
        <h4>No incoming requests</h4>
        <p>
          You don't have any pending friend
          requests right now.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    allIncomingRequests
      .map(request =>
        requestUserCard(
          request.sender,
          request,
          true
        )
      )
      .join("");
}


/* =========================================================
   RENDER OUTGOING
========================================================= */

function renderOutgoingRequests() {
  const container =
    byId("outgoingRequests") ||
    $(".outgoing-requests");

  if (!container) {
    return;
  }

  if (!allOutgoingRequests.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <div class="empty-icon">→</div>
        <h4>No sent requests</h4>
        <p>
          Friend requests you send will appear here.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML =
    allOutgoingRequests
      .map(request =>
        requestUserCard(
          request.receiver,
          request,
          false
        )
      )
      .join("");
}


/* =========================================================
   REQUEST COUNTS
========================================================= */

function updateRequestCounts() {
  const incomingCount =
    allIncomingRequests.length;

  const outgoingCount =
    allOutgoingRequests.length;

  const total =
    incomingCount + outgoingCount;

  const elements = [
    ["incomingCount", incomingCount],
    ["outgoingCount", outgoingCount],
    ["requestCount", total],
    ["requestBadge", incomingCount]
  ];

  elements.forEach(([id, value]) => {
    const element = byId(id);

    if (element) {
      element.textContent = value;
    }
  });
}


/* =========================================================
   UPDATE ALL UI
========================================================= */

function updateUI() {
  if (!currentProfile) {
    return;
  }

  const name =
    currentProfile.name ||
    "FriendZone User";

  const friendID =
    currentProfile.friend_id ||
    "------";

  const friendsCount =
    allFriends.length;

  const bestCount =
    allBestFriends.length;

  const pendingCount =
    allIncomingRequests.length;

  const avatar =
    initials(name);


  /* User names */

  $$(
    "[data-user-name], .user-name, #userName, #sidebarUserName, #headerUserName"
  ).forEach(element => {
    element.textContent = name;
  });


  /* Friend ID */

  $$(
    "[data-friend-id], .friend-id-value, #friendIDDisplay, #myFriendID"
  ).forEach(element => {
    element.textContent = friendID;
  });


  /* Avatar */

  $$(
    "[data-user-avatar], .user-avatar, #userAvatar, #headerAvatar, #sidebarAvatar"
  ).forEach(element => {
    element.textContent = avatar;
  });


  /* Counts */

  $$(
    "#friendsCount, #homeFriendsCount"
  ).forEach(element => {
    element.textContent = friendsCount;
  });


  $$(
    "#bestFriendsCount, #homeBestFriendsCount"
  ).forEach(element => {
    element.textContent = bestCount;
  });


  $$(
    "#pendingRequestsCount, #homeRequestsCount"
  ).forEach(element => {
    element.textContent = pendingCount;
  });


  /* Profile inputs */

  const nameInput =
    byId("profileNameInput");

  if (nameInput) {
    nameInput.value = name;
  }

  const avatarInput =
    byId("profileAvatarInput");

  if (
    avatarInput &&
    currentProfile.avatar_url
  ) {
    avatarInput.value =
      currentProfile.avatar_url;
  }
}


/* =========================================================
   PAGE NAVIGATION
========================================================= */

function showPage(pageName) {
  if (!pageName) {
    return;
  }

  const pages =
    $$(".page");

  pages.forEach(page => {
    page.classList.remove(
      "active-page"
    );
  });

  const target =
    byId(`page-${pageName}`) ||
    byId(pageName);

  if (target) {
    target.classList.add(
      "active-page"
    );
  }

  $$(".nav-item").forEach(item => {
    item.classList.remove("active");

    if (
      item.dataset.page === pageName
    ) {
      item.classList.add("active");
    }
  });

  updatePageHeader(pageName);

  closeSidebar();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   PAGE HEADER
========================================================= */

function updatePageHeader(pageName) {
  const titles = {
    home: [
      "Home",
      "Your FriendZone dashboard"
    ],

    friends: [
      "Friends",
      "Manage your friends"
    ],

    "add-friend": [
      "Add Friend",
      "Connect using a Friend ID"
    ],

    requests: [
      "Friend Requests",
      "Manage your incoming and sent requests"
    ],

    "best-friends": [
      "Best Friends",
      "Your optional closest-friend list"
    ],

    profile: [
      "Profile",
      "Manage your FriendZone account"
    ]
  };

  const info =
    titles[pageName];

  if (!info) {
    return;
  }

  const title =
    byId("pageTitle");

  const subtitle =
    byId("pageSubtitle");

  if (title) {
    title.textContent = info[0];
  }

  if (subtitle) {
    subtitle.textContent = info[1];
  }
}


/* =========================================================
   SIDEBAR
========================================================= */

function openSidebar() {
  const sidebar =
    byId("sidebar") ||
    $(".sidebar");

  const overlay =
    byId("sidebarOverlay") ||
    $(".sidebar-overlay");

  sidebar?.classList.add("open");
  overlay?.classList.add("show");
}


function closeSidebar() {
  const sidebar =
    byId("sidebar") ||
    $(".sidebar");

  const overlay =
    byId("sidebarOverlay") ||
    $(".sidebar-overlay");

  sidebar?.classList.remove("open");
  overlay?.classList.remove("show");
}


/* =========================================================
   BUTTON LOADING
========================================================= */

function setButtonLoading(
  button,
  loading
) {
  if (!button) {
    return;
  }

  if (loading) {
    button.disabled = true;
    button.classList.add("btn-loading");
  } else {
    button.disabled = false;
    button.classList.remove("btn-loading");
  }
}


/* =========================================================
   PASSWORD VISIBILITY
========================================================= */

function togglePassword(inputID, button) {
  const input =
    byId(inputID);

  if (!input) {
    return;
  }

  if (input.type === "password") {
    input.type = "text";

    if (button) {
      button.textContent = "◉";
    }

  } else {
    input.type = "password";

    if (button) {
      button.textContent = "○";
    }
  }
}


/* =========================================================
   SEARCH FRIENDS
========================================================= */

function filterFriends(searchValue) {
  const value =
    String(searchValue || "")
      .trim()
      .toLowerCase();

  const cards =
    $$(".friend-card");

  cards.forEach(card => {
    const name =
      card.dataset.friendName
        ?.toLowerCase() || "";

    const id =
      card.dataset.friendId
        ?.toLowerCase() || "";

    const visible =
      !value ||
      name.includes(value) ||
      id.includes(value);

    card.style.display =
      visible ? "" : "block";

    if (!visible) {
      card.style.display = "none";
    }
  });
}


/* =========================================================
   EVENT DELEGATION
========================================================= */

document.addEventListener(
  "click",
  async event => {

    const nav =
      event.target.closest(
        "[data-page]"
      );

    if (
      nav &&
      nav.dataset.page
    ) {
      showPage(nav.dataset.page);

      return;
    }


    const action =
      event.target.closest(
        "[data-action]"
      );

    if (!action) {
      return;
    }

    const type =
      action.dataset.action;


    /* Friend actions */

    if (type === "remove-friend") {
      await removeFriend(
        action.dataset.userId
      );

      return;
    }


    if (type === "best-friend") {
      await addBestFriend(
        action.dataset.userId
      );

      return;
    }


    if (type === "remove-best") {
      await removeBestFriend(
        action.dataset.userId
      );

      return;
    }


    /* Requests */

    if (type === "accept-request") {
      await acceptFriendRequest(
        action.dataset.requestId
      );

      return;
    }


    if (type === "reject-request") {
      await rejectFriendRequest(
        action.dataset.requestId
      );

      return;
    }


    if (type === "cancel-request") {
      await cancelFriendRequest(
        action.dataset.requestId
      );

      return;
    }
  }
);


/* =========================================================
   AUTH EVENT SETUP
========================================================= */

function setupAuthEvents() {

  byId("loginForm")
    ?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        login();
      }
    );


  byId("signupForm")
    ?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        signUp();
      }
    );


  byId("loginTab")
    ?.addEventListener(
      "click",
      () => switchAuthMode("login")
    );


  byId("signupTab")
    ?.addEventListener(
      "click",
      () => switchAuthMode("signup")
    );


  byId("loginBtn")
    ?.addEventListener(
      "click",
      login
    );


  byId("signupBtn")
    ?.addEventListener(
      "click",
      signUp
    );


  byId("logoutBtn")
    ?.addEventListener(
      "click",
      logout
    );


  byId("logoutSidebarBtn")
    ?.addEventListener(
      "click",
      logout
    );


  byId("searchFriendBtn")
    ?.addEventListener(
      "click",
      searchFriendID
    );


  byId("saveProfileBtn")
    ?.addEventListener(
      "click",
      updateProfile
    );


  byId("copyFriendID")
    ?.addEventListener(
      "click",
      copyFriendID
    );


  byId("menuBtn")
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


  byId("friendsSearch")
    ?.addEventListener(
      "input",
      event =>
        filterFriends(
          event.target.value
        )
    );


  byId("friendIDInput")
    ?.addEventListener(
      "keydown",
      event => {
        if (event.key === "Enter") {
          event.preventDefault();
          searchFriendID();
        }
      }
    );
}


/* =========================================================
   REQUEST TABS
========================================================= */

function setupRequestTabs() {
  $$(".request-tab").forEach(tab => {

    tab.addEventListener(
      "click",
      () => {

        const target =
          tab.dataset.tab;

        if (!target) {
          return;
        }

        $$(".request-tab")
          .forEach(item => {
            item.classList.remove(
              "active"
            );
          });

        $$(".request-tab-content")
          .forEach(content => {
            content.classList.remove(
              "active"
            );
          });

        tab.classList.add("active");

        const content =
          byId(`${target}Requests`) ||
          $(`.${target}-requests`);

        content?.classList.add("active");

        currentRequestTab = target;
      }
    );
  });
}


/* =========================================================
   PROFILE AUTH STATE
========================================================= */

async function initializeAuth() {

  const {
    data,
    error
  } = await supabaseClient.auth.getSession();

  if (error) {
    console.error(
      "Session error:",
      error
    );
  }

  if (data?.session?.user) {

    await loadApplication(
      data.session.user
    );

  } else {

    showAuthScreen();

    hideLoader();
  }


  supabaseClient.auth.onAuthStateChange(
    async (
      event,
      session
    ) => {

      if (
        session?.user &&
        event !== "INITIAL_SESSION"
      ) {

        currentUser =
          session.user;

        await loadApplication(
          session.user
        );

      } else if (
        !session?.user &&
        event !== "INITIAL_SESSION"
      ) {

        currentUser = null;
        currentProfile = null;

        showAuthScreen();
      }
    }
  );
}


/* =========================================================
   REALTIME
========================================================= */

function setupRealtime() {

  if (!currentUser) {
    return;
  }

  /*
    Friend requests realtime.
  */

  supabaseClient
    .channel(
      `friendzone-requests-${currentUser.id}`
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

        await loadFriendRequests();

        updateRequestCounts();
      }
    )
    .subscribe();


  /*
    Friendships realtime.
  */

  supabaseClient
    .channel(
      `friendzone-friends-${currentUser.id}`
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

        updateUI();
      }
    )
    .subscribe();


  /*
    Best Friends realtime.
  */

  supabaseClient
    .channel(
      `friendzone-best-${currentUser.id}`
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

        updateUI();
      }
    )
    .subscribe();
}


/* =========================================================
   PROFILE DATA SYNC
========================================================= */

async function refreshEverything() {
  if (!currentUser) {
    return;
  }

  await Promise.all([
    loadProfile(),
    loadFriends(),
    loadFriendRequests(),
    loadBestFriends()
  ]);

  updateUI();
}


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (event.key === "Escape") {
      closeSidebar();

      $$(".modal").forEach(modal => {
        modal.classList.add("hidden");
      });
    }
  }
);


/* =========================================================
   GLOBAL FUNCTIONS
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

  searchFriendID,

  copyFriendID,

  updateProfile,

  refreshEverything,

  getFriendID,

  showToast
};


/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  async () => {

    setupAuthEvents();

    setupRequestTabs();

    await initializeAuth();

    /*
      Realtime is initialized after the user
      has been authenticated.
    */

    if (currentUser) {
      setupRealtime();
    }
  }
);


/* =========================================================
   GLOBAL ERROR HANDLING
========================================================= */

window.addEventListener(
  "unhandledrejection",
  event => {

    console.error(
      "Unhandled Promise:",
      event.reason
    );
  }
);


/* =========================================================
   END FRIENDZONE SCRIPT
========================================================= */
