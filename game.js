const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDiv = document.getElementById('score');
const gameOverDiv = document.getElementById('game-over');
const muteButton = document.getElementById('muteButton');

// 設置畫布大小為 960x540（縮小尺寸以適應 Notion）
canvas.width = 960;
canvas.height = 540;

// 遊戲參數
const dino = { 
  x: 64,
  y: 424, // 調整人物位置到地面高度
  w: 60,
  h: 60,
  vy: 0, 
  jumpPower: -15,
  gravity: 0.8,
  isJumping: false,
  canDoubleJump: false,
  hasDoubleJumped: false,
  rotation: 0,
  lastY: 424 // 記錄上一幀的位置
};

// 調整其他遊戲參數
let obstacles = [];
let score = 0;
let gameOver = false;
let speed = 4; // 調整基礎速度
let baseSpeed = 4;
let speedMultiplier = 1;

// 背景元素
const clouds = [];
const mountains = [];
const stars = [];

// 音效系統
const sounds = {
  background: new Audio('sounds/background.mp3'),
  jump: new Audio('sounds/jump.mp3'),
  doubleJump: new Audio('sounds/double_jump.mp3'),
  hit: new Audio('sounds/hit.mp3'),
  score: new Audio('sounds/score.mp3')
};

// 音效控制
let isMuted = false;

// 添加尾跡陣列
const trails = [];
const maxTrails = 10; // 最大尾跡數量

function drawDino() {
  ctx.save();
  // 設定旋轉中心點
  ctx.translate(dino.x + 30, dino.y + 30);
  ctx.rotate(dino.rotation);
  ctx.translate(-(dino.x + 30), -(dino.y + 30));
  
  // 設定紅色
  ctx.fillStyle = '#FF0000';
  
  // 畫頭部（圓形）
  ctx.beginPath();
  ctx.arc(dino.x + 30, dino.y + 15, 15, 0, Math.PI * 2);
  ctx.fill();
  
  // 畫身體（矩形）
  ctx.fillRect(dino.x + 20, dino.y + 30, 20, 30);
  
  // 畫手（兩條線）
  ctx.beginPath();
  ctx.moveTo(dino.x + 20, dino.y + 40);
  ctx.lineTo(dino.x + 10, dino.y + 50);
  ctx.moveTo(dino.x + 40, dino.y + 40);
  ctx.lineTo(dino.x + 50, dino.y + 50);
  ctx.strokeStyle = '#FF0000';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  // 畫腿（兩條線）
  ctx.beginPath();
  ctx.moveTo(dino.x + 25, dino.y + 60);
  ctx.lineTo(dino.x + 20, dino.y + 70);
  ctx.moveTo(dino.x + 35, dino.y + 60);
  ctx.lineTo(dino.x + 40, dino.y + 70);
  ctx.stroke();
  
  ctx.restore();
}

function drawObstacles() {
  obstacles.forEach(obs => {
    // 設定黑色
    ctx.fillStyle = '#000000';
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;

    // 畫黑色棒狀物（視覺高度為兩倍）
    ctx.fillRect(obs.x, obs.y - obs.h/2, obs.w, obs.h * 2);
    
    // 添加簡單的邊框效果
    ctx.strokeRect(obs.x, obs.y - obs.h/2, obs.w, obs.h * 2);
  });
}

function updateObstacles() {
  for (let i = 0; i < obstacles.length; i++) {
    obstacles[i].x -= speed;
  }
  obstacles = obstacles.filter(obs => obs.x + obs.w > 0);
  if (obstacles.length === 0 || obstacles[obstacles.length - 1].x < 640) {
    const h = 60 + Math.random() * 30;
    obstacles.push({ 
      x: 960, 
      y: 424,
      w: 15,
      h
    });
  }
}

function checkCollision() {
  for (let obs of obstacles) {
    // 使用原始的碰撞範圍進行檢測
    if (
      dino.x < obs.x + obs.w &&
      dino.x + dino.w > obs.x &&
      dino.y < obs.y + obs.h &&
      dino.y + dino.h > obs.y
    ) {
      return true;
    }
  }
  return false;
}

