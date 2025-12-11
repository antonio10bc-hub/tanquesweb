const COLORS = {
    player: { main: 0x85c1e9, shadow: 0x5dade2 }, 
    enemy: { main: 0xf1948a, shadow: 0xec7063 },  
    wall: { main: 0xecf0f1, shadow: 0xbdc3c7 },   
    bg: 0xabf7b1,      
    grid: 0xa5f2ad     
};

function iniciarJuego() {
    const config = {
        type: Phaser.AUTO,
        // Ajuste para que ocupe toda la pantalla en móvil
        scale: {
            mode: Phaser.Scale.FIT,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 800,
            height: 600
        },
        parent: 'game-container',
        physics: {
            default: 'arcade',
            arcade: { debug: false, gravity: { y: 0 } }
        },
        // AÑADIR EL PLUGIN DEL JOYSTICK
        plugins: {
            global: [{
                key: 'rexVirtualJoystick',
                plugin: rexvirtualjoystickplugin,
                start: true
            }]
        },
        scene: {
            preload: preload,
            create: create,
            update: update
        }
    };
    new Phaser.Game(config);
}

function preload() {}

function create() {
    var self = this;
    this.enemies = {}; 
    this.isDead = false; 
    this.isGameOver = false;
    this.uiGroup = this.add.group(); 
    this.bullets = this.physics.add.group();
    this.walls = this.physics.add.staticGroup();

    createTankTexture(this, 'playerTex', COLORS.player.main, COLORS.player.shadow);
    createTankTexture(this, 'enemyTex', COLORS.enemy.main, COLORS.enemy.shadow);
    createWallTexture(this, 'wallTex', COLORS.wall.main, COLORS.wall.shadow);
    createBulletTexture(this, 'playerBulletTex', COLORS.player.main);
    createBulletTexture(this, 'enemyBulletTex', COLORS.enemy.main);
    
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.add.grid(400, 300, 800, 600, 40, 40, COLORS.bg)
        .setAltFillStyle(COLORS.bg)
        .setOutlineStyle(COLORS.grid);

    // --- CONTROLES MÓVILES ---
    // Detectar si es móvil o si queremos probarlo siempre (quitamos la comprobación de móvil para que lo veas en PC también)
    // El Joystick a la Izquierda
    this.joyStick = this.plugins.get('rexVirtualJoystick').add(this, {
        x: 100,
        y: 500,
        radius: 60,
        base: { fill: 0x888888, alpha: 0.5 },
        thumb: { fill: 0xcccccc, alpha: 0.8 },
        dir: '4dir', // Solo 4 direcciones
        forceMin: 16
    }).on('update', dumpJoyStickState, this);

    // Mapeamos el joystick a cursores virtuales
    this.joystickCursors = this.joyStick.createCursorKeys();

    // El Botón de Disparo a la Derecha
    this.shootBtn = this.add.circle(700, 500, 40, 0xf1c40f, 0.5)
        .setInteractive()
        .setScrollFactor(0)
        .setDepth(100);
    
    // Texto o icono dentro del botón
    this.add.text(700, 500, 'FIRE', { fontSize: '15px', color: '#000' }).setOrigin(0.5);

    // Lógica del botón de disparo
    this.shootBtn.on('pointerdown', () => {
        this.shootBtn.isDown = true;
        this.shootBtn.setFillStyle(0xf39c12, 0.7); // Cambio de color al pulsar
    });
    this.shootBtn.on('pointerup', () => {
        this.shootBtn.isDown = false;
        this.shootBtn.setFillStyle(0xf1c40f, 0.5);
    });
    this.shootBtn.on('pointerout', () => { // Si arrastras el dedo fuera
        this.shootBtn.isDown = false;
        this.shootBtn.setFillStyle(0xf1c40f, 0.5);
    });

    // --- CARGAR ESTADO INICIAL ---
    if (window.initialGameData) {
        if (window.initialGameData.map) buildMap(self, window.initialGameData.map);
        if (window.initialGameData.players) {
            Object.keys(window.initialGameData.players).forEach((id) => {
                if (window.initialGameData.players[id].playerId === socket.id) {
                    addPlayer(self, window.initialGameData.players[id]);
                } else {
                    addOtherPlayer(self, window.initialGameData.players[id]);
                }
            });
        }
        if (window.initialGameData.walls) {
            window.initialGameData.walls.forEach(p => makeWallVisible(self, p.x, p.y, false));
        }
    }

    socket.on('wallGroupRevealed', (blockLists) => {
        blockLists.forEach(p => makeWallVisible(self, p.x, p.y, true));
    });
    socket.on('newPlayer', (info) => addOtherPlayer(self, info));
    socket.on('disconnectPlayer', (id) => {
        if (self.enemies[id]) { self.enemies[id].destroy(); delete self.enemies[id]; }
    });
    socket.on('playerMoved', (info) => {
        const enemy = self.enemies[info.playerId];
        if (enemy) { enemy.setPosition(info.x, info.y); enemy.rotation = info.rotation; }
    });
    socket.on('playerShot', (id) => {
        const enemy = self.enemies[id];
        if (enemy) fireBullet(self, enemy, false);
    });
    socket.on('gameOver', (id) => {
        self.isGameOver = true;
        this.joyStick.setVisible(false); // Ocultar joystick al terminar
        this.shootBtn.setVisible(false);
        if (id === socket.id) {
            if (self.player) self.player.setVisible(false);
            self.isDead = true;
            showGameOverUI(self, false);
        } else {
            if (self.enemies[id]) self.enemies[id].setVisible(false);
            showGameOverUI(self, true);
        }
    });
    socket.on('gameReset', (data) => {
        self.uiGroup.clear(true, true);
        self.isGameOver = false;
        self.isDead = false;
        self.lastFired = 0;
        
        // Mostrar controles de nuevo
        self.joyStick.setVisible(true);
        self.shootBtn.setVisible(true);

        buildMap(self, data.map);
        const myInfo = data.players[socket.id];
        if (!self.player) addPlayer(self, myInfo);
        else {
            self.player.setVisible(true);
            self.player.setPosition(myInfo.x, myInfo.y);
            self.player.rotation = myInfo.rotation;
            setupColliders(self); 
            updateTankAnimation(self.player);
        }
        Object.keys(data.players).forEach(id => {
            if (id !== socket.id) {
                if (self.enemies[id]) {
                    self.enemies[id].setVisible(true);
                    self.enemies[id].setPosition(data.players[id].x, data.players[id].y);
                    self.enemies[id].rotation = data.players[id].rotation;
                    updateTankAnimation(self.enemies[id]);
                } else {
                    addOtherPlayer(self, data.players[id]);
                }
            }
        });
    });

    this.cursors = this.input.keyboard.createCursorKeys();
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.lastFired = 0;
}

