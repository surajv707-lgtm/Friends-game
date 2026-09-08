/* =========================================================
   FRIENDZONE — AUTHENTICATION
   Supabase + Email Verification + Forgot Password
   ========================================================= */

const SUPABASE_URL =
  "https://hrkoomycvbjvcocjlmzy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_KamGl3TpE_bwjQPmFmtnTQ_z4jLiyZp";

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);


/* =========================================================
   ELEMENT HELPERS
   ========================================================= */

const $ = (id) => document.getElementById(id);

function showElement(id) {
  const el = $(id);
  if (el) el.classList.remove("hidden");
}

function hideElement(id) {
  const el = $(id);
  if (el) el.classList.add("hidden");
}


/* =========================================================
   TOAST / MESSAGE
   ========================================================= */

function showToast(message, type = "info") {
  const container = $("toastContainer");

  if (!container) {
    alert(message);
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-hide");

    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3500);
}


function showFormMessage(id, message, type = "error") {
  const el = $(id);

  if (!el) return;

  el.textContent = message;
  el.className = `form-message ${type}`;

  if (message) {
    el.classList.remove("hidden");
  } else {
    el.classList.add("hidden");
  }
}


/* =========================================================
   LOADING BUTTON
   ========================================================= */

function setButtonLoading(button, loading, loadingText = "Please wait...") {
  if (!button) return;

  if (loading) {
    button.dataset.originalText = button.innerHTML;
    button.disabled = true;

    button.innerHTML = `
      <span class="button-spinner"></span>
      ${loadingText}
    `;
  } else {
    button.disabled = false;

    if (button.dataset.originalText) {
      button.innerHTML = button.dataset.originalText;
    }
  }
}


/* =========================================================
   AUTH VIEW SWITCHING
   ========================================================= */

function showAuthView(view) {
  const views = [
    "signinView",
    "signupView",
    "forgotView",
    "verifyView"
  ];

  views.forEach((id) => {
    const el = $(id);

    if (el) {
      el.classList.remove("active");
    }
  });

  const selected = $(view);

  if (selected) {
    selected.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   PASSWORD SHOW / HIDE
   ========================================================= */

document.querySelectorAll("[data-password-toggle]").forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.getAttribute("data-password-toggle");
    const input = $(targetId);

    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
      button.classList.add("active");
    } else {
      input.type = "password";
      button.classList.remove("active");
    }
  });
});


/* =========================================================
   NAVIGATION BUTTONS
   ========================================================= */

$("goToSignup")?.addEventListener("click", () => {
  showAuthView("signupView");
});

$("goToSignin")?.addEventListener("click", () => {
  showAuthView("signinView");
});

$("goToForgot")?.addEventListener("click", () => {
  showAuthView("forgotView");
});

$("goToVerify")?.addEventListener("click", () => {
  showAuthView("verifyView");
});

$("backToSigninFromForgot")?.addEventListener("click", () => {
  showAuthView("signinView");
});

$("backToSigninFromVerify")?.addEventListener("click", () => {
  showAuthView("signinView");
});


/* =========================================================
   VALIDATION
   ========================================================= */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}


function isValidUsername(username) {
  return /^[a-zA-Z0-9_]{3,25}$/.test(username);
}


/* =========================================================
   PASSWORD STRENGTH
   ========================================================= */

function updatePasswordStrength(password) {
  const strengthBar = $("passwordStrengthBar");
  const strengthText = $("passwordStrengthText");

  if (!strengthBar || !strengthText) return;

  let score = 0;

  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const percentage = (score / 5) * 100;

  strengthBar.style.width = `${percentage}%`;

  if (!password) {
    strengthText.textContent = "";
    return;
  }

  if (score <= 2) {
    strengthText.textContent = "Weak password";
  } else if (score === 3) {
    strengthText.textContent = "Medium password";
  } else if (score === 4) {
    strengthText.textContent = "Strong password";
  } else {
    strengthText.textContent = "Very strong password";
  }
}


$("signupPassword")?.addEventListener("input", (event) => {
  updatePasswordStrength(event.target.value);
});


/* =========================================================
   SIGN UP
   ========================================================= */

