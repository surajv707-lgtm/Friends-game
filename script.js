/* =====================================================
   FRIENDZONE
   Main website logic
===================================================== */


/* ================= STATE ================= */

let state = JSON.parse(
  localStorage.getItem("friendzoneState")
);

if(!state){

  state = {

    account:null,

    loggedIn:false,

    friends:[],

    requests:[],

    bestFriends:[],

    messages:{},

    rooms:[],

    score:0

  };

}

let captchaA = 0;
let captchaB = 0;

let currentChat = null;
let currentGame = null;


/* ================= GAMES ================= */

const games = [

  {
    id:"tictactoe",
    name:"Tic Tac Toe",
    icon:"⭕",
    description:"Classic 1v1 strategy game.",
    players:"2 Players"
  },

  {
    id:"rps",
    name:"Rock Paper Scissors",
    icon:"✊",
    description:"Fast 1v1 battle.",
    players:"2 Players"
  },

  {
    id:"quiz",
    name:"Quick Quiz",
    icon:"🧠",
    description:"Answer quickly and score points.",
    players:"2+ Players"
  },

  {
    id:"memory",
    name:"Memory Match",
    icon:"🃏",
    description:"Test your memory and speed.",
    players:"1–2 Players"
  },

  {
    id:"dots",
    name:"Dots Battle",
    icon:"🔵",
    description:"Capture more space than your opponent.",
    players:"2 Players"
  },

  {
    id:"reaction",
    name:"Reaction Rush",
    icon:"⚡",
    description:"React faster than your opponent.",
    players:"1–2 Players"
  }

];


/* ================= HELPERS ================= */

function $(id){
  return document.getElementById(id);
}


function save(){

  localStorage.setItem(
    "friendzoneState",
    JSON.stringify(state)
  );

}


function toast(message){

  const box = $("toast");

  box.textContent = message;

  box.classList.add("show");

  setTimeout(()=>{
    box.classList.remove("show");
  },2200);

}


/* ================= AUTH ================= */

function showAuth(type){

  $("loginBox").classList.add("hidden");
  $("signupBox").classList.add("hidden");
  $("forgotBox").classList.add("hidden");
  $("resetBox").classList.add("hidden");

  $("loginTab").classList.remove("active");
  $("signupTab").classList.remove("active");


  if(type==="login"){

    $("loginBox").classList.remove("hidden");
    $("loginTab").classList.add("active");

  }


  if(type==="signup"){

    $("signupBox").classList.remove("hidden");
    $("signupTab").classList.add("active");

  }


  if(type==="forgot"){

    $("forgotBox").classList.remove("hidden");

  }

}


function validPassword(password){

  return (

    password.length >= 8 &&

    /[A-Z]/.test(password) &&

    /[0-9]/.test(password)

  );

}


function checkPassword(inputID,rulesID){

  const password = $(inputID).value;

  $(rulesID).innerHTML = `

    <span class="rule ${password.length>=8?"ok":""}">
      8+ Characters
    </span>

    <span class="rule ${/[A-Z]/.test(password)?"ok":""}">
      Capital Letter
    </span>

    <span class="rule ${/[0-9]/.test(password)?"ok":""}">
      Number
    </span>

  `;

}


/* CAPTCHA */

function createCaptcha(){

  captchaA =
    Math.floor(Math.random()*9)+1;

  captchaB =
    Math.floor(Math.random()*9)+1;

  $("captchaQuestion").textContent =
    `${captchaA} + ${captchaB} = ?`;

  $("captchaAnswer").value = "";

}


/* FRIEND ID */

function generateFriendID(){

  return (
    "FZ-" +
    Math.floor(
      100000 +
      Math.random()*900000
    )
  );

}


/* SIGNUP */

function signup(){

  const name =
    $("signupName").value.trim();

  const email =
    $("signupEmail").value
    .trim()
    .toLowerCase();

  const password =
    $("signupPassword").value;

  const answer =
    Number(
      $("captchaAnswer").value
    );


  if(!name || !email || !password){

    toast("Please fill all fields.");

    return;

  }


  if(!validPassword(password)){

    toast(
      "Password needs 8+ characters, capital letter and number."
    );

    return;

  }


  if(answer !== captchaA + captchaB){

    toast("Wrong CAPTCHA.");

    createCaptcha();

    return;

  }


  if(state.account &&
     state.account.email === email){

    toast("Email is already registered.");

    return;

  }


  state.account = {

    name:name,

    email:email,

    password:password,

    friendId:generateFriendID()

  };


  state.loggedIn = true;

  save();

  toast("Account created successfully!");

  enterApp();

}


