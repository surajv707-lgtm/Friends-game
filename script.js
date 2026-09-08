/* =========================================================
   FRIENDZONE — AUTHENTICATION JAVASCRIPT
   Supabase + Login + Signup + Forgot Password
   ========================================================= */


/* =========================================================
   1. SUPABASE CONFIGURATION
   ========================================================= */

const SUPABASE_URL = "https://hrkoomycvbjvcocjlmzy.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_KamGl3TpE_bwjQPmFmtnTQ_z4jLiyZp";


/*
   The Supabase CDN from index.html creates the global
   "supabase" object.
*/

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
   2. ELEMENT HELPERS
   ========================================================= */

const $ = (selector) => document.querySelector(selector);

const $$ = (selector) => document.querySelectorAll(selector);


/* =========================================================
   3. AUTH VIEWS
   ========================================================= */

const views = {
  signin: $("#signinView"),
  signup: $("#signupView"),
  forgot: $("#forgotView"),
  verify: $("#verifyView")
};


function showView(viewName) {

  Object.values(views).forEach((view) => {
    if (view) {
      view.classList.remove("active");
    }
  });

  if (views[viewName]) {
    views[viewName].classList.add("active");
  }

  clearMessages();
  clearErrors();

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}


/* =========================================================
   4. MESSAGE SYSTEM
   ========================================================= */

function showMessage(elementId, message, type = "info") {

  const element = document.getElementById(elementId);

  if (!element) return;

  element.textContent = message;

  element.className = `form-message show ${type}`;
}


function clearMessages() {

  $$(".form-message").forEach((element) => {

    element.textContent = "";

    element.className = "form-message";

  });
}


function showToast(message, type = "info") {

  const container = $("#toastContainer");

  if (!container) return;

  const toast = document.createElement("div");

  toast.className = "toast";

  let icon = "fa-circle-info";

  if (type === "success") {
    icon = "fa-circle-check";
  }

  if (type === "error") {
    icon = "fa-circle-exclamation";
  }

  toast.innerHTML = `
    <i class="fa-solid ${icon}"></i>
    <span></span>
  `;

  toast.querySelector("span").textContent = message;

  container.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4200);
}


/* =========================================================
   5. ERROR SYSTEM
   ========================================================= */

function setError(elementId, message) {

  const element = document.getElementById(elementId);

  if (!element) return;

  element.textContent = message;
}


function clearErrors() {

  $$(".field-error").forEach((element) => {
    element.textContent = "";
  });
}


/* =========================================================
   6. BUTTON LOADING
   ========================================================= */

function setButtonLoading(button, loading) {

  if (!button) return;

  if (loading) {

    button.classList.add("loading");

    button.disabled = true;

  } else {

    button.classList.remove("loading");

    button.disabled = false;

  }
}


/* =========================================================
   7. PASSWORD SHOW / HIDE
   ========================================================= */

$$(".password-toggle").forEach((button) => {

  button.addEventListener("click", () => {

    const targetId = button.dataset.target;

    const input = document.getElementById(targetId);

    if (!input) return;

    const icon = button.querySelector("i");

    if (input.type === "password") {

      input.type = "text";

      button.setAttribute(
        "aria-label",
        "Hide password"
      );

      if (icon) {
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      }

    } else {

      input.type = "password";

      button.setAttribute(
        "aria-label",
        "Show password"
      );

      if (icon) {
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }

    }

  });

});


/* =========================================================
   8. NAVIGATION BETWEEN AUTH SCREENS
   ========================================================= */

$("#showSignup")?.addEventListener("click", () => {
  showView("signup");
});


$("#showSignin")?.addEventListener("click", () => {
  showView("signin");
});


$("#showForgotPassword")?.addEventListener("click", () => {

  const signinEmail = $("#signinEmail")?.value.trim();

  if (signinEmail && isValidEmail(signinEmail)) {
    $("#forgotEmail").value = signinEmail;
  }

  showView("forgot");

});


$("#backToSignin")?.addEventListener("click", () => {
  showView("signin");
});


$("#verificationBack")?.addEventListener("click", () => {
  showView("signin");
});


/* =========================================================
   9. EMAIL VALIDATION
   ========================================================= */

function isValidEmail(email) {

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

}


/* =========================================================
   10. USERNAME VALIDATION
   ========================================================= */

function isValidUsername(username) {

  return /^[a-zA-Z0-9_.-]{3,25}$/.test(username);

}


/* =========================================================
   11. PASSWORD STRENGTH
   ========================================================= */

const signupPassword = $("#signupPassword");

signupPassword?.addEventListener("input", () => {

  updatePasswordStrength(
    signupPassword.value
  );

});


