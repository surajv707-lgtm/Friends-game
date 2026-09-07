/* =========================================================
   FRIENDZONE - COMPLETE SCRIPT
   Supabase + Authentication + Friends + Requests
   + Best Friends + Profile + Navigation
   ========================================================= */

/* =========================
   SUPABASE CONFIG
   ========================= */

const SUPABASE_URL = "https://hjdevuoxuoyenzmawwnb.supabase.co";

const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZGV2dW94dW95ZW56bWF3d25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODgzNjYsImV4cCI6MjEwNDM2NDM2Nn0.-ER4x0hqUYss521B_FWAHnfWjtxg9YJIaWNXjQJPPhI";

if (!window.supabase) {
  console.error("Supabase JS library was not loaded.");
  alert("Supabase failed to load. Please check your internet connection.");
}

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);


/* =========================================================
   GLOBAL STATE
   ========================================================= */

let currentUser = null;
let currentProfile = null;

let friends = [];
let receivedRequests = [];
let sentRequests = [];
let bestFriends = [];

let currentFriend = null;
let confirmCallback = null;


/* =========================================================
   DOM READY
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initializeApp();
});


/* =========================================================
   INITIALIZE
   ========================================================= */

async function initializeApp() {
  try {
    setupPasswordToggles();
    setupAuthSwitching();
    setupForms();
    setupNavigation();
    setupModals();
    setupButtons();

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session && session.user) {
      await startUserSession(session.user);
    } else {
      showAuthScreen();
    }

    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await startUserSession(session.user);
      }

      if (event === "SIGNED_OUT") {
        resetApplication();
        showAuthScreen();
      }
    });

  } catch (error) {
    console.error("Initialization error:", error);
    showAuthScreen();
  }
}


/* =========================================================
   AUTH SCREEN
   ========================================================= */

function showAuthScreen() {
  const authScreen = document.getElementById("authScreen");
  const mainApp = document.getElementById("mainApp");

  if (authScreen) authScreen.classList.remove("hidden");
  if (mainApp) mainApp.classList.add("hidden");

  switchAuthPanel("login");
}


function showMainApp() {
  const authScreen = document.getElementById("authScreen");
  const mainApp = document.getElementById("mainApp");

  if (authScreen) authScreen.classList.add("hidden");
  if (mainApp) mainApp.classList.remove("hidden");
}


/* =========================================================
   AUTH PANEL SWITCH
   ========================================================= */

function setupAuthSwitching() {
  const showSignupBtn = document.getElementById("showSignupBtn");
  const showLoginBtn = document.getElementById("showLoginBtn");

  if (showSignupBtn) {
    showSignupBtn.type = "button";

    showSignupBtn.addEventListener("click", (event) => {
      event.preventDefault();
      switchAuthPanel("signup");
    });
  }

  if (showLoginBtn) {
    showLoginBtn.type = "button";

    showLoginBtn.addEventListener("click", (event) => {
      event.preventDefault();
      switchAuthPanel("login");
    });
  }
}


function switchAuthPanel(panel) {
  const loginPanel = document.getElementById("loginPanel");
  const signupPanel = document.getElementById("signupPanel");

  if (!loginPanel || !signupPanel) return;

  if (panel === "signup") {
    loginPanel.classList.add("hidden");
    signupPanel.classList.remove("hidden");
  } else {
    signupPanel.classList.add("hidden");
    loginPanel.classList.remove("hidden");
  }
}


/* =========================================================
   PASSWORD EYE BUTTON
   ========================================================= */

function setupPasswordToggles() {
  const toggleButtons = document.querySelectorAll(".password-toggle");

  toggleButtons.forEach((button) => {
    button.type = "button";

    const targetId = button.dataset.target;
    const input = document.getElementById(targetId);

    if (!input) return;

    setEyeIcon(button, false);

    button.setAttribute("aria-label", "Show password");
    button.setAttribute("title", "Show password");

    button.addEventListener("click", (event) => {
      event.preventDefault();

      const isPassword = input.type === "password";

      input.type = isPassword ? "text" : "password";

      setEyeIcon(button, isPassword);

      button.setAttribute(
        "aria-label",
        isPassword ? "Hide password" : "Show password"
      );

      button.setAttribute(
        "title",
        isPassword ? "Hide password" : "Show password"
      );
    });
  });
}


function setEyeIcon(button, visible) {
  if (!button) return;

  if (visible) {
    button.innerHTML = `
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M4 4l16 16"></path>
      </svg>
    `;
  } else {
    button.innerHTML = `
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
        aria-hidden="true"
      >
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"></path>
        <circle cx="12" cy="12" r="3"></circle>
      </svg>
    `;
  }
}


/* =========================================================
   FORM SETUP
   ========================================================= */

function setupForms() {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");
  const addFriendForm = document.getElementById("addFriendForm");
  const profileForm = document.getElementById("profileForm");

  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  if (signupForm) {
    signupForm.addEventListener("submit", handleSignup);
  }

  if (addFriendForm) {
    addFriendForm.addEventListener("submit", handleAddFriend);
  }

  if (profileForm) {
    profileForm.addEventListener("submit", handleProfileUpdate);
  }
}


