const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);


/* ================= GAMES ================= */

const games = [

  ["🎯","Tic Tac Toe","1v1 • Room","purple"],
  ["✊","Rock Paper Scissors","1v1 • Random","red"],
  ["⚡","Reaction Rush","Solo • Score","green"],
  ["🧠","Memory Clash","1v1 • Room","blue"],
  ["🔢","Guess Number","1v1 • Random","orange"],
  ["🐍","Snake","Solo • Score","lime"],
  ["🎲","Dice Battle","Multiplayer","gold"],
  ["🔥","Roast Me","Party","pink"],
  ["❤️","Friendship Test","Friends","heart"],
  ["🔮","Future Generator","Party","violet"],
  ["🧩","Connect 4","1v1 • Room","blue"],
  ["❓","Quiz Battle","Multiplayer","purple"]

];


/* ================= DATA ================= */

const thoughts = [

  "Bro said “one game” 47 minutes ago.",
  "Your friend is online. Your productivity is offline.",
  "If losing was a skill, your squad would be professional.",
  "One more match. Famous last words.",
  "Best friends are basically free teammates.",
  "Someone in your friend list is definitely waiting for you."

];

let thoughtIndex = 0;

let captchaA = 0;
let captchaB = 0;

let user =
  JSON.parse(
    localStorage.getItem("fz_user")
  );

let friends =
  JSON.parse(
    localStorage.getItem("fz_friends") || "[]"
  );

let best =
  JSON.parse(
    localStorage.getItem("fz_best") || "[]"
  );

let requests =
  JSON.parse(
    localStorage.getItem("fz_requests") || "[]"
  );

let score =
  Number(
    localStorage.getItem("fz_score") || 0
  );


/* ================= TOAST ================= */

function toast(message){

  const box = $("#toast");

  box.textContent = message;

  box.classList.add("show");

  clearTimeout(window.toastTimer);

  window.toastTimer =
    setTimeout(
      () => box.classList.remove("show"),
      2500
    );
}


/* ================= PASSWORD ================= */

function validatePassword(password){

  return (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[0-9]/.test(password)
  );

}


/* ================= CAPTCHA ================= */

function createCaptcha(){

  captchaA =
    Math.floor(Math.random() * 8) + 1;

  captchaB =
    Math.floor(Math.random() * 8) + 1;

  $("#captchaText").textContent =
    `${captchaA} + ${captchaB} = ?`;

}


/* ================= GAME UI ================= */

function renderGames(target){

  $(target).innerHTML =
    games.map(
      (game,index) => `

        <article class="game-card ${game[3]}">

          <div class="game-icon">
            ${game[0]}
          </div>

          <h4>
            ${game[1]}
          </h4>

          <p>
            ${game[2]}
          </p>

          <button
            class="play"
            onclick="launchGame(${index})"
          >
            →
          </button>

        </article>

      `
    ).join("");

}


function launchGame(index){

  const game = games[index];

  score += 10;

  localStorage.setItem(
    "fz_score",
    score
  );

  $("#score").textContent = score;

  $("#meter").style.width =
    Math.min(
      100,
      score % 101
    ) + "%";


  openModal(`

    <p class="eyebrow">
      GAME LOBBY
    </p>

    <h2>
      ${game[0]} ${game[1]}
    </h2>

    <p class="muted">
      Choose how you want to play.
    </p>

    <div class="dashboard-grid">

      <button
        class="primary"
        onclick="toast('Matchmaking started!')"
      >
        ⚡ Random Match
      </button>

      <button
        class="secondary"
        onclick="toast('Room created!')"
      >
        🏠 Create Room
      </button>

    </div>

    <p class="muted">
      Multiplayer engine will be connected
      with the backend.
    </p>

  `);

}


/* ================= PAGE NAVIGATION ================= */

function showPage(page){

  $$(".page").forEach(
    pageElement =>
      pageElement.classList.remove(
        "active-page"
      )
  );

  const selected =
    $(`#page-${page}`);

  if(selected){
    selected.classList.add(
      "active-page"
    );
  }

  $$(".nav").forEach(
    button =>
      button.classList.toggle(
        "active",
        button.dataset.page === page
      )
  );

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });

}


/* ================= FRIEND ID ================= */

function generateFriendID(){

  return (
    "FZ-" +
    Math.floor(
      100000 +
      Math.random() * 900000
    )
  );

}


/* ================= STORAGE ================= */

function saveFriends(){

  localStorage.setItem(
    "fz_friends",
    JSON.stringify(friends)
  );

  localStorage.setItem(
    "fz_best",
    JSON.stringify(best)
  );

  localStorage.setItem(
    "fz_requests",
    JSON.stringify(requests)
  );

}


