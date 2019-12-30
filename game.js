var game;
var gameOptions = {
    platformGapRange: [200, 400],
    platformWidthRange: [50, 150],
    platformHeight: 360,
    playerWidth: 32,
    playerHeight: 64,
    poleWidth: 8,
    growTime: 500,
    rotateTime: 500,
    walkTime: 3,
    fallTime: 500,
    scrollTime: 250
}

const IDLE = 0;
const WAITING = 1;
const GROWING = 2;
const WALKING = 3;

window.onload = function() {
    var gameConfig = {
        type: Phaser.AUTO,
        width: 750,
        height: 1000,
        scene: [playGame],
        backgroundColor: 0x0c88c7
    }

    game = new Phaser.Game(gameConfig);
    window.focus();
    resize();
    window.addEventListener("resize", resize, false);
}

class playGame extends Phaser.Scene{
    constructor(){
        //noinspection JSAnnotator
        super("PlayGame");
    }

    preload(){
        this.load.image("tile", "assets/tile.png");
        this.load.image("coin", "assets/coin.png");
        this.load.image("player", "assets/player.png");
    }

    create(){
        this.addCoin();
        this.addPlatforms();
        this.addPlayer();
        this.addPole();
        // this.input.on("pointerdown", this.grow, this);
        // this.input.on("pointerup", this.stop, this);
        this.keyEnter = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
        // this.input.keyboard.on('keyup_UP',this.grow, this);
        // this.input.keyboard.on('keyup_DOWN',this.stop, this);
    }
    addPlatforms(){
        this.mainPlatform = 0;
        this.platforms = [];
        this.platforms.push(this.addPlatform(0));
        this.platforms.push(this.addPlatform(game.config.width));
        this.tweenPlatform();
    }
    addPlatform(posX){
        var platform = this.add.sprite(posX, game.config.height - gameOptions.platformHeight, "tile");
        platform.displayWidth = (gameOptions.platformWidthRange[0] + gameOptions.platformWidthRange[1]) / 2;
        platform.displayHeight = gameOptions.platformHeight;
        platform.alpha = 0.7;
        platform.setOrigin(0, 0);
        return platform
    }

    addCoin(){
        this.coin = this.add.sprite(0, game.config.height - gameOptions.platformHeight + gameOptions.playerHeight / 2, "coin");
        this.coin.visible = false;
    }

    placeCoin(){
        this.coin.x = Phaser.Math.Between(this.platforms[this.mainPlatform].getBounds().right + 10, this.platforms[1 - this.mainPlatform ].getBounds().left - 10);
        this.coin.visible = true;
    }

    tweenPlatform(){
        var destination = this.platforms[this.mainPlatform].displayWidth + Phaser.Math.Between(gameOptions.platformGapRange[0], gameOptions.platformGapRange[1]);
        var size = Phaser.Math.Between(gameOptions.platformWidthRange[0], gameOptions.platformWidthRange[1]);
        this.tweens.add({
            targets: [this.platforms[1 - this.mainPlatform]],
            x: destination,
            displayWidth: size,
            duration: gameOptions.scrollTime,
            callbackScope: this,
            onComplete: function(){
                this.gameMode = WAITING;
                this.placeCoin();
            }
        })
    }

    addPlayer(){
        this.player = this.add.sprite(this.platforms[this.mainPlatform].displayWidth - gameOptions.poleWidth, game.config.height - gameOptions.platformHeight, "player");
        this.player.setOrigin(1, 1)
    }

    addPole(){
        this.pole = this.add.sprite(this.platforms[this.mainPlatform].displayWidth, game.config.height - gameOptions.platformHeight, "tile");
        this.pole.setOrigin(1, 1);
        this.pole.displayWidth = gameOptions.poleWidth;
        this.pole.displayHeight = gameOptions.playerHeight / 4;
    }

    grow(){
        if(this.gameMode == WAITING){
            this.gameMode = GROWING;
            this.growTween = this.tweens.add({
                targets: [this.pole],
                displayHeight: gameOptions.platformGapRange[1] + gameOptions.platformWidthRange[1],
                duration: gameOptions.growTime
            });
        }
        if(this.gameMode == WALKING){
            if(this.player.flipY){
                this.player.flipY = false;
                this.player.y = game.config.height - gameOptions.platformHeight;
            }
            else{
                this.player.flipY = true;
                this.player.y = game.config.height - gameOptions.platformHeight + gameOptions.playerHeight - gameOptions.poleWidth;
                var playerBound = this.player.getBounds();
                var platformBound = this.platforms[1 - this.mainPlatform].getBounds();
                if(Phaser.Geom.Rectangle.Intersection(playerBound, platformBound).width != 0){
                    this.player.flipY = false;
                    this.player.y = game.config.height - gameOptions.platformHeight;
                }
            }
        }
    }