/* =========================================================
   LOGIN
   ========================================================= */

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;

  if (!email || !password) {
    showToast("Please enter email and password.", "error");
    return;
  }

  const button = event.submitter || event.target.querySelector("button[type='submit']");

  setButtonLoading(button, true);

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (data?.user) {
      await startUserSession(data.user);
      showToast("Welcome back! 👋", "success");
    }

  } catch (error) {
    console.error("Login error:", error);

    showToast(
      getAuthErrorMessage(error),
      "error"
    );
  } finally {
    setButtonLoading(button, false);
  }
}


/* =========================================================
   SIGN UP
   ========================================================= */

async function handleSignup(event) {
  event.preventDefault();

  const name = document.getElementById("signupName")?.value.trim();
  const username = document.getElementById("signupUsername")?.value.trim();
  const email = document.getElementById("signupEmail")?.value.trim();
  const password = document.getElementById("signupPassword")?.value;

  if (!name || !username || !email || !password) {
    showToast("Please fill all fields.", "error");
    return;
  }

  if (password.length < 6) {
    showToast("Password must contain at least 6 characters.", "error");
    return;
  }

  const button =
    event.submitter ||
    event.target.querySelector("button[type='submit']");

  setButtonLoading(button, true);

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name,
          username: username
        }
      }
    });

    if (error) throw error;

    if (data?.user) {
      /*
        Your Supabase database trigger should create the profile.
        We also try to create/update it here if necessary.
      */

      if (data.session) {
        await startUserSession(data.user);
        showToast("Account created successfully! 🎉", "success");
      } else {
        showToast(
          "Account created! Check your email to verify your account.",
          "success"
        );

        switchAuthPanel("login");
      }
    }

  } catch (error) {
    console.error("Signup error:", error);

    showToast(
      getAuthErrorMessage(error),
      "error"
    );
  } finally {
    setButtonLoading(button, false);
  }
}


/* =========================================================
   AUTH ERROR MESSAGE
   ========================================================= */

function getAuthErrorMessage(error) {
  const message = String(error?.message || "").toLowerCase();

  if (message.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }

  if (message.includes("email not confirmed")) {
    return "Please verify your email first.";
  }

  if (message.includes("user already registered")) {
    return "This email is already registered.";
  }

  if (message.includes("password")) {
    return error.message;
  }

  if (message.includes("network")) {
    return "Network error. Please check your internet.";
  }

  return error?.message || "Something went wrong.";
}


/* =========================================================
   USER SESSION
   ========================================================= */

async function startUserSession(user) {
  currentUser = user;

  try {
    await ensureProfile();

    await loadAllData();

    updateProfileUI();

    showMainApp();

    showPage("homePage");

  } catch (error) {
    console.error("Session start error:", error);

    showMainApp();
    updateProfileUI();

    showToast(
      "Logged in, but some data could not be loaded.",
      "error"
    );
  }
}


/* =========================================================
   ENSURE PROFILE
   ========================================================= */

async function ensureProfile() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      currentProfile = data;
      return;
    }

    const metadata = currentUser.user_metadata || {};

    const newProfile = {
      id: currentUser.id,
      name: metadata.name || "FriendZone User",
      friend_id: generateTemporaryFriendId(),
      avatar_url: metadata.avatar_url || null,
      xp: 0,
      level: 1,
      streak: 0
    };

    const { data: created, error: insertError } = await supabase
      .from("profiles")
      .insert(newProfile)
      .select()
      .single();

    if (!insertError) {
      currentProfile = created;
    }

  } catch (error) {
    console.error("Profile error:", error);
  }
}


function generateTemporaryFriendId() {
  const random = Math.floor(100000 + Math.random() * 900000);
  return `FZ${random}`;
}


/* =========================================================
   LOAD ALL DATA
   ========================================================= */

async function loadAllData() {
  await Promise.all([
    loadFriends(),
    loadReceivedRequests(),
    loadSentRequests(),
    loadBestFriends()
  ]);

  updateAllCounts();
  renderAll();
}


/* =========================================================
   LOAD FRIENDS
   ========================================================= */

async function loadFriends() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabase
      .from("friendships")
      .select(`
        id,
        user_id,
        friend_id,
        created_at
      `)
      .or(
        `user_id.eq.${currentUser.id},friend_id.eq.${currentUser.id}`
      )
      .order("created_at", { ascending: false });

    if (error) throw error;

    const friendIds = (data || []).map((item) =>
      item.user_id === currentUser.id
        ? item.friend_id
        : item.user_id
    );

    if (!friendIds.length) {
      friends = [];
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", friendIds);

    if (profileError) throw profileError;

    friends = profiles || [];

  } catch (error) {
    console.error("Load friends error:", error);
    friends = [];
  }
}


/* =========================================================
   LOAD RECEIVED REQUESTS
   ========================================================= */

async function loadReceivedRequests() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("receiver_id", currentUser.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const senderIds = (data || []).map(
      (request) => request.sender_id
    );

    let profiles = [];

    if (senderIds.length) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .in("id", senderIds);

      profiles = profileData || [];
    }

    receivedRequests = (data || []).map((request) => ({
      ...request,
      profile: profiles.find(
        (profile) => profile.id === request.sender_id
      )
    }));

  } catch (error) {
    console.error("Received request error:", error);
    receivedRequests = [];
  }
}


/* =========================================================
   LOAD SENT REQUESTS
   ========================================================= */

async function loadSentRequests() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("sender_id", currentUser.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    const receiverIds = (data || []).map(
      (request) => request.receiver_id
    );

    let profiles = [];

    if (receiverIds.length) {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .in("id", receiverIds);

      profiles = profileData || [];
    }

    sentRequests = (data || []).map((request) => ({
      ...request,
      profile: profiles.find(
        (profile) => profile.id === request.receiver_id
      )
    }));

  } catch (error) {
    console.error("Sent request error:", error);
    sentRequests = [];
  }
}