/* LOGIN */

function login(){

  const email =
    $("loginEmail").value
    .trim()
    .toLowerCase();

  const password =
    $("loginPassword").value;


  if(
    !state.account ||
    state.account.email !== email ||
    state.account.password !== password
  ){

    toast("Invalid email or password.");

    return;

  }


  state.loggedIn = true;

  save();

  toast("Login successful!");

  enterApp();

}


/* FORGOT PASSWORD */

function verifyEmail(){

  const email =
    $("forgotEmail").value
    .trim()
    .toLowerCase();


  if(
    !state.account ||
    state.account.email !== email
  ){

    toast("Email not found.");

    return;

  }


  $("forgotBox").classList.add("hidden");

  $("resetBox").classList.remove("hidden");

  toast("Email verified.");

}


/* RESET PASSWORD */

function resetPassword(){

  const password =
    $("newPassword").value;

  const confirm =
    $("confirmPassword").value;


  if(!validPassword(password)){

    toast(
      "Password needs 8+ characters, capital letter and number."
    );

    return;

  }


  if(password !== confirm){

    toast("Passwords do not match.");

    return;

  }


  state.account.password = password;

  save();


  $("resetBox").classList.add("hidden");

  $("loginBox").classList.remove("hidden");

  $("loginTab").classList.add("active");

  toast("Password renewed. Login now.");

}


/* ENTER WEBSITE */

function enterApp(){

  $("authPage")
    .classList
    .remove("active");

  $("navbar")
    .classList
    .remove("hidden");

  updateUI();

  openPage("home");

}


/* LOGOUT */

function logout(){

  state.loggedIn = false;

  save();

  $("navbar")
    .classList
    .add("hidden");

  document
    .querySelectorAll(".page")
    .forEach(page=>{
      page.classList.remove("active");
    });

  $("authPage")
    .classList
    .add("active");

  showAuth("login");

  toast("Logged out.");

}


/* ================= NAVIGATION ================= */

function openPage(page){

  if(!state.loggedIn){

    return;

  }


  document
    .querySelectorAll(".page")
    .forEach(p=>{
      p.classList.remove("active");
    });


  const target =
    $(page + "Page");


  if(target){

    target.classList.add("active");

  }


  if(page==="home")
    renderHome();

  if(page==="friends")
    renderFriends();

  if(page==="bestfriends")
    renderBestFriends();

  if(page==="chat")
    renderChat();

  if(page==="games")
    renderGames();

  if(page==="rooms")
    renderRooms();

  if(page==="competitions")
    renderLeaderboard();

  if(page==="profile")
    renderProfile();

}


/* ================= UI ================= */

function updateUI(){

  if(!state.account)
    return;


  const firstLetter =
    state.account.name
    .charAt(0)
    .toUpperCase();


  $("topAvatar").textContent =
    firstLetter;

  $("topName").textContent =
    state.account.name
    .split(" ")[0];


  $("homeName").textContent =
    state.account.name
    .split(" ")[0];


  $("homeFriendID").textContent =
    state.account.friendId;


  $("friendCount").textContent =
    state.friends.length;


  $("bestCount").textContent =
    state.bestFriends.length;


  $("roomCount").textContent =
    state.rooms.length;


  renderHomeGames();

  renderFriends();

  renderBestFriends();

  renderChat();

  renderRooms();

  renderLeaderboard();

  renderProfile();

}


/* ================= HOME ================= */

function renderHome(){

  updateUI();

  renderHomeGames();

}


function renderHomeGames(){

  const box =
    $("homeGames");

  if(!box)
    return;


  box.innerHTML =
    games
      .slice(0,3)
      .map(gameCard)
      .join("");

}


/* ================= FRIENDS ================= */

