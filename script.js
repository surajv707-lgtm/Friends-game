/* =========================================================
   FRIENDZONE
   COMPLETE FIXED JAVASCRIPT
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     SUPABASE
     ======================================================= */

  const SUPABASE_URL =
    "https://hjdevuoxuoyenzmawwnb.supabase.co";

  const SUPABASE_ANON_KEY =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZGV2dW94dW95ZW56bWF3d25iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3ODgzNjYsImV4cCI6MjEwNDM2NDM2Nn0.-ER4x0hqUYss521B_FWAHnfWjtxg9YJIaWNXjQJPPhI";

  let supabaseClient = null;

  /* =======================================================
     STATE
     ======================================================= */

  let currentUser = null;
  let currentProfile = null;

  let friends = [];
  let receivedRequests = [];
  let sentRequests = [];
  let bestFriends = [];

  let currentFriend = null;
  let confirmCallback = null;

  /* =======================================================
     START
     ======================================================= */

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    console.log("FriendZone JS started.");

    try {
      /* Check Supabase library */
      if (!window.supabase) {
        console.error("Supabase library not found.");

        showToast(
          "Supabase library could not load. Check your internet connection.",
          "error"
        );

        return;
      }

      /* Create Supabase client */
      supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );

      console.log("Supabase connected.");

      setupPasswordToggles();
      setupAuthButtons();
      setupForms();
      setupNavigation();
      setupSidebar();
      setupModals();
      setupSearch();
      setupRequestTabs();
      setupProfileButtons();

      /* Check existing login */
      const {
        data: { session },
        error
      } = await supabaseClient.auth.getSession();

      if (error) {
        console.error("Session error:", error);
      }

      if (session && session.user) {
        await loginUser(session.user);
      } else {
        showLoginScreen();
      }

      /* Auth listener */
      supabaseClient.auth.onAuthStateChange(
        async (event, session) => {
          console.log("Auth event:", event);

          if (
            event === "SIGNED_IN" &&
            session &&
            session.user
          ) {
            await loginUser(session.user);
          }

          if (event === "SIGNED_OUT") {
            resetApp();
            showLoginScreen();
          }
        }
      );

    } catch (error) {
      console.error("FriendZone startup error:", error);

      showLoginScreen();

      showToast(
        "FriendZone could not start. Check the browser console.",
        "error"
      );
    }
  }

  /* =======================================================
     AUTH SCREEN
     ======================================================= */

  function showLoginScreen() {
    const authScreen =
      document.getElementById("authScreen");

    const mainApp =
      document.getElementById("mainApp");

    if (authScreen) {
      authScreen.classList.remove("hidden");
    }

    if (mainApp) {
      mainApp.classList.add("hidden");
    }

    switchAuth("login");
  }

  function showApp() {
    const authScreen =
      document.getElementById("authScreen");

    const mainApp =
      document.getElementById("mainApp");

    if (authScreen) {
      authScreen.classList.add("hidden");
    }

    if (mainApp) {
      mainApp.classList.remove("hidden");
    }
  }

  /* =======================================================
     LOGIN / SIGNUP SWITCH
     ======================================================= */

  function setupAuthButtons() {
    const signup =
      document.getElementById("showSignupBtn");

    const login =
      document.getElementById("showLoginBtn");

    if (signup) {
      signup.type = "button";

      signup.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        switchAuth("signup");
      });
    }

    if (login) {
      login.type = "button";

      login.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        switchAuth("login");
      });
    }
  }

  function switchAuth(type) {
    const loginPanel =
      document.getElementById("loginPanel");

    const signupPanel =
      document.getElementById("signupPanel");

    if (!loginPanel || !signupPanel) {
      console.error(
        "Login or signup panel not found."
      );
      return;
    }

    if (type === "signup") {
      loginPanel.classList.add("hidden");
      signupPanel.classList.remove("hidden");
    } else {
      signupPanel.classList.add("hidden");
      loginPanel.classList.remove("hidden");
    }
  }

  /* =======================================================
     PASSWORD EYE
     ======================================================= */

  function setupPasswordToggles() {
    const buttons =
      document.querySelectorAll(".password-toggle");

    buttons.forEach((button) => {
      const target =
        button.dataset.target;

      const input =
        document.getElementById(target);

      if (!input) {
        console.warn(
          "Password input not found:",
          target
        );
        return;
      }

      button.type = "button";

      setEye(button, false);

      button.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        if (input.type === "password") {
          input.type = "text";
          setEye(button, true);

          button.title = "Hide password";
          button.setAttribute(
            "aria-label",
            "Hide password"
          );
        } else {
          input.type = "password";
          setEye(button, false);

          button.title = "Show password";
          button.setAttribute(
            "aria-label",
            "Show password"
          );
        }
      });
    });
  }

  function setEye(button, visible) {
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
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
          <circle cx="12" cy="12" r="3"/>
          <path d="M4 4l16 16"/>
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
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z"/>
          <circle cx="12" cy="12" r="3"/>
        </svg>
      `;
    }
  }

  /* =======================================================
     FORMS
     ======================================================= */

  function setupForms() {
    const loginForm =
      document.getElementById("loginForm");

    const signupForm =
      document.getElementById("signupForm");

    const addFriendForm =
      document.getElementById("addFriendForm");

    const profileForm =
      document.getElementById("profileForm");

    if (loginForm) {
      loginForm.addEventListener(
        "submit",
        handleLogin
      );
    }

    if (signupForm) {
      signupForm.addEventListener(
        "submit",
        handleSignup
      );
    }

    if (addFriendForm) {
      addFriendForm.addEventListener(
        "submit",
        handleAddFriend
      );
    }

    if (profileForm) {
      profileForm.addEventListener(
        "submit",
        handleProfileUpdate
      );
    }
  }

  /* =======================================================
     LOGIN
     ======================================================= */

  async function handleLogin(e) {
    e.preventDefault();

    console.log("Login button clicked.");

    const email =
      document
        .getElementById("loginEmail")
        ?.value
        .trim();

    const password =
      document
        .getElementById("loginPassword")
        ?.value;

    if (!email || !password) {
      showToast(
        "Please enter your email and password.",
        "error"
      );

      return;
    }

    const button =
      e.submitter ||
      e.target.querySelector(
        'button[type="submit"]'
      );

    buttonLoading(button, true);

    try {
      const {
        data,
        error
      } =
        await supabaseClient.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        throw error;
      }

      if (data && data.user) {
        await loginUser(data.user);

        showToast(
          "Welcome back! 👋",
          "success"
        );
      }

    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      showToast(
        authError(error),
        "error"
      );

    } finally {
      buttonLoading(button, false);
    }
  }

  /* =======================================================
     SIGN UP
     ======================================================= */

  async function handleSignup(e) {
    e.preventDefault();

    console.log("Signup button clicked.");

    const name =
      document
        .getElementById("signupName")
        ?.value
        .trim();

    const username =
      document
        .getElementById("signupUsername")
        ?.value
        .trim();

    const email =
      document
        .getElementById("signupEmail")
        ?.value
        .trim();

    const password =
      document
        .getElementById("signupPassword")
        ?.value;

    if (!name || !username || !email || !password) {
      showToast(
        "Please fill all fields.",
        "error"
      );

      return;
    }

    if (password.length < 6) {
      showToast(
        "Password must be at least 6 characters.",
        "error"
      );

      return;
    }

    const button =
      e.submitter ||
      e.target.querySelector(
        'button[type="submit"]'
      );

    buttonLoading(button, true);

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

      if (data && data.user) {

        if (data.session) {
          await loginUser(data.user);

          showToast(
            "Account created successfully! 🎉",
            "success"
          );

        } else {
          switchAuth("login");

          showToast(
            "Account created! Please verify your email.",
            "success"
          );
        }
      }

    } catch (error) {
      console.error(
        "Signup error:",
        error
      );

      showToast(
        authError(error),
        "error"
      );

    } finally {
      buttonLoading(button, false);
    }
  }

  /* =======================================================
     LOGIN USER
     ======================================================= */

  async function loginUser(user) {
    currentUser = user;

    console.log(
      "Logged in:",
      user.email
    );

    try {
      await ensureProfile();

      await loadFriends();
      await loadReceivedRequests();
      await loadSentRequests();
      await loadBestFriends();

      updateProfileUI();
      updateCounts();

      renderFriends();
      renderRequests();
      renderBestFriends();
      renderRecentFriends();

      showApp();

      showPage("homePage");

    } catch (error) {
      console.error(
        "User loading error:",
        error
      );

      showApp();
      updateProfileUI();

      showToast(
        "Logged in, but some data could not load.",
        "error"
      );
    }
  }

  /* =======================================================
     PROFILE
     ======================================================= */

  async function ensureProfile() {
    if (!currentUser) return;

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
        console.error(
          "Profile select:",
          error
        );

        return;
      }

      if (data) {
        currentProfile = data;
        return;
      }

      console.log(
        "Profile not found. Creating profile..."
      );

      const metadata =
        currentUser.user_metadata || {};

      const profile = {
        id: currentUser.id,
        name:
          metadata.name ||
          "FriendZone User",

        friend_id:
          "FZ" +
          Math.floor(
            100000 +
            Math.random() * 900000
          ),

        avatar_url:
          metadata.avatar_url ||
          null,

        xp: 0,
        level: 1,
        streak: 0
      };

      const {
        data: created,
        error: createError
      } =
        await supabaseClient
          .from("profiles")
          .insert(profile)
          .select()
          .single();

      if (createError) {
        console.error(
          "Profile creation:",
          createError
        );

        return;
      }

      currentProfile = created;

    } catch (error) {
      console.error(
        "ensureProfile error:",
        error
      );
    }
  }

  /* =======================================================
     LOAD FRIENDS
     ======================================================= */

  async function loadFriends() {
    if (!currentUser) return;

    try {
      const {
        data,
        error
      } =
        await supabaseClient
          .from("friendships")
          .select("*")
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
        console.error(
          "Friends:",
          error
        );

        friends = [];
        return;
      }

      const ids =
        (data || []).map((row) =>
          row.user_id === currentUser.id
            ? row.friend_id
            : row.user_id
        );

      if (!ids.length) {
        friends = [];
        return;
      }

      const {
        data: profiles,
        error: profileError
      } =
        await supabaseClient
          .from("profiles")
          .select("*")
          .in("id", ids);

      if (profileError) {
        console.error(
          "Friend profiles:",
          profileError
        );

        friends = [];
        return;
      }

      friends = profiles || [];

    } catch (error) {
      console.error(
        "loadFriends:",
        error
      );

      friends = [];
    }
  }

  /* =======================================================
     RECEIVED REQUESTS
     ======================================================= */

  async function loadReceivedRequests() {
    if (!currentUser) return;

    try {
      const {
        data,
        error
      } =
        await supabaseClient
          .from("friend_requests")
          .select("*")
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
          );

      if (error) {
        console.error(
          "Received requests:",
          error
        );

        receivedRequests = [];
        return;
      }

      const ids =
        (data || []).map(
          (r) => r.sender_id
        );

      let profiles = [];

      if (ids.length) {
        const {
          data: profileData
        } =
          await supabaseClient
            .from("profiles")
            .select("*")
            .in("id", ids);

        profiles =
          profileData || [];
      }

      receivedRequests =
        (data || []).map(
          (request) => ({
            ...request,
            profile:
              profiles.find(
                (p) =>
                  p.id ===
                  request.sender_id
              ) || null
          })
        );

    } catch (error) {
      console.error(
        "loadReceivedRequests:",
        error
      );

      receivedRequests = [];
    }
  }

  /* =======================================================
     SENT REQUESTS
     ======================================================= */

  async function loadSentRequests() {
    if (!currentUser) return;

    try {
      const {
        data,
        error
      } =
        await supabaseClient
          .from("friend_requests")
          .select("*")
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
          );

      if (error) {
        console.error(
          "Sent requests:",
          error
        );

        sentRequests = [];
        return;
      }

      const ids =
        (data || []).map(
          (r) => r.receiver_id
        );

      let profiles = [];

      if (ids.length) {
        const {
          data: profileData
        } =
          await supabaseClient
            .from("profiles")
            .select("*")
            .in("id", ids);

        profiles =
          profileData || [];
      }

      sentRequests =
        (data || []).map(
          (request) => ({
            ...request,
            profile:
              profiles.find(
                (p) =>
                  p.id ===
                  request.receiver_id
              ) || null
          })
        );

    } catch (error) {
      console.error(
        "loadSentRequests:",
        error
      );

      sentRequests = [];
    }
  }

  /* =======================================================
     BEST FRIENDS
     ======================================================= */

  async function loadBestFriends() {
    if (!currentUser) return;

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
          .order(
            "created_at",
            {
              ascending: false
            }
          );

      if (error) {
        console.error(
          "Best friends:",
          error
        );

        bestFriends = [];
        return;
      }

      const ids =
        (data || []).map(
          (row) => row.friend_id
        );

      if (!ids.length) {
        bestFriends = [];
        return;
      }

      const {
        data: profiles,
        error: profileError
      } =
        await supabaseClient
          .from("profiles")
          .select("*")
          .in("id", ids);

      if (profileError) {
        console.error(
          "Best profiles:",
          profileError
        );

        bestFriends = [];
        return;
      }

      bestFriends =
        profiles || [];

    } catch (error) {
      console.error(
        "loadBestFriends:",
        error
      );

      bestFriends = [];
    }
  }

  /* =======================================================
     NAVIGATION
     ======================================================= */

  function setupNavigation() {
    const items =
      document.querySelectorAll(
        ".nav-item"
      );

    items.forEach((item) => {
      item.addEventListener(
        "click",
        function (e) {
          e.preventDefault();

          const page =
            item.dataset.page;

          if (page) {
            showPage(page);
          }

          closeSidebar();
        }
      );
    });

    const buttons =
      document.querySelectorAll(
        "[data-go-page]"
      );

    buttons.forEach((button) => {
      button.addEventListener(
        "click",
        function (e) {
          e.preventDefault();

          const page =
            button.dataset.goPage;

          if (page) {
            showPage(page);
          }
        }
      );
    });
  }

  function showPage(pageId) {
    const pages =
      document.querySelectorAll(
        ".page"
      );

    pages.forEach((page) => {
      page.classList.remove(
        "active-page"
      );
    });

    const page =
      document.getElementById(pageId);

    if (page) {
      page.classList.add(
        "active-page"
      );
    }

    const nav =
      document.querySelectorAll(
        ".nav-item"
      );

    nav.forEach((item) => {
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

  /* =======================================================
     HEADER
     ======================================================= */

  function updateHeader(pageId) {
    const title =
      document.getElementById(
        "currentPageTitle"
      );

    const subtitle =
      document.getElementById(
        "currentPageSubtitle"
      );

    const pages = {
      homePage: [
        "Home",
        "Welcome back to FriendZone"
      ],

      friendsPage: [
        "My Friends",
        "Connect with your friends"
      ],

      requestsPage: [
        "Friend Requests",
        "Manage your friend requests"
      ],

      bestFriendsPage: [
        "Best Friends",
        "Your closest connections"
      ],

      addFriendPage: [
        "Add Friend",
        "Find friends using their Friend ID"
      ],

      profilePage: [
        "My Profile",
        "Manage your FriendZone profile"
      ]
    };

    const info =
      pages[pageId] ||
      pages.homePage;

    if (title) {
      title.textContent =
        info[0];
    }

    if (subtitle) {
      subtitle.textContent =
        info[1];
    }
  }

  /* =======================================================
     SIDEBAR
     ======================================================= */

  function setupSidebar() {
    const open =
      document.getElementById(
        "openSidebarBtn"
      );

    const close =
      document.getElementById(
        "closeSidebarBtn"
      );

    const overlay =
      document.getElementById(
        "sidebarOverlay"
      );

    const logout =
      document.getElementById(
        "logoutBtn"
      );

    if (open) {
      open.addEventListener(
        "click",
        openSidebar
      );
    }

    if (close) {
      close.addEventListener(
        "click",
        closeSidebar
      );
    }

    if (overlay) {
      overlay.addEventListener(
        "click",
        closeSidebar
      );
    }

    if (logout) {
      logout.addEventListener(
        "click",
        logoutUser
      );
    }
  }

  function openSidebar() {
    const sidebar =
      document.getElementById(
        "sidebar"
      );

    const overlay =
      document.getElementById(
        "sidebarOverlay"
      );

    if (sidebar) {
      sidebar.classList.add(
        "open"
      );
    }

    if (overlay) {
      overlay.classList.add(
        "active"
      );
    }
  }

  function closeSidebar() {
    const sidebar =
      document.getElementById(
        "sidebar"
      );

    const overlay =
      document.getElementById(
        "sidebarOverlay"
      );

    if (sidebar) {
      sidebar.classList.remove(
        "open"
      );
    }

    if (overlay) {
      overlay.classList.remove(
        "active"
      );
    }
  }

  /* =======================================================
     REQUEST TABS
     ======================================================= */

  function setupRequestTabs() {
    const tabs =
      document.querySelectorAll(
        ".request-tab"
      );

    tabs.forEach((tab) => {
      tab.addEventListener(
        "click",
        function () {
          tabs.forEach((t) =>
            t.classList.remove(
              "active"
            )
          );

          tab.classList.add(
            "active"
          );

          const type =
            tab.dataset.requestTab;

          const received =
            document.getElementById(
              "receivedRequestsContainer"
            );

          const sent =
            document.getElementById(
              "sentRequestsContainer"
            );

          if (type === "received") {
            received?.classList.remove(
              "hidden"
            );

            sent?.classList.add(
              "hidden"
            );
          }

          if (type === "sent") {
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

  /* =======================================================
     SEARCH
     ======================================================= */

  function setupSearch() {
    const search =
      document.getElementById(
        "friendsSearch"
      );

    if (search) {
      search.addEventListener(
        "input",
        renderFriends
      );
    }
  }

  /* =======================================================
     ADD FRIEND
     ======================================================= */

  async function handleAddFriend(e) {
    e.preventDefault();

    const input =
      document.getElementById(
        "friendIdInput"
      );

    const friendId =
      input?.value
        .trim()
        .toUpperCase();

    if (!friendId) {
      showToast(
        "Enter a Friend ID.",
        "error"
      );

      return;
    }

    await searchFriend(
      friendId
    );
  }

  async function searchFriend(friendId) {
    const result =
      document.getElementById(
        "friendSearchResult"
      );

    if (result) {
      result.innerHTML = `
        <div class="empty-state">
          <p>Searching...</p>
        </div>
      `;
    }

    try {
      const {
        data: profile,
        error
      } =
        await supabaseClient
          .from("profiles")
          .select("*")
          .eq(
            "friend_id",
            friendId
          )
          .maybeSingle();

      if (error) {
        throw error;
      }

      if (!profile) {
        if (result) {
          result.innerHTML = `
            <div class="empty-state">
              <div class="empty-icon">🔎</div>
              <h3>Friend not found</h3>
              <p>
                No account found with this Friend ID.
              </p>
            </div>
          `;
        }

        return;
      }

      if (
        profile.id ===
        currentUser.id
      ) {
        showToast(
          "You cannot add yourself.",
          "error"
        );

        return;
      }

      const alreadyFriend =
        friends.some(
          (friend) =>
            friend.id ===
            profile.id
        );

      if (alreadyFriend) {
        showSearchResult(
          profile,
          "friend"
        );

        return;
      }

      const {
        data: request
      } =
        await supabaseClient
          .from("friend_requests")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`
          )
          .eq(
            "status",
            "pending"
          )
          .maybeSingle();

      if (request) {
        showSearchResult(
          profile,
          request.sender_id ===
            currentUser.id
            ? "sent"
            : "received"
        );

        return;
      }

      showSearchResult(
        profile,
        "available"
      );

    } catch (error) {
      console.error(
        "Search error:",
        error
      );

      showToast(
        "Could not search for friend.",
        "error"
      );
    }
  }

  function showSearchResult(
    profile,
    state
  ) {
    const result =
      document.getElementById(
        "friendSearchResult"
      );

    if (!result) return;

    let action = "";

    if (state === "available") {
      action = `
        <button
          type="button"
          class="primary-btn"
          data-send-request="${profile.id}"
        >
          Add Friend
        </button>
      `;
    }

    if (state === "friend") {
      action = `
        <span class="friend-status">
          ✓ Already Friends
        </span>
      `;
    }

    if (state === "sent") {
      action = `
        <span class="friend-status">
          Request Sent
        </span>
      `;
    }

    if (state === "received") {
      action = `
        <span class="friend-status">
          Request Received
        </span>
      `;
    }

    result.innerHTML = `
      <div class="friend-card">
        <div class="friend-avatar">
          ${avatar(profile)}
        </div>

        <div class="friend-info">
          <h3>
            ${safe(
              profile.name ||
              "FriendZone User"
            )}
          </h3>

          <p>
            @${safe(
              username(profile)
            )}
          </p>

          <small>
            ${safe(
              profile.friend_id ||
              ""
            )}
          </small>
        </div>

        <div class="friend-actions">
          ${action}
        </div>
      </div>
    `;

    const send =
      result.querySelector(
        "[data-send-request]"
      );

    if (send) {
      send.addEventListener(
        "click",
        async () => {
          await sendFriendRequest(
            profile.id
          );
        }
      );
    }
  }

  /* =======================================================
     SEND REQUEST
     ======================================================= */

  async function sendFriendRequest(
    receiverId
  ) {
    try {
      const {
        data: existing
      } =
        await supabaseClient
          .from("friend_requests")
          .select("*")
          .or(
            `and(sender_id.eq.${currentUser.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${currentUser.id})`
          )
          .in(
            "status",
            [
              "pending",
              "accepted"
            ]
          )
          .maybeSingle();

      if (existing) {
        showToast(
          existing.status ===
            "accepted"
            ? "You are already friends."
            : "Request already exists.",
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
            sender_id:
              currentUser.id,

            receiver_id:
              receiverId,

            status: "pending"
          });

      if (error) {
        throw error;
      }

      showToast(
        "Friend request sent! 🎉",
        "success"
      );

      await loadSentRequests();
      updateCounts();

    } catch (error) {
      console.error(
        "Send request:",
        error
      );

      showToast(
        error.message ||
          "Could not send request.",
        "error"
      );
    }
  }

  /* =======================================================
     ACCEPT REQUEST
     ======================================================= */

  async function acceptRequest(
    requestId
  ) {
    const request =
      receivedRequests.find(
        (r) =>
          r.id === requestId
      );

    if (!request) return;

    try {
      const {
        error
      } =
        await supabaseClient
          .from("friend_requests")
          .update({
            status: "accepted",
            updated_at:
              new Date().toISOString()
          })
          .eq(
            "id",
            requestId
          )
          .eq(
            "receiver_id",
            currentUser.id
          );

      if (error) {
        throw error;
      }

      /*
        Create friendship.
      */
      const {
        error: friendshipError
      } =
        await supabaseClient
          .from("friendships")
          .insert({
            user_id:
              currentUser.id,

            friend_id:
              request.sender_id
          });

      if (
        friendshipError &&
        !String(
          friendshipError.message
        )
          .toLowerCase()
          .includes("duplicate")
      ) {
        console.warn(
          "Friendship:",
          friendshipError
        );
      }

      /*
        Reciprocal friendship.
        If RLS blocks this, the request is
        still accepted.
      */
      await supabaseClient
        .from("friendships")
        .insert({
          user_id:
            request.sender_id,

          friend_id:
            currentUser.id
        });

      showToast(
        "Friend request accepted! 💜",
        "success"
      );

      await loadFriends();
      await loadReceivedRequests();

      updateCounts();
      renderFriends();
      renderRequests();

    } catch (error) {
      console.error(
        "Accept request:",
        error
      );

      showToast(
        error.message ||
          "Could not accept request.",
        "error"
      );
    }
  }

  /* =======================================================
     REJECT REQUEST
     ======================================================= */

  async function rejectRequest(
    requestId
  ) {
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
          .eq(
            "id",
            requestId
          )
          .eq(
            "receiver_id",
            currentUser.id
          );

      if (error) {
        throw error;
      }

      showToast(
        "Friend request rejected.",
        "info"
      );

      await loadReceivedRequests();

      updateCounts();
      renderRequests();

    } catch (error) {
      console.error(
        "Reject request:",
        error
      );

      showToast(
        error.message ||
          "Could not reject request.",
        "error"
      );
    }
  }

  /* =======================================================
     RENDER FRIENDS
     ======================================================= */

  function renderFriends() {
    const container =
      document.getElementById(
        "friendsContainer"
      );

    if (!container) return;

    const search =
      document
        .getElementById(
          "friendsSearch"
        )
        ?.value
        .trim()
        .toLowerCase() || "";

    let list =
      friends;

    if (search) {
      list =
        friends.filter(
          (friend) => {
            const name =
              String(
                friend.name ||
                ""
              ).toLowerCase();

            const user =
              username(
                friend
              ).toLowerCase();

            const id =
              String(
                friend.friend_id ||
                ""
              ).toLowerCase();

            return (
              name.includes(search) ||
              user.includes(search) ||
              id.includes(search)
            );
          }
        );
    }

    if (!list.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            👥
          </div>

          <h3>
            ${
              search
                ? "No friends found"
                : "No friends yet"
            }
          </h3>

          <p>
            ${
              search
                ? "Try another search."
                : "Add friends using their Friend ID."
            }
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      list
        .map(
          createFriendCard
        )
        .join("");

    attachFriendActions(
      container
    );
  }

  function createFriendCard(
    friend
  ) {
    const isBest =
      bestFriends.some(
        (f) =>
          f.id === friend.id
      );

    return `
      <article class="friend-card">

        <button
          type="button"
          class="friend-card-main"
          data-open-friend="${friend.id}"
        >

          <div class="friend-avatar">
            ${avatar(friend)}
          </div>

          <div class="friend-info">

            <h3>
              ${safe(
                friend.name ||
                "FriendZone User"
              )}
            </h3>

            <p>
              @${safe(
                username(friend)
              )}
            </p>

            <small>
              ${safe(
                friend.friend_id ||
                ""
              )}
            </small>

          </div>

        </button>

        <div class="friend-actions">

          <button
            type="button"
            class="icon-action"
            data-open-friend="${friend.id}"
            title="View profile"
          >
            👤
          </button>

          <button
            type="button"
            class="icon-action"
            ${
              isBest
                ? `data-remove-best="${friend.id}"`
                : `data-add-best="${friend.id}"`
            }
            title="${
              isBest
                ? "Remove Best Friend"
                : "Add Best Friend"
            }"
          >
            ${isBest ? "★" : "☆"}
          </button>

        </div>

      </article>
    `;
  }

  function attachFriendActions(
    container
  ) {
    container
      .querySelectorAll(
        "[data-open-friend]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            openFriend(
              button.dataset.openFriend
            );
          }
        );
      });

    container
      .querySelectorAll(
        "[data-add-best]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          async (e) => {
            e.stopPropagation();

            await addBestFriend(
              button.dataset.addBest
            );
          }
        );
      });

    container
      .querySelectorAll(
        "[data-remove-best]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          async (e) => {
            e.stopPropagation();

            await removeBestFriend(
              button.dataset.removeBest
            );
          }
        );
      });
  }

  /* =======================================================
     REQUEST RENDER
     ======================================================= */

  function renderRequests() {
    const received =
      document.getElementById(
        "receivedRequestsContainer"
      );

    const sent =
      document.getElementById(
        "sentRequestsContainer"
      );

    if (received) {
      if (!receivedRequests.length) {
        received.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              📥
            </div>
            <h3>No incoming requests</h3>
            <p>
              You don't have any pending requests.
            </p>
          </div>
        `;
      } else {
        received.innerHTML =
          receivedRequests
            .map(
              requestCard
            )
            .join("");

        attachRequestButtons(
          received
        );
      }
    }

    if (sent) {
      if (!sentRequests.length) {
        sent.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              📤
            </div>
            <h3>No sent requests</h3>
            <p>
              You haven't sent any pending requests.
            </p>
          </div>
        `;
      } else {
        sent.innerHTML =
          sentRequests
            .map(
              sentRequestCard
            )
            .join("");
      }
    }
  }

  function requestCard(
    request
  ) {
    const p =
      request.profile || {};

    return `
      <article class="request-card">

        <div class="friend-avatar">
          ${avatar(p)}
        </div>

        <div class="friend-info">

          <h3>
            ${safe(
              p.name ||
              "FriendZone User"
            )}
          </h3>

          <p>
            @${safe(
              username(p)
            )}
          </p>

          <small>
            ${safe(
              p.friend_id ||
              ""
            )}
          </small>

        </div>

        <div class="request-actions">

          <button
            type="button"
            class="primary-btn"
            data-accept="${request.id}"
          >
            Accept
          </button>

          <button
            type="button"
            class="secondary-btn"
            data-reject="${request.id}"
          >
            Reject
          </button>

        </div>

      </article>
    `;
  }

  function sentRequestCard(
    request
  ) {
    const p =
      request.profile || {};

    return `
      <article class="request-card">

        <div class="friend-avatar">
          ${avatar(p)}
        </div>

        <div class="friend-info">
          <h3>
            ${safe(
              p.name ||
              "FriendZone User"
            )}
          </h3>

          <p>
            @${safe(
              username(p)
            )}
          </p>

          <small>
            ${safe(
              p.friend_id ||
              ""
            )}
          </small>
        </div>

        <div class="request-status">
          Pending
        </div>

      </article>
    `;
  }

  function attachRequestButtons(
    container
  ) {
    container
      .querySelectorAll(
        "[data-accept]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () =>
            acceptRequest(
              button.dataset.accept
            )
        );
      });

    container
      .querySelectorAll(
        "[data-reject]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () =>
            rejectRequest(
              button.dataset.reject
            )
        );
      });
  }

  /* =======================================================
     BEST FRIENDS
     ======================================================= */

  async function addBestFriend(
    friendId
  ) {
    try {
      const exists =
        bestFriends.some(
          (f) =>
            f.id === friendId
        );

      if (exists) {
        showToast(
          "Already in Best Friends.",
          "info"
        );

        return;
      }

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

      if (error) {
        throw error;
      }

      showToast(
        "Added to Best Friends ⭐",
        "success"
      );

      await loadBestFriends();

      updateCounts();
      renderFriends();
      renderBestFriends();

    } catch (error) {
      console.error(
        "Best friend:",
        error
      );

      showToast(
        error.message ||
          "Could not add Best Friend.",
        "error"
      );
    }
  }

  async function removeBestFriend(
    friendId
  ) {
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
            friendId
          );

      if (error) {
        throw error;
      }

      showToast(
        "Removed from Best Friends.",
        "info"
      );

      await loadBestFriends();

      updateCounts();
      renderFriends();
      renderBestFriends();

    } catch (error) {
      console.error(
        "Remove best:",
        error
      );

      showToast(
        error.message ||
          "Could not remove Best Friend.",
        "error"
      );
    }
  }

  function renderBestFriends() {
    const container =
      document.getElementById(
        "bestFriendsContainer"
      );

    if (!container) return;

    if (!bestFriends.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            ⭐
          </div>

          <h3>
            No Best Friends yet
          </h3>

          <p>
            Add your closest friends here.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      bestFriends
        .map(
          (friend) => `
          <article class="friend-card">

            <button
              type="button"
              class="friend-card-main"
              data-open-best="${friend.id}"
            >

              <div class="friend-avatar">
                ${avatar(friend)}
              </div>

              <div class="friend-info">
                <h3>
                  ${safe(
                    friend.name ||
                    "FriendZone User"
                  )}
                </h3>

                <p>
                  @${safe(
                    username(friend)
                  )}
                </p>

                <small>
                  ${safe(
                    friend.friend_id ||
                    ""
                  )}
                </small>
              </div>

            </button>

            <button
              type="button"
              class="icon-action"
              data-remove-best="${friend.id}"
              title="Remove Best Friend"
            >
              ★
            </button>

          </article>
        `
        )
        .join("");

    container
      .querySelectorAll(
        "[data-open-best]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () =>
            openFriend(
              button.dataset.openBest
            )
        );
      });

    container
      .querySelectorAll(
        "[data-remove-best]"
      )
      .forEach((button) => {
        button.addEventListener(
          "click",
          () =>
            removeBestFriend(
              button.dataset.removeBest
            )
        );
      });
  }

  /* =======================================================
     HOME
     ======================================================= */

  function renderRecentFriends() {
    const container =
      document.getElementById(
        "recentFriendsContainer"
      );

    if (!container) return;

    if (!friends.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">
            👋
          </div>

          <h3>
            No friends yet
          </h3>

          <p>
            Add your first friend to get started.
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      friends
        .slice(0, 5)
        .map(
          createFriendCard
        )
        .join("");

    attachFriendActions(
      container
    );
  }

  /* =======================================================
     COUNTS
     ======================================================= */

  function updateCounts() {
    setText(
      "homeFriendsCount",
      friends.length
    );

    setText(
      "homeRequestsCount",
      receivedRequests.length
    );

    setText(
      "homeBestFriendsCount",
      bestFriends.length
    );

    setText(
      "friendsBadge",
      friends.length
    );

    setText(
      "requestsBadge",
      receivedRequests.length
    );

    setText(
      "headerRequestBadge",
      receivedRequests.length
    );

    setText(
      "receivedCount",
      receivedRequests.length
    );

    setText(
      "sentCount",
      sentRequests.length
    );

    renderRecentFriends();
  }

  /* =======================================================
     FRIEND MODAL
     ======================================================= */

  function openFriend(
    friendId
  ) {
    const friend =
      friends.find(
        (f) =>
          f.id === friendId
      ) ||
      bestFriends.find(
        (f) =>
          f.id === friendId
      );

    if (!friend) return;

    currentFriend =
      friend;

    const modal =
      document.getElementById(
        "friendModal"
      );

    const content =
      document.getElementById(
        "modalFriendContent"
      );

    if (!modal || !content) return;

    const isBest =
      bestFriends.some(
        (f) =>
          f.id === friend.id
      );

    content.innerHTML = `
      <div class="modal-friend-profile">

        <div class="large-avatar">
          ${avatar(friend)}
        </div>

        <h2>
          ${safe(
            friend.name ||
            "FriendZone User"
          )}
        </h2>

        <p>
          @${safe(
            username(friend)
          )}
        </p>

        <div class="profile-friend-id">
          Friend ID:
          <strong>
            ${safe(
              friend.friend_id ||
              ""
            )}
          </strong>
        </div>

        <div class="modal-actions">

          ${
            isBest
              ? `
                <button
                  type="button"
                  class="secondary-btn"
                  data-modal-remove="${friend.id}"
                >
                  ★ Remove Best Friend
                </button>
              `
              : `
                <button
                  type="button"
                  class="primary-btn"
                  data-modal-add="${friend.id}"
                >
                  ⭐ Add to Best Friends
                </button>
              `
          }

        </div>

      </div>
    `;

    modal.classList.remove(
      "hidden"
    );

    const add =
      content.querySelector(
        "[data-modal-add]"
      );

    const remove =
      content.querySelector(
        "[data-modal-remove]"
      );

    if (add) {
      add.addEventListener(
        "click",
        async () => {
          await addBestFriend(
            friend.id
          );

          closeModal(
            "friendModal"
          );
        }
      );
    }

    if (remove) {
      remove.addEventListener(
        "click",
        async () => {
          await removeBestFriend(
            friend.id
          );

          closeModal(
            "friendModal"
          );
        }
      );
    }
  }

  /* =======================================================
     MODALS
     ======================================================= */

  function setupModals() {
    document
      .querySelectorAll(
        "[data-close-modal]"
      )
      .forEach((element) => {
        element.addEventListener(
          "click",
          () => {
            const id =
              element.dataset.closeModal;

            if (id) {
              closeModal(id);
            } else {
              element.classList.add(
                "hidden"
              );
            }
          }
        );
      });

    const cancel =
      document.getElementById(
        "confirmCancelBtn"
      );

    const action =
      document.getElementById(
        "confirmActionBtn"
      );

    if (cancel) {
      cancel.type = "button";

      cancel.addEventListener(
        "click",
        closeConfirm
      );
    }

    if (action) {
      action.type = "button";

      action.addEventListener(
        "click",
        async () => {
          if (
            typeof confirmCallback ===
            "function"
          ) {
            const callback =
              confirmCallback;

            closeConfirm();

            await callback();
          }
        }
      );
    }
  }

  function closeModal(
    id
  ) {
    const modal =
      document.getElementById(
        id
      );

    if (modal) {
      modal.classList.add(
        "hidden"
      );
    }
  }

  function showConfirm(
    title,
    message,
    callback
  ) {
    const modal =
      document.getElementById(
        "confirmModal"
      );

    if (!modal) {
      if (window.confirm(message)) {
        callback();
      }

      return;
    }

    setText(
      "confirmTitle",
      title
    );

    setText(
      "confirmMessage",
      message
    );

    confirmCallback =
      callback;

    modal.classList.remove(
      "hidden"
    );
  }

  function closeConfirm() {
    const modal =
      document.getElementById(
        "confirmModal"
      );

    if (modal) {
      modal.classList.add(
        "hidden"
      );
    }

    confirmCallback =
      null;
  }

  /* =======================================================
     PROFILE BUTTONS
     ======================================================= */

  function setupProfileButtons() {
    const copy =
      document.getElementById(
        "copyFriendIdBtn"
      );

    const profile =
      document.getElementById(
        "headerProfileBtn"
      );

    const requests =
      document.getElementById(
        "headerRequestBtn"
      );

    if (copy) {
      copy.type = "button";

      copy.addEventListener(
        "click",
        copyFriendId
      );
    }

    if (profile) {
      profile.type = "button";

      profile.addEventListener(
        "click",
        () =>
          showPage(
            "profilePage"
          )
      );
    }

    if (requests) {
      requests.type = "button";

      requests.addEventListener(
        "click",
        () =>
          showPage(
            "requestsPage"
          )
      );
    }
  }

  /* =======================================================
     PROFILE UPDATE
     ======================================================= */

  async function handleProfileUpdate(
    e
  ) {
    e.preventDefault();

    if (!currentUser) return;

    const name =
      document
        .getElementById(
          "profileNameInput"
        )
        ?.value
        .trim();

    const usernameValue =
      document
        .getElementById(
          "profileUsernameInput"
        )
        ?.value
        .trim();

    if (!name) {
      showToast(
        "Name cannot be empty.",
        "error"
      );

      return;
    }

    try {
      const {
        error: authError
      } =
        await supabaseClient.auth.updateUser(
          {
            data: {
              name,
              username:
                usernameValue || ""
            }
          }
        );

      if (authError) {
        throw authError;
      }

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
        console.warn(
          "Profile update:",
          profileError
        );
      }

      const {
        data
      } =
        await supabaseClient.auth.getUser();

      if (data?.user) {
        currentUser =
          data.user;
      }

      await ensureProfile();

      updateProfileUI();

      showToast(
        "Profile updated successfully! ✨",
        "success"
      );

    } catch (error) {
      console.error(
        "Profile update:",
        error
      );

      showToast(
        error.message ||
          "Could not update profile.",
        "error"
      );
    }
  }

  /* =======================================================
     PROFILE UI
     ======================================================= */

  function updateProfileUI() {
    if (!currentUser) return;

    const metadata =
      currentUser.user_metadata ||
      {};

    const name =
      currentProfile?.name ||
      metadata.name ||
      "FriendZone User";

    const user =
      metadata.username ||
      "friend";

    const friendId =
      currentProfile?.friend_id ||
      "Not assigned";

    setText(
      "sidebarUserName",
      name
    );

    setText(
      "sidebarFriendId",
      friendId
    );

    setText(
      "profileName",
      name
    );

    setText(
      "profileUsername",
      "@" + user
    );

    setText(
      "profileFriendId",
      friendId
    );

    setText(
      "homeFriendId",
      friendId
    );

    setValue(
      "profileNameInput",
      name
    );

    setValue(
      "profileUsernameInput",
      user
    );

    const sidebarAvatar =
      document.getElementById(
        "sidebarAvatar"
      );

    const profileAvatar =
      document.getElementById(
        "profileAvatar"
      );

    if (sidebarAvatar) {
      sidebarAvatar.innerHTML =
        avatar(currentProfile || {
          name
        });
    }

    if (profileAvatar) {
      profileAvatar.innerHTML =
        avatar(currentProfile || {
          name
        });
    }
  }

  /* =======================================================
     COPY FRIEND ID
     ======================================================= */

  async function copyFriendId() {
    const id =
      currentProfile?.friend_id;

    if (!id) {
      showToast(
        "Friend ID not available.",
        "error"
      );

      return;
    }

    try {
      await navigator.clipboard.writeText(
        id
      );

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

  /* =======================================================
     LOGOUT
     ======================================================= */

  async function logoutUser() {
    showConfirm(
      "Log out?",
      "Are you sure you want to log out?",
      async () => {
        try {
          const {
            error
          } =
            await supabaseClient.auth.signOut();

          if (error) {
            throw error;
          }

          resetApp();

          showLoginScreen();

        } catch (error) {
          console.error(
            "Logout:",
            error
          );

          showToast(
            "Could not log out.",
            "error"
          );
        }
      }
    );
  }

  /* =======================================================
     RESET
     ======================================================= */

  function resetApp() {
    currentUser = null;
    currentProfile = null;

    friends = [];
    receivedRequests = [];
    sentRequests = [];
    bestFriends = [];

    currentFriend = null;

    closeSidebar();
    closeConfirm();
  }

  /* =======================================================
     AVATAR
     ======================================================= */

  function avatar(profile) {
    const name =
      profile?.name ||
      "Friend";

    const url =
      profile?.avatar_url ||
      null;

    if (url) {
      return `
        <img
          src="${attribute(url)}"
          alt="${attribute(name)}"
          loading="lazy"
        >
      `;
    }

    return `
      <span class="avatar-fallback">
        ${safe(initials(name))}
      </span>
    `;
  }

  function initials(name) {
    const words =
      String(name)
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) {
      return "F";
    }

    if (words.length === 1) {
      return words[0]
        .slice(0, 2)
        .toUpperCase();
    }

    return (
      words[0][0] +
      words[words.length - 1][0]
    ).toUpperCase();
  }

  /* =======================================================
     USERNAME
     ======================================================= */

  function username(profile) {
    if (!profile) {
      return "friend";
    }

    if (profile.username) {
      return profile.username;
    }

    if (
      profile.user_metadata?.username
    ) {
      return profile
        .user_metadata
        .username;
    }

    if (
      currentUser &&
      profile.id ===
        currentUser.id
    ) {
      return (
        currentUser
          .user_metadata
          ?.username ||
        "friend"
      );
    }

    return "friend";
  }

  /* =======================================================
     BUTTON LOADING
     ======================================================= */

  function buttonLoading(
    button,
    loading
  ) {
    if (!button) return;

    if (loading) {
      if (
        !button.dataset.originalHTML
      ) {
        button.dataset.originalHTML =
          button.innerHTML;
      }

      button.disabled = true;

      button.innerHTML = `
        <span class="button-spinner"></span>
        <span>Please wait...</span>
      `;

    } else {
      button.disabled =
        false;

      if (
        button.dataset.originalHTML
      ) {
        button.innerHTML =
          button.dataset.originalHTML;
      }
    }
  }

  /* =======================================================
     TOAST
     ======================================================= */

  function showToast(
    message,
    type = "info"
  ) {
    const container =
      document.getElementById(
        "toastContainer"
      );

    if (!container) {
      console.log(
        `[${type}]`,
        message
      );

      return;
    }

    const toast =
      document.createElement(
        "div"
      );

    toast.className =
      "toast toast-" +
      type;

    const icon =
      type === "success"
        ? "✓"
        : type === "error"
        ? "!"
        : "i";

    toast.innerHTML = `
      <span class="toast-icon">
        ${icon}
      </span>

      <span class="toast-message">
        ${safe(message)}
      </span>

      <button
        type="button"
        class="toast-close"
      >
        ×
      </button>
    `;

    container.appendChild(
      toast
    );

    setTimeout(() => {
      toast.classList.add(
        "show"
      );
    }, 10);

    const close =
      toast.querySelector(
        ".toast-close"
      );

    if (close) {
      close.addEventListener(
        "click",
        () => removeToast(toast)
      );
    }

    setTimeout(
      () => removeToast(toast),
      4000
    );
  }

  function removeToast(
    toast
  ) {
    if (!toast) return;

    toast.classList.remove(
      "show"
    );

    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  /* =======================================================
     HELPERS
     ======================================================= */

  function setText(
    id,
    value
  ) {
    const element =
      document.getElementById(id);

    if (element) {
      element.textContent =
        value ?? "";
    }
  }

  function setValue(
    id,
    value
  ) {
    const element =
      document.getElementById(id);

    if (element) {
      element.value =
        value ?? "";
    }
  }

  function safe(value) {
    return String(
      value ?? ""
    )
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

  function attribute(value) {
    return safe(value);
  }

  function authError(
    error
  ) {
    const message =
      String(
        error?.message ||
          ""
      ).toLowerCase();

    if (
      message.includes(
        "invalid login credentials"
      )
    ) {
      return "Incorrect email or password.";
    }

    if (
      message.includes(
        "email not confirmed"
      )
    ) {
      return "Please verify your email first.";
    }

    if (
      message.includes(
        "user already registered"
      )
    ) {
      return "This email is already registered.";
    }

    if (
      message.includes(
        "password should be at least"
      )
    ) {
      return "Password must be at least 6 characters.";
    }

    if (
      message.includes(
        "rate limit"
      )
    ) {
      return "Too many attempts. Please wait and try again.";
    }

    return (
      error?.message ||
      "Something went wrong."
    );
  }

  /* =======================================================
     GLOBAL ERROR LOGGING
     ======================================================= */

  window.addEventListener(
    "error",
    (event) => {
      console.error(
        "FriendZone error:",
        event.error ||
          event.message
      );
    }
  );

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      console.error(
        "FriendZone promise error:",
        event.reason
      );
    }
  );

})();
