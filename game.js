class DotGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.path = [];
        this.isPlaying = false;
        this.gameMode = 'free';
        this.timeLeft = 60;
        this.score = 0;
        this.timer = null;
        this.level = 1;
        this.specialPoints = [];
        this.animationFrame = null;
        this.maxPathLength = null;
        this.requiredOrder = false;
        this.bonusPoints = [];
        this.combo = 0;
        this.lastMoveTime = 0;
        this.theme = 'standard';
        this.teleportPoints = [];
        this.splitPoints = [];
        this.timePoints = [];

        this.initCanvas();
        this.initEventListeners();
    }

    initCanvas() {
        this.canvas.width = Math.min(800, window.innerWidth - 40);
        this.canvas.height = Math.min(600, window.innerHeight - 200);
        this.canvasColor = '#ffffff';
        this.pathColor = '#007bff';
        this.pointRadius = 8;
    }

    initEventListeners() {
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        document.getElementById('startGame').addEventListener('click', this.startGame.bind(this));
        document.getElementById('resetGame').addEventListener('click', this.resetGame.bind(this));
        document.getElementById('gameMode').addEventListener('change', (e) => this.gameMode = e.target.value);
        document.getElementById('pathColor').addEventListener('change', (e) => {
            this.pathColor = e.target.value;
            this.redraw();
        });
        document.getElementById('canvasColor').addEventListener('change', (e) => {
            this.canvasColor = e.target.value;
            this.redraw();
        });
        document.getElementById('imageUpload').addEventListener('change', this.handleImageUpload.bind(this));
    }

    generatePoints() {
        const count = parseInt(document.getElementById('pointCount').value);
        this.points = [];
        this.specialPoints = [];
        this.bonusPoints = [];
        this.teleportPoints = [];
        this.splitPoints = [];
        this.timePoints = [];
        const margin = this.pointRadius * 2;

        // 生成基础点位
        for (let i = 0; i < count; i++) {
            let x, y, valid;
            do {
                valid = true;
                x = margin + Math.random() * (this.canvas.width - 2 * margin);
                y = margin + Math.random() * (this.canvas.height - 2 * margin);

                // 检查与其他点的距离
                for (const point of this.points) {
                    const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);
                    if (distance < 50) {
                        valid = false;
                        break;
                    }
                }
            } while (!valid);

            this.points.push({ x, y, type: 'normal' });
        }

        // 根据等级添加特殊点
        if (this.level >= 2) {
            // 添加必须按顺序连接的点
            this.requiredOrder = true;
            // 设置最大路径长度限制
            this.maxPathLength = this.points.length * 1.5;

            // 添加传送点（成对出现）
            if (this.level >= 3) {
                const teleportCount = Math.min(2, Math.floor(this.level / 3));
                for (let i = 0; i < teleportCount * 2; i += 2) {
                    const index1 = Math.floor(Math.random() * this.points.length);
                    const index2 = Math.floor(Math.random() * this.points.length);
                    this.teleportPoints.push([index1, index2]);
                    this.points[index1].type = 'teleport';
                    this.points[index2].type = 'teleport';
                }
            }

            // 添加分裂点
            if (this.level >= 4) {
                const splitCount = Math.min(2, Math.floor((this.level - 3) / 2));
                for (let i = 0; i < splitCount; i++) {
                    const index = Math.floor(Math.random() * this.points.length);
                    if (this.points[index].type === 'normal') {
                        this.points[index].type = 'split';
                        this.splitPoints.push(index);
                    }
                }
            }

            // 添加限时点
            if (this.level >= 5) {
                const timeCount = Math.min(2, Math.floor((this.level - 4) / 2));
                for (let i = 0; i < timeCount; i++) {
                    const index = Math.floor(Math.random() * this.points.length);
                    if (this.points[index].type === 'normal') {
                        this.points[index].type = 'time';
                        this.timePoints.push(index);
                    }
                }
            }

            // 添加额外分数点
            const bonusCount = Math.min(3, Math.floor(this.level / 2));
            for (let i = 0; i < bonusCount; i++) {
                const index = Math.floor(Math.random() * this.points.length);
                if (this.points[index].type === 'normal') {
                    this.bonusPoints.push(index);
                }
            }
        }
    }

    startGame() {
        this.resetGame();
        this.isPlaying = true;
        this.generatePoints();
        this.redraw();

        if (this.gameMode === 'time') {
            this.timeLeft = Math.max(30, 60 - this.level * 5);
            document.getElementById('timer').classList.remove('hidden');
            this.timer = setInterval(() => {
                this.timeLeft--;
                document.getElementById('timeLeft').textContent = this.timeLeft;
                if (this.timeLeft <= 0) {
                    this.gameOver('时间到！游戏结束');
                }
            }, 1000);
        }
    }

    resetGame() {
        this.isPlaying = false;
        this.points = [];
        this.path = [];
        this.specialPoints = [];
        this.score = 0;
        this.combo = 0;
        this.lastMoveTime = 0;
        document.getElementById('score').textContent = `得分: ${this.score}`;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            document.getElementById('timer').classList.add('hidden');
        }
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        this.redraw();
    }

    handleClick(event) {
        if (!this.isPlaying) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const distance = Math.sqrt((x - point.x) ** 2 + (y - point.y) ** 2);

            if (distance <= this.pointRadius) {
                if (this.isValidMove(i)) {
                    // 处理连击奖励
                    const now = Date.now();
                    if (now - this.lastMoveTime < 1000) {
                        this.combo++;
                    } else {
                        this.combo = 1;
                    }
                    this.lastMoveTime = now;

                    this.path.push(i);

                    // 处理特殊点效果
                    this.handleSpecialPoints(i);

                    this.redraw();
                    this.checkWin();
                }
                break;
            }
        }
    }

    handleSpecialPoints(pointIndex) {
        const point = this.points[pointIndex];

        // 处理传送点
        if (point.type === 'teleport') {
            for (const [index1, index2] of this.teleportPoints) {
                if (pointIndex === index1) {
                    this.path.push(index2);
                    break;
                } else if (pointIndex === index2) {
                    this.path.push(index1);
                    break;
                }
            }
        }

        // 处理分裂点
        if (point.type === 'split') {
            this.maxPathLength += 2;
        }

        // 处理限时点
        if (point.type === 'time') {
            this.timeLeft = Math.min(this.timeLeft + 5, 60);
            document.getElementById('timeLeft').textContent = this.timeLeft;
        }
    }

    isValidMove(pointIndex) {
        if (this.path.length === 0) return true;

        // 检查是否超过最大路径长度
        if (this.maxPathLength && this.path.length >= this.maxPathLength) {
            this.showMessage('已达到最大路径长度限制！');
            return false;
        }

        // 检查是否需要按顺序连接
        if (this.requiredOrder && this.path.length < this.points.length) {
            if (pointIndex !== this.path.length) {
                this.showMessage('必须按顺序连接点！');
                return false;
            }
        }

        // 检查是否可以闭合路径
        if (this.path.includes(pointIndex)) {
            if (pointIndex === this.path[0] && this.path.length === this.points.length) {
                return true;
            }
            return false;
        }

        // 检查线路碰撞
        if (this.checkLineCollision(pointIndex)) {
            this.showMessage('线路发生碰撞！游戏结束');
            this.gameOver('线路碰撞，游戏结束');
            return false;
        }

        return true;
    }

    checkLineCollision(newPointIndex) {
        if (this.path.length < 2) return false;

        const newPoint = this.points[newPointIndex];
        const lastPoint = this.points[this.path[this.path.length - 1]];

        // 检查新线段与现有线段的碰撞
        for (let i = 1; i < this.path.length; i++) {
            const p1 = this.points[this.path[i - 1]];
            const p2 = this.points[this.path[i]];

            if (this.lineIntersects(
                lastPoint.x, lastPoint.y,
                newPoint.x, newPoint.y,
                p1.x, p1.y,
                p2.x, p2.y
            )) {
                return true;
            }
        }

        return false;
    }

    lineIntersects(x1, y1, x2, y2, x3, y3, x4, y4) {
        // 线段相交检测算法
        const denominator = ((x2 - x1) * (y4 - y3)) - ((y2 - y1) * (x4 - x3));
        if (denominator === 0) return false;

        const ua = (((x4 - x3) * (y1 - y3)) - ((y4 - y3) * (x1 - x3))) / denominator;
        const ub = (((x2 - x1) * (y1 - y3)) - ((y2 - y1) * (x1 - x3))) / denominator;

        return (ua > 0 && ua < 1) && (ub > 0 && ub < 1);
    }

    checkWin() {
        if (this.path.length === this.points.length + 1 && 
            this.path[0] === this.path[this.path.length - 1]) {
            let bonus = 0;
            // 计算额外分数点奖励
            for (const bonusIndex of this.bonusPoints) {
                if (this.path.includes(bonusIndex)) {
                    bonus += 50;
                }
            }

            // 计算连击奖励
            const comboBonus = Math.floor(this.combo * 10);

            const timeBonus = this.gameMode === 'time' ? Math.max(0, this.timeLeft) : 0;
            this.score += 100 + timeBonus + bonus + comboBonus;
            document.getElementById('score').textContent = `得分: ${this.score}`;
            this.showMessage(`恭喜完成！获得额外分数：${bonus + comboBonus}（连击：${this.combo}）`);
            this.adjustDifficulty();
        }
    }

    adjustDifficulty() {
        const pointCountInput = document.getElementById('pointCount');
        const currentCount = parseInt(pointCountInput.value);
        
        // 根据完成时间和当前等级调整难度
        if (this.timeLeft > 30) {
            this.level = Math.min(this.level + 1, 5);
            if (currentCount < 20) {
                pointCountInput.value = currentCount + 2;
            }
        }

        // 根据等级调整时间限制
        if (this.gameMode === 'time') {
            this.timeLeft = Math.max(30, 60 - (this.level - 1) * 5);
        }
    }

    async handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const img = new Image();
        img.src = URL.createObjectURL(file);
        await new Promise(resolve => img.onload = resolve);

        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;

        const scale = Math.min(
            (this.canvas.width - 40) / img.width,
            (this.canvas.height - 40) / img.height
        );

        const scaledWidth = img.width * scale;
        const scaledHeight = img.height * scale;
        const x = (this.canvas.width - scaledWidth) / 2;
        const y = (this.canvas.height - scaledHeight) / 2;

        tempCtx.drawImage(img, x, y, scaledWidth, scaledHeight);
        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
        this.extractPointsFromImage(imageData);
        URL.revokeObjectURL(img.src);
    }

    extractPointsFromImage(imageData) {
        this.points = [];
        const step = 20;
        const threshold = 100;

        for (let y = 0; y < imageData.height; y += step) {
            for (let x = 0; x < imageData.width; x += step) {
                const i = (y * imageData.width + x) * 4;
                const brightness = (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;

                if (brightness < threshold) {
                    this.points.push({ x, y });
                }
            }
        }

        if (this.points.length > 20) {
            this.points = this.points.slice(0, 20);
        }

        this.path = [];
        this.redraw();
    }

    showMessage(text) {
        const message = document.getElementById('message');
        message.textContent = text;
        message.classList.remove('hidden');
        message.classList.add('show');
        setTimeout(() => {
            message.classList.remove('show');
            message.classList.add('hidden');
        }, 2000);
    }

    gameOver(message) {
        this.isPlaying = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
        this.showMessage(message);
    }

    updateObstacles() {
        const updateFrame = () => {
            if (!this.isPlaying) return;
            
            for (const obstacle of this.obstacles) {
                obstacle.x += obstacle.dx;
                obstacle.y += obstacle.dy;
                
                if (obstacle.x <= 0 || obstacle.x + obstacle.width >= this.canvas.width) {
                    obstacle.dx = -obstacle.dx;
                }
                if (obstacle.y <= 0 || obstacle.y + obstacle.height >= this.canvas.height) {
                    obstacle.dy = -obstacle.dy;
                }
            }
            
            this.redraw();
            this.animationFrame = requestAnimationFrame(updateFrame);
        };
        
        updateFrame();
    }

    redraw() {
        this.ctx.fillStyle = this.canvasColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制路径
        if (this.path.length > 1) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = this.pathColor;
            this.ctx.lineWidth = 3;
            const start = this.points[this.path[0]];
            this.ctx.moveTo(start.x, start.y);

            for (let i = 1; i < this.path.length; i++) {
                const point = this.points[this.path[i]];
                this.ctx.lineTo(point.x, point.y);
            }
            this.ctx.stroke();
        }

        // 绘制点
        this.points.forEach((point, index) => {
            this.ctx.beginPath();
            
            // 设置点的颜色
            if (this.path.includes(index)) {
                this.ctx.fillStyle = '#28a745';
            } else if (this.bonusPoints.includes(index)) {
                this.ctx.fillStyle = '#ffd700'; // 金色表示额外分数点
            } else if (this.requiredOrder) {
                this.ctx.fillStyle = index === this.path.length ? '#ff4500' : '#dc3545';
            } else {
                this.ctx.fillStyle = '#dc3545';
            }

            this.ctx.arc(point.x, point.y, this.pointRadius, 0, Math.PI * 2);
            this.ctx.fill();

            // 如果需要按顺序连接，显示数字
            if (this.requiredOrder && !this.path.includes(index)) {
                this.ctx.fillStyle = 'white';
                this.ctx.textAlign = 'center';
                this.ctx.textBaseline = 'middle';
                this.ctx.font = '12px Arial';
                this.ctx.fillText(index + 1, point.x, point.y);
            }
        });
    }
}

// 初始化游戏
window.addEventListener('load', () => {
    new DotGame();
});