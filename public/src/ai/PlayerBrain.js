export class PlayerBrain {
    constructor(input) {
        this.input = input;
    }

    update(tank) {
        tank.intent.x = this.input.move.x;
        tank.intent.z = this.input.move.z;
    }
}
