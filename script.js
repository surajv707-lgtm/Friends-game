/* =========================================================
   FRIENDZONE
   MAIN JAVASCRIPT
   SUPABASE + AUTH + FRIEND SYSTEM
   LOADING PAGE REMOVED
========================================================= */


/* =========================================================
   SUPABASE CONFIG
========================================================= */

const SUPABASE_URL =
  "https://hjdevuoxuoyenzmawwnb.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IkFub24iLCJpYXQiOjE3ODg3ODgzNjYsImV4cCI6MjEwNDM2NDM2Nn0.-ER4x0hqUYss521B_FWAHnfWjtxg9YJIaWNXjQJPPhI";

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

let currentRequestTab = "received";


/* =========================================================
   DOM HELPERS
========================================================= */

const $ = (selector) =>
  document.querySelector(selector);

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
  const cleanName = String(name).trim();

  if (!cleanName) {
    return "U";
  }

  const parts = cleanName.split(/\s+/);

  if (parts.length === 1) {
    return parts[0]
      .substring(0, 2)
      .toUpperCase();
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
   AUTH SCREEN
========================================================= */

function showAuthScreen() {
  const auth =
    byId("authScreen");

  const app =
    byId("mainApp");

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
    byId("authScreen");

  const app =
    byId("mainApp");

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
  const loginPanel =
    byId("loginPanel");

  const signupPanel =
    byId("signupPanel");

  if (mode === "signup") {
    loginPanel?.classList.add("hidden");
    signupPanel?.classList.remove("hidden");
    return;
  }

  signupPanel?.classList.add("hidden");
  loginPanel?.classList.remove("hidden");
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

  const username =
    byId("signupUsername")?.value.trim();

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
    } =
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

    if (data?.session) {
      showToast(
        "Your FriendZone account has been created.",
        "success"
      );

      await loadApplication(data.user);

    } else {
      showToast(
        "Account created. Please verify your email if verification is enabled.",
        "success"
      );

      switchAuthMode("login");
    }

  } catch (error) {
    console.error(
      "Signup error:",
      error
    );

    showToast(
      error.message ||
      "Unable to create account.",
      "error"
    );

  } finally {
    setButtonLoading(button, false);
  }
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
    } =
      await supabaseClient.auth
        .signInWithPassword({
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
    console.error(
      "Login error:",
      error
    );

    showToast(
      error.message ||
      "Login failed.",
      "error"
    );

  } finally {
    setButtonLoading(button, false);
  }
}


/* =========================================================
   LOGOUT
========================================================= */

async function logout() {
  try {
    const {
      error
    } =
      await supabaseClient.auth.signOut();

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
      error.message ||
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

  try {
    await loadProfile();

    await Promise.allSettled([
      loadFriends(),
      loadFriendRequests(),
      loadBestFriends()
    ]);

    updateUI();

  } catch (error) {
    console.error(
      "Application loading error:",
      error
    );
  }
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
    } =
      await supabaseClient
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

    const metadata =
      currentUser.user_metadata || {};

    currentProfile = {
      id: currentUser.id,
      name:
        metadata.name ||
        currentUser.email?.split("@")[0] ||
        "FriendZone User",
      friend_id: null,
      avatar_url: null
    };
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
    } =
      await supabaseClient
        .from("profiles")
        .insert({
          id: currentUser.id,
          name
        })
        .select("*")
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
    byId("profileNameInput")
      ?.value.trim();

  const username =
    byId("profileUsernameInput")
      ?.value.trim();

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
      error: profileError
    } =
      await supabaseClient
        .from("profiles")
        .update({
          name,
          updated_at:
            new Date().toISOString()
        })
        .eq("id", currentUser.id);

    if (profileError) {
      throw profileError;
    }

    await supabaseClient.auth.updateUser({
      data: {
        name,
        username
      }
    });

    await loadProfile();

    updateUI();

    showToast(
      "Profile updated successfully.",
      "success"
    );

  } catch (error) {
    console.error(error);

    showToast(
      error.message ||
      "Could not update profile.",
      "error"
    );

  } finally {
    setButtonLoading(button, false);
  }
}