function updatePasswordStrength(password) {

  const bar = document.querySelector(
    "#passwordStrength .strength-bar span"
  );

  const text = document.querySelector(
    "#passwordStrength .strength-text"
  );

  if (!bar || !text) return;

  let strength = 0;

  if (password.length >= 8) {
    strength++;
  }

  if (/[a-z]/.test(password)) {
    strength++;
  }

  if (/[A-Z]/.test(password)) {
    strength++;
  }

  if (/[0-9]/.test(password)) {
    strength++;
  }

  if (/[^A-Za-z0-9]/.test(password)) {
    strength++;
  }


  if (!password) {

    bar.style.width = "0%";
    text.textContent = "Password strength";

  } else if (strength <= 2) {

    bar.style.width = "35%";
    text.textContent = "Weak";

  } else if (strength <= 3) {

    bar.style.width = "65%";
    text.textContent = "Good";

  } else {

    bar.style.width = "100%";
    text.textContent = "Strong";

  }

}


/* =========================================================
   12. SIGN UP
   ========================================================= */

$("#signupForm")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearErrors();

    const username =
      $("#signupUsername").value.trim();

    const email =
      $("#signupEmail").value.trim();

    const password =
      $("#signupPassword").value;

    const confirmPassword =
      $("#signupConfirmPassword").value;

    const termsAccepted =
      $("#acceptTerms").checked;

    let valid = true;


    /* USERNAME */

    if (!username) {

      setError(
        "signupUsernameError",
        "Please enter a username."
      );

      valid = false;

    } else if (!isValidUsername(username)) {

      setError(
        "signupUsernameError",
        "Use 3–25 letters, numbers, dots, hyphens or underscores."
      );

      valid = false;

    }


    /* EMAIL */

    if (!email) {

      setError(
        "signupEmailError",
        "Please enter your email address."
      );

      valid = false;

    } else if (!isValidEmail(email)) {

      setError(
        "signupEmailError",
        "Please enter a valid email address."
      );

      valid = false;

    }


    /* PASSWORD */

    if (!password) {

      setError(
        "signupPasswordError",
        "Please create a password."
      );

      valid = false;

    } else if (password.length < 8) {

      setError(
        "signupPasswordError",
        "Password must contain at least 8 characters."
      );

      valid = false;

    }


    /* CONFIRM PASSWORD */

    if (!confirmPassword) {

      setError(
        "signupConfirmPasswordError",
        "Please confirm your password."
      );

      valid = false;

    } else if (password !== confirmPassword) {

      setError(
        "signupConfirmPasswordError",
        "Passwords do not match."
      );

      valid = false;

    }


    /* TERMS */

    if (!termsAccepted) {

      setError(
        "termsError",
        "Please accept the terms to continue."
      );

      valid = false;

    }


    if (!valid) {

      showMessage(
        "signupMessage",
        "Please check the highlighted fields.",
        "error"
      );

      return;
    }


    const button = $("#signupButton");

    setButtonLoading(button, true);


    try {

      /*
        We put the username inside Supabase user metadata.

        Our database trigger reads this username and
        automatically creates the user's profile + Friend ID.
      */

      const {
        data,
        error
      } = await supabaseClient.auth.signUp({

        email: email,

        password: password,

        options: {
          data: {
            username: username
          }
        }

      });


      if (error) {
        throw error;
      }


      /*
        If email confirmation is enabled,
        Supabase returns a user without an active session.
      */

      if (data.user && !data.session) {

        showView("verify");

        showToast(
          "Account created! Check your email.",
          "success"
        );

      } else if (data.session) {

        showToast(
          "Welcome to FriendZone! 🎉",
          "success"
        );

        /*
          The dashboard will be added in the next phase.
        */

        await handleAuthenticatedUser(
          data.session.user
        );

      } else {

        showMessage(
          "signupMessage",
          "Your account was created. Please check your email.",
          "success"
        );

      }


    } catch (error) {

      console.error(
        "Signup error:",
        error
      );

      showMessage(
        "signupMessage",
        getFriendlyAuthError(error),
        "error"
      );

    } finally {

      setButtonLoading(
        button,
        false
      );

    }

  }
);


/* =========================================================
   13. SIGN IN
   ========================================================= */

$("#signinForm")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearErrors();

    const email =
      $("#signinEmail").value.trim();

    const password =
      $("#signinPassword").value;

    let valid = true;


    if (!email) {

      setError(
        "signinEmailError",
        "Please enter your email address."
      );

      valid = false;

    } else if (!isValidEmail(email)) {

      setError(
        "signinEmailError",
        "Please enter a valid email address."
      );

      valid = false;

    }


    if (!password) {

      setError(
        "signinPasswordError",
        "Please enter your password."
      );

      valid = false;

    }


    if (!valid) {

      showMessage(
        "signinMessage",
        "Please enter your email and password.",
        "error"
      );

      return;
    }


    const button = $("#signinButton");

    setButtonLoading(
      button,
      true
    );


    try {

      const {
        data,
        error
      } = await supabaseClient.auth.signInWithPassword({

        email: email,

        password: password

      });


      if (error) {
        throw error;
      }


      if (!data.session) {

        throw new Error(
          "Login succeeded but no session was created."
        );

      }


      showToast(
        "Welcome back! 👋",
        "success"
      );


      await handleAuthenticatedUser(
        data.user
      );


    } catch (error) {

      console.error(
        "Sign in error:",
        error
      );

      showMessage(
        "signinMessage",
        getFriendlyAuthError(error),
        "error"
      );

    } finally {

      setButtonLoading(
        button,
        false
      );

    }

  }
);