    stop(){
        if(this.gameMode == GROWING){
            this.gameMode = IDLE;
            this.growTween.stop();
            if(this.pole.displayHeight > this.platforms[1 - this.mainPlatform].x - this.pole.x){
                this.tweens.add({
                    targets: [this.pole],
                    angle: 90,
                    duration: gameOptions.rotateTime,
                    ease: "Bounce.easeOut",
                    callbackScope: this,
                    onComplete: function(){
                        this.gameMode = WALKING;
                        if(this.pole.displayHeight < this.platforms[1 - this.mainPlatform].x + this.platforms[1 - this.mainPlatform].displayWidth - this.pole.x){
                            this.walkTween = this.tweens.add({
                                targets: [this.player],
                                x: this.platforms[1 - this.mainPlatform].x + this.platforms[1 - this.mainPlatform].displayWidth - this.pole.displayWidth,
                                duration: gameOptions.walkTime * this.pole.displayHeight,
                                callbackScope: this,
                                onComplete: function(){
                                    this.coin.visible = false;
                                    this.tweens.add({
                                        targets: [this.player, this.pole, this.platforms[1 - this.mainPlatform], this.platforms[this.mainPlatform]],
                                        props: {
                                            x: {
                                                value: "-= " +  this.platforms[1 - this.mainPlatform].x
                                            }
                                        },
                                        duration: gameOptions.scrollTime,
                                        callbackScope: this,
                                        onComplete: function(){
                                            this.prepareNextMove();
                                        }
                                    })
                                }
                            })
                        }
                        else{
                            this.platformTooLong();
                        }
                    }
                })
            }
            else{
                this.platformTooShort();
            }
        }
    }
    platformTooLong(){
        this.walkTween = this.tweens.add({
            targets: [this.player],
            x: this.pole.x + this.pole.displayHeight + this.player.displayWidth,
            duration: gameOptions.walkTime * this.pole.displayHeight,
            callbackScope: this,
            onComplete: function(){
                this.fallAndDie();
            }
        })
    }

    platformTooShort(){
        this.tweens.add({
            targets: [this.pole],
            angle: 90,
            duration: gameOptions.rotateTime,
            ease: "Cubic.easeIn",
            callbackScope: this,
            onComplete: function(){
                this.gameMode = WALKING;
                this.tweens.add({
                    targets: [this.player],
                    x: this.pole.x + this.pole.displayHeight,
                    duration: gameOptions.walkTime * this.pole.displayHeight,
                    callbackScope: this,
                    onComplete: function(){
                        this.tweens.add({
                            targets: [this.pole],
                            angle: 180,
                            duration: gameOptions.rotateTime,
                            ease: "Cubic.easeIn"
                        })
                        this.fallAndDie();
                    }
                })
            }
        })
    }

    fallAndDie(){
        this.gameMode = IDLE;
        this.tweens.add({
            targets: [this.player],
            y: game.config.height + this.player.displayHeight * 2,
            duration: gameOptions.fallTime,
            ease: "Cubic.easeIn",
            callbackScope: this,
            onComplete: function(){
                this.shakeAndRestart();
            }
        })
    }

    prepareNextMove(){
        this.gameMode = IDLE;
        this.platforms[this.mainPlatform].x = game.config.width;
        this.mainPlatform = 1 - this.mainPlatform;
        this.tweenPlatform();
        this.pole.angle = 0;
        this.pole.x = this.platforms[this.mainPlatform].displayWidth;
        this.pole.displayHeight = gameOptions.poleWidth;
    }

    shakeAndRestart(){
        this.cameras.main.shake(800, 0.01);
        this.time.addEvent({
            delay: 2000,
            callbackScope: this,
            callback: function(){
                this.scene.start("PlayGame");
            }
        })
    }

    update(){
        if(this.player.flipY){
            var playerBound = this.player.getBounds();
            var coinBound = this.coin.getBounds();
            var platformBound = this.platforms[1 - this.mainPlatform].getBounds();
            if(Phaser.Geom.Rectangle.Intersection(playerBound, platformBound).width != 0){
                this.walkTween.stop();
                this.gameMode = IDLE;
                this.shakeAndRestart();
            }
            if(this.coin.visible && Phaser.Geom.Rectangle.Intersection(playerBound, coinBound).width != 0){
                this.coin.visible = false;
            }
        }

        if (this.keyEnter.isDown) {
            this.grow();
        }

        if(this.keyEnter.isUp){
            this.stop();
        }
    }
};

function resize(){
    var canvas = document.querySelector("canvas");
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;
    var windowRatio = windowWidth / windowHeight;
    var gameRatio = game.config.width / game.config.height;
    if(windowRatio < gameRatio){
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    }
    else{
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}