function updateDino() {
  // 記錄上一幀的位置
  dino.lastY = dino.y;
  
  dino.y += dino.vy;
  dino.vy += dino.gravity;
  
  // 在跳躍時添加尾跡
  if (dino.isJumping) {
    // 計算速度向量
    const velocityX = 0; // 水平速度為0
    const velocityY = dino.vy;
    const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY);
    
    // 計算尾跡位置（與移動方向相反）
    const trailX = dino.x + dino.w/2 - (velocityX / speed) * 20;
    const trailY = dino.y + dino.h/2 - (velocityY / speed) * 20;
    
    trails.push({
      x: trailX,
      y: trailY,
      alpha: 1,
      size: 20,
      velocityX: velocityX,
      velocityY: velocityY
    });
    
    // 限制尾跡數量
    if (trails.length > maxTrails) {
      trails.shift();
    }
    
    dino.rotation += 0.2;
    if (dino.rotation > Math.PI * 2) {
      dino.rotation = 0;
    }
  } else {
    // 清空尾跡
    trails.length = 0;
  }
  
  if (dino.y >= 424) {
    dino.y = 424;
    dino.vy = 0;
    dino.isJumping = false;
    dino.canDoubleJump = false;
    dino.hasDoubleJumped = false;
    dino.rotation = 0;
  }
}

function drawTrails() {
  // 繪製尾跡
  trails.forEach((trail, index) => {
    // 計算透明度
    const alpha = trail.alpha * (index / trails.length);
    
    // 創建發光效果
    ctx.shadowBlur = 15;
    ctx.shadowColor = 'rgba(0, 150, 255, ' + alpha + ')';
    
    // 計算尾跡位置（根據速度向量移動）
    const trailX = trail.x + (trail.velocityX * 0.1);
    const trailY = trail.y + (trail.velocityY * 0.1);
    
    // 繪製發光的圓形
    ctx.beginPath();
    ctx.fillStyle = 'rgba(0, 150, 255, ' + alpha + ')';
    ctx.arc(trailX, trailY, trail.size * (index / trails.length), 0, Math.PI * 2);
    ctx.fill();
    
    // 重置陰影效果
    ctx.shadowBlur = 0;
  });
}

function drawGround() {
  ctx.strokeStyle = '#888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 484); // 調整地面位置
  ctx.lineTo(960, 484);
  ctx.stroke();
}

// 初始化背景
function initBackground() {
  // 初始化雲朵
  for (let i = 0; i < 5; i++) {
    clouds.push({
      x: Math.random() * 960,
      y: Math.random() * 180,
      width: 60 + Math.random() * 40,
      speed: 1 + Math.random()
    });
  }
  
  // 初始化山脈
  for (let i = 0; i < 3; i++) {
    mountains.push({
      x: i * 320,
      height: 100 + Math.random() * 50
    });
  }
  
  // 初始化星星
  for (let i = 0; i < 50; i++) {
    stars.push({
      x: Math.random() * 960,
      y: Math.random() * 180,
      size: 2 + Math.random() * 4,
      brightness: 0.5 + Math.random() * 0.5
    });
  }
}

function drawBackground() {
  // 繪製漸層天空
  const gradient = ctx.createLinearGradient(0, 0, 0, 540);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 960, 540);

  // 繪製星星
  ctx.fillStyle = '#ffffff';
  stars.forEach(star => {
    ctx.globalAlpha = star.brightness;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // 繪製山脈
  ctx.fillStyle = '#2c3e50';
  mountains.forEach(mountain => {
    ctx.beginPath();
    ctx.moveTo(mountain.x, 484);
    ctx.lineTo(mountain.x + 160, 484 - mountain.height);
    ctx.lineTo(mountain.x + 320, 484);
    ctx.fill();
  });

  // 繪製雲朵
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  clouds.forEach(cloud => {
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.width/3, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.width/3, cloud.y - cloud.width/6, cloud.width/3, 0, Math.PI * 2);
    ctx.arc(cloud.x + cloud.width/2, cloud.y, cloud.width/3, 0, Math.PI * 2);
    ctx.fill();
  });
}

