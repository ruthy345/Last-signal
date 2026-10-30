(() => {
  "use strict";
  const socket = io();
  const $ = id => document.getElementById(id);
  const canvas = $("arena"), ctx = canvas.getContext("2d");
  let myId=null, arena={width:1800,height:1100}, state={players:[],enemies:[],shots:[],wave:1};
  let joined=false, mouse={x:450,y:280}, firing=false, camera={x:0,y:0};
  const keys={up:false,down:false,left:false,right:false};
  const colors={ground:"#101d2a",grid:"#1a2b3c",cyan:"#62e6d0",alien:"#ff806d",gold:"#ffbd69"};
  function addFeed(text,system=true){const p=document.createElement("p");p.textContent=text;if(system)p.className="system";$("feed").appendChild(p);$("feed").scrollTop=$("feed").scrollHeight;while($("feed").children.length>35)$("feed").firstChild.remove()}
  socket.on("connect",()=>{$("connectionText").textContent="Connected to server";$("dot").classList.add("online")});
  socket.on("disconnect",()=>{$("connectionText").textContent="Connection lost";$("dot").classList.remove("online");addFeed("Connection lost. Reconnecting…")});
  socket.on("joined",data=>{myId=data.id;arena=data.arena;joined=true;$("lobby").classList.add("hidden");$("game").classList.remove("hidden");addFeed("You are connected. Stay with your squad.")});
  socket.on("feed",msg=>addFeed(msg));
  socket.on("chat",msg=>addFeed(`${msg.name}: ${msg.message}`,false));
  socket.on("snapshot",s=>{state=s;updateHud()});
  socket.on("state",s=>{state=s;updateHud()});
  function updateHud(){const me=state.players.find(p=>p.id===myId);$("wave").textContent=state.wave||1;$("online").textContent=state.players.length;if(me){$("score").textContent=me.score;$("health").textContent=me.hp+"%";$("healthFill").style.width=me.hp+"%";$("healthFill").style.background=me.hp<30?"#ff806d":"#62e6d0";$("respawn").classList.toggle("hidden",me.hp>0)}}
  $("join").addEventListener("click",()=>{if(!socket.connected){addFeed("Still connecting to the game server. Try again in a moment.");return}socket.emit("join",$("name").value.trim()||"Ranger")});
  $("name").addEventListener("keydown",e=>{if(e.key==="Enter")$("join").click()});
  const keyMap={w:"up",ArrowUp:"up",s:"down",ArrowDown:"down",a:"left",ArrowLeft:"left",d:"right",ArrowRight:"right"};
  window.addEventListener("keydown",e=>{if(keyMap[e.key]){keys[keyMap[e.key]]=true;e.preventDefault()}if(e.code==="Space"&&joined){firing=true;e.preventDefault()}});
  window.addEventListener("keyup",e=>{if(keyMap[e.key])keys[keyMap[e.key]]=false;if(e.code==="Space")firing=false});
  canvas.addEventListener("pointermove",e=>{const r=canvas.getBoundingClientRect();mouse.x=(e.clientX-r.left)*canvas.width/r.width;mouse.y=(e.clientY-r.top)*canvas.height/r.height});
  canvas.addEventListener("pointerdown",e=>{if(e.button===0)firing=true});
  window.addEventListener("pointerup",()=>firing=false);
  $("chatForm").addEventListener("submit",e=>{e.preventDefault();const input=$("chatInput"),msg=input.value.trim();if(msg&&joined)socket.emit("chat",msg);input.value=""});
  setInterval(()=>{if(!joined)return;const me=state.players.find(p=>p.id===myId);if(!me)return;const worldMouse={x:mouse.x+camera.x,y:mouse.y+camera.y};socket.emit("input",{...keys,angle:Math.atan2(worldMouse.y-me.y,worldMouse.x-me.x),shoot:firing&&me.hp>0})},50);
  function drawPlayer(p){const x=p.x-camera.x,y=p.y-camera.y;ctx.save();ctx.translate(x,y);ctx.rotate(p.angle);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(0,0,17,0,Math.PI*2);ctx.fill();ctx.fillStyle="#dffefa";ctx.fillRect(4,-5,25,10);ctx.restore();ctx.fillStyle="#eaf3fa";ctx.font="12px Inter, sans-serif";ctx.textAlign="center";ctx.fillText(p.name,x,y-27);ctx.fillStyle="#33485a";ctx.fillRect(x-19,y+23,38,4);ctx.fillStyle="#62e6d0";ctx.fillRect(x-19,y+23,38*Math.max(0,p.hp)/100,4)}
  function drawAlien(e){const x=e.x-camera.x,y=e.y-camera.y;ctx.save();ctx.translate(x,y);ctx.fillStyle="#ff806d";ctx.beginPath();ctx.arc(0,0,e.radius,0,Math.PI*2);ctx.fill();ctx.fillStyle="#3b1b29";ctx.beginPath();ctx.arc(-6,-3,3,0,Math.PI*2);ctx.arc(6,-3,3,0,Math.PI*2);ctx.fill();ctx.strokeStyle="#3b1b29";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,5,6,.15,Math.PI-.15);ctx.stroke();ctx.restore()}
  function frame(){requestAnimationFrame(frame);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle=colors.ground;ctx.fillRect(0,0,canvas.width,canvas.height);
    const me=state.players.find(p=>p.id===myId);if(me){camera.x=Math.max(0,Math.min(arena.width-canvas.width,me.x-canvas.width/2));camera.y=Math.max(0,Math.min(arena.height-canvas.height,me.y-canvas.height/2))}
    ctx.strokeStyle=colors.grid;ctx.lineWidth=1;for(let x=-(camera.x%60);x<canvas.width;x+=60){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas.height);ctx.stroke()}for(let y=-(camera.y%60);y<canvas.height;y+=60){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(canvas.width,y);ctx.stroke()}
    ctx.strokeStyle="#31485c";ctx.lineWidth=5;ctx.strokeRect(-camera.x,-camera.y,arena.width,arena.height);
    for(const b of state.shots||[]){ctx.fillStyle="#ffdf8a";ctx.beginPath();ctx.arc(b.x-camera.x,b.y-camera.y,4,0,Math.PI*2);ctx.fill()}
    for(const e of state.enemies||[])drawAlien(e);for(const p of state.players||[])drawPlayer(p);
    if(me){ctx.strokeStyle="#62e6d044";ctx.beginPath();ctx.arc(me.x-camera.x,me.y-camera.y,34,0,Math.PI*2);ctx.stroke()}
  }
  frame();
})();