/* =========================================================
   LOAD BEST FRIENDS
   ========================================================= */

async function loadBestFriends() {
  if (!currentUser) return;

  try {
    const { data, error } = await supabase
      .from("best_friends")
      .select("*")
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const friendIds = (data || []).map(
      (item) => item.friend_id
    );

    if (!friendIds.length) {
      bestFriends = [];
      return;
    }

    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", friendIds);

    if (profileError) throw profileError;

    bestFriends = profiles || [];

  } catch (error) {
    console.error("Best friends error:", error);
    bestFriends = [];
  }
}


/* =========================================================
   NAVIGATION
   ========================================================= */

function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const pageId = item.dataset.page;

      if (pageId) {
        showPage(pageId);
      }

      closeSidebar();
    });
  });

  const goPageButtons = document.querySelectorAll("[data-go-page]");

  goPageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const pageId = button.dataset.goPage;

      if (pageId) {
        showPage(pageId);
      }

      closeSidebar();
    });
  });
}


function showPage(pageId) {
  const pages = document.querySelectorAll(".page");

  pages.forEach((page) => {
    page.classList.remove("active-page");
  });

  const selectedPage = document.getElementById(pageId);

  if (selectedPage) {
    selectedPage.classList.add("active-page");
  }

  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    item.classList.toggle(
      "active",
      item.dataset.page === pageId
    );
  });

  updateHeader(pageId);

  if (pageId === "friendsPage") {
    renderFriends();
  }

  if (pageId === "requestsPage") {
    renderRequests();
  }

  if (pageId === "bestFriendsPage") {
    renderBestFriends();
  }

  if (pageId === "profilePage") {
    updateProfileUI();
  }
}


/* =========================================================
   HEADER
   ========================================================= */

function updateHeader(pageId) {
  const title = document.getElementById("currentPageTitle");
  const subtitle = document.getElementById("currentPageSubtitle");

  const pageInfo = {
    homePage: {
      title: "Home",
      subtitle: "Welcome back to FriendZone"
    },

    friendsPage: {
      title: "My Friends",
      subtitle: "Connect with your friends"
    },

    requestsPage: {
      title: "Friend Requests",
      subtitle: "Manage your friend requests"
    },

    bestFriendsPage: {
      title: "Best Friends",
      subtitle: "Your closest connections"
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

  const info = pageInfo[pageId] || pageInfo.homePage;

  if (title) title.textContent = info.title;
  if (subtitle) subtitle.textContent = info.subtitle;
}


/* =========================================================
   SIDEBAR
   ========================================================= */

function setupButtons() {
  const openSidebarBtn = document.getElementById("openSidebarBtn");
  const closeSidebarBtn = document.getElementById("closeSidebarBtn");
  const overlay = document.getElementById("sidebarOverlay");
  const logoutBtn = document.getElementById("logoutBtn");
  const copyFriendIdBtn = document.getElementById("copyFriendIdBtn");
  const headerProfileBtn = document.getElementById("headerProfileBtn");
  const headerRequestBtn = document.getElementById("headerRequestBtn");

  if (openSidebarBtn) {
    openSidebarBtn.addEventListener("click", openSidebar);
  }

  if (closeSidebarBtn) {
    closeSidebarBtn.addEventListener("click", closeSidebar);
  }

  if (overlay) {
    overlay.addEventListener("click", closeSidebar);
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }

  if (copyFriendIdBtn) {
    copyFriendIdBtn.addEventListener("click", copyFriendId);
  }

  if (headerProfileBtn) {
    headerProfileBtn.addEventListener("click", () => {
      showPage("profilePage");
    });
  }

  if (headerRequestBtn) {
    headerRequestBtn.addEventListener("click", () => {
      showPage("requestsPage");
    });
  }

  const searchInput = document.getElementById("friendsSearch");

  if (searchInput) {
    searchInput.addEventListener("input", renderFriends);
  }

  const requestTabs = document.querySelectorAll(".request-tab");

  requestTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      requestTabs.forEach((item) => item.classList.remove("active"));
      tab.classList.add("active");

      const type = tab.dataset.requestTab;

      const receivedContainer =
        document.getElementById("receivedRequestsContainer");

      const sentContainer =
        document.getElementById("sentRequestsContainer");

      if (type === "received") {
        if (receivedContainer) {
          receivedContainer.classList.remove("hidden");
        }

        if (sentContainer) {
          sentContainer.classList.add("hidden");
        }
      }

      if (type === "sent") {
        if (receivedContainer) {
          receivedContainer.classList.add("hidden");
        }

        if (sentContainer) {
          sentContainer.classList.remove("hidden");
        }
      }
    });
  });
}


function openSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (sidebar) sidebar.classList.add("open");
  if (overlay) overlay.classList.add("active");
}


function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("active");
}


/* =========================================================
   FRIEND REQUEST - ADD FRIEND
   ========================================================= */

async function handleAddFriend(event) {
  event.preventDefault();

  const input = document.getElementById("friendIdInput");
  const friendId = input?.value.trim().toUpperCase();

  if (!friendId) {
    showToast("Enter a Friend ID.", "error");
    return;
  }

  await searchFriend(friendId);
}