function dumpJoyStickState() {
    // Función necesaria para el plugin, aunque esté vacía
}

function update(time, delta) {
    const speed = 160;
    if (this.isGameOver || !this.player || this.isDead) return;

    this.player.body.setVelocity(0);

    // --- MOVIMIENTO HÍBRIDO (TECLADO O JOYSTICK) ---
    // Comprobamos si se pulsa la flecha O el joystick virtual

    if (this.cursors.left.isDown || this.joystickCursors.left.isDown) {
        this.player.body.setVelocityX(-speed);
        this.player.rotation = Math.PI;
    } else if (this.cursors.right.isDown || this.joystickCursors.right.isDown) {
        this.player.body.setVelocityX(speed);
        this.player.rotation = 0;
    } else if (this.cursors.up.isDown || this.joystickCursors.up.isDown) {
        this.player.body.setVelocityY(-speed);
        this.player.rotation = -Math.PI / 2;
    } else if (this.cursors.down.isDown || this.joystickCursors.down.isDown) {
        this.player.body.setVelocityY(speed);
        this.player.rotation = Math.PI / 2;
    }

    updateTankAnimation(this.player);
    Object.values(this.enemies).forEach(enemy => updateTankAnimation(enemy));

    // --- DISPARO HÍBRIDO (ESPACIO O BOTÓN TÁCTIL) ---
    // Usamos 'justDown' manual para el botón táctil
    let isShooting = Phaser.Input.Keyboard.JustDown(this.spaceKey);
    
    // Lógica para que el botón táctil no dispare 60 veces por segundo, sino solo al pulsar
    if (this.shootBtn.isDown) {
        if (!this.shootBtn.locked) {
            isShooting = true;
            this.shootBtn.locked = true; // Bloquear hasta que levante el dedo
        }
    } else {
        this.shootBtn.locked = false;
    }

    if (isShooting) {
        if (time > this.lastFired) {
            fireBullet(this, this.player, true);
            this.lastFired = time + 1500;
            socket.emit('shoot');
        }
    }

    if (!this.player.oldPosition) this.player.oldPosition = { x: this.player.x, y: this.player.y, rotation: this.player.rotation };
    if (this.player.x !== this.player.oldPosition.x || this.player.y !== this.player.oldPosition.y || this.player.rotation !== this.player.oldPosition.rotation) {
        socket.emit('playerMovement', { x: this.player.x, y: this.player.y, rotation: this.player.rotation });
        this.player.oldPosition = { x: this.player.x, y: this.player.y, rotation: this.player.rotation };
    }
}

