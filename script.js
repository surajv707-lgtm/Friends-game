const $ = (s) => document.querySelector(s),
  $$ = (s) => document.querySelectorAll(s);
const G = [
  ["🎯", "Tic Tac Toe", "1v1 • Room", "purple"],
  ["✊", "Rock Paper Scissors", "1v1 • Random", "red"],
  ["⚡", "Reaction Rush", "Solo • Score", "green"],
  ["🧠", "Memory Clash", "1v1 • Room", "blue"],
  ["🔢", "Guess Number", "1v1 • Random", "orange"],
  ["🐍", "Snake", "Solo • Score", "green"],
  ["🎲", "Dice Battle", "Multiplayer", "gold"],
  ["🔥", "Roast Me", "Party", "pink"],
  ["❤️", "Friendship Test", "Friends", "pink"],
  ["🔮", "Future Generator", "Party", "violet"],
  ["🧩", "Connect 4", "1v1 • Room", "blue"],
  ["❓", "Quiz Battle", "Multiplayer", "purple"],
];
const thoughts = [
  "Bro said “one game” 47 minutes ago.",
  "Your friend is online. Your productivity is offline.",
  "If losing was a skill, your squad would be professional.",
  "One more match. Famous last words.",
  "Best friends are basically free teammates.",
];
let capA,
  capB,
  user = JSON.parse(localStorage.fzUser || "null"),
  xp = +localStorage.fzXp || 0,
  friends = JSON.parse(localStorage.fzFriends || "[]"),
  best = JSON.parse(localStorage.fzBest || "[]"),
  requests = JSON.parse(localStorage.fzReq || "[]");