function sendFriendRequest(){

  const id =
    $("friendIDInput")
    .value
    .trim()
    .toUpperCase();


  if(!/^FZ-\d{6}$/.test(id)){

    toast("Enter a valid Friend ID.");

    return;

  }


  if(id===state.account.friendId){

    toast("You cannot add yourself.");

    return;

  }


  if(
    state.friends.some(
      f=>f.friendId===id
    )
  ){

    toast("Already your friend.");

    return;

  }


  if(
    state.requests.some(
      r=>r.friendId===id
    )
  ){

    toast("Request already pending.");

    return;

  }


  /*
    Demo frontend:
    In the real backend version this request
    will be delivered to the user owning
    this Friend ID.
  */

  state.requests.push({

    friendId:id,

    name:"Friend " +
      id.substring(3),

    incoming:false

  });


  save();

  $("friendIDInput").value="";

  toast(
    "Friend request sent!"
  );

  renderFriends();

}


function acceptRequest(index){

  const request =
    state.requests[index];


  state.friends.push({

    friendId:request.friendId,

    name:request.name

  });


  state.requests.splice(
    index,
    1
  );


  save();

  renderFriends();

  updateUI();

  toast(
    "Friend added successfully!"
  );

}


function rejectRequest(index){

  state.requests.splice(
    index,
    1
  );

  save();

  renderFriends();

  toast("Request rejected.");

}


function removeFriend(id){

  state.friends =
    state.friends.filter(
      f=>f.friendId!==id
    );


  state.bestFriends =
    state.bestFriends.filter(
      x=>x!==id
    );


  delete state.messages[id];

  save();

  renderFriends();

  renderBestFriends();

  updateUI();

  toast("Friend removed.");

}


function makeBestFriend(id){

  if(
    !state.friends.some(
      f=>f.friendId===id
    )
  ){

    toast(
      "Only friends can become Best Friends."
    );

    return;

  }


  if(
    state.bestFriends.includes(id)
  ){

    state.bestFriends =
      state.bestFriends.filter(
        x=>x!==id
      );

    toast("Removed from Best Friends.");

  }else{

    state.bestFriends.push(id);

    toast("Added to Best Friends 💜");

  }


  save();

  renderFriends();

  renderBestFriends();

  updateUI();

}


function renderFriends(){

  const box =
    $("friendsList");

  if(!box)
    return;


  if(state.friends.length===0){

    box.innerHTML = `

      <div class="empty">

        No friends yet.<br>

        Add someone using their Friend ID.

      </div>

    `;

  }else{

    box.innerHTML =
      state.friends
      .map(friend=>`

        <div class="friend-card">

          <div class="avatar">
            ${friend.name.charAt(0)}
          </div>

          <div class="friend-info">

            <b>
              ${friend.name}
            </b>

            <small>
              ${friend.friendId}
            </small>

          </div>


          <div class="friend-actions">

            <button
              class="secondary"
              onclick="startChat('${friend.friendId}')">

              Chat

            </button>


            <button
              class="secondary"
              onclick="makeBestFriend('${friend.friendId}')">

              ${
                state.bestFriends.includes(
                  friend.friendId
                )
                ? "💜 Best"
                : "☆ Best"
              }

            </button>


            <button
              class="danger"
              onclick="removeFriend('${friend.friendId}')">

              Remove

            </button>

          </div>

        </div>

      `)
      .join("");

  }


  const requests =
    $("requestsList");


  requests.innerHTML =
    state.requests.length

    ?

    state.requests
      .map((request,index)=>`

        <div class="friend-card">

          <div class="avatar">
            ?
          </div>

          <div class="friend-info">

            <b>
              ${request.name}
            </b>

            <small>
              ${request.friendId}
            </small>

          </div>


          <div class="friend-actions">

            <button
              class="primary"
              onclick="acceptRequest(${index})">

              Accept

            </button>


            <button
              class="danger"
              onclick="rejectRequest(${index})">

              Reject

            </button>

          </div>

        </div>

      `)
      .join("")

    :

    `<div class="empty">
      No friend requests.
    </div>`;


  $("requestCount").textContent =
    state.requests.length
    ? `(${state.requests.length})`
    : "";

}


function friendTab(id,button){

  $("friendsList")
    .classList
    .toggle(
      "hidden",
      id!=="friendsList"
    );


  $("requestsList")
    .classList
    .toggle(
      "hidden",
      id!=="requestsList"
    );


  document
    .querySelectorAll(".tabs-small button")
    .forEach(btn=>{
      btn.classList.remove("active");
    });


  button.classList.add("active");

}