async function searchFriend(friendId) {
  if (!currentUser) return;

  const resultContainer =
    document.getElementById("friendSearchResult");

  if (resultContainer) {
    resultContainer.innerHTML = `
      <div class="empty-state">
        Searching...
      </div>
    `;
  }

  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("friend_id", friendId)
      .maybeSingle();

    if (error) throw error;

    if (!profile) {
      if (resultContainer) {
        resultContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🔎</div>
            <h3>Friend not found</h3>
            <p>No account was found with this Friend ID.</p>
          </div>
        `;
      }

      return;
    }

    if (profile.id === currentUser.id) {
      if (resultContainer) {
        resultContainer.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🙂</div>
            <h3>That's you!</h3>
            <p>You cannot send a friend request to yourself.</p>
          </div>
        `;
      }

      return;
    }

    const alreadyFriend = friends.some(
      (friend) => friend.id === profile.id
    );

    if (alreadyFriend) {
      showFriendSearchResult(
        profile,
        "already-friend"
      );
      return;
    }

    const { data: existingRequest } = await supabase
      .from("friend_requests")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`
      )
      .eq("status", "pending")
      .maybeSingle();

    if (existingRequest) {
      showFriendSearchResult(
        profile,
        existingRequest.sender_id === currentUser.id
          ? "request-sent"
          : "request-received"
      );

      return;
    }

    showFriendSearchResult(profile, "available");

  } catch (error) {
    console.error("Friend search error:", error);

    if (resultContainer) {
      resultContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3>Something went wrong</h3>
          <p>Please try again.</p>
        </div>
      `;
    }
  }
}


function showFriendSearchResult(profile, state) {
  const container =
    document.getElementById("friendSearchResult");

  if (!container) return;

  const avatar = getAvatar(profile);

  let action = "";

  if (state === "available") {
    action = `
      <button
        class="primary-btn send-request-btn"
        data-friend-id="${profile.id}"
      >
        Add Friend
      </button>
    `;
  }

  if (state === "already-friend") {
    action = `
      <span class="friend-status">
        ✓ Already Friends
      </span>
    `;
  }

  if (state === "request-sent") {
    action = `
      <span class="friend-status">
        Request Sent
      </span>
    `;
  }

  if (state === "request-received") {
    action = `
      <span class="friend-status">
        This person already sent you a request
      </span>
    `;
  }

  container.innerHTML = `
    <div class="friend-card search-result-card">
      <div class="friend-avatar">
        ${avatar}
      </div>

      <div class="friend-info">
        <h3>${escapeHTML(profile.name || "FriendZone User")}</h3>
        <p>@${escapeHTML(getUsername(profile))}</p>
        <small>${escapeHTML(profile.friend_id || "")}</small>
      </div>

      <div class="friend-actions">
        ${action}
      </div>
    </div>
  `;

  const addButton =
    container.querySelector(".send-request-btn");

  if (addButton) {
    addButton.addEventListener("click", async () => {
      await sendFriendRequest(profile.id);
    });
  }
}


/* =========================================================
   SEND FRIEND REQUEST
   ========================================================= */

async function sendFriendRequest(receiverId) {
  if (!currentUser) return;

  if (receiverId === currentUser.id) {
    showToast("You cannot add yourself.", "error");
    return;
  }

  try {
    const { data: existing } = await supabase
      .from("friend_requests")
      .select("*")
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`
      )
      .in("status", ["pending", "accepted"])
      .maybeSingle();

    if (existing) {
      if (existing.status === "accepted") {
        showToast("You are already friends.", "info");
      } else {
        showToast("A friend request already exists.", "info");
      }

      return;
    }

    const { error } = await supabase
      .from("friend_requests")
      .insert({
        sender_id: currentUser.id,
        receiver_id: receiverId,
        status: "pending"
      });

    if (error) throw error;

    showToast("Friend request sent! 🎉", "success");

    await loadAllData();

    const input = document.getElementById("friendIdInput");

    if (input) input.value = "";

    const result = document.getElementById("friendSearchResult");

    if (result) {
      result.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">💜</div>
          <h3>Request sent!</h3>
          <p>Your friend request has been sent successfully.</p>
        </div>
      `;
    }

  } catch (error) {
    console.error("Send request error:", error);

    showToast(
      error?.message || "Could not send friend request.",
      "error"
    );
  }
}


/* =========================================================
   ACCEPT FRIEND REQUEST
   ========================================================= */