// --- GENERADORES GRÁFICOS ---
function createTankTexture(scene, name, colorMain, colorShadow) {
    const width = 40; const height = 30; const shadowHeight = 4;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(colorShadow, 1); g.fillRoundedRect(0, shadowHeight, width, height, 6);
    g.fillStyle(colorMain, 1); g.fillRoundedRect(0, 0, width, height, 6);
    g.fillStyle(0xffffff, 0.3); g.fillRoundedRect(width - 12, height/2 - 3, 12, 6, 2);
    g.generateTexture(name, width, height + shadowHeight);
}
function createWallTexture(scene, name, colorMain, colorShadow) {
    const size = 40; const shadowHeight = 6;
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(colorShadow, 1); g.fillRect(0, 0, size, size);
    g.fillStyle(colorMain, 1); g.fillRect(0, 0, size, size - shadowHeight);
    g.generateTexture(name, size, size);
}
function createBulletTexture(scene, name, color) {
    const g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 1); g.fillCircle(6, 6, 6);
    g.generateTexture(name, 12, 12);
}
function setupTankAnimations(scene, sprite) {
    sprite.idleTween = scene.tweens.add({
        targets: sprite, scaleX: 1.05, scaleY: 1.05, duration: 500,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut', paused: true
    });
    sprite.moveTween = scene.tweens.add({
        targets: sprite, scaleX: 1.02, scaleY: 1.02, duration: 200,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut', paused: true
    });
    sprite.currentAnimState = 'none';
}
function updateTankAnimation(sprite) {
    if (!sprite || !sprite.body) return;
    const isMoving = sprite.body.velocity.x !== 0 || sprite.body.velocity.y !== 0;
    const newState = isMoving ? 'move' : 'idle';
    if (sprite.currentAnimState !== newState) {
        if (newState === 'move') { sprite.idleTween.pause(); sprite.setScale(1); sprite.moveTween.play(); } 
        else { sprite.moveTween.pause(); sprite.setScale(1); sprite.idleTween.play(); }
        sprite.currentAnimState = newState;
    }
}
function buildMap(self, mapMatrix) {
    self.walls.clear(true, true);
    for (let y = 0; y < mapMatrix.length; y++) {
        for (let x = 0; x < mapMatrix[y].length; x++) {
            if (mapMatrix[y][x] === 1) {
                let posX = (x * 40) + 20; let posY = (y * 40) + 20;
                let wall = self.add.sprite(posX, posY, 'wallTex');
                self.physics.add.existing(wall, true); self.walls.add(wall);
                wall.coordX = posX; wall.coordY = posY;
                wall.setVisible(x === 0 || x === 19 || y === 0 || y === 14);
            }
        }
    }
    setupColliders(self);
}
function addPlayer(self, info) {
    self.player = self.physics.add.sprite(info.x, info.y, 'playerTex');
    self.player.setCollideWorldBounds(true);
    self.player.rotation = info.rotation;
    self.player.body.setSize(36, 26);
    setupColliders(self);
    setupTankAnimations(self, self.player);
}
function addOtherPlayer(self, info) {
    const other = self.physics.add.sprite(info.x, info.y, 'enemyTex');
    other.playerId = info.playerId;
    other.rotation = info.rotation;
    self.enemies[info.playerId] = other;
    other.body.setSize(36, 26);
    setupTankAnimations(self, other);
}
function fireBullet(scene, source, isMyBullet) {
    const vec = new Phaser.Math.Vector2();
    vec.setToPolar(source.rotation, 25);
    const texture = isMyBullet ? 'playerBulletTex' : 'enemyBulletTex';
    const bullet = scene.physics.add.sprite(source.x + vec.x, source.y + vec.y, texture);
    scene.bullets.add(bullet);
    scene.physics.velocityFromRotation(source.rotation, 600, bullet.body.velocity);

    if (isMyBullet) {
        Object.values(scene.enemies).forEach(enemy => {
            scene.physics.add.overlap(bullet, enemy, (b, e) => {
                b.destroy();
                socket.emit('playerDied', e.playerId);
            });
        });
    }
    scene.physics.add.overlap(bullet, scene.walls, (b, w) => {
        b.destroy();
        if (!w.visible) {
            socket.emit('wallHit', { x: w.coordX, y: w.coordY });
        }
    });
}
function setupColliders(self) {
    if (self.player && self.walls) {
        self.physics.add.collider(self.player, self.walls, (player, wall) => {
            if (!wall.visible) {
                socket.emit('wallHit', { x: wall.coordX, y: wall.coordY });
            }
        });
    }
}
function makeWallVisible(self, x, y, animate) {
    self.walls.getChildren().forEach((wall) => {
        if (wall.coordX === x && wall.coordY === y && !wall.visible) {
            wall.setVisible(true);
            if (animate) {
                wall.alpha = 0;
                self.tweens.add({ targets: wall, alpha: 1, duration: 300 });
            }
        }
    });
}
function showGameOverUI(scene, playerWon) {
    let overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000).setAlpha(0.0);
    scene.tweens.add({ targets: overlay, alpha: 0.7, duration: 500 });
    let color = playerWon ? "#58d68d" : "#ec7063"; 
    let title = scene.add.text(400, 250, playerWon ? "¡VICTORIA!" : "DERROTA", { 
        fontSize: '60px', fontFamily: 'Arial Black', color: color, stroke: '#000000', strokeThickness: 6 
    }).setOrigin(0.5).setScale(0);
    scene.tweens.add({ targets: title, scale: 1, duration: 500, ease: 'Back.out' });
    let btn = scene.add.rectangle(400, 400, 200, 50, 0xffffff).setInteractive({ useHandCursor: true });
    let btnText = scene.add.text(400, 400, "JUGAR OTRA VEZ", { fontSize: '20px', color: '#000000', fontStyle: 'bold' }).setOrigin(0.5);
    btn.on('pointerover', () => scene.tweens.add({ targets: btn, scaleX: 1.1, scaleY: 1.1, duration: 100 }));
    btn.on('pointerout', () => scene.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 100 }));
    btn.on('pointerdown', () => {
        btnText.setText("Reiniciando...");
        socket.emit('requestRestart');
    });
    scene.uiGroup.addMultiple([overlay, title, btn, btnText]);
}