/* ================= BEST FRIENDS ================= */

function renderBestFriends(){

  const box =
    $("bestFriendsList");

  if(!box)
    return;


  const best =
    state.friends.filter(
      friend =>
        state.bestFriends
        .includes(friend.friendId)
    );


  if(best.length===0){

    box.innerHTML = `

      <div class="empty">

        Your Best Friends list is empty.<br><br>

        Add someone to Best Friends
        from your Friends list.

      </div>

    `;

    return;

  }


  box.innerHTML =
    best
    .map(friend=>`

      <div class="friend-card">

        <div class="avatar">
          💜
        </div>

        <div class="friend-info">

          <b>
            ${friend.name}
          </b>

          <small>
            ${friend.friendId}
          </small>

        </div>


        <button
          class="secondary"
          onclick="startChat('${friend.friendId}')">

          Chat

        </button>


        <button
          class="danger"
          onclick="makeBestFriend('${friend.friendId}')">

          Remove Best

        </button>

      </div>

    `)
    .join("");

}


/* ================= CHAT ================= */

function renderChat(){

  const box =
    $("chatFriends");

  if(!box)
    return;


  if(state.friends.length===0){

    box.innerHTML =
      `<div class="empty">
        Add friends first.
      </div>`;

    return;

  }


  box.innerHTML =
    state.friends
    .map(friend=>`

      <div
        class="chat-person ${
          currentChat===friend.friendId
          ? "active"
          : ""
        }"
        onclick="startChat('${friend.friendId}')">

        <div class="avatar">
          ${friend.name.charAt(0)}
        </div>

        <b>
          ${friend.name}
        </b>

      </div>

    `)
    .join("");


  if(currentChat){

    renderMessages();

  }

}


function startChat(id){

  if(
    !state.friends.some(
      friend =>
        friend.friendId===id
    )
  ){

    toast(
      "Chat is only available with friends."
    );

    return;

  }


  currentChat=id;

  openPage("chat");

  renderChat();

  renderMessages();

}


function renderMessages(){

  const friend =
    state.friends.find(
      f=>f.friendId===currentChat
    );


  if(!friend)
    return;


  $("chatHeader").textContent =
    friend.name;


  const list =
    state.messages[currentChat] || [];


  if(list.length===0){

    $("messages").innerHTML =
      `<div class="empty">
        No messages yet.<br>
        Say hello 👋
      </div>`;

    return;

  }


  $("messages").innerHTML =
    list
    .map(message=>`

      <div class="bubble ${
        message.me ? "me" : ""
      }">

        ${escapeHTML(message.text)}

      </div>

    `)
    .join("");


  $("messages").scrollTop =
    $("messages").scrollHeight;

}


function sendMessage(){

  if(!currentChat){

    toast(
      "Select a friend first."
    );

    return;

  }


  const input =
    $("messageInput");


  const text =
    input.value.trim();


  if(!text)
    return;


  if(!state.messages[currentChat]){

    state.messages[currentChat]=[];

  }


  state.messages[currentChat].push({

    text:text,

    me:true

  });


  input.value="";

  save();

  renderMessages();

}