async function acceptFriendRequest(requestId) {
  if (!currentUser) return;

  const request = receivedRequests.find(
    (item) => item.id === requestId
  );

  if (!request) {
    showToast("Request not found.", "error");
    return;
  }

  try {
    const { error: updateError } = await supabase
      .from("friend_requests")
      .update({
        status: "accepted",
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId)
      .eq("receiver_id", currentUser.id);

    if (updateError) throw updateError;

    /*
      Create the friendship from the current user's side.
    */

    const { error: firstFriendshipError } = await supabase
      .from("friendships")
      .insert({
        user_id: currentUser.id,
        friend_id: request.sender_id
      });

    if (
      firstFriendshipError &&
      !String(firstFriendshipError.message)
        .toLowerCase()
        .includes("duplicate")
    ) {
      console.warn(
        "Current friendship insert:",
        firstFriendshipError
      );
    }

    /*
      Try reciprocal row as well.
      This can be blocked by RLS depending on your policy,
      so failure here does not break the accepted request.
    */

    const { error: reciprocalError } = await supabase
      .from("friendships")
      .insert({
        user_id: request.sender_id,
        friend_id: currentUser.id
      });

    if (reciprocalError) {
      console.warn(
        "Reciprocal friendship insert:",
        reciprocalError
      );
    }

    showToast("Friend request accepted! 💜", "success");

    await loadAllData();

  } catch (error) {
    console.error("Accept request error:", error);

    showToast(
      error?.message || "Could not accept request.",
      "error"
    );
  }
}


/* =========================================================
   REJECT FRIEND REQUEST
   ========================================================= */

async function rejectFriendRequest(requestId) {
  if (!currentUser) return;

  try {
    const { error } = await supabase
      .from("friend_requests")
      .update({
        status: "rejected",
        updated_at: new Date().toISOString()
      })
      .eq("id", requestId)
      .eq("receiver_id", currentUser.id);

    if (error) throw error;

    showToast("Friend request rejected.", "info");

    await loadAllData();

  } catch (error) {
    console.error("Reject request error:", error);

    showToast(
      error?.message || "Could not reject request.",
      "error"
    );
  }
}


/* =========================================================
   BEST FRIEND
   ========================================================= */

async function addBestFriend(friendId) {
  if (!currentUser) return;

  try {
    const alreadyExists = bestFriends.some(
      (friend) => friend.id === friendId
    );

    if (alreadyExists) {
      showToast("Already in Best Friends.", "info");
      return;
    }

    const { error } = await supabase
      .from("best_friends")
      .insert({
        user_id: currentUser.id,
        friend_id: friendId
      });

    if (error) throw error;

    showToast("Added to Best Friends ⭐", "success");

    await loadBestFriends();
    renderBestFriends();
    updateAllCounts();

  } catch (error) {
    console.error("Add best friend error:", error);

    showToast(
      error?.message || "Could not add Best Friend.",
      "error"
    );
  }
}


async function removeBestFriend(friendId) {
  if (!currentUser) return;

  try {
    const { error } = await supabase
      .from("best_friends")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("friend_id", friendId);

    if (error) throw error;

    showToast("Removed from Best Friends.", "info");

    await loadBestFriends();
    renderBestFriends();
    updateAllCounts();

  } catch (error) {
    console.error("Remove best friend error:", error);

    showToast(
      error?.message || "Could not remove Best Friend.",
      "error"
    );
  }
}


/* =========================================================
   FRIEND CARD ACTIONS
   ========================================================= */

function openFriendModal(friendId) {
  const friend =
    friends.find((item) => item.id === friendId) ||
    bestFriends.find((item) => item.id === friendId);

  if (!friend) return;

  currentFriend = friend;

  const modal = document.getElementById("friendModal");
  const content = document.getElementById("modalFriendContent");

  if (!modal || !content) return;

  content.innerHTML = createFriendProfileHTML(friend);

  modal.classList.remove("hidden");
}


function createFriendProfileHTML(friend) {
  const isBestFriend = bestFriends.some(
    (item) => item.id === friend.id
  );

  return `
    <div class="modal-friend-profile">

      <div class="large-avatar">
        ${getAvatar(friend)}
      </div>

      <h2>${escapeHTML(friend.name || "FriendZone User")}</h2>

      <p>@${escapeHTML(getUsername(friend))}</p>

      <div class="profile-friend-id">
        Friend ID: <strong>${escapeHTML(friend.friend_id || "")}</strong>
      </div>

      <div class="modal-actions">

        ${
          isBestFriend
            ? `
              <button
                class="secondary-btn"
                data-modal-remove-best="${friend.id}"
              >
                ★ Remove Best Friend
              </button>
            `
            : `
              <button
                class="primary-btn"
                data-modal-add-best="${friend.id}"
              >
                ⭐ Add to Best Friends
              </button>
            `
        }

      </div>

    </div>
  `;
}


/* =========================================================
   MODALS
   ========================================================= */

function setupModals() {
  document.querySelectorAll("[data-close-modal]").forEach((element) => {
    element.addEventListener("click", () => {
      const modalId = element.dataset.closeModal;

      if (modalId) {
        closeModal(modalId);
      } else if (element.classList.contains("modal-overlay")) {
        element.classList.add("hidden");
      }
    });
  });

  const cancelButton =
    document.getElementById("confirmCancelBtn");

  if (cancelButton) {
    cancelButton.addEventListener("click", closeConfirm);
  }

  const confirmButton =
    document.getElementById("confirmActionBtn");

  if (confirmButton) {
    confirmButton.addEventListener("click", async () => {
      if (typeof confirmCallback === "function") {
        const callback = confirmCallback;

        closeConfirm();

        await callback();
      }
    });
  }

  document.addEventListener("click", async (event) => {
    const addBestButton =
      event.target.closest("[data-modal-add-best]");

    const removeBestButton =
      event.target.closest("[data-modal-remove-best]");

    if (addBestButton) {
      await addBestFriend(addBestButton.dataset.modalAddBest);
      closeModal("friendModal");
    }

    if (removeBestButton) {
      await removeBestFriend(
        removeBestButton.dataset.modalRemoveBest
      );

      closeModal("friendModal");
    }
  });
}


function closeModal(modalId) {
  const modal = document.getElementById(modalId);

  if (modal) {
    modal.classList.add("hidden");
  }
}


function showConfirm(title, message, callback) {
  const modal = document.getElementById("confirmModal");

  if (!modal) {
    if (confirm(message)) {
      callback();
    }

    return;
  }

  const titleElement =
    document.getElementById("confirmTitle");

  const messageElement =
    document.getElementById("confirmMessage");

  if (titleElement) {
    titleElement.textContent = title;
  }

  if (messageElement) {
    messageElement.textContent = message;
  }

  confirmCallback = callback;

  modal.classList.remove("hidden");
}


function closeConfirm() {
  const modal = document.getElementById("confirmModal");

  if (modal) {
    modal.classList.add("hidden");
  }

  confirmCallback = null;
}


/* =========================================================
   PROFILE UPDATE
   ========================================================= */

async function handleProfileUpdate(event) {
  event.preventDefault();

  if (!currentUser) return;

  const name =
    document.getElementById("profileNameInput")?.value.trim();

  const username =
    document.getElementById("profileUsernameInput")?.value.trim();

  if (!name) {
    showToast("Name cannot be empty.", "error");
    return;
  }

  try {
    /*
      Username is stored in Supabase Auth metadata because
      the current profiles table does not require a username
      column.
    */

    const { error: authError } =
      await supabase.auth.updateUser({
        data: {
          name: name,
          username: username || ""
        }
      });

    if (authError) throw authError;

    const { error: profileError } =
      await supabase
        .from("profiles")
        .update({
          name: name,
          updated_at: new Date().toISOString()
        })
        .eq("id", currentUser.id);

    if (profileError) {
      console.warn("Profile database update:", profileError);
    }

    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      currentUser = user;
    }

    await ensureProfile();

    updateProfileUI();

    showToast("Profile updated successfully! ✨", "success");

  } catch (error) {
    console.error("Profile update error:", error);

    showToast(
      error?.message || "Could not update profile.",
      "error"
    );
  }
}