/* =========================================================
   14. FORGOT PASSWORD
   ========================================================= */

$("#forgotForm")?.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();

    clearErrors();

    const email =
      $("#forgotEmail").value.trim();


    if (!email) {

      setError(
        "forgotEmailError",
        "Please enter your email address."
      );

      return;

    }


    if (!isValidEmail(email)) {

      setError(
        "forgotEmailError",
        "Please enter a valid email address."
      );

      return;

    }


    const button = $("#forgotButton");

    setButtonLoading(
      button,
      true
    );


    try {

      /*
        IMPORTANT:
        Before deploying, add your actual website URL
        to Supabase Authentication → URL Configuration.

        This fallback works for local testing.
      */

      const redirectUrl =
        `${window.location.origin}${window.location.pathname}`;


      const {
        error
      } = await supabaseClient.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: redirectUrl
        }
      );


      if (error) {
        throw error;
      }


      showMessage(
        "forgotMessage",
        "If an account exists for this email, a password reset link has been sent.",
        "success"
      );

      showToast(
        "Check your email for the reset link.",
        "success"
      );


    } catch (error) {

      console.error(
        "Password reset error:",
        error
      );

      showMessage(
        "forgotMessage",
        getFriendlyAuthError(error),
        "error"
      );

    } finally {

      setButtonLoading(
        button,
        false
      );

    }

  }
);


/* =========================================================
   15. AUTHENTICATED USER HANDLER
   ========================================================= */

async function handleAuthenticatedUser(user) {

  if (!user) return;


  /*
    Check that the profile exists.

    The database trigger normally creates it automatically
    when a user signs up.
  */

  try {

    const {
      data: profile,
      error
    } = await supabaseClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();


    if (error) {

      console.error(
        "Profile lookup error:",
        error
      );

    }


    if (!profile) {

      console.warn(
        "Profile has not been created yet."
      );

    }


    /*
      Dashboard will be added in the next part.
      For now, show a clear message.
    */

    showMessage(
      "signinMessage",
      "Login successful! FriendZone dashboard is coming next.",
      "success"
    );


  } catch (error) {

    console.error(
      "Authenticated user error:",
      error
    );

  }

}


/* =========================================================
   16. FRIENDLY SUPABASE ERRORS
   ========================================================= */

function getFriendlyAuthError(error) {

  if (!error) {
    return "Something went wrong. Please try again.";
  }


  const message =
    String(error.message || error);


  const lower =
    message.toLowerCase();


  if (
    lower.includes("invalid login credentials")
  ) {

    return "Incorrect email or password.";

  }


  if (
    lower.includes("email not confirmed")
  ) {

    return "Please verify your email before signing in.";

  }


  if (
    lower.includes("user already registered")
  ) {

    return "An account with this email already exists.";

  }


  if (
    lower.includes("password should be at least")
  ) {

    return "Your password is too short.";

  }


  if (
    lower.includes("rate limit")
  ) {

    return "Too many attempts. Please wait a little and try again.";

  }


  if (
    lower.includes("network")
  ) {

    return "Network problem. Please check your internet connection.";

  }


  return message;

}


/* =========================================================
   17. PASSWORD RESET SESSION
   ========================================================= */

supabaseClient.auth.onAuthStateChange(
  async (event, session) => {

    console.log(
      "Auth event:",
      event
    );


    /*
      Supabase can return a PASSWORD_RECOVERY event
      when the user opens a password reset link.

      The actual reset-password screen will be added
      with the dashboard/auth update phase.
    */

    if (event === "PASSWORD_RECOVERY") {

      showToast(
        "Password recovery session detected.",
        "info"
      );

    }


    if (
      event === "SIGNED_IN" &&
      session
    ) {

      console.log(
        "User signed in:",
        session.user.email
      );

    }


    if (event === "SIGNED_OUT") {

      console.log(
        "User signed out."
      );

    }

  }
);


/* =========================================================
   18. SESSION CHECK ON PAGE LOAD
========================================================= */

async function checkExistingSession() {

  try {

    const {
      data,
      error
    } = await supabaseClient.auth.getSession();


    if (error) {

      console.error(
        "Session check error:",
        error
      );

      return;

    }


    if (data.session) {

      console.log(
        "Existing FriendZone session found."
      );

      /*
        Dashboard will be connected here later.
      */

    }

  } catch (error) {

    console.error(
      "Session initialization error:",
      error
    );

  }

}


/* =========================================================
   19. YEAR
========================================================= */

const yearElement = $("#currentYear");

if (yearElement) {

  yearElement.textContent =
    new Date().getFullYear();

}


/* =========================================================
   20. INITIALIZE
========================================================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {

    checkExistingSession();

    console.log(
      "%cFriendZone",
      "font-size:22px;font-weight:800;color:#8b5cf6;"
    );

    console.log(
      "%cFriends. Games. Memories.",
      "font-size:12px;color:#9b7cff;"
    );

  }
);


/* =========================================================
   FRIENDZONE AUTH READY
   ========================================================= */

console.log(
  "FriendZone authentication initialized."
);