function escapeHTML(text){

  return text.replace(
    /[&<>"']/g,

    char => ({

      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"

    }[char])

  );

}


/* ================= GAMES ================= */

function gameCard(game){

  return `

    <div class="game-card">

      <div>

        <div class="game-icon">
          ${game.icon}
        </div>

        <h3>
          ${game.name}
        </h3>

        <p>
          ${game.description}
          • ${game.players}
        </p>

      </div>


      <button
        class="primary"
        onclick="openGame('${game.id}')">

        Play

      </button>

    </div>

  `;

}


function renderGames(){

  $("gamesGrid").innerHTML =
    games
    .map(gameCard)
    .join("");

}


function openGame(id){

  currentGame =
    games.find(
      game=>game.id===id
    );


  openPage("game");


  $("gameDetails").innerHTML = `

    <div class="game-detail">

      <div class="game-icon">
        ${currentGame.icon}
      </div>

      <small>
        GAME
      </small>

      <h1>
        ${currentGame.name}
      </h1>

      <p>
        ${currentGame.description}
      </p>


      <div class="mode-grid">


        <button
          class="mode"
          onclick="playSolo()">

          <b>
            🎯 Play Solo
          </b>

          <span>
            Play by yourself and practice.
          </span>

        </button>


        <button
          class="mode"
          onclick="randomMatch()">

          <b>
            ⚡ Random Match
          </b>

          <span>
            Find an available opponent automatically.
          </span>

        </button>


        <button
          class="mode"
          onclick="openPrivateRoom()">

          <b>
            🔐 Private Room
          </b>

          <span>
            Create a room and invite friends.
          </span>

        </button>


      </div>

    </div>

  `;

}


function playSolo(){

  state.score += 5;

  save();

  renderLeaderboard();

  toast(
    `${currentGame.name} started! +5 points`
  );

}


function randomMatch(){

  toast(
    "Searching for an available opponent..."
  );


  setTimeout(()=>{

    toast(
      "Opponent found! Match ready."
    );

  },1200);

}


function openPrivateRoom(){

  openPage("rooms");

  createRoom(
    currentGame
    ? currentGame.name
    : "Game"
  );

}


/* ================= ROOMS ================= */

function createRoom(gameName="Game"){

  const code =
    "FZ-" +
    Math.random()
    .toString(36)
    .substring(2,7)
    .toUpperCase();


  state.rooms.push({

    code:code,

    game:gameName,

    owner:state.account.name,

    members:[
      state.account.friendId
    ]

  });


  save();

  renderRooms();

  updateUI();

  toast(
    "Room created: " + code
  );

}


function joinRoom(){

  const code =
    $("roomCode")
    .value
    .trim()
    .toUpperCase();


  const room =
    state.rooms.find(
      r=>r.code===code
    );


  if(!room){

    toast("Room not found.");

    return;

  }


  if(
    !room.members.includes(
      state.account.friendId
    )
  ){

    room.members.push(
      state.account.friendId
    );

  }


  save();

  renderRooms();

  toast(
    "Joined room " + code
  );

}


function renderRooms(){

  const box =
    $("roomsList");

  if(!box)
    return;


  if(state.rooms.length===0){

    box.innerHTML =
      `<div class="empty">
        No private rooms yet.<br>
        Create one and invite your friends.
      </div>`;

    return;

  }


  box.innerHTML =
    state.rooms
    .map(room=>`

      <div class="room-card">

        <div>

          <b>
            ${room.game}
          </b>

          <small>

            <br>

            Room:
            ${room.code}

            •
            ${room.members.length}
            player(s)

          </small>

        </div>


        <button
          class="primary"
          onclick="enterRoom('${room.code}')">

          Enter

        </button>

      </div>

    `)
    .join("");

}


function enterRoom(code){

  toast(
    "Room " + code + " is ready!"
  );

}


/* ================= COMPETITIONS ================= */

function joinCompetition(){

  state.score += 10;

  save();

  renderLeaderboard();

  toast(
    "Joined competition! +10 points"
  );

}


function renderLeaderboard(){

  const box =
    $("leaderboard");

  if(!box)
    return;


  const people = [

    {

      name:
        state.account
        ? state.account.name
        : "You",

      score:
        state.score || 0

    }

  ];


  state.friends.forEach(
    (friend,index)=>{

      people.push({

        name:friend.name,

        score:
          Math.max(
            0,
            80-(index*13)
          )

      });

    }
  );


  people.sort(
    (a,b)=>b.score-a.score
  );


  box.innerHTML =
    people
    .map(
      (person,index)=>`

        <div class="rank">

          <strong>
            #${index+1}
          </strong>

          <span>
            ${person.name}
          </span>

          <b>
            ${person.score} pts
          </b>

        </div>

      `
    )
    .join("");

}


/* ================= PROFILE ================= */

function renderProfile(){

  if(!state.account)
    return;


  $("profileName").textContent =
    state.account.name;


  $("profileEmail").textContent =
    state.account.email;


  $("profileID").textContent =
    state.account.friendId;


  $("bigAvatar").textContent =
    state.account.name
    .charAt(0)
    .toUpperCase();

}


/* ================= START ================= */

window.addEventListener(
  "load",
  ()=>{

    if(
      state.loggedIn &&
      state.account
    ){

      $("navbar")
        .classList
        .remove("hidden");

      enterApp();

    }else{

      showAuth("login");

      createCaptcha();

    }

  }
);