/* =========================================================
   UPDATE PROFILE UI
   ========================================================= */

function updateProfileUI() {
  if (!currentUser) return;

  const metadata = currentUser.user_metadata || {};

  const name =
    currentProfile?.name ||
    metadata.name ||
    "FriendZone User";

  const username =
    metadata.username ||
    "friend";

  const friendId =
    currentProfile?.friend_id ||
    "Not assigned";

  const avatar =
    currentProfile?.avatar_url ||
    metadata.avatar_url ||
    null;

  setText("sidebarUserName", name);
  setText("sidebarFriendId", friendId);

  setText("profileName", name);
  setText("profileUsername", `@${username}`);
  setText("profileFriendId", friendId);

  setValue("profileNameInput", name);
  setValue("profileUsernameInput", username);

  setText("homeFriendId", friendId);

  const sidebarAvatar =
    document.getElementById("sidebarAvatar");

  const profileAvatar =
    document.getElementById("profileAvatar");

  if (sidebarAvatar) {
    sidebarAvatar.innerHTML = getAvatarHTML(
      name,
      avatar
    );
  }

  if (profileAvatar) {
    profileAvatar.innerHTML = getAvatarHTML(
      name,
      avatar
    );
  }
}


/* =========================================================
   RENDER ALL
   ========================================================= */

function renderAll() {
  renderFriends();
  renderRequests();
  renderBestFriends();
}


/* =========================================================
   RENDER FRIENDS
   ========================================================= */

function renderFriends() {
  const container =
    document.getElementById("friendsContainer");

  if (!container) return;

  const search =
    document.getElementById("friendsSearch")?.value
      .trim()
      .toLowerCase() || "";

  let filteredFriends = friends;

  if (search) {
    filteredFriends = friends.filter((friend) => {
      const name =
        String(friend.name || "").toLowerCase();

      const username =
        getUsername(friend).toLowerCase();

      const friendId =
        String(friend.friend_id || "").toLowerCase();

      return (
        name.includes(search) ||
        username.includes(search) ||
        friendId.includes(search)
      );
    });
  }

  if (!filteredFriends.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">👥</div>
        <h3>${search ? "No friends found" : "No friends yet"}</h3>
        <p>
          ${
            search
              ? "Try another name, username or Friend ID."
              : "Add friends using their Friend ID to start building your FriendZone."
          }
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = filteredFriends
    .map((friend) => createFriendCard(friend))
    .join("");

  attachFriendCardEvents(container);
}


/* =========================================================
   FRIEND CARD
   ========================================================= */

function createFriendCard(friend) {
  const isBestFriend = bestFriends.some(
    (item) => item.id === friend.id
  );

  return `
    <article
      class="friend-card"
      data-friend-card="${friend.id}"
    >

      <button
        class="friend-card-main"
        type="button"
        data-open-friend="${friend.id}"
      >

        <div class="friend-avatar">
          ${getAvatar(friend)}
          <span class="online-dot"></span>
        </div>

        <div class="friend-info">
          <h3>
            ${escapeHTML(friend.name || "FriendZone User")}
          </h3>

          <p>
            @${escapeHTML(getUsername(friend))}
          </p>

          <small>
            ${escapeHTML(friend.friend_id || "")}
          </small>
        </div>

      </button>

      <div class="friend-actions">

        <button
          class="icon-action"
          type="button"
          title="View profile"
          data-open-friend="${friend.id}"
        >
          👤
        </button>

        ${
          isBestFriend
            ? `
              <button
                class="icon-action"
                type="button"
                title="Remove Best Friend"
                data-remove-best="${friend.id}"
              >
                ⭐
              </button>
            `
            : `
              <button
                class="icon-action"
                type="button"
                title="Add Best Friend"
                data-add-best="${friend.id}"
              >
                ☆
              </button>
            `
        }

      </div>

    </article>
  `;
}


function attachFriendCardEvents(container) {
  container.querySelectorAll("[data-open-friend]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        openFriendModal(button.dataset.openFriend);
      });
    });

  container.querySelectorAll("[data-add-best]")
    .forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();

        await addBestFriend(
          button.dataset.addBest
        );

        renderFriends();
      });
    });

  container.querySelectorAll("[data-remove-best]")
    .forEach((button) => {
      button.addEventListener("click", async (event) => {
        event.stopPropagation();

        await removeBestFriend(
          button.dataset.removeBest
        );

        renderFriends();
      });
    });
}