/* =========================================================
   FRIEND ID
========================================================= */

function getFriendID() {
  return (
    currentProfile?.friend_id ||
    "------"
  );
}


async function copyFriendID() {
  const id =
    getFriendID();

  if (
    !id ||
    id === "------"
  ) {
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
  const id =
    String(friendID || "")
      .trim()
      .toUpperCase();

  if (!id) {
    return null;
  }

  try {
    const {
      data,
      error
    } =
      await supabaseClient
        .from("profiles")
        .select("*")
        .eq("friend_id", id)
        .maybeSingle();

    if (error) {
      throw error;
    }

    return data;

  } catch (error) {
    console.error(
      "Friend ID search error:",
      error
    );

    return null;
  }
}


/* =========================================================
   SEARCH FRIEND ID
========================================================= */

async function searchFriendID() {
  const input =
    byId("friendIdInput");

  if (!input) {
    return;
  }

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

  if (
    friendID === getFriendID()
  ) {
    showToast(
      "You cannot add yourself.",
      "warning"
    );
    return;
  }

  const result =
    byId("friendSearchResult");

  const user =
    await findUserByFriendID(friendID);

  if (!result) {
    return;
  }

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
    await getFriendshipStatus(user.id);

  let buttonHTML = "";

  if (relationship?.type === "friend") {
    buttonHTML = `
      <button
        class="secondary-btn"
        type="button"
        disabled
      >
        Already Friends
      </button>
    `;
  } else if (
    relationship?.type === "outgoing"
  ) {
    buttonHTML = `
      <button
        class="secondary-btn"
        type="button"
        disabled
      >
        Request Sent
      </button>
    `;
  } else if (
    relationship?.type === "incoming"
  ) {
    buttonHTML = `
      <button
        class="secondary-btn"
        type="button"
        disabled
      >
        Request Received
      </button>
    `;
  } else {
    buttonHTML = `
      <button
        class="primary-btn"
        id="sendSearchRequestBtn"
        type="button"
      >
        Add Friend
      </button>
    `;
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

      ${buttonHTML}

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
   CHECK RELATIONSHIP
========================================================= */

async function getFriendshipStatus(otherUserID) {
  if (
    !currentUser ||
    !otherUserID
  ) {
    return null;
  }

  try {

    const {
      data: friendship
    } =
      await supabaseClient
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
    } =
      await supabaseClient
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
    } =
      await supabaseClient
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

  if (
    receiverID === currentUser.id
  ) {
    showToast(
      "You cannot send a request to yourself.",
      "warning"
    );
    return;
  }

  try {

    const relationship =
      await getFriendshipStatus(
        receiverID
      );

    if (
      relationship?.type === "friend"
    ) {
      showToast(
        "You are already friends.",
        "info"
      );
      return;
    }

    if (
      relationship?.type === "outgoing"
    ) {
      showToast(
        "Friend request already sent.",
        "info"
      );
      return;
    }

    if (
      relationship?.type === "incoming"
    ) {
      showToast(
        "This person has already sent you a request.",
        "info"
      );
      return;
    }

    const {
      error
    } =
      await supabaseClient
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
    } =
      await supabaseClient
        .from("friend_requests")
        .select("*")
        .eq(
          "receiver_id",
          currentUser.id
        )
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
    } =
      await supabaseClient
        .from("friend_requests")
        .select("*")
        .eq(
          "sender_id",
          currentUser.id
        )
        .eq("status", "pending")
        .order("created_at", {
          ascending: false
        });

    if (outgoingError) {
      throw outgoingError;
    }


    allIncomingRequests = [];

    for (
      const request of incoming || []
    ) {

      const {
        data: profile
      } =
        await supabaseClient
          .from("profiles")
          .select("*")
          .eq(
            "id",
            request.sender_id
          )
          .maybeSingle();

      allIncomingRequests.push({
        ...request,
        sender: profile
      });
    }


    allOutgoingRequests = [];

    for (
      const request of outgoing || []
    ) {

      const {
        data: profile
      } =
        await supabaseClient
          .from("profiles")
          .select("*")
          .eq(
            "id",
            request.receiver_id
          )
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

    console.error(
      "Request loading error:",
      error
    );
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
    } =
      await supabaseClient
        .from("friend_requests")
        .select("*")
        .eq("id", requestID)
        .eq(
          "receiver_id",
          currentUser.id
        )
        .eq("status", "pending")
        .single();

    if (requestError) {
      throw requestError;
    }


    const {
      error: updateError
    } =
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


    const {
      error: friendshipError
    } =
      await supabaseClient
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

    if (
      friendshipError &&
      !String(friendshipError.message)
        .toLowerCase()
        .includes("duplicate")
    ) {
      throw friendshipError;
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
  if (!currentUser) {
    return;
  }

  try {

    const {
      error
    } =
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
          currentUser.id
        )
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
   CANCEL FRIEND REQUEST
========================================================= */

async function cancelFriendRequest(requestID) {
  if (!currentUser) {
    return;
  }

  try {

    const {
      error
    } =
      await supabaseClient
        .from("friend_requests")
        .delete()
        .eq("id", requestID)
        .eq(
          "sender_id",
          currentUser.id
        )
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
    } =
      await supabaseClient
        .from("friendships")
        .select("*")
        .eq(
          "user_id",
          currentUser.id
        )
        .order("created_at", {
          ascending: false
        });

    if (error) {
      throw error;
    }

    allFriends = [];

    for (
      const friendship of data || []
    ) {

      const {
        data: profile
      } =
        await supabaseClient
          .from("profiles")
          .select("*")
          .eq(
            "id",
            friendship.friend_id
          )
          .maybeSingle();

      allFriends.push({
        ...friendship,
        friend: profile
      });
    }

    renderFriends();
    renderFriendsPreview();

  } catch (error) {

    console.error(
      "Friends loading error:",
      error
    );
  }
}


/* =========================================================
   REMOVE FRIEND
========================================================= */

async function removeFriend(friendID) {
  if (
    !currentUser ||
    !friendID
  ) {
    return;
  }

  const confirmed =
    window.confirm(
      "Are you sure you want to remove this friend?"
    );

  if (!confirmed) {
    return;
  }

  try {

    const {
      error: firstError
    } =
      await supabaseClient
        .from("friendships")
        .delete()
        .eq(
          "user_id",
          currentUser.id
        )
        .eq(
          "friend_id",
          friendID
        );

    if (firstError) {
      throw firstError;
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
        currentUser.id
      );


    await supabaseClient
      .from("best_friends")
      .delete()
      .eq(
        "user_id",
        currentUser.id
      )
      .eq(
        "friend_id",
        friendID
      );


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
   LOAD BEST FRIENDS
========================================================= */

async function loadBestFriends() {
  if (!currentUser) {
    return;
  }

  try {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("best_friends")
        .select("*")
        .eq(
          "user_id",
          currentUser.id
        )
        .order("created_at", {
          ascending: false
        });

    if (error) {
      throw error;
    }

    allBestFriends = [];

    for (
      const item of data || []
    ) {

      const {
        data: profile
      } =
        await supabaseClient
          .from("profiles")
          .select("*")
          .eq(
            "id",
            item.friend_id
          )
          .maybeSingle();

      allBestFriends.push({
        ...item,
        friend: profile
      });
    }

    renderBestFriends();

  } catch (error) {

    console.error(
      "Best friends loading error:",
      error
    );
  }
}


/* =========================================================
   ADD BEST FRIEND
========================================================= */

async function addBestFriend(friendID) {
  if (!currentUser) {
    return;
  }

  if (
    !allFriends.some(
      item =>
        item.friend_id === friendID
    )
  ) {
    showToast(
      "You can only add an existing friend as a Best Friend.",
      "warning"
    );
    return;
  }

  if (
    allBestFriends.some(
      item =>
        item.friend_id === friendID
    )
  ) {
    showToast(
      "This person is already a Best Friend.",
      "info"
    );
    return;
  }

  try {

    const {
      error
    } =
      await supabaseClient
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
  if (!currentUser) {
    return;
  }

  try {

    const {
      error
    } =
      await supabaseClient
        .from("best_friends")
        .delete()
        .eq(
          "user_id",
          currentUser.id
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

function createFriendCard(
  item,
  best = false
) {
  const friend =
    item.friend;

  if (!friend) {
    return "";
  }

  const isBest =
    allBestFriends.some(
      bestFriend =>
        bestFriend.friend_id ===
        friend.id
    );

  return `
    <div
      class="friend-card"
      data-friend-name="${escapeHTML(
        friend.name
      )}"
      data-friend-id="${escapeHTML(
        friend.friend_id
      )}"
    >

      ${
        isBest || best
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
          ${escapeHTML(
            initials(friend.name)
          )}
        </div>

        <div class="friend-card-info">

          <h4>
            ${escapeHTML(
              friend.name
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
          class="small-action-btn"
          type="button"
          data-action="remove-friend"
          data-user-id="${escapeHTML(
            friend.id
          )}"
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
                data-user-id="${escapeHTML(
                  friend.id
                )}"
              >
                ★ Best
              </button>
            `
            : `
              <button
                class="small-action-btn primary"
                type="button"
                data-action="remove-best"
                data-user-id="${escapeHTML(
                  friend.id
                )}"
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
    byId("friendsContainer");

  if (!container) {
    return;
  }

  if (!allFriends.length) {
    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          ♧
        </div>

        <h3>
          No friends yet
        </h3>

        <p>
          Start by using a Friend ID
          to send your first friend request.
        </p>

        <button
          class="primary-btn"
          type="button"
          data-page="addFriendPage"
        >
          Add Your First Friend
        </button>

      </div>
    `;

    return;
  }

  container.innerHTML =
    allFriends
      .map(item =>
        createFriendCard(item)
      )
      .join("");
}


/* =========================================================
   FRIEND PREVIEW
========================================================= */

function renderFriendsPreview() {
  const container =
    byId("recentFriendsContainer");

  if (!container) {
    return;
  }

  if (!allFriends.length) {
    container.innerHTML = `
      <div class="empty-state compact">

        <div class="empty-icon">
          ♧
        </div>

        <h4>
          No friends yet
        </h4>

        <p>
          Add people using their Friend ID.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML =
    allFriends
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

  if (!container) {
    return;
  }

  if (!allBestFriends.length) {
    container.innerHTML = `
      <div class="empty-state">

        <div class="empty-icon">
          ★
        </div>

        <h3>
          No Best Friends yet
        </h3>

        <p>
          Best Friends are optional.
          Add your closest friends whenever
          you want.
        </p>

      </div>
    `;

    return;
  }

  container.innerHTML =
    allBestFriends
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
          ${escapeHTML(
            initials(user.name)
          )}
        </div>

        <div class="request-user-info">

          <strong>
            ${escapeHTML(
              user.name
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

    </div>
  `;
}


/* =========================================================
   REQUEST RENDERING
========================================================= */

function renderIncomingRequests() {
  const container =
    byId("receivedRequestsContainer");

  if (!container) {
    return;
  }

  if (!allIncomingRequests.length) {
    container.innerHTML = `
      <div class="empty-state compact">

        <div class="empty-icon">
          ✓
        </div>

        <h4>
          No incoming requests
        </h4>

        <p>
          You don't have any pending
          friend requests right now.
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


function renderOutgoingRequests() {
  const container =
    byId("sentRequestsContainer");

  if (!container) {
    return;
  }

  if (!allOutgoingRequests.length) {
    container.innerHTML = `
      <div class="empty-state compact">

        <div class="empty-icon">
          →
        </div>

        <h4>
          No sent requests
        </h4>

        <p>
          Friend requests you send
          will appear here.
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
  const incoming =
    allIncomingRequests.length;

  const outgoing =
    allOutgoingRequests.length;

  const elements = [
    ["receivedCount", incoming],
    ["sentCount", outgoing],
    ["requestsBadge", incoming],
    ["headerRequestBadge", incoming],
    ["homeRequestsCount", incoming]
  ];

  elements.forEach(
    ([id, value]) => {
      const element =
        byId(id);

      if (element) {
        element.textContent =
          value;
      }
    }
  );

  const badge =
    byId("requestsBadge");

  if (badge) {
    badge.classList.toggle(
      "hidden",
      incoming === 0
    );
  }

  const headerBadge =
    byId("headerRequestBadge");

  if (headerBadge) {
    headerBadge.classList.toggle(
      "hidden",
      incoming === 0
    );
  }
}


/* =========================================================
   UPDATE UI
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

  const requestsCount =
    allIncomingRequests.length;

  const username =
    currentUser?.user_metadata?.username ||
    "";


  /* Sidebar */

  const sidebarName =
    byId("sidebarUserName");

  if (sidebarName) {
    sidebarName.textContent =
      name;
  }


  const sidebarID =
    byId("sidebarFriendId");

  if (sidebarID) {
    sidebarID.textContent =
      friendID;
  }


  const sidebarAvatar =
    byId("sidebarAvatar");

  if (sidebarAvatar) {
    sidebarAvatar.textContent =
      initials(name);
  }


  /* Home */

  byId("homeFriendsCount")
    ?.replaceChildren(
      document.createTextNode(
        friendsCount
      )
    );

  byId("homeRequestsCount")
    ?.replaceChildren(
      document.createTextNode(
        requestsCount
      )
    );

  byId("homeBestFriendsCount")
    ?.replaceChildren(
      document.createTextNode(
        bestCount
      )
    );

  const homeID =
    byId("homeFriendId");

  if (homeID) {
    homeID.textContent =
      friendID;
  }


  /* Profile */

  const profileName =
    byId("profileName");

  if (profileName) {
    profileName.textContent =
      name;
  }


  const profileUsername =
    byId("profileUsername");

  if (profileUsername) {
    profileUsername.textContent =
      username
        ? `@${username}`
        : "@friendzone";
  }


  const profileID =
    byId("profileFriendId");

  if (profileID) {
    profileID.textContent =
      friendID;
  }


  const profileAvatar =
    byId("profileAvatar");

  if (profileAvatar) {
    profileAvatar.textContent =
      initials(name);
  }


  /* Inputs */

  const nameInput =
    byId("profileNameInput");

  if (nameInput) {
    nameInput.value =
      name;
  }


  const usernameInput =
    byId("profileUsernameInput");

  if (
    usernameInput &&
    document.activeElement !== usernameInput
  ) {
    usernameInput.value =
      username;
  }


  /* General */

  $$(".user-name").forEach(
    element => {
      element.textContent =
        name;
    }
  );
}


/* =========================================================
   PAGE NAVIGATION
========================================================= */

function showPage(pageName) {
  if (!pageName) {
    return;
  }

  const page =
    byId(pageName);

  if (!page) {
    return;
  }

  $$(".page").forEach(
    item => {
      item.classList.remove(
        "active-page"
      );
    }
  );

  page.classList.add(
    "active-page"
  );


  $$(".nav-item").forEach(
    item => {
      item.classList.remove(
        "active"
      );

      if (
        item.dataset.page ===
        pageName
      ) {
        item.classList.add(
          "active"
        );
      }
    }
  );


  updatePageHeader(
    pageName
  );

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
    homePage: [
      "Home",
      "Your FriendZone dashboard"
    ],

    friendsPage: [
      "Friends",
      "Manage your friends"
    ],

    requestsPage: [
      "Friend Requests",
      "Manage your incoming and sent requests"
    ],

    bestFriendsPage: [
      "Best Friends",
      "Your optional closest-friend list"
    ],

    addFriendPage: [
      "Add Friend",
      "Connect using a Friend ID"
    ],

    profilePage: [
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
    byId("currentPageTitle");

  const subtitle =
    byId("currentPageSubtitle");

  if (title) {
    title.textContent =
      info[0];
  }

  if (subtitle) {
    subtitle.textContent =
      info[1];
  }
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
   BUTTON LOADING
========================================================= */

function setButtonLoading(
  button,
  loading
) {
  if (!button) {
    return;
  }

  button.disabled =
    loading;

  button.classList.toggle(
    "btn-loading",
    loading
  );
}


/* =========================================================
   PASSWORD VISIBILITY
========================================================= */

function togglePassword(
  inputID,
  button
) {
  const input =
    byId(inputID);

  if (!input) {
    return;
  }

  if (
    input.type ===
    "password"
  ) {
    input.type = "text";

    if (button) {
      button.textContent =
        "◉";
    }

  } else {
    input.type =
      "password";

    if (button) {
      button.textContent =
        "○";
    }
  }
}


/* =========================================================
   FRIEND SEARCH
========================================================= */

function filterFriends(
  searchValue
) {
  const value =
    String(searchValue || "")
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

      const visible =
        !value ||
        name.includes(value) ||
        id.includes(value);

      card.style.display =
        visible
          ? ""
          : "none";
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
        ".nav-item"
      );

    if (
      nav &&
      nav.dataset.page
    ) {
      showPage(
        nav.dataset.page
      );

      return;
    }


    const goPage =
      event.target.closest(
        "[data-go-page]"
      );

    if (
      goPage &&
      goPage.dataset.goPage
    ) {
      showPage(
        goPage.dataset.goPage
      );

      return;
    }


    const pageButton =
      event.target.closest(
        "[data-page]"
      );

    if (
      pageButton &&
      pageButton.dataset.page
    ) {
      showPage(
        pageButton.dataset.page
      );

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


    if (
      type ===
      "remove-friend"
    ) {
      await removeFriend(
        action.dataset.userId
      );
      return;
    }


    if (
      type ===
      "best-friend"
    ) {
      await addBestFriend(
        action.dataset.userId
      );
      return;
    }


    if (
      type ===
      "remove-best"
    ) {
      await removeBestFriend(
        action.dataset.userId
      );
      return;
    }


    if (
      type ===
      "accept-request"
    ) {
      await acceptFriendRequest(
        action.dataset.requestId
      );
      return;
    }


    if (
      type ===
      "reject-request"
    ) {
      await rejectFriendRequest(
        action.dataset.requestId
      );
      return;
    }


    if (
      type ===
      "cancel-request"
    ) {
      await cancelFriendRequest(
        action.dataset.requestId
      );
      return;
    }
  }
);


/* =========================================================
   AUTH EVENTS
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


  byId("showSignupBtn")
    ?.addEventListener(
      "click",
      () =>
        switchAuthMode(
          "signup"
        )
    );


  byId("showLoginBtn")
    ?.addEventListener(
      "click",
      () =>
        switchAuthMode(
          "login"
        )
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


  byId("headerRequestBtn")
    ?.addEventListener(
      "click",
      () =>
        showPage(
          "requestsPage"
        )
    );


  byId("headerProfileBtn")
    ?.addEventListener(
      "click",
      () =>
        showPage(
          "profilePage"
        )
    );


  byId("copyFriendIdBtn")
    ?.addEventListener(
      "click",
      copyFriendID
    );


  byId("addFriendForm")
    ?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        searchFriendID();
      }
    );


  byId("profileForm")
    ?.addEventListener(
      "submit",
      event => {
        event.preventDefault();
        updateProfile();
      }
    );


  byId("friendsSearch")
    ?.addEventListener(
      "input",
      event =>
        filterFriends(
          event.target.value
        )
    );


  $$(".password-toggle")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const target =
            button.dataset.target;

          togglePassword(
            target,
            button
          );
        }
      );

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

          if (!target) {
            return;
          }

          currentRequestTab =
            target;

          $$(".request-tab")
            .forEach(item => {
              item.classList.remove(
                "active"
              );
            });

          tab.classList.add(
            "active"
          );


          const received =
            byId(
              "receivedRequestsContainer"
            );

          const sent =
            byId(
              "sentRequestsContainer"
            );


          if (
            target ===
            "received"
          ) {
            received?.classList.remove(
              "hidden"
            );

            sent?.classList.add(
              "hidden"
            );

          } else {

            received?.classList.add(
              "hidden"
            );

            sent?.classList.remove(
              "hidden"
            );
          }
        }
      );

    });
}


/* =========================================================
   AUTH INITIALIZATION
========================================================= */

let authInitializing = true;


async function initializeAuth() {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.auth
        .getSession();

    if (error) {
      console.error(
        "Session error:",
        error
      );
    }


    if (
      data?.session?.user
    ) {

      await loadApplication(
        data.session.user
      );

    } else {

      showAuthScreen();

    }


  } catch (error) {

    console.error(
      "Authentication initialization error:",
      error
    );

    showAuthScreen();

  } finally {

    authInitializing =
      false;
  }


  supabaseClient.auth
    .onAuthStateChange(
      async (
        event,
        session
      ) => {

        if (
          authInitializing
        ) {
          return;
        }


        if (
          session?.user
        ) {

          await loadApplication(
            session.user
          );

        } else {

          currentUser =
            null;

          currentProfile =
            null;

          allFriends = [];
          allIncomingRequests = [];
          allOutgoingRequests = [];
          allBestFriends = [];

          showAuthScreen();
        }
      }
    );
}


/* =========================================================
   REALTIME
========================================================= */

let realtimeChannels = [];


function setupRealtime() {

  if (!currentUser) {
    return;
  }

  realtimeChannels.forEach(
    channel => {
      try {
        supabaseClient.removeChannel(
          channel
        );
      } catch {}
    }
  );

  realtimeChannels = [];


  try {

    const requestChannel =
      supabaseClient
        .channel(
          `friendzone-request-${currentUser.id}`
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

    realtimeChannels.push(
      requestChannel
    );

  } catch (error) {
    console.error(
      "Realtime request error:",
      error
    );
  }


  try {

    const friendChannel =
      supabaseClient
        .channel(
          `friendzone-friend-${currentUser.id}`
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

    realtimeChannels.push(
      friendChannel
    );

  } catch (error) {
    console.error(
      "Realtime friend error:",
      error
    );
  }


  try {

    const bestChannel =
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

    realtimeChannels.push(
      bestChannel
    );

  } catch (error) {
    console.error(
      "Realtime best-friend error:",
      error
    );
  }
}


/* =========================================================
   REFRESH EVERYTHING
========================================================= */

async function refreshEverything() {
  if (!currentUser) {
    return;
  }

  await Promise.allSettled([
    loadProfile(),
    loadFriends(),
    loadFriendRequests(),
    loadBestFriends()
  ]);

  updateUI();
}


/* =========================================================
   KEYBOARD
========================================================= */

document.addEventListener(
  "keydown",
  event => {

    if (
      event.key ===
      "Escape"
    ) {
      closeSidebar();

      $$(".modal")
        .forEach(modal => {
          modal.classList.add(
            "hidden"
          );
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
   END FRIENDZONE
========================================================= */