function toast(x) {
  let t = $("#toast");
  t.textContent = x;
  t.classList.add("show");
  clearTimeout(window.to);
  window.to = setTimeout(() => t.classList.remove("show"), 2200);
}
function pass(p) {
  return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p);
}
function captcha() {
  capA = 1 + Math.floor(Math.random() * 8);
  capB = 1 + Math.floor(Math.random() * 8);
  $("#cap").textContent = `${capA} + ${capB} = ?`;
}
function games(el) {
  $(el).innerHTML = G.map(
    (g, i) =>
      `<article class="game ${g[3]}"><i>${g[0]}</i><h4>${g[1]}</h4><p>${g[2]}</p><button onclick="launch(${i})">→</button></article>`
  ).join("");
}
function launch(i) {
  xp += 10;
  localStorage.fzXp = xp;
  $("#xp").textContent = xp;
  $("#meter").style.width = (xp % 101) + "%";
  open(
    `<small class="eyebrow">GAME LOBBY</small><h2>${G[i][0]} ${G[i][1]}</h2><p>How do you want to play?</p><div class="twocol"><button class="primary" onclick="toast('Finding opponent…')">⚡ Random Match</button><button class="secondary" onclick="toast('Room created — invite your friends!')">🏠 Create Room</button></div><p class="muted">The live multiplayer engine will be connected in the backend phase.</p>`
  );
}
function open(html) {
  $("#mb").innerHTML = html;
  $("#modal").classList.remove("hide");
}
function page(p) {
  $$(".page").forEach((x) => x.classList.remove("active"));
  $("#" + p).classList.add("active");
  $$("[data-page]").forEach((x) =>
    x.classList.toggle("active", x.dataset.page === p)
  );
  scrollTo(0, 0);
}
function id() {
  return "FZ-" + Math.floor(100000 + Math.random() * 900000);
}
function save() {
  localStorage.fzFriends = JSON.stringify(friends);
  localStorage.fzBest = JSON.stringify(best);
  localStorage.fzReq = JSON.stringify(requests);
}
function esc(x) {
  return String(x).replace(
    /[&<>"']/g,
    (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[
        m
      ])
  );
}
function render() {
  let f = $("#fl");
  $("#fc").textContent = friends.length;
  f.innerHTML = friends.length
    ? friends
        .map(
          (x, i) =>
            `<div class="friend"><span class="avatar">${x.name[0].toUpperCase()}</span><div class="grow"><b>${esc( x.name )}</b><small>${ x.id }</small></div><div class="mini"><button class="secondary" onclick="bestToggle(${i})">${ best.includes(x.id) ? "❤️" : "♡" }</button><button class="secondary" onclick="toast('Chat is available after the realtime backend is connected.')">💬</button></div></div>`
        )
        .join("")
    : '<p class="muted">No friends yet. Add someone using their Friend ID.</p>';
  $("#bl").innerHTML = best.length
    ? best
        .map((i) => {
          let x = friends.find((y) => y.id === i);
          return x
            ? `<div class="friend"><span class="avatar">❤️</span><div class="grow"><b>${esc( x.name )}</b><small>Best Friend • ${ x.id }</small></div><button class="secondary" onclick="bestRemove('${ x.id }')">Remove</button></div>`
            : "";
        })
        .join("")
    : '<p class="muted">Choose ❤️ beside an accepted friend.</p>';
  $("#rq").innerHTML = requests.length
    ? requests
        .map(
          (x, i) =>
            `<div class="friend"><span class="avatar">${x.name[0].toUpperCase()}</span><div class="grow"><b>${esc( x.name )}</b><small>${ x.id }</small></div><div class="mini"><button class="primary" onclick="accept(${i})">Accept</button><button class="secondary" onclick="reject(${i})">Reject</button></div></div>`
        )
        .join("")
    : '<p class="muted">No pending requests.</p>';
}
function bestToggle(i) {
  let id = friends[i].id;
  best = best.includes(id) ? best.filter((x) => x !== id) : [...best, id];
  save();
  render();
  toast(
    best.includes(id) ? "Added to Best Friends ❤️" : "Removed from Best Friends"
  );
}
function bestRemove(id) {
  best = best.filter((x) => x !== id);
  save();
  render();
}
$("#send").onclick = () => {
  let v = $("#addid").value.trim().toUpperCase();
  if (!/^FZ-\d{6}$/.test(v)) return toast("Enter a valid Friend ID");
  if (v === user.id) return toast("You cannot add yourself");
  if (friends.some((x) => x.id === v)) return toast("Already your friend");
  toast("Friend request created. Live delivery needs the backend.");
  $("#addid").value = "";
};
function accept(i) {
  let r = requests[i];
  friends.push(r);
  requests.splice(i, 1);
  save();
  render();
  toast(r.name + " is now your friend!");
}
function reject(i) {
  requests.splice(i, 1);
  save();
  render();
  toast("Request rejected");
}
$("#copy").onclick = () =>
  navigator.clipboard
    ?.writeText(user.id)
    .then(() => toast("Friend ID copied"))
    .catch(() => toast(user.id));
function enter() {
  if (!user) return;
  $("#auth").classList.add("hide");
  $("#app").classList.remove("hide");
  $("#hello").textContent = user.name.toUpperCase();
  $("#fid").textContent = user.id;
  $("#profile").textContent = user.name[0].toUpperCase();
  $("#xp").textContent = xp;
  $("#meter").style.width = (xp % 101) + "%";
  render();
}
function setupAuth() {
  captcha();
  $$(".tabs button").forEach(
    (b) =>
      (b.onclick = () => {
        $$(".tabs button").forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        $("#loginForm").classList.toggle("hide", b.dataset.auth !== "login");
        $("#signupForm").classList.toggle("hide", b.dataset.auth !== "signup");
        $("#forgotForm").classList.add("hide");
      })
  );
  $("#sp").oninput = (e) => {
    let p = e.target.value;
    $("#rl").textContent = (p.length >= 8 ? "✓" : "○") + " 8+ chars";
    $("#rc").textContent = (/[A-Z]/.test(p) ? "✓" : "○") + " 1 capital";
    $("#rn").textContent = (/[0-9]/.test(p) ? "✓" : "○") + " 1 number";
  };
  $("#signupForm").onsubmit = (e) => {
    e.preventDefault();
    let p = $("#sp").value;
    if (!pass(p))
      return toast("Password needs 8+ chars, 1 capital and 1 number");
    if (+$("#ca").value !== capA + capB) return toast("Wrong CAPTCHA");
    user = {
      name: $("#sn").value.trim(),
      email: $("#se").value.trim().toLowerCase(),
      password: p,
      id: id(),
    };
    localStorage.fzUser = JSON.stringify(user);
    localStorage.fzAccount = JSON.stringify(user);
    enter();
    toast("Welcome to FriendZone!");
  };
  $("#loginForm").onsubmit = (e) => {
    e.preventDefault();
    let a = JSON.parse(localStorage.fzAccount || "null");
    if (
      !a ||
      a.email !== $("#le").value.trim().toLowerCase() ||
      a.password !== $("#lp").value
    )
      return toast("Invalid email or password");
    user = a;
    localStorage.fzUser = JSON.stringify(user);
    enter();
  };
  $("#forgot").onclick = () => {
    $("#loginForm").classList.add("hide");
    $("#signupForm").classList.add("hide");
    $("#forgotForm").classList.remove("hide");
  };
  $("#back").onclick = () => {
    $("#forgotForm").classList.add("hide");
    $("#loginForm").classList.remove("hide");
  };
  $("#forgotForm").onsubmit = (e) => {
    e.preventDefault();
    let a = JSON.parse(localStorage.fzAccount || "null");
    if (!a || a.email !== $("#fe").value.trim().toLowerCase())
      return toast("That email is not registered");
    open(
      `<small class="eyebrow">VERIFIED</small><h2>Renew password</h2><label>New password<input id="np" type="password" placeholder="8+ characters"></label><br><button class="primary" style="width:100%" onclick="renew()">Renew password</button>`
    );
  };
}
window.renew = () => {
  let p = $("#np").value;
  if (!pass(p)) return toast("Password needs 8+ chars, 1 capital and 1 number");
  let a = JSON.parse(localStorage.fzAccount);
  a.password = p;
  localStorage.fzAccount = JSON.stringify(a);
  $("#modal").classList.add("hide");
  toast("Password renewed. Login now.");
};
$$("[data-page]").forEach((b) => (b.onclick = () => page(b.dataset.page)));
$("#profile").onclick = () =>
  open(
    `<small class="eyebrow">PROFILE</small><h2>${esc( user.name )}</h2><p>Friend ID: <b>${ user.id }</b></p><p>XP: <b>${xp}</b></p><button class="secondary" style="width:100%" onclick="localStorage.removeItem('fzUser');location.reload()">Log out</button>`
  );
$("#another").onclick = () =>
  ($("#thought").textContent =
    thoughts[Math.floor(Math.random() * thoughts.length)]);
$("#room").onclick = $("#room2").onclick = () =>
  open(
    '<small class="eyebrow">PRIVATE PLAY</small><h2>Create a room 🏠</h2><p>Select a game, then invite accepted friends.</p><select style="width:100%;padding:13px;background:#090b11;color:white;border:1px solid #ffffff12;border-radius:11px">' +
      G.map((g) => `<option>${g[1]}</option>`).join("") +
      '</select><br><br><button class="primary" style="width:100%" onclick="toast(\'Room created! Backend will generate the live code.\')">Create room</button>'
  );
$("#match").onclick = () =>
  open(
    '<small class="eyebrow">MATCHMAKING</small><h2>Finding opponent… ⚡</h2><p>FriendZone will pair you with an available player.</p><button class="primary" style="width:100%" onclick="toast(\'Searching for players…\')">Keep searching</button>'
  );
$("#close").onclick = () => $("#modal").classList.add("hide");
$("#modal").onclick = (e) => {
  if (e.target.id === "modal") $("#modal").classList.add("hide");
};
games("#quick");
games("#allGames");
$("#thought").textContent = thoughts[0];
setupAuth();
enter();