/* =========================================================
   RENDER REQUESTS
   ========================================================= */

function renderRequests() {
  const receivedContainer =
    document.getElementById("receivedRequestsContainer");

  const sentContainer =
    document.getElementById("sentRequestsContainer");

  if (receivedContainer) {
    if (!receivedRequests.length) {
      receivedContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📥</div>
          <h3>No incoming requests</h3>
          <p>You don't have any pending friend requests.</p>
        </div>
      `;
    } else {
      receivedContainer.innerHTML =
        receivedRequests
          .map(createReceivedRequestCard)
          .join("");

      attachRequestEvents(receivedContainer);
    }
  }

  if (sentContainer) {
    if (!sentRequests.length) {
      sentContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📤</div>
          <h3>No sent requests</h3>
          <p>You haven't sent any pending friend requests.</p>
        </div>
      `;
    } else {
      sentContainer.innerHTML =
        sentRequests
          .map(createSentRequestCard)
          .join("");

      attachRequestEvents(sentContainer);
    }
  }
}


function createReceivedRequestCard(request) {
  const profile = request.profile || {};

  return `
    <article class="request-card">

      <div class="friend-avatar">
        ${getAvatar(profile)}
      </div>

      <div class="friend-info">
        <h3>${escapeHTML(profile.name || "FriendZone User")}</h3>
        <p>@${escapeHTML(getUsername(profile))}</p>
        <small>${escapeHTML(profile.friend_id || "")}</small>
      </div>

      <div class="request-actions">

        <button
          class="primary-btn accept-request-btn"
          type="button"
          data-accept-request="${request.id}"
        >
          Accept
        </button>

        <button
          class="secondary-btn reject-request-btn"
          type="button"
          data-reject-request="${request.id}"
        >
          Reject
        </button>

      </div>

    </article>
  `;
}


function createSentRequestCard(request) {
  const profile = request.profile || {};

  return `
    <article class="request-card">

      <div class="friend-avatar">
        ${getAvatar(profile)}
      </div>

      <div class="friend-info">
        <h3>${escapeHTML(profile.name || "FriendZone User")}</h3>
        <p>@${escapeHTML(getUsername(profile))}</p>
        <small>${escapeHTML(profile.friend_id || "")}</small>
      </div>

      <div class="request-status">
        <span>Pending</span>
      </div>

    </article>
  `;
}


function attachRequestEvents(container) {
  container.querySelectorAll("[data-accept-request]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        await acceptFriendRequest(
          button.dataset.acceptRequest
        );
      });
    });

  container.querySelectorAll("[data-reject-request]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        await rejectFriendRequest(
          button.dataset.rejectRequest
        );
      });
    });
}


/* =========================================================
   RENDER BEST FRIENDS
   ========================================================= */