$("signupForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const username = $("signupUsername")?.value.trim();
  const email = $("signupEmail")?.value.trim().toLowerCase();
  const password = $("signupPassword")?.value || "";
  const confirmPassword = $("signupConfirmPassword")?.value || "";
  const terms = $("termsCheckbox")?.checked;

  const button = $("signupButton");

  showFormMessage("signupMessage", "");

  if (!username || !isValidUsername(username)) {
    showFormMessage(
      "signupMessage",
      "Username must be 3–25 characters and use only letters, numbers or underscore."
    );
    return;
  }

  if (!email || !isValidEmail(email)) {
    showFormMessage(
      "signupMessage",
      "Please enter a valid email address."
    );
    return;
  }

  if (password.length < 8) {
    showFormMessage(
      "signupMessage",
      "Password must be at least 8 characters."
    );
    return;
  }

  if (password !== confirmPassword) {
    showFormMessage(
      "signupMessage",
      "Passwords do not match."
    );
    return;
  }

  if (!terms) {
    showFormMessage(
      "signupMessage",
      "Please accept the Terms & Conditions."
    );
    return;
  }

  try {
    setButtonLoading(button, true, "Creating account...");

    const { data, error } =
      await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      });

    if (error) {
      throw error;
    }

    /*
      Supabase may return a user without a session when
      email confirmation is enabled.
    */

    if (data?.user && !data?.session) {
      if ($("verifyEmailInput")) {
        $("verifyEmailInput").value = email;
      }

      showAuthView("verifyView");

      showFormMessage(
        "verifyMessage",
        "Account created! Check your email and click the verification link before signing in.",
        "success"
      );

      showToast(
        "Verification email sent!",
        "success"
      );
    } else {
      showToast(
        "Account created successfully!",
        "success"
      );

      showAuthView("signinView");
    }

  } catch (error) {
    console.error("SIGN UP ERROR:", error);

    showFormMessage(
      "signupMessage",
      getFriendlyAuthError(error)
    );

  } finally {
    setButtonLoading(button, false);
  }
});


/* =========================================================
   SIGN IN
   ========================================================= */

$("signinForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email = $("signinEmail")?.value.trim().toLowerCase();
  const password = $("signinPassword")?.value || "";

  const button = $("signinButton");

  showFormMessage("signinMessage", "");

  if (!email || !isValidEmail(email)) {
    showFormMessage(
      "signinMessage",
      "Please enter a valid email address."
    );
    return;
  }

  if (!password) {
    showFormMessage(
      "signinMessage",
      "Please enter your password."
    );
    return;
  }

  try {
    setButtonLoading(button, true, "Signing in...");

    const { data, error } =
      await supabaseClient.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    const user = data?.user;

    if (!user) {
      throw new Error("Unable to sign in. Please try again.");
    }

    /*
      IMPORTANT:
      The account must have a confirmed email.
    */

    if (!user.email_confirmed_at) {

      await supabaseClient.auth.signOut();

      if ($("verifyEmailInput")) {
        $("verifyEmailInput").value = email;
      }

      showAuthView("verifyView");

      showFormMessage(
        "verifyMessage",
        "Your email is not verified yet. Check your inbox and verify your email before signing in."
      );

      showToast(
        "Please verify your email first.",
        "error"
      );

      return;
    }

    /*
      User is authenticated AND email is verified.
    */

    showToast(
      "Login successful!",
      "success"
    );

    await loadUserProfile(user);

    /*
      TEMPORARY:
      Dashboard will be connected in the next FriendZone phase.
    */

    setTimeout(() => {
      showFormMessage(
        "signinMessage",
        "Login successful! Your FriendZone dashboard will open here.",
        "success"
      );
    }, 300);

  } catch (error) {
    console.error("SIGN IN ERROR:", error);

    showFormMessage(
      "signinMessage",
      getFriendlyAuthError(error)
    );

  } finally {
    setButtonLoading(button, false);
  }
});


/* =========================================================
   VERIFY / RESEND EMAIL
   ========================================================= */

$("verifyForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email =
    $("verifyEmailInput")?.value.trim().toLowerCase();

  const button = $("verifyButton");

  showFormMessage("verifyMessage", "");

  if (!email || !isValidEmail(email)) {
    showFormMessage(
      "verifyMessage",
      "Please enter the email address you used to create your FriendZone account."
    );
    return;
  }

  try {
    setButtonLoading(
      button,
      true,
      "Sending verification..."
    );

    /*
      This asks Supabase to resend the confirmation email.

      Supabase controls whether the email/account is eligible
      for confirmation. We do NOT expose account-registration
      information to the browser.
    */

    const { error } =
      await supabaseClient.auth.resend({
        type: "signup",
        email
      });

    if (error) {
      throw error;
    }

    showFormMessage(
      "verifyMessage",
      "Verification email sent. Check your inbox and click the verification link.",
      "success"
    );

    showToast(
      "Verification email sent!",
      "success"
    );

  } catch (error) {
    console.error("VERIFY ERROR:", error);

    showFormMessage(
      "verifyMessage",
      getFriendlyAuthError(error)
    );

  } finally {
    setButtonLoading(button, false);
  }
});


