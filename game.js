class DotGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.path = [];
        this.obstacles = [];
        this.isPlaying = false;
        this.gameMode = 'free';
        this.timeLeft = 60;
        this.score = 0;
        this.timer = null;
        this.level = 1;

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
        this.obstacles = [];
        const margin = this.pointRadius * 2;

        // 生成障碍物
        const obstacleCount = Math.min(this.level, 5);
        for (let i = 0; i < obstacleCount; i++) {
            const width = 40 + Math.random() * 60;
            const height = 40 + Math.random() * 60;
            const x = margin + Math.random() * (this.canvas.width - width - 2 * margin);
            const y = margin + Math.random() * (this.canvas.height - height - 2 * margin);
            this.obstacles.push({ x, y, width, height });
        }

        // 生成点位，避开障碍物
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

                // 检查是否与障碍物重叠
                for (const obstacle of this.obstacles) {
                    if (x >= obstacle.x - this.pointRadius && 
                        x <= obstacle.x + obstacle.width + this.pointRadius && 
                        y >= obstacle.y - this.pointRadius && 
                        y <= obstacle.y + obstacle.height + this.pointRadius) {
                        valid = false;
                        break;
                    }
                }
            } while (!valid);

            this.points.push({ x, y });
        }
    }

    startGame() {
        this.resetGame();
        this.isPlaying = true;
        this.generatePoints();
        this.redraw();

        if (this.gameMode === 'time') {
            this.timeLeft = 60;
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
        this.score = 0;
        document.getElementById('score').textContent = `得分: ${this.score}`;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
            document.getElementById('timer').classList.add('hidden');
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
                    this.path.push(i);
                    this.redraw();
                    this.checkWin();
                }
                break;
            }
        }
    }

    isValidMove(pointIndex) {
        if (this.path.length === 0) return true;
        if (this.path.includes(pointIndex)) {
            if (pointIndex === this.path[0] && this.path.length === this.points.length) {
                return true;
            }
            return false;
        }
        return true;
    }

    checkWin() {
        if (this.path.length === this.points.length + 1 && 
            this.path[0] === this.path[this.path.length - 1]) {
            const timeBonus = this.gameMode === 'time' ? Math.max(0, this.timeLeft) : 0;
            this.score += 100 + timeBonus;
            document.getElementById('score').textContent = `得分: ${this.score}`;
            this.showMessage('恭喜完成！');
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

    redraw() {
        this.ctx.fillStyle = this.canvasColor;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 绘制障碍物
        this.ctx.fillStyle = '#666666';
        for (const obstacle of this.obstacles) {
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        }

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
            this.ctx.fillStyle = this.path.includes(index) ? '#28a745' : '#dc3545';
            this.ctx.arc(point.x, point.y, this.pointRadius, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
}

// 初始化游戏
window.addEventListener('load', () => {
    new DotGame();
});