/* ================= FRIEND RENDER ================= */

function renderFriends(){

  $("#friendCount").textContent =
    friends.length;


  /* FRIENDS */

  if(friends.length){

    $("#friendsList").innerHTML =
      friends.map(
        (friend,index) => `

          <div class="friend-item">

            <span class="avatar sm">
              ${friend.name[0].toUpperCase()}
            </span>

            <div class="grow">

              <b>
                ${escapeHTML(friend.name)}
              </b>

              <small>
                ${escapeHTML(friend.id)}
              </small>

            </div>

            <div class="mini-actions">

              <button
                class="secondary"
                onclick="toggleBest(${index})"
              >
                ${best.includes(friend.id) ? "❤️" : "♡"}
              </button>

              <button
                class="secondary"
                onclick="toast('Chat will open here.')"
              >
                💬
              </button>

            </div>

          </div>

        `
      ).join("");

  }else{

    $("#friendsList").innerHTML =
      `
        <div class="empty">
          No friends yet.
          Add someone using their Friend ID.
        </div>
      `;

  }


  /* BEST FRIENDS */

  if(best.length){

    $("#bestList").innerHTML =
      best.map(
        id => {

          const friend =
            friends.find(
              f => f.id === id
            );

          if(!friend)
            return "";

          return `

            <div class="friend-item">

              <span class="avatar sm">
                ❤️
              </span>

              <div class="grow">

                <b>
                  ${escapeHTML(friend.name)}
                </b>

                <small>
                  Best Friend •
                  ${escapeHTML(friend.id)}
                </small>

              </div>

              <button
                class="secondary"
                onclick="removeBest('${friend.id}')"
              >
                Remove
              </button>

            </div>

          `;

        }
      ).join("");

  }else{

    $("#bestList").innerHTML =
      `
        <div class="empty">
          Choose ❤️ from your accepted friends.
        </div>
      `;

  }


  /* REQUESTS */

  if(requests.length){

    $("#requestList").innerHTML =
      requests.map(
        (request,index) => `

          <div class="friend-item">

            <span class="avatar sm">
              ${request.name[0].toUpperCase()}
            </span>

            <div class="grow">

              <b>
                ${escapeHTML(request.name)}
              </b>

              <small>
                Friend Request •
                ${escapeHTML(request.id)}
              </small>

            </div>

            <div class="mini-actions">

              <button
                class="primary"
                onclick="acceptRequest(${index})"
              >
                Accept
              </button>

              <button
                class="secondary"
                onclick="rejectRequest(${index})"
              >
                Reject
              </button>

            </div>

          </div>

        `
      ).join("");

  }else{

    $("#requestList").innerHTML =
      `
        <div class="empty">
          No pending requests.
        </div>
      `;

  }

}


/* ================= BEST FRIEND ================= */

function toggleBest(index){

  const id =
    friends[index].id;

  if(best.includes(id)){

    best =
      best.filter(
        item => item !== id
      );

    toast("Removed from Best Friends");

  }else{

    best.push(id);

    toast("Added to Best Friends ❤️");

  }

  saveFriends();

  renderFriends();

}


function removeBest(id){

  best =
    best.filter(
      item => item !== id
    );

  saveFriends();

  renderFriends();

  toast("Removed from Best Friends");

}


/* ================= SEND REQUEST ================= */

function sendFriendRequest(){

  const id =
    $("#friendInput")
      .value
      .trim()
      .toUpperCase();


  if(!/^FZ-\d{6}$/.test(id)){

    toast(
      "Enter a valid Friend ID"
    );

    return;

  }


  if(user && id === user.id){

    toast(
      "You cannot add yourself"
    );

    return;

  }


  if(
    friends.some(
      friend => friend.id === id
    )
  ){

    toast(
      "Already your friend"
    );

    return;

  }


  /*
    REAL requests will be stored
    in the backend later.
  */

  toast(
    "Friend request ready for backend."
  );

  $("#friendInput").value = "";

}


/* ================= ACCEPT / REJECT ================= */

function acceptRequest(index){

  const request =
    requests[index];

  friends.push({
    id:request.id,
    name:request.name
  });

  requests.splice(
    index,
    1
  );

  saveFriends();

  renderFriends();

  toast(
    `${request.name} is now your friend!`
  );

}


function rejectRequest(index){

  requests.splice(
    index,
    1
  );

  saveFriends();

  renderFriends();

  toast(
    "Request rejected"
  );

}


/* ================= ESCAPE HTML ================= */

function escapeHTML(value){

  return String(value)
    .replace(
      /[&<>"']/g,
      character => ({

        "&":"&amp;",
        "<":"&lt;",
        ">":"&gt;",
        '"':"&quot;",
        "'":"&#039;"

      }[character])
    );

}


/* ================= MODAL ================= */

function openModal(content){

  $("#modalBody").innerHTML =
    content;

  $("#modal")
    .classList
    .remove("hidden");

}


function closeModal(){

  $("#modal")
    .classList
    .add("hidden");

}


/* ================= LOGIN ================= */

function enterApp(){

  if(!user)
    return;


  $("#auth")
    .classList
    .add("hidden");

  $("#app")
    .classList
    .remove("hidden");


  $("#helloName")
    .textContent =
    user.name.toUpperCase();


  $("#friendId")
    .textContent =
    user.id;


  $("#profileBtn")
    .textContent =
    user.name[0]
      .toUpperCase();


  $("#score")
    .textContent =
    score;


  $("#meter")
    .style.width =
    Math.min(
      100,
      score % 101
    ) + "%";


  renderFriends();

}


/* ================= PROFILE ================= */

function openProfile(){

  openModal(`

    <p class="eyebrow">
      YOUR PROFILE
    </p>

    <h2>
      ${escapeHTML(user.name)}
    </h2>

    <p class="muted">
      Friend ID:
      <b>${user.id}</b>
    </p>

    <p class="muted">
      FriendZone XP:
      <b>${score}</b>
    </p>

    <button
      class="secondary full"
      onclick="logout()"
    >
      Log Out
    </button>

  `);

}


/* ================= LOGOUT ================= */

function logout(){

  user = null;

  localStorage.removeItem(
    "fz_user"
  );

  closeModal();

  $("#app")
    .classList
    .add("hidden");

  $("#auth")
    .classList
    .remove("hidden");

  toast("Logged out");

}


/* ================= AUTH ================= */

function setupAuth(){

  createCaptcha();


  /* TABS */

  $$(".auth-tabs button")
    .forEach(
      button => {

        button.onclick = () => {

          $$(".auth-tabs button")
            .forEach(
              item =>
                item.classList.remove(
                  "active"
                )
            );

          button.classList.add(
            "active"
          );


          $("#loginForm")
            .classList.toggle(
              "hidden",
              button.dataset.auth !== "login"
            );


          $("#signupForm")
            .classList.toggle(
              "hidden",
              button.dataset.auth !== "signup"
            );


          $("#forgotForm")
            .classList.add(
              "hidden"
            );

        };

      }
    );


  /* PASSWORD RULES */

  $("#signupPassword")
    .addEventListener(
      "input",
      event => {

        const password =
          event.target.value;


        $("#rLen")
          .textContent =
          (password.length >= 8 ? "✓" : "○")
          + " 8+ characters";


        $("#rCap")
          .textContent =
          (/[A-Z]/.test(password) ? "✓" : "○")
          + " 1 capital";


        $("#rNum")
          .textContent =
          (/[0-9]/.test(password) ? "✓" : "○")
          + " 1 number";

      }
    );


  /* SIGNUP */

  $("#signupForm")
    .onsubmit =
    event => {

      event.preventDefault();


      const password =
        $("#signupPassword").value;


      if(!validatePassword(password)){

        toast(
          "Password needs 8+ chars, 1 capital and 1 number"
        );

        return;

      }


      if(
        Number(
          $("#captchaInput").value
        )
        !==
        captchaA + captchaB
      ){

        toast(
          "CAPTCHA answer is incorrect"
        );

        return;

      }


      const account = {

        name:
          $("#signupName")
            .value
            .trim(),

        email:
          $("#signupEmail")
            .value
            .trim()
            .toLowerCase(),

        password,

        id:
          generateFriendID()

      };


      localStorage.setItem(
        "fz_account",
        JSON.stringify(account)
      );


      user = account;


      localStorage.setItem(
        "fz_user",
        JSON.stringify(user)
      );


      toast(
        "Account created!"
      );


      enterApp();

    };


  /* LOGIN */

  $("#loginForm")
    .onsubmit =
    event => {

      event.preventDefault();


      const account =
        JSON.parse(
          localStorage.getItem(
            "fz_account"
          )
        );


      if(
        !account ||
        account.email !==
          $("#loginEmail")
            .value
            .trim()
            .toLowerCase() ||
        account.password !==
          $("#loginPassword").value
      ){

        toast(
          "Invalid email or password"
        );

        return;

      }


      user = account;

      localStorage.setItem(
        "fz_user",
        JSON.stringify(user)
      );


      enterApp();

    };


  /* FORGOT PASSWORD */

  $("#forgotBtn")
    .onclick = () => {

      $("#loginForm")
        .classList
        .add("hidden");

      $("#signupForm")
        .classList
        .add("hidden");

      $("#forgotForm")
        .classList
        .remove("hidden");

    };


  $("#backLogin")
    .onclick = () => {

      $("#forgotForm")
        .classList
        .add("hidden");

      $("#loginForm")
        .classList
        .remove("hidden");

    };


  $("#forgotForm")
    .onsubmit =
    event => {

      event.preventDefault();


      const account =
        JSON.parse(
          localStorage.getItem(
            "fz_account"
          )
        );


      const email =
        $("#forgotEmail")
          .value
          .trim()
          .toLowerCase();


      if(
        !account ||
        account.email !== email
      ){

        toast(
          "This email is not registered"
        );

        return;

      }


      openModal(`

        <p class="eyebrow">
          EMAIL VERIFIED
        </p>

        <h2>
          Renew Password
        </h2>

        <p class="muted">
          Create your new password.
        </p>

        <label>

          New Password

          <input
            id="newPass"
            type="password"
            placeholder="8+ characters"
          >

        </label>

        <br>

        <button
          class="primary full"
          onclick="renewPassword()"
        >
          Renew Password
        </button>

      `);

    };

}


/* ================= RENEW PASSWORD ================= */

window.renewPassword =
function(){

  const password =
    $("#newPass").value;


  if(!validatePassword(password)){

    toast(
      "Password needs 8+ chars, 1 capital and 1 number"
    );

    return;

  }


  const account =
    JSON.parse(
      localStorage.getItem(
        "fz_account"
      )
    );


  account.password =
    password;


  localStorage.setItem(
    "fz_account",
    JSON.stringify(account)
  );


  closeModal();

  toast(
    "Password renewed successfully!"
  );

};


/* ================= CREATE ROOM ================= */

function createRoom(){

  openModal(`

    <p class="eyebrow">
      PRIVATE PLAY
    </p>

    <h2>
      🏠 Create a Room
    </h2>

    <p class="muted">
      Choose a game and invite your friends.
    </p>

    <label>

      Game

      <select>

        ${games.map(
          game =>
            `<option>
              ${game[1]}
            </option>`
        ).join("")}

      </select>

    </label>

    <br>

    <button
      class="primary full"
      onclick="toast('Room created!')"
    >
      Create Room
    </button>

  `);

}


/* ================= INIT ================= */

$("#closeModal")
  .onclick =
  closeModal;


$("#modal")
  .addEventListener(
    "click",
    event => {

      if(
        event.target.id === "modal"
      ){
        closeModal();
      }

    }
  );


$$("[data-page]")
  .forEach(
    button => {

      button.addEventListener(
        "click",
        () => showPage(
          button.dataset.page
        )
      );

    }
  );


$("#newThought")
  .onclick = () => {

    thoughtIndex =
      (thoughtIndex + 1)
      % thoughts.length;

    $("#thought")
      .textContent =
      thoughts[thoughtIndex];

  };


$("#copyId")
  .onclick =
  async () => {

    try{

      await navigator.clipboard
        .writeText(user.id);

      toast(
        "Friend ID copied!"
      );

    }catch{

      toast(user.id);

    }

  };


$("#sendRequest")
  .onclick =
  sendFriendRequest;


$("#profileBtn")
  .onclick =
  openProfile;


$("#createRoom")
  .onclick =
  createRoom;


$("#createRoom2")
  .onclick =
  createRoom;


$("#quickMatch")
  .onclick =
  () => {

    openModal(`

      <p class="eyebrow">
        MATCHMAKING
      </p>

      <h2>
        ⚡ Finding Opponent...
      </h2>

      <p class="muted">
        Searching for an available player.
      </p>

      <button
        class="secondary full"
        onclick="toast('Searching...')"
      >
        Keep Searching
      </button>

    `);

  };


$("#tournament")
  .onclick =
  () => {

    openModal(`

      <p class="eyebrow">
        TOURNAMENT
      </p>

      <h2>
        🏆 Weekly Cup
      </h2>

      <p class="muted">
        Tournament system is ready for
        the realtime backend.
      </p>

      <button
        class="primary full"
        onclick="toast('Tournament coming soon!')"
      >
        Join Tournament
      </button>

    `);

  };


renderGames("#quickGames");

renderGames("#allGames");

setupAuth();


if(user){

  enterApp();

}