function renderBestFriends() {
  const container =
    document.getElementById("bestFriendsContainer");

  if (!container) return;

  if (!bestFriends.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">⭐</div>
        <h3>No Best Friends yet</h3>
        <p>
          Add your closest friends to your Best Friends list.
        </p>
      </div>
    `;

    return;
  }

  container.innerHTML = bestFriends
    .map((friend) => `
      <article class="friend-card">

        <button
          class="friend-card-main"
          type="button"
          data-open-best="${friend.id}"
        >

          <div class="friend-avatar">
            ${getAvatar(friend)}
          </div>

          <div class="friend-info">
            <h3>${escapeHTML(friend.name || "FriendZone User")}</h3>
            <p>@${escapeHTML(getUsername(friend))}</p>
            <small>${escapeHTML(friend.friend_id || "")}</small>
          </div>

        </button>

        <button
          class="icon-action"
          type="button"
          title="Remove Best Friend"
          data-remove-best="${friend.id}"
        >
          ★
        </button>

      </article>
    `)
    .join("");

  container
    .querySelectorAll("[data-open-best]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        openFriendModal(button.dataset.openBest);
      });
    });

  container
    .querySelectorAll("[data-remove-best]")
    .forEach((button) => {
      button.addEventListener("click", async () => {
        await removeBestFriend(
          button.dataset.removeBest
        );
      });
    });
}


/* =========================================================
   HOME RECENT FRIENDS
   ========================================================= */

function renderRecentFriends() {
  const container =
    document.getElementById("recentFriendsContainer");

  if (!container) return;

  const recent = friends.slice(0, 5);

  if (!recent.length) {
    container.innerHTML = `
      <div class="empty-state compact">
        <div class="empty-icon">👋</div>
        <h3>No friends yet</h3>
        <p>Add your first friend to see them here.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = recent
    .map((friend) => createFriendCard(friend))
    .join("");

  attachFriendCardEvents(container);
}


/* =========================================================
   COUNTS
   ========================================================= */

function updateAllCounts() {
  const friendsCount = friends.length;
  const requestsCount = receivedRequests.length;
  const bestCount = bestFriends.length;

  setText("homeFriendsCount", friendsCount);
  setText("homeRequestsCount", requestsCount);
  setText("homeBestFriendsCount", bestCount);

  setText("friendsBadge", friendsCount);
  setText("requestsBadge", requestsCount);
  setText("headerRequestBadge", requestsCount);

  const receivedCount =
    document.getElementById("receivedCount");

  const sentCount =
    document.getElementById("sentCount");

  if (receivedCount) {
    receivedCount.textContent =
      receivedRequests.length;
  }

  if (sentCount) {
    sentCount.textContent =
      sentRequests.length;
  }

  renderRecentFriends();
}


/* =========================================================
   LOGOUT
   ========================================================= */

async function logout() {
  showConfirm(
    "Log out?",
    "Are you sure you want to log out of FriendZone?",
    async () => {
      try {
        const { error } =
          await supabase.auth.signOut();

        if (error) throw error;

        resetApplication();

        showAuthScreen();

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
  );
}


/* =========================================================
   COPY FRIEND ID
   ========================================================= */

async function copyFriendId() {
  const friendId =
    currentProfile?.friend_id;

  if (!friendId) {
    showToast("Friend ID is not available.", "error");
    return;
  }

  try {
    await navigator.clipboard.writeText(friendId);

    showToast(
      "Friend ID copied! 📋",
      "success"
    );

  } catch (error) {
    console.error(error);

    showToast(
      "Could not copy Friend ID.",
      "error"
    );
  }
}


/* =========================================================
   RESET APP
   ========================================================= */

function resetApplication() {
  currentUser = null;
  currentProfile = null;

  friends = [];
  receivedRequests = [];
  sentRequests = [];
  bestFriends = [];

  currentFriend = null;

  closeSidebar();
  closeConfirm();

  document.querySelectorAll(".modal")
    .forEach((modal) => {
      modal.classList.add("hidden");
    });
}


/* =========================================================
   AVATAR
   ========================================================= */

function getAvatar(profile) {
  return getAvatarHTML(
    profile?.name || "Friend",
    profile?.avatar_url
  );
}


function getAvatarHTML(name, avatarUrl) {
  if (avatarUrl) {
    return `
      <img
        src="${escapeAttribute(avatarUrl)}"
        alt="${escapeAttribute(name)}"
        loading="lazy"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      >
      <span class="avatar-fallback" style="display:none;">
        ${escapeHTML(getInitials(name))}
      </span>
    `;
  }

  return `
    <span class="avatar-fallback">
      ${escapeHTML(getInitials(name))}
    </span>
  `;
}


function getInitials(name) {
  const words =
    String(name || "Friend")
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  if (!words.length) return "F";

  if (words.length === 1) {
    return words[0].substring(0, 2).toUpperCase();
  }

  return (
    words[0][0] +
    words[words.length - 1][0]
  ).toUpperCase();
}


/* =========================================================
   USERNAME
   ========================================================= */

function getUsername(profile) {
  if (!profile) return "friend";

  if (profile.username) {
    return profile.username;
  }

  if (
    profile.user_metadata &&
    profile.user_metadata.username
  ) {
    return profile.user_metadata.username;
  }

  if (
    currentUser &&
    profile.id === currentUser.id &&
    currentUser.user_metadata?.username
  ) {
    return currentUser.user_metadata.username;
  }

  return "friend";
}


/* =========================================================
   BUTTON LOADING
   ========================================================= */

function setButtonLoading(button, loading) {
  if (!button) return;

  if (loading) {
    if (!button.dataset.originalHTML) {
      button.dataset.originalHTML =
        button.innerHTML;
    }

    button.disabled = true;
    button.classList.add("loading");

    button.innerHTML = `
      <span class="button-spinner"></span>
      <span>Please wait...</span>
    `;
  } else {
    button.disabled = false;
    button.classList.remove("loading");

    if (button.dataset.originalHTML) {
      button.innerHTML =
        button.dataset.originalHTML;
    }
  }
}


/* =========================================================
   TOAST
   ========================================================= */

function showToast(message, type = "info") {
  const container =
    document.getElementById("toastContainer");

  if (!container) {
    console.log(`[${type}] ${message}`);
    return;
  }

  const toast =
    document.createElement("div");

  toast.className = `toast toast-${type}`;

  const icon =
    type === "success"
      ? "✓"
      : type === "error"
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
      aria-label="Close"
    >
      ×
    </button>
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
    ?.addEventListener(
      "click",
      removeToast
    );

  setTimeout(removeToast, 4000);
}


/* =========================================================
   HELPERS
   ========================================================= */

function setText(id, value) {
  const element =
    document.getElementById(id);

  if (element) {
    element.textContent = value ?? "";
  }
}


function setValue(id, value) {
  const element =
    document.getElementById(id);

  if (element) {
    element.value = value ?? "";
  }
}


function escapeHTML(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function escapeAttribute(value) {
  return escapeHTML(value);
}


/* =========================================================
   GLOBAL ERROR PROTECTION
   ========================================================= */

window.addEventListener("error", (event) => {
  console.error(
    "FriendZone JavaScript error:",
    event.error || event.message
  );
});


window.addEventListener(
  "unhandledrejection",
  (event) => {
    console.error(
      "FriendZone promise error:",
      event.reason
    );
  }
);
