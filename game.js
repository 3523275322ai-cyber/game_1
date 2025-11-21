// --- 游戏初始化 ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('score');
const abilityDisplay = document.getElementById('ability');

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const FLOOR_Y = 500;
const GRAVITY = 1;
const OBSTACLE_SPEED = 5;

let score = 0;
let gameOver = false;
let gameLoopId;

// --- 玩家对象 ---
const Player = {
    x: 100,
    y: FLOOR_Y - 30,
    width: 30,
    height: 30,
    xVelocity: 3, // <-- 修正：主角向右移动的速度 (自动跑酷)
    yVelocity: 0,
    isJumping: false,
    ability: 0, // 0: 无, 1: 短跳, 2: 长跳
    shortJumpPower: -18,
    longJumpPower: -25,

    draw() {
        // 玩家颜色随能力变化
        ctx.fillStyle = this.ability === 1 ? 'gold' : this.ability === 2 ? 'magenta' : 'blue';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    },

    update() {
        // 水平移动 (主角自动向前)
        this.x += this.xVelocity;
        
        // 限制主角不跑出左侧边界
        if (this.x < 0) {
            this.x = 0;
        }

        // 重力
        this.yVelocity += GRAVITY;
        this.y += this.yVelocity;

        // 地面碰撞
        if (this.y + this.height >= FLOOR_Y) {
            this.y = FLOOR_Y - this.height;
            this.yVelocity = 0;
            this.isJumping = false;
        }
    },

    jump() {
        if (!this.isJumping) {
            if (this.ability === 1) {
                this.yVelocity = this.shortJumpPower;
                this.isJumping = true;
                this.ability = 0; // 跳跃后重置能力
            } else if (this.ability === 2) {
                this.yVelocity = this.longJumpPower;
                this.isJumping = true;
                this.ability = 0; // 跳跃后重置能力
            }
        }
    }
};

// --- 障碍物/音符 数组 ---
let gameObjects = [];

// --- 游戏对象构造函数 (障碍物/音符) ---
class GameObject {
    constructor(x, y, width, height, color, type, value = 0) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.type = type; // 'obstacle', 'note'
        this.value = value; // 1:短跳, 2:长跳
        this.passed = false; // 用于得分
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        // 障碍物和音符向左移动
        this.x -= OBSTACLE_SPEED; 
        // 销毁离开屏幕的物体
        if (this.x + this.width < 0) {
            return true; // 返回 true 表示可以销毁
        }
        return false;
    }
}

// --- 碰撞检测函数 ---
function checkCollision(player, object) {
    return player.x < object.x + object.width &&
           player.x + player.width > object.x &&
           player.y < object.y + object.height &&
           player.y + player.height > object.y;
}

// --- 生成器 ---
let lastSpawnTime = 0;
const spawnInterval = 2000; // 每2秒生成一次

function spawnObjects(timestamp) {
    if (timestamp - lastSpawnTime > spawnInterval) {
        lastSpawnTime = timestamp;
        
        if (Math.random() < 0.6) { // 60% 概率生成障碍物
            const width = Math.floor(Math.random() * 60) + 40;
            const newObstacle = new GameObject(GAME_WIDTH, FLOOR_Y - 30, width, 30, 'black', 'obstacle');
            gameObjects.push(newObstacle);
        } else { // 40% 概率生成音符 (随机短跳或长跳)
            const noteType = Math.random() < 0.5 ? 1 : 2; 
            const color = noteType === 1 ? 'green' : 'red';
            const newNote = new GameObject(GAME_WIDTH, FLOOR_Y - 60, 15, 25, color, 'note', noteType);
            gameObjects.push(newNote);
        }
    }
}

// --- 主游戏循环 ---
function gameLoop(timestamp) {
    if (gameOver) return;

    // 清屏
    ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    // 绘制地面
    ctx.fillStyle = '#333';
    ctx.fillRect(0, FLOOR_Y, GAME_WIDTH, 5);

    // 更新和绘制玩家
    Player.update();
    Player.draw();

    // 生成新物体
    spawnObjects(timestamp);

    // 更新和处理游戏物体
    for (let i = gameObjects.length - 1; i >= 0; i--) {
        const obj = gameObjects[i];
        
        // 销毁
        if (obj.update()) {
            gameObjects.splice(i, 1);
            continue;
        }

        // 碰撞检测
        if (checkCollision(Player, obj)) {
            if (obj.type === 'obstacle') {
                gameOver = true;
                alert(`游戏结束! 最终得分: ${score}`);
                return;
            } else if (obj.type === 'note') {
                Player.ability = obj.value;
                gameObjects.splice(i, 1); // 移除被吃掉的音符
            }
        }
        
        // 得分检测 (障碍物从主角身后经过)
        // 只有障碍物类型，且通过主角的位置，且未计分，才加分
        if (obj.type === 'obstacle' && obj.x + obj.width < Player.x && !obj.passed) {
             score++;
             obj.passed = true;
        }

        obj.draw();
    }
    
    // 更新信息显示
    scoreDisplay.textContent = score;
    abilityDisplay.textContent = Player.ability === 1 ? '短跳' : Player.ability === 2 ? '长跳' : '无';

    gameLoopId = requestAnimationFrame(gameLoop);
}

// --- 事件监听 ---

// 键盘控制 (空格键跳跃)
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        Player.jump();
    }
});

// 触摸屏控制 (点击屏幕任意位置跳跃) <-- 新增手机支持
document.addEventListener('touchstart', (e) => {
    e.preventDefault(); 
    Player.jump();
});


// 启动游戏
gameLoop(0);