/* =========================================================
   FORGOT PASSWORD
   ========================================================= */

$("forgotForm")?.addEventListener("submit", async (event) => {
  event.preventDefault();

  const email =
    $("forgotEmail")?.value.trim().toLowerCase();

  const button = $("forgotButton");

  showFormMessage("forgotMessage", "");

  if (!email || !isValidEmail(email)) {
    showFormMessage(
      "forgotMessage",
      "Please enter a valid email address."
    );
    return;
  }

  try {
    setButtonLoading(
      button,
      true,
      "Sending reset email..."
    );

    const { error } =
      await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: window.location.origin
        }
      );

    if (error) {
      throw error;
    }

    showFormMessage(
      "forgotMessage",
      "If this email can receive a password reset, a reset link has been sent. Check your inbox.",
      "success"
    );

    showToast(
      "Password reset email sent!",
      "success"
    );

  } catch (error) {
    console.error("FORGOT PASSWORD ERROR:", error);

    showFormMessage(
      "forgotMessage",
      getFriendlyAuthError(error)
    );

  } finally {
    setButtonLoading(button, false);
  }
});


/* =========================================================
   AUTH STATE
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      "AUTH EVENT:",
      event,
      session?.user?.email || "No user"
    );

    if (event === "PASSWORD_RECOVERY") {
      /*
        Password recovery UI can be connected here later.
      */
      return;
    }

    if (!session?.user) {
      return;
    }

    const user = session.user;

    /*
      Never allow an unverified account to continue.
    */

    if (!user.email_confirmed_at) {
      await supabaseClient.auth.signOut();
      return;
    }

    await loadUserProfile(user);
  }
);


/* =========================================================
   SESSION CHECK
   ========================================================= */

async function checkExistingSession() {

  try {

    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session?.user) {
      return;
    }

    const user = session.user;

    if (!user.email_confirmed_at) {
      await supabaseClient.auth.signOut();
      return;
    }

    await loadUserProfile(user);

  } catch (error) {

    console.error(
      "SESSION CHECK ERROR:",
      error
    );

  }
}


/* =========================================================
   LOAD PROFILE
   ========================================================= */

async function loadUserProfile(user) {

  if (!user?.id) return null;

  try {

    const { data, error } =
      await supabaseClient
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

    if (error) {
      console.error(
        "PROFILE ERROR:",
        error
      );

      return null;
    }

    if (data) {

      console.log(
        "FriendZone Profile:",
        data
      );

      /*
        Available for the upcoming dashboard.
      */

      window.friendZoneUser = data;

      return data;
    }

  } catch (error) {

    console.error(
      "LOAD PROFILE ERROR:",
      error
    );
  }

  return null;
}


/* =========================================================
   FRIENDLY SUPABASE ERRORS
   ========================================================= */

function getFriendlyAuthError(error) {

  const message =
    error?.message?.toLowerCase() || "";

  if (
    message.includes("invalid login credentials")
  ) {
    return "Incorrect email or password.";
  }

  if (
    message.includes("email not confirmed")
  ) {
    return "Please verify your email before signing in.";
  }

  if (
    message.includes("user already registered")
  ) {
    return "This email is already registered. Please sign in.";
  }

  if (
    message.includes("password should be at least")
  ) {
    return "Password must be at least 8 characters.";
  }

  if (
    message.includes("rate limit")
  ) {
    return "Too many requests. Please wait a little and try again.";
  }

  if (
    message.includes("email rate limit")
  ) {
    return "Too many emails were requested. Please wait before requesting another email.";
  }

  if (
    message.includes("email address")
  ) {
    return "Please check that your email address is correct.";
  }

  if (
    message.includes("network")
  ) {
    return "Network error. Please check your internet connection.";
  }

  return error?.message ||
    "Something went wrong. Please try again.";
}


/* =========================================================
   LOGOUT HELPER
   ========================================================= */

async function logoutFriendZone() {

  const { error } =
    await supabaseClient.auth.signOut();

  if (error) {
    console.error(
      "LOGOUT ERROR:",
      error
    );

    return false;
  }

  window.friendZoneUser = null;

  showAuthView("signinView");

  showToast(
    "You have been signed out.",
    "success"
  );

  return true;
}


/* Make logout available to the future dashboard. */
window.logoutFriendZone = logoutFriendZone;


/* =========================================================
   CURRENT YEAR
   ========================================================= */

const yearElement = $("currentYear");

if (yearElement) {
  yearElement.textContent =
    new Date().getFullYear();
}


/* =========================================================
   START
   ========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    checkExistingSession();
  }
);