function updateBackground() {
  clouds.forEach(cloud => {
    cloud.x -= cloud.speed * speedMultiplier;
    if (cloud.x + cloud.width < 0) {
      cloud.x = 960;
      cloud.y = Math.random() * 180;
    }
  });

  mountains.forEach(mountain => {
    mountain.x -= 1 * speedMultiplier;
    if (mountain.x + 320 < 0) {
      mountain.x = 960;
      mountain.height = 100 + Math.random() * 50;
    }
  });
}

// 初始化音效
function initSounds() {
  // 設置背景音樂循環播放
  sounds.background.loop = true;
  sounds.background.volume = 0.3;
  
  // 設置其他音效音量
  sounds.jump.volume = 0.4;
  sounds.doubleJump.volume = 0.4;
  sounds.hit.volume = 0.5;
  sounds.score.volume = 0.2;
}

// 播放音效函數
function playSound(soundName) {
  if (!isMuted && sounds[soundName]) {
    sounds[soundName].currentTime = 0;
    sounds[soundName].play();
  }
}

// 切換靜音
function toggleMute() {
  isMuted = !isMuted;
  if (isMuted) {
    sounds.background.pause();
  } else {
    sounds.background.play();
  }
}

function gameLoop() {
  ctx.clearRect(0, 0, 960, 540);
  drawBackground();
  drawGround();
  drawTrails(); // 在繪製人物之前繪製尾跡
  drawDino();
  drawObstacles();
  
  if (!gameOver) {
    updateDino();
    updateObstacles();
    updateBackground();
    
    if (score > 0 && score % 2000 === 0) {
      speedMultiplier += 0.5;
      speed = baseSpeed * speedMultiplier;
      playSound('score');
    }
    
    if (checkCollision()) {
      gameOver = true;
      gameOverDiv.style.display = 'block';
      playSound('hit');
      sounds.background.pause();
    } else {
      score++;
      scoreDiv.textContent = score;
      requestAnimationFrame(gameLoop);
    }
  }
}

// 修改事件監聽器
document.addEventListener('keydown', function(e) {
  if (e.code === 'Space') {
    handleJump();
  }
  if (e.code === 'KeyM') {
    toggleMute();
  }
});

canvas.addEventListener('click', function() {
  handleJump();
});

muteButton.addEventListener('click', function() {
  toggleMute();
});

gameOverDiv.addEventListener('click', function() {
  restartGame();
});

function handleJump() {
  if (!dino.isJumping && !gameOver) {
    dino.vy = dino.jumpPower;
    dino.isJumping = true;
    dino.canDoubleJump = true;
    dino.hasDoubleJumped = false;
    playSound('jump');
  } else if (dino.canDoubleJump && !dino.hasDoubleJumped && !gameOver) {
    dino.vy = dino.jumpPower * 0.8;
    dino.hasDoubleJumped = true;
    dino.canDoubleJump = false;
    playSound('doubleJump');
  } else if (gameOver) {
    restartGame();
  }
}

function restartGame() {
  obstacles = [];
  trails.length = 0; // 清空尾跡
  score = 0;
  gameOver = false;
  speedMultiplier = 1;
  speed = baseSpeed;
  dino.y = 424;
  dino.lastY = 424;
  dino.vy = 0;
  dino.isJumping = false;
  dino.canDoubleJump = false;
  dino.hasDoubleJumped = false;
  dino.rotation = 0;
  gameOverDiv.style.display = 'none';
  scoreDiv.textContent = '0';
  if (!isMuted) {
    sounds.background.play();
  }
  requestAnimationFrame(gameLoop);
}

// 初始化背景
initBackground();
// 初始化音效
initSounds();
// 開始播放背景音樂
if (!isMuted) {
  sounds.background.play();
}
// 遊戲開始
requestAnimationFrame(gameLoop);
