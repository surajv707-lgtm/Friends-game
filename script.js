/* =========================================================
   FRIENDZONE — MAIN JAVASCRIPT
   Premium Friends System
   Supabase connected
   NO STARTUP LOADING SCREEN
========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIG
  ======================================================= */

  const config = window.FRIENDZONE_CONFIG || {};

  const SUPABASE_URL = config.SUPABASE_URL;
  const SUPABASE_ANON_KEY = config.SUPABASE_ANON_KEY;

  let db = null;
  let currentUser = null;
  let currentProfile = null;

  let friends = [];
  let receivedRequests = [];
  let sentRequests = [];
  let bestFriends = [];

  let activeRequestTab = "received";

  const avatarFallback =
    "https://ui-avatars.com/api/?background=6d3ee8&color=fff&bold=true&name=";


  /* =======================================================
     DOM HELPERS
  ======================================================= */

  const $ = (selector) => document.querySelector(selector);

  const $$ = (selector) => [...document.querySelectorAll(selector)];


  /* =======================================================
     INITIALIZE
  ======================================================= */

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    try {
      setupUI();

      if (
        !SUPABASE_URL ||
        !SUPABASE_ANON_KEY ||
        !window.supabase
      ) {
        console.error("Supabase configuration is missing.");

        showAuth();

        showToast(
          "Supabase could not be initialized. Check your configuration.",
          "error"
        );

        return;
      }

      db = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );

      const {
        data: { session },
        error
      } = await db.auth.getSession();

      if (error) {
        console.error(error);
        showAuth();
        return;
      }

      if (session?.user) {
        currentUser = session.user;

        await openMainApp();
      } else {
        showAuth();
      }

      db.auth.onAuthStateChange(async (_event, sessionData) => {
        if (sessionData?.user) {
          currentUser = sessionData.user;

          await openMainApp();
        } else {
          currentUser = null;
          currentProfile = null;

          showAuth();
        }
      });

    } catch (error) {
      console.error("FriendZone startup error:", error);

      /*
        IMPORTANT:
        There is intentionally NO loading screen here.
        Even if something fails, the user can still see
        the login page.
      */

      showAuth();

      showToast(
        error?.message || "Something went wrong.",
        "error"
      );
    }
  }


  /* =======================================================
     UI SETUP
  ======================================================= */

  function setupUI() {

    /* ---------------------------------------------
       AUTH SWITCH
    --------------------------------------------- */

    $("#showSignupBtn")?.addEventListener("click", () => {
      $("#loginPanel")?.classList.add("hidden");
      $("#signupPanel")?.classList.remove("hidden");
    });

    $("#showLoginBtn")?.addEventListener("click", () => {
      $("#signupPanel")?.classList.add("hidden");
      $("#loginPanel")?.classList.remove("hidden");
    });


    /* ---------------------------------------------
       PASSWORD TOGGLE
    --------------------------------------------- */

    $$(".password-toggle").forEach((button) => {
      button.addEventListener("click", () => {
        const targetId = button.dataset.target;
        const input = document.getElementById(targetId);

        if (!input) return;

        if (input.type === "password") {
          input.type = "text";
          button.textContent = "Hide";
        } else {
          input.type = "password";
          button.textContent = "Show";
        }
      });
    });


    /* ---------------------------------------------
       LOGIN
    --------------------------------------------- */

    $("#loginForm")?.addEventListener("submit", handleLogin);


    /* ---------------------------------------------
       SIGNUP
    --------------------------------------------- */

    $("#signupForm")?.addEventListener("submit", handleSignup);


    /* ---------------------------------------------
       LOGOUT
    --------------------------------------------- */

    $("#logoutBtn")?.addEventListener("click", handleLogout);


    /* ---------------------------------------------
       SIDEBAR
    --------------------------------------------- */

    $("#openSidebarBtn")?.addEventListener("click", openSidebar);

    $("#closeSidebarBtn")?.addEventListener("click", closeSidebar);

    $("#sidebarOverlay")?.addEventListener("click", closeSidebar);


    /* ---------------------------------------------
       NAVIGATION
    --------------------------------------------- */

    $$(".nav-item").forEach((button) => {
      button.addEventListener("click", () => {
        const page = button.dataset.page;

        navigateTo(page);
        closeSidebar();
      });
    });


    /* ---------------------------------------------
       QUICK NAVIGATION
    --------------------------------------------- */

    $$("[data-go-page]").forEach((button) => {
      button.addEventListener("click", () => {
        navigateTo(button.dataset.goPage);
      });
    });


    /* ---------------------------------------------
       HEADER BUTTONS
    --------------------------------------------- */

    $("#headerRequestBtn")?.addEventListener("click", () => {
      navigateTo("requests");
    });

    $("#headerProfileBtn")?.addEventListener("click", () => {
      navigateTo("profile");
    });


    /* ---------------------------------------------
       REQUEST TABS
    --------------------------------------------- */

    $$(".request-tab").forEach((button) => {
      button.addEventListener("click", () => {

        const tab =
          button.dataset.requestTab ||
          button.dataset.tab;

        switchRequestTab(tab);
      });
    });


    /* ---------------------------------------------
       FRIEND SEARCH
    --------------------------------------------- */

    $("#friendsSearch")?.addEventListener(
      "input",
      handleFriendsSearch
    );


    /* ---------------------------------------------
       ADD FRIEND
    --------------------------------------------- */

    $("#addFriendForm")?.addEventListener(
      "submit",
      handleFriendSearch
    );


    /* ---------------------------------------------
       PROFILE
    --------------------------------------------- */

    $("#profileForm")?.addEventListener(
      "submit",
      handleProfileUpdate
    );


    /* ---------------------------------------------
       COPY FRIEND ID
    --------------------------------------------- */

    $("#copyFriendIdBtn")?.addEventListener(
      "click",
      copyFriendId
    );


    /* ---------------------------------------------
       MODALS
    --------------------------------------------- */

    $$("[data-close-modal]").forEach((button) => {
      button.addEventListener("click", () => {
        const modalId = button.dataset.closeModal;

        if (modalId) {
          closeModal(modalId);
        }
      });
    });

    $$(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          overlay.classList.add("hidden");
        }
      });
    });

    $("#confirmCancelBtn")?.addEventListener(
      "click",
      cancelConfirm
    );
  }


  /* =======================================================
     AUTH
  ======================================================= */

  function showAuth() {

    $("#mainApp")?.classList.add("hidden");

    $("#authScreen")?.classList.remove("hidden");

    $("#loginPanel")?.classList.remove("hidden");

    $("#signupPanel")?.classList.add("hidden");
  }


  function showMain() {

    $("#authScreen")?.classList.add("hidden");

    $("#mainApp")?.classList.remove("hidden");
  }


  /* =======================================================
     LOGIN
  ======================================================= */

  async function handleLogin(event) {

    event.preventDefault();

    if (!db) {
      showToast("Supabase is not connected.", "error");
      return;
    }

    const email =
      $("#loginEmail")?.value.trim();

    const password =
      $("#loginPassword")?.value;

    if (!email || !password) {
      showToast(
        "Please enter your email and password.",
        "error"
      );

      return;
    }

    const button =
      event.submitter ||
      $("#loginForm button[type='submit']");

    setButtonLoading(button, true);

    try {

      const { error } =
        await db.auth.signInWithPassword({
          email,
          password
        });

      if (error) {
        throw error;
      }

      showToast(
        "Welcome back! 👋",
        "success"
      );

    } catch (error) {

      console.error(error);

      showToast(
        getFriendlyAuthError(error),
        "error"
      );

    } finally {

      setButtonLoading(button, false);
    }
  }


  /* =======================================================
     SIGNUP
  ======================================================= */

  async function handleSignup(event) {

    event.preventDefault();

    if (!db) {
      showToast("Supabase is not connected.", "error");
      return;
    }

    const name =
      $("#signupName")?.value.trim();

    const username =
      $("#signupUsername")?.value.trim();

    const email =
      $("#signupEmail")?.value.trim();

    const password =
      $("#signupPassword")?.value;

    if (!name || !username || !email || !password) {
      showToast(
        "Please fill in all fields.",
        "error"
      );

      return;
    }

    if (password.length < 6) {
      showToast(
        "Password must contain at least 6 characters.",
        "error"
      );

      return;
    }

    const button =
      event.submitter ||
      $("#signupForm button[type='submit']");

    setButtonLoading(button, true);

    try {

      const {
        data,
        error
      } = await db.auth.signUp({

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

        currentUser = data.user;

        showToast(
          "Account created successfully! 🎉",
          "success"
        );

        await openMainApp();

      } else {

        showToast(
          "Account created. Please verify your email before logging in.",
          "success"
        );

        $("#signupForm")?.reset();

        $("#signupPanel")?.classList.add("hidden");

        $("#loginPanel")?.classList.remove("hidden");
      }

    } catch (error) {

      console.error(error);

      showToast(
        getFriendlyAuthError(error),
        "error"
      );

    } finally {

      setButtonLoading(button, false);
    }
  }


  /* =======================================================
     LOGOUT
  ======================================================= */

  async function handleLogout() {

    if (!db) {
      showAuth();
      return;
    }

    try {

      const { error } =
        await db.auth.signOut();

      if (error) {
        throw error;
      }

      currentUser = null;
      currentProfile = null;

      friends = [];
      receivedRequests = [];
      sentRequests = [];
      bestFriends = [];

      showAuth();

      showToast(
        "You have been logged out.",
        "success"
      );

    } catch (error) {

      console.error(error);

      showToast(
        "Unable to logout. Please try again.",
        "error"
      );
    }
  }


  /* =======================================================
     OPEN MAIN APP
  ======================================================= */

  async function openMainApp() {

    if (!currentUser) {
      showAuth();
      return;
    }

    showMain();

    /*
      Navigate immediately.
      Data loads after the interface is visible.
    */

    navigateTo("home");

    try {

      await loadProfile();

    } catch (error) {

      console.error(
        "Profile loading error:",
        error
      );

    }

    /*
      These are loaded separately so one failed query
      cannot make the whole website blank.
    */

    await Promise.allSettled([
      loadFriends(),
      loadRequests(),
      loadBestFriends()
    ]);

    updateAllUI();

    setupRealtime();
  }


  /* =======================================================
     PROFILE
  ======================================================= */

  async function loadProfile() {

    if (!currentUser || !db) return;

    const {
      data,
      error
    } = await db
      .from("profiles")
      .select("*")
      .eq("id", currentUser.id)
      .maybeSingle();

    if (error) {
      console.error(
        "Profile query error:",
        error
      );

      return;
    }

    if (data) {

      currentProfile = data;

    } else {

      /*
        Normally your Supabase trigger creates the profile.
        This fallback keeps the app usable if the trigger
        has not created it yet.
      */

      const metadata =
        currentUser.user_metadata || {};

      currentProfile = {
        id: currentUser.id,

        name:
          metadata.name ||
          currentUser.email?.split("@")[0] ||
          "Friend",

        friend_id:
          metadata.friend_id ||
          null,

        avatar_url:
          metadata.avatar_url ||
          null,

        xp: 0,
        level: 1,
        streak: 0
      };
    }

    updateProfileUI();
  }


  async function handleProfileUpdate(event) {

    event.preventDefault();

    if (!currentUser || !db) return;

    const name =
      $("#profileNameInput")?.value.trim();

    const username =
      $("#profileUsernameInput")?.value.trim();

    if (!name || !username) {
      showToast(
        "Name and username cannot be empty.",
        "error"
      );

      return;
    }

    const button =
      event.submitter ||
      $("#profileForm button[type='submit']");

    setButtonLoading(button, true);

    try {

      /*
        Your current profiles schema does not require
        a username column, so username is safely stored
        in Supabase Auth metadata.
      */

      const {
        error: authError
      } = await db.auth.updateUser({
        data: {
          name,
          username
        }
      });

      if (authError) {
        throw authError;
      }


      /*
        Update the profile name.
      */

      const {
        error: profileError
      } = await db
        .from("profiles")
        .update({
          name,
          updated_at: new Date().toISOString()
        })
        .eq("id", currentUser.id);

      if (profileError) {

        console.warn(
          "Profile name update warning:",
          profileError
        );
      }


      currentUser.user_metadata = {
        ...(currentUser.user_metadata || {}),
        name,
        username
      };


      if (currentProfile) {
        currentProfile.name = name;
      }

      updateProfileUI();

      showToast(
        "Profile updated successfully.",
        "success"
      );

    } catch (error) {

      console.error(error);

      showToast(
        error?.message ||
        "Unable to update profile.",
        "error"
      );

    } finally {

      setButtonLoading(button, false);
    }
  }


  /* =======================================================
     FRIENDS
  ======================================================= */

  async function loadFriends() {

    if (!currentUser || !db) return;

    friends = [];

    try {

      const {
        data,
        error
      } = await db
        .from("friendships")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", {
          ascending: false
        });

      if (error) {
        console.error(
          "Friendships error:",
          error
        );

        return;
      }

      if (!data?.length) {
        renderFriends();
        return;
      }

      const friendIds =
        data
          .map((row) => row.friend_id)
          .filter(Boolean);

      if (!friendIds.length) {
        renderFriends();
        return;
      }

      const {
        data: profiles,
        error: profileError
      } = await db
        .from("profiles")
        .select("*")
        .in("id", friendIds);

      if (profileError) {
        console.error(profileError);
        return;
      }

      const profileMap =
        new Map(
          (profiles || []).map(
            (profile) => [
              profile.id,
              profile
            ]
          )
        );

      friends = data
        .map((friendship) => {

          const profile =
            profileMap.get(
              friendship.friend_id
            );

          if (!profile) return null;

          return {
            ...profile,
            friendship_id: friendship.id
          };

        })
        .filter(Boolean);

    } catch (error) {

      console.error(error);

    }

    renderFriends();
    updateCounts();
  }


  function renderFriends(searchTerm = "") {

    const container =
      $("#friendsContainer");

    if (!container) return;

    let list = [...friends];

    if (searchTerm) {

      const query =
        searchTerm.toLowerCase();

      list = list.filter((friend) => {

        const name =
          String(friend.name || "")
            .toLowerCase();

        const friendId =
          String(friend.friend_id || "")
            .toLowerCase();

        const username =
          getUsername(friend)
            .toLowerCase();

        return (
          name.includes(query) ||
          friendId.includes(query) ||
          username.includes(query)
        );
      });
    }

    if (!list.length) {

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>
            ${
              searchTerm
                ? "No friends found"
                : "No friends yet"
            }
          </h3>
          <p>
            ${
              searchTerm
                ? "Try another search."
                : "Add someone using their Friend ID."
            }
          </p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      list
        .map((friend) =>
          friendCardHTML(
            friend,
            {
              showBestButton: true,
              showRemoveButton: true
            }
          )
        )
        .join("");

    attachFriendCardEvents(container);
  }


  function renderRecentFriends() {

    const container =
      $("#recentFriendsContainer");

    if (!container) return;

    const recent =
      friends.slice(0, 3);

    if (!recent.length) {

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>No friends yet</h3>
          <p>Add someone using their Friend ID.</p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      recent
        .map((friend) =>
          friendCardHTML(
            friend,
            {
              showBestButton: true,
              showRemoveButton: false
            }
          )
        )
        .join("");

    attachFriendCardEvents(container);
  }


  /* =======================================================
     FRIEND CARD
  ======================================================= */

  function friendCardHTML(
    friend,
    options = {}
  ) {

    const {
      showBestButton = false,
      showRemoveButton = false
    } = options;

    const name =
      escapeHTML(
        friend.name ||
        "Friend"
      );

    const username =
      escapeHTML(
        getUsername(friend)
      );

    const friendId =
      escapeHTML(
        friend.friend_id ||
        "No ID"
      );

    const avatar =
      getAvatar(friend);

    const isBest =
      bestFriends.some(
        (item) =>
          item.friend_id === friend.id
      );

    return `
      <article
        class="friend-card"
        data-friend-id="${escapeAttr(friend.id)}"
      >

        <div class="friend-avatar">
          <img
            src="${escapeAttr(avatar)}"
            alt="${name}"
            loading="lazy"
            onerror="this.src='${escapeAttr(
              avatarFallback + encodeURIComponent(name)
            )}'"
          />

          <span class="online-dot"></span>
        </div>

        <div class="friend-info">

          <h3>${name}</h3>

          <p>${username}</p>

          <span class="friend-id">
            ${friendId}
          </span>

        </div>

        <div class="friend-card-actions">

          <button
            type="button"
            class="small-action-btn view-friend-btn"
            data-id="${escapeAttr(friend.id)}"
            title="View profile"
          >
            View
          </button>

          ${
            showBestButton
              ? `
                <button
                  type="button"
                  class="small-action-btn best toggle-best-btn"
                  data-id="${escapeAttr(friend.id)}"
                  title="${
                    isBest
                      ? "Remove from Best Friends"
                      : "Add to Best Friends"
                  }"
                >
                  ${isBest ? "♥" : "♡"}
                </button>
              `
              : ""
          }

          ${
            showRemoveButton
              ? `
                <button
                  type="button"
                  class="small-action-btn danger remove-friend-btn"
                  data-id="${escapeAttr(friend.id)}"
                  title="Remove friend"
                >
                  ×
                </button>
              `
              : ""
          }

        </div>

      </article>
    `;
  }


  function attachFriendCardEvents(container) {

    container
      .querySelectorAll(".view-friend-btn")
      .forEach((button) => {

        button.addEventListener("click", () => {

          const id =
            button.dataset.id;

          const friend =
            friends.find(
              (item) =>
                item.id === id
            );

          if (friend) {
            openFriendModal(friend);
          }
        });
      });


    container
      .querySelectorAll(".toggle-best-btn")
      .forEach((button) => {

        button.addEventListener("click", async () => {

          const id =
            button.dataset.id;

          await toggleBestFriend(id);
        });
      });


    container
      .querySelectorAll(".remove-friend-btn")
      .forEach((button) => {

        button.addEventListener("click", async () => {

          const id =
            button.dataset.id;

          const friend =
            friends.find(
              (item) =>
                item.id === id
            );

          if (!friend) return;

          askConfirmation(
            "Remove Friend?",
            `Are you sure you want to remove ${
              friend.name || "this friend"
            } from your Friends list?`,
            async () => {
              await removeFriend(id);
            }
          );
        });
      });
  }


  /* =======================================================
     FRIEND REQUESTS
  ======================================================= */

  async function loadRequests() {

    if (!currentUser || !db) return;

    receivedRequests = [];
    sentRequests = [];

    try {

      const {
        data: received,
        error: receivedError
      } = await db
        .from("friend_requests")
        .select("*")
        .eq("receiver_id", currentUser.id)
        .eq("status", "pending")
        .order("created_at", {
          ascending: false
        });

      if (receivedError) {
        console.error(
          "Received requests error:",
          receivedError
        );
      }


      const {
        data: sent,
        error: sentError
      } = await db
        .from("friend_requests")
        .select("*")
        .eq("sender_id", currentUser.id)
        .eq("status", "pending")
        .order("created_at", {
          ascending: false
        });

      if (sentError) {
        console.error(
          "Sent requests error:",
          sentError
        );
      }


      const receivedRows =
        received || [];

      const sentRows =
        sent || [];


      /*
        Get profile IDs separately.
        This avoids fragile Supabase foreign-key
        relation names.
      */

      const receivedIds =
        receivedRows
          .map((row) => row.sender_id)
          .filter(Boolean);

      const sentIds =
        sentRows
          .map((row) => row.receiver_id)
          .filter(Boolean);


      const allIds =
        [
          ...new Set([
            ...receivedIds,
            ...sentIds
          ])
        ];


      let profileMap =
        new Map();


      if (allIds.length) {

        const {
          data: profiles,
          error: profileError
        } = await db
          .from("profiles")
          .select("*")
          .in("id", allIds);

        if (!profileError) {

          profileMap =
            new Map(
              (profiles || []).map(
                (profile) => [
                  profile.id,
                  profile
                ]
              )
            );
        }
      }


      receivedRequests =
        receivedRows.map((request) => ({
          ...request,
          profile:
            profileMap.get(
              request.sender_id
            ) || null
        }));


      sentRequests =
        sentRows.map((request) => ({
          ...request,
          profile:
            profileMap.get(
              request.receiver_id
            ) || null
        }));

    } catch (error) {

      console.error(
        "Request loading error:",
        error
      );
    }

    renderRequests();
    updateCounts();
  }


  function renderRequests() {

    renderReceivedRequests();
    renderSentRequests();

    $("#receivedCount").textContent =
      receivedRequests.length;

    $("#sentCount").textContent =
      sentRequests.length;
  }


  function renderReceivedRequests() {

    const container =
      $("#receivedRequestsContainer");

    if (!container) return;

    if (!receivedRequests.length) {

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">♡</div>
          <h3>No incoming requests</h3>
          <p>You don't have any pending requests right now.</p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      receivedRequests
        .map((request) =>
          requestCardHTML(
            request,
            "received"
          )
        )
        .join("");

    attachRequestEvents(container);
  }


  function renderSentRequests() {

    const container =
      $("#sentRequestsContainer");

    if (!container) return;

    if (!sentRequests.length) {

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">↗</div>
          <h3>No sent requests</h3>
          <p>Friend requests you send will appear here.</p>
        </div>
      `;

      return;
    }

    container.innerHTML =
      sentRequests
        .map((request) =>
          requestCardHTML(
            request,
            "sent"
          )
        )
        .join("");

    attachRequestEvents(container);
  }


  function requestCardHTML(
    request,
    type
  ) {

    const profile =
      request.profile || {};

    const name =
      escapeHTML(
        profile.name ||
        "Friend"
      );

    const username =
      escapeHTML(
        getUsername(profile)
      );

    const avatar =
      getAvatar(profile);

    const friendId =
      escapeHTML(
        profile.friend_id ||
        "No ID"
      );


    if (type === "received") {

      return `
        <article
          class="request-card"
          data-request-id="${escapeAttr(request.id)}"
        >

          <div class="friend-avatar">
            <img
              src="${escapeAttr(avatar)}"
              alt="${name}"
              loading="lazy"
            />
          </div>

          <div class="request-info">
            <h3>${name}</h3>
            <p>${username}</p>
            <p>${friendId}</p>
          </div>

          <div class="request-actions">

            <button
              type="button"
              class="accept-btn accept-request-btn"
              data-id="${escapeAttr(request.id)}"
            >
              Accept
            </button>

            <button
              type="button"
              class="reject-btn reject-request-btn"
              data-id="${escapeAttr(request.id)}"
            >
              Reject
            </button>

          </div>

        </article>
      `;
    }


    return `
      <article
        class="request-card"
        data-request-id="${escapeAttr(request.id)}"
      >

        <div class="friend-avatar">
          <img
            src="${escapeAttr(avatar)}"
            alt="${name}"
            loading="lazy"
          />
        </div>

        <div class="request-info">
          <h3>${name}</h3>
          <p>${username}</p>
          <p>${friendId}</p>
        </div>

        <div class="request-actions">

          <button
            type="button"
            class="reject-btn cancel-request-btn"
            data-id="${escapeAttr(request.id)}"
          >
            Cancel
          </button>

        </div>

      </article>
    `;
  }


  function attachRequestEvents(container) {

    container
      .querySelectorAll(".accept-request-btn")
      .forEach((button) => {

        button.addEventListener("click", async () => {

          await acceptRequest(
            button.dataset.id
          );
        });
      });


    container
      .querySelectorAll(".reject-request-btn")
      .forEach((button) => {

        button.addEventListener("click", async () => {

          await rejectRequest(
            button.dataset.id
          );
        });
      });


    container
      .querySelectorAll(".cancel-request-btn")
      .forEach((button) => {

        button.addEventListener("click", async () => {

          await cancelRequest(
            button.dataset.id
          );
        });
      });
  }


  /* =======================================================
     SEND FRIEND REQUEST
  ======================================================= */

  async function handleFriendSearch(event) {

    event.preventDefault();

    const input =
      $("#friendIdInput");

    const result =
      $("#friendSearchResult");

    if (!input || !result) return;

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


    if (!currentUser || !db) {

      showToast(
        "Please login first.",
        "error"
      );

      return;
    }


    result.innerHTML = `
      <div class="search-result-card">
        <div class="search-result-info">
          <h3>Searching...</h3>
          <p>Please wait.</p>
        </div>
      </div>
    `;


    try {

      const {
        data: profile,
        error
      } = await db
        .from("profiles")
        .select("*")
        .eq("friend_id", friendId)
        .maybeSingle();


      if (error) {
        throw error;
      }


      if (!profile) {

        result.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">?</div>
            <h3>Friend not found</h3>
            <p>
              No account was found with
              Friend ID ${escapeHTML(friendId)}.
            </p>
          </div>
        `;

        return;
      }


      if (profile.id === currentUser.id) {

        result.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">🙂</div>
            <h3>That's you!</h3>
            <p>You cannot send a friend request to yourself.</p>
          </div>
        `;

        return;
      }


      const alreadyFriend =
        friends.some(
          (friend) =>
            friend.id === profile.id
        );


      if (alreadyFriend) {

        renderSearchResult(
          profile,
          "Already your friend"
        );

        return;
      }


      const {
        data: existingRequests,
        error: requestError
      } = await db
        .from("friend_requests")
        .select("*")
        .or(
          `and(sender_id.eq.${currentUser.id},receiver_id.eq.${profile.id}),and(sender_id.eq.${profile.id},receiver_id.eq.${currentUser.id})`
        )
        .eq("status", "pending");


      if (requestError) {
        throw requestError;
      }


      if (existingRequests?.length) {

        const request =
          existingRequests[0];

        if (
          request.sender_id ===
          currentUser.id
        ) {

          renderSearchResult(
            profile,
            "Request already sent"
          );

        } else {

          renderSearchResult(
            profile,
            "This person already sent you a request"
          );
        }

        return;
      }


      renderSearchResult(
        profile,
        "available"
      );

    } catch (error) {

      console.error(error);

      result.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">!</div>
          <h3>Something went wrong</h3>
          <p>
            Unable to search for this Friend ID.
          </p>
        </div>
      `;
    }
  }


  function renderSearchResult(
    profile,
    status
  ) {

    const result =
      $("#friendSearchResult");

    if (!result) return;

    const name =
      escapeHTML(
        profile.name ||
        "Friend"
      );

    const username =
      escapeHTML(
        getUsername(profile)
      );

    const friendId =
      escapeHTML(
        profile.friend_id ||
        "No ID"
      );

    const avatar =
      getAvatar(profile);


    let buttonHTML = "";

    if (status === "available") {

      buttonHTML = `
        <button
          type="button"
          class="primary-btn send-request-btn"
        >
          Send Request
        </button>
      `;

    } else {

      buttonHTML = `
        <span class="search-result-status">
          ${escapeHTML(status)}
        </span>
      `;
    }


    result.innerHTML = `
      <div class="search-result-card">

        <div class="friend-avatar">
          <img
            src="${escapeAttr(avatar)}"
            alt="${name}"
          />
        </div>

        <div class="search-result-info">

          <h3>${name}</h3>

          <p>
            ${username}
            ·
            ${friendId}
          </p>

        </div>

        ${buttonHTML}

      </div>
    `;


    const button =
      result.querySelector(
        ".send-request-btn"
      );

    button?.addEventListener(
      "click",
      async () => {

        await sendFriendRequest(
          profile.id,
          button
        );
      }
    );
  }


  async function sendFriendRequest(
    receiverId,
    button
  ) {

    if (!currentUser || !db) return;

    setButtonLoading(
      button,
      true
    );

    try {

      const {
        error
      } = await db
        .from("friend_requests")
        .insert({
          sender_id: currentUser.id,
          receiver_id: receiverId,
          status: "pending"
        });

      if (error) {
        throw error;
      }

      showToast(
        "Friend request sent! 💜",
        "success"
      );

      const input =
        $("#friendIdInput");

      const result =
        $("#friendSearchResult");

      if (input) {
        input.value = "";
      }

      if (result) {
        result.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">✓</div>
            <h3>Request sent!</h3>
            <p>Your friend request has been sent successfully.</p>
          </div>
        `;
      }

      await loadRequests();

    } catch (error) {

      console.error(error);

      showToast(
        error?.message ||
        "Unable to send friend request.",
        "error"
      );

    } finally {

      setButtonLoading(
        button,
        false
      );
    }
  }


  /* =======================================================
     ACCEPT REQUEST
  ======================================================= */

  async function acceptRequest(
    requestId
  ) {

    if (!currentUser || !db) return;

    try {

      const {
        data: request,
        error: requestError
      } = await db
        .from("friend_requests")
        .select("*")
        .eq("id", requestId)
        .eq("receiver_id", currentUser.id)
        .eq("status", "pending")
        .maybeSingle();


      if (requestError) {
        throw requestError;
      }


      if (!request) {

        showToast(
          "This request is no longer available.",
          "error"
        );

        await loadRequests();

        return;
      }


      /*
        Mark request accepted.
      */

      const {
        error: updateError
      } = await db
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
        Create friendship for receiver.
      */

      const {
        error: firstFriendshipError
      } = await db
        .from("friendships")
        .insert({
          user_id: currentUser.id,
          friend_id: request.sender_id
        });


      /*
        Create friendship for sender.
      */

      const {
        error: secondFriendshipError
      } = await db
        .from("friendships")
        .insert({
          user_id: request.sender_id,
          friend_id: currentUser.id
        });


      /*
        Duplicate errors are harmless if the row
        already exists.
      */

      if (
        firstFriendshipError &&
        !isDuplicateError(firstFriendshipError)
      ) {
        throw firstFriendshipError;
      }

      if (
        secondFriendshipError &&
        !isDuplicateError(secondFriendshipError)
      ) {
        throw secondFriendshipError;
      }


      showToast(
        "Friend request accepted! 🎉",
        "success"
      );


      await Promise.allSettled([
        loadFriends(),
        loadRequests()
      ]);

      updateAllUI();

    } catch (error) {

      console.error(error);

      showToast(
        error?.message ||
        "Unable to accept request.",
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

    if (!currentUser || !db) return;

    try {

      const {
        error
      } = await db
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

      console.error(error);

      showToast(
        error?.message ||
        "Unable to reject request.",
        "error"
      );
    }
  }


  /* =======================================================
     CANCEL REQUEST
  ======================================================= */

  async function cancelRequest(
    requestId
  ) {

    if (!currentUser || !db) return;

    try {

      const {
        error
      } = await db
        .from("friend_requests")
        .delete()
        .eq("id", requestId)
        .eq("sender_id", currentUser.id)
        .eq("status", "pending");


      if (error) {
        throw error;
      }


      showToast(
        "Friend request cancelled.",
        "success"
      );

      await loadRequests();

    } catch (error) {

      console.error(error);

      showToast(
        error?.message ||
        "Unable to cancel request.",
        "error"
      );
    }
  }


  /* =======================================================
     BEST FRIENDS
  ======================================================= */

  async function loadBestFriends() {

    if (!currentUser || !db) return;

    bestFriends = [];

    try {

      const {
        data,
        error
      } = await db
        .from("best_friends")
        .select("*")
        .eq("user_id", currentUser.id)
        .order("created_at", {
          ascending: false
        });


      if (error) {

        console.error(
          "Best Friends error:",
          error
        );

        return;
      }


      if (!data?.length) {

        renderBestFriends();

        return;
      }


      const ids =
        data
          .map((item) => item.friend_id)
          .filter(Boolean);


      if (!ids.length) {

        renderBestFriends();

        return;
      }


      const {
        data: profiles,
        error: profileError
      } = await db
        .from("profiles")
        .select("*")
        .in("id", ids);


      if (profileError) {

        console.error(
          profileError
        );

        return;
      }


      const profileMap =
        new Map(
          (profiles || []).map(
            (profile) => [
              profile.id,
              profile
            ]
          )
        );


      bestFriends =
        data
          .map((item) => {

            const profile =
              profileMap.get(
                item.friend_id
              );

            if (!profile) return null;

            return {
              ...profile,
              best_friend_id: item.id
            };

          })
          .filter(Boolean);

    } catch (error) {

      console.error(error);
    }


    renderBestFriends();
    updateCounts();
  }


  function renderBestFriends() {

    const container =
      $("#bestFriendsContainer");

    if (!container) return;


    if (!bestFriends.length) {

      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">♥</div>
          <h3>No Best Friends yet</h3>
          <p>
            Add your closest friends from your Friends list.
          </p>
        </div>
      `;

      return;
    }


    container.innerHTML =
      bestFriends
        .map((friend) =>
          friendCardHTML(
            friend,
            {
              showBestButton: true,
              showRemoveButton: false
            }
          )
        )
        .join("");


    attachFriendCardEvents(container);
  }


  async function toggleBestFriend(
    friendId
  ) {

    if (!currentUser || !db) return;


    const existing =
      bestFriends.find(
        (friend) =>
          friend.id === friendId
      );


    try {

      if (existing) {

        const {
          error
        } = await db
          .from("best_friends")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("friend_id", friendId);


        if (error) {
          throw error;
        }


        showToast(
          "Removed from Best Friends.",
          "success"
        );

      } else {

        /*
          Only a normal friend can become
          a Best Friend.
        */

        const isFriend =
          friends.some(
            (friend) =>
              friend.id === friendId
          );


        if (!isFriend) {

          showToast(
            "You can only add an existing friend as a Best Friend.",
            "error"
          );

          return;
        }


        const {
          error
        } = await db
          .from("best_friends")
          .insert({
            user_id: currentUser.id,
            friend_id: friendId
          });


        if (error) {
          throw error;
        }


        showToast(
          "Added to Best Friends! ♥",
          "success"
        );
      }


      await loadBestFriends();

      renderFriends();

      renderRecentFriends();

    } catch (error) {

      console.error(error);

      showToast(
        error?.message ||
        "Unable to update Best Friends.",
        "error"
      );
    }
  }


  /* =======================================================
     REMOVE FRIEND
  ======================================================= */

  async function removeFriend(
    friendId
  ) {

    if (!currentUser || !db) return;


    try {

      /*
        Remove both directions.
      */

      const {
        error: firstError
      } = await db
        .from("friendships")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("friend_id", friendId);


      if (firstError) {
        throw firstError;
      }


      const {
        error: secondError
      } = await db
        .from("friendships")
        .delete()
        .eq("user_id", friendId)
        .eq("friend_id", currentUser.id);


      if (secondError) {
        console.warn(secondError);
      }


      /*
        Remove from Best Friends too.
      */

      await db
        .from("best_friends")
        .delete()
        .eq("user_id", currentUser.id)
        .eq("friend_id", friendId);


      showToast(
        "Friend removed.",
        "success"
      );


      await Promise.allSettled([
        loadFriends(),
        loadBestFriends()
      ]);


      updateAllUI();

    } catch (error) {

      console.error(error);

      showToast(
        error?.message ||
        "Unable to remove friend.",
        "error"
      );
    }
  }


  /* =======================================================
     SEARCH FRIENDS
  ======================================================= */

  function handleFriendsSearch(event) {

    renderFriends(
      event.target.value.trim()
    );
  }


  /* =======================================================
     NAVIGATION
  ======================================================= */

  const pageMap = {

    home: "homePage",
    homePage: "homePage",

    friends: "friendsPage",
    friendsPage: "friendsPage",

    requests: "requestsPage",
    requestsPage: "requestsPage",

    "best-friends": "bestFriendsPage",
    bestFriends: "bestFriendsPage",
    bestFriendsPage: "bestFriendsPage",

    "add-friend": "addFriendPage",
    addFriend: "addFriendPage",
    addFriendPage: "addFriendPage",

    profile: "profilePage",
    profilePage: "profilePage"
  };


  const pageTitles = {

    homePage: [
      "Home",
      "Welcome back to your FriendZone."
    ],

    friendsPage: [
      "Friends",
      "Everyone you've connected with."
    ],

    requestsPage: [
      "Friend Requests",
      "Manage incoming and outgoing requests."
    ],

    bestFriendsPage: [
      "Best Friends",
      "Your closest people."
    ],

    addFriendPage: [
      "Add Friend",
      "Grow your FriendZone."
    ],

    profilePage: [
      "Profile",
      "Manage your FriendZone profile."
    ]
  };


  function navigateTo(
    requestedPage
  ) {

    const pageId =
      pageMap[requestedPage] ||
      "homePage";


    $$(".page").forEach((page) => {
      page.classList.remove(
        "active-page"
      );
    });


    const target =
      document.getElementById(
        pageId
      );


    if (target) {
      target.classList.add(
        "active-page"
      );
    }


    $$(".nav-item").forEach((item) => {

      const itemPage =
        pageMap[item.dataset.page];

      item.classList.toggle(
        "active",
        itemPage === pageId
      );
    });


    const titleData =
      pageTitles[pageId] ||
      pageTitles.homePage;


    if ($("#currentPageTitle")) {
      $("#currentPageTitle").textContent =
        titleData[0];
    }


    if ($("#currentPageSubtitle")) {
      $("#currentPageSubtitle").textContent =
        titleData[1];
    }


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
     REQUEST TABS
  ======================================================= */

  function switchRequestTab(
    tab
  ) {

    activeRequestTab =
      tab === "sent"
        ? "sent"
        : "received";


    $$(".request-tab").forEach(
      (button) => {

        const buttonTab =
          button.dataset.requestTab ||
          button.dataset.tab;

        button.classList.toggle(
          "active",
          buttonTab === activeRequestTab
        );
      }
    );


    $("#receivedRequestsContainer")
      ?.classList.toggle(
        "hidden",
        activeRequestTab !== "received"
      );


    $("#sentRequestsContainer")
      ?.classList.toggle(
        "hidden",
        activeRequestTab !== "sent"
      );
  }


  /* =======================================================
     SIDEBAR
  ======================================================= */

  function openSidebar() {

    $("#sidebar")
      ?.classList.add("open");

    $("#sidebarOverlay")
      ?.classList.add("active");
  }


  function closeSidebar() {

    $("#sidebar")
      ?.classList.remove("open");

    $("#sidebarOverlay")
      ?.classList.remove("active");
  }


  /* =======================================================
     PROFILE UI
  ======================================================= */

  function updateProfileUI() {

    if (!currentUser) return;


    const metadata =
      currentUser.user_metadata || {};


    const name =
      currentProfile?.name ||
      metadata.name ||
      currentUser.email?.split("@")[0] ||
      "Friend";


    const username =
      metadata.username ||
      "username";


    const friendId =
      currentProfile?.friend_id ||
      "Not assigned";


    const avatar =
      getAvatar(
        currentProfile || {
          name
        }
      );


    $("#sidebarUserName").textContent =
      name;


    $("#sidebarFriendId").textContent =
      friendId;


    $("#profileName").textContent =
      name;


    $("#profileUsername").textContent =
      `@${username.replace(/^@/, "")}`;


    $("#profileFriendId").textContent =
      friendId;


    $("#profileNameInput").value =
      name;


    $("#profileUsernameInput").value =
      username;


    setImage(
      $("#sidebarAvatar"),
      avatar,
      name
    );


    setImage(
      $("#headerAvatar"),
      avatar,
      name
    );


    setImage(
      $("#profileAvatar"),
      avatar,
      name
    );


    $("#homeFriendId").textContent =
      friendId;
  }


  /* =======================================================
     COUNTS
  ======================================================= */

  function updateCounts() {

    const friendsCount =
      friends.length;

    const requestsCount =
      receivedRequests.length;

    const bestCount =
      bestFriends.length;


    $("#homeFriendsCount").textContent =
      friendsCount;


    $("#homeRequestsCount").textContent =
      requestsCount;


    $("#homeBestFriendsCount").textContent =
      bestCount;


    $("#receivedCount").textContent =
      requestsCount;


    $("#sentCount").textContent =
      sentRequests.length;


    setBadge(
      $("#friendsBadge"),
      friendsCount
    );


    setBadge(
      $("#requestsBadge"),
      requestsCount
    );


    setBadge(
      $("#headerRequestBadge"),
      requestsCount
    );
  }


  function setBadge(
    element,
    number
  ) {

    if (!element) return;

    element.textContent =
      number;


    element.classList.toggle(
      "hidden",
      Number(number) <= 0
    );
  }


  function updateAllUI() {

    updateProfileUI();

    updateCounts();

    renderFriends();

    renderRecentFriends();

    renderRequests();

    renderBestFriends();
  }


  /* =======================================================
     FRIEND MODAL
  ======================================================= */

  function openFriendModal(
    friend
  ) {

    const modal =
      $("#friendModal");

    const content =
      $("#modalFriendContent");

    if (!modal || !content) return;


    const name =
      escapeHTML(
        friend.name ||
        "Friend"
      );

    const username =
      escapeHTML(
        getUsername(friend)
      );

    const friendId =
      escapeHTML(
        friend.friend_id ||
        "No ID"
      );

    const avatar =
      getAvatar(friend);


    const isBest =
      bestFriends.some(
        (item) =>
          item.id === friend.id
      );


    content.innerHTML = `

      <div style="text-align:center">

        <div class="profile-avatar-large">
          <img
            src="${escapeAttr(avatar)}"
            alt="${name}"
          />
        </div>

        <h2>${name}</h2>

        <p
          style="
            margin-top:5px;
            color:var(--purple-light);
            font-size:12px;
          "
        >
          ${username}
        </p>

        <div class="profile-id-box">

          <span>Friend ID</span>

          <strong>${friendId}</strong>

        </div>

        <div
          class="modal-actions"
          style="margin-top:15px"
        >

          <button
            type="button"
            class="secondary-btn modal-best-btn"
          >
            ${isBest
              ? "♥ Remove Best Friend"
              : "♡ Add to Best Friends"}
          </button>

        </div>

      </div>
    `;


    content
      .querySelector(".modal-best-btn")
      ?.addEventListener(
        "click",
        async () => {

          await toggleBestFriend(
            friend.id
          );

          closeModal(
            "friendModal"
          );
        }
      );


    modal.classList.remove(
      "hidden"
    );
  }


  function closeModal(
    modalId
  ) {

    document
      .getElementById(modalId)
      ?.classList.add("hidden");
  }


  /* =======================================================
     CONFIRM MODAL
  ======================================================= */

  let confirmCallback = null;


  function askConfirmation(
    title,
    message,
    callback
  ) {

    const modal =
      $("#confirmModal");

    if (!modal) {

      /*
        Fallback without browser confirm
        blocking the application.
      */

      callback?.();

      return;
    }


    $("#confirmTitle").textContent =
      title;

    $("#confirmMessage").textContent =
      message;


    confirmCallback =
      callback;


    modal.classList.remove(
      "hidden"
    );


    $("#confirmActionBtn").onclick =
      async () => {

        const action =
          confirmCallback;

        confirmCallback = null;

        modal.classList.add(
          "hidden"
        );

        if (typeof action === "function") {
          await action();
        }
      };
  }


  function cancelConfirm() {

    confirmCallback = null;

    $("#confirmModal")
      ?.classList.add("hidden");
  }


  /* =======================================================
     COPY FRIEND ID
  ======================================================= */

  async function copyFriendId() {

    const friendId =
      currentProfile?.friend_id;


    if (!friendId) {

      showToast(
        "Friend ID is not available yet.",
        "error"
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

    } catch (error) {

      /*
        Fallback for older browsers.
      */

      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value =
        friendId;

      document.body.appendChild(
        textarea
      );

      textarea.select();

      document.execCommand(
        "copy"
      );

      textarea.remove();

      showToast(
        "Friend ID copied! 📋",
        "success"
      );
    }
  }


  /* =======================================================
     REALTIME
  ======================================================= */

  let realtimeChannel = null;


  function setupRealtime() {

    if (!db || !currentUser) {
      return;
    }


    try {

      if (realtimeChannel) {

        db.removeChannel(
          realtimeChannel
        );

        realtimeChannel = null;
      }


      realtimeChannel =
        db
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
              updateCounts();
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
              updateCounts();
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

              updateAllUI();
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

              updateAllUI();
            }
          )

          .subscribe();

    } catch (error) {

      /*
        Realtime is optional.
        It must never stop the main website.
      */

      console.warn(
        "Realtime unavailable:",
        error
      );
    }
  }


  /* =======================================================
     TOAST
  ======================================================= */

  function showToast(
    message,
    type = "success"
  ) {

    const container =
      $("#toastContainer");

    if (!container) return;


    const toast =
      document.createElement(
        "div"
      );


    toast.className =
      `toast ${type}`;


    const icon =
      type === "error"
        ? "!"
        : "✓";


    toast.innerHTML = `
      <strong>${icon}</strong>
      <span>${escapeHTML(message)}</span>
    `;


    container.appendChild(
      toast
    );


    setTimeout(() => {

      toast.style.opacity =
        "0";

      toast.style.transform =
        "translateY(10px)";

      setTimeout(() => {
        toast.remove();
      }, 220);

    }, 3500);
  }


  /* =======================================================
     BUTTON LOADING
     Normal action only.
     NOT a startup loader.
  ======================================================= */

  function setButtonLoading(
    button,
    loading
  ) {

    if (!button) return;


    if (loading) {

      if (!button.dataset.originalText) {
        button.dataset.originalText =
          button.textContent;
      }

      button.classList.add(
        "btn-loading"
      );

      button.disabled = true;

    } else {

      button.classList.remove(
        "btn-loading"
      );

      button.disabled = false;

      if (button.dataset.originalText) {

        button.textContent =
          button.dataset.originalText;

        delete button.dataset.originalText;
      }
    }
  }


  /* =======================================================
     HELPERS
  ======================================================= */

  function getUsername(
    profile
  ) {

    if (!profile) {
      return "@username";
    }


    /*
      Username is stored in Auth metadata
      in the current database structure.
    */

    if (
      profile.username &&
      typeof profile.username === "string"
    ) {

      return profile.username.startsWith("@")
        ? profile.username
        : `@${profile.username}`;
    }


    if (
      currentUser &&
      profile.id === currentUser.id
    ) {

      const username =
        currentUser.user_metadata?.username;

      if (username) {

        return username.startsWith("@")
          ? username
          : `@${username}`;
      }
    }


    return "@friend";
  }


  function getAvatar(
    profile
  ) {

    const name =
      profile?.name ||
      "Friend";


    if (profile?.avatar_url) {
      return profile.avatar_url;
    }


    return (
      avatarFallback +
      encodeURIComponent(name)
    );
  }


  function setImage(
    img,
    src,
    name
  ) {

    if (!img) return;


    img.src = src;

    img.alt =
      name || "Profile";


    img.onerror = () => {

      img.onerror = null;

      img.src =
        avatarFallback +
        encodeURIComponent(
          name || "Friend"
        );
    };
  }


  function escapeHTML(
    value
  ) {

    return String(
      value ?? ""
    )
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }


  function escapeAttr(
    value
  ) {

    return escapeHTML(
      value
    );
  }


  function isDuplicateError(
    error
  ) {

    return (
      error?.code === "23505" ||
      String(error?.message || "")
        .toLowerCase()
        .includes("duplicate")
    );
  }


  function getFriendlyAuthError(
    error
  ) {

    const message =
      String(
        error?.message || ""
      );


    if (
      message
        .toLowerCase()
        .includes("invalid login credentials")
    ) {

      return "Incorrect email or password.";
    }


    if (
      message
        .toLowerCase()
        .includes("email not confirmed")
    ) {

      return "Please verify your email first.";
    }


    if (
      message
        .toLowerCase()
        .includes("user already registered")
    ) {

      return "An account with this email already exists.";
    }


    if (
      message
        .toLowerCase()
        .includes("password should be at least")
    ) {

      return "Your password is too short.";
    }


    return message ||
      "Authentication failed. Please try again.";
  }


  /* =======================================================
     EXPOSE OPTIONAL DEBUG OBJECT
  ======================================================= */

  window.FriendZone = {

    get currentUser() {
      return currentUser;
    },

    get profile() {
      return currentProfile;
    },

    get friends() {
      return friends;
    },

    get requests() {
      return {
        received:
          receivedRequests,
        sent:
          sentRequests
      };
    },

    get bestFriends() {
      return bestFriends;
    },

    navigateTo
  };

})();
