"use strict";
function asteroids() {
    const svg = document.getElementById("canvas");
    const METEORS = [];
    const ITEMS = [];
    const ENEMIES = [];
    let bounds = svg.getBoundingClientRect();
    const game = {
        max_bullets: 1,
        meteor_id: 0, meteor_count: 0,
        item_id: 0, item_count: 0,
        enemy_id: 0, enemy_count: 0,
        level: 1, score: 0
    };
    const ship = {
        lives: 3, bullets: game.max_bullets,
        accel: 0, speed_boost: 0, boosts: 3,
        immune: false, immobile: false, control: new Elem(svg, 'g').attr("transform", "translate(300 300) rotate(0)"),
        radius: 13, bullet: { colour: "white", radius: 2 }, move: false, angle: 0, velX: 0, velY: 0
    };
    const ship_shape = new Elem(svg, 'polygon', ship.control.elem).attr("points", "-15,20 15,20 0,-20").attr("style", `fill:black;stroke:${ship.bullet.colour};stroke-width:1`);
    const mousemove = Observable.fromEvent(svg, 'mousemove'), mousedown = Observable.fromEvent(svg, 'mousedown'), keydown = Observable.fromEvent(document, 'keydown'), keyup = Observable.fromEvent(document, 'keyup');
    const updateText = () => {
        const livesText = document.getElementById("lives");
        livesText.innerHTML = `Lives: ${ship.lives}`;
        const boostsText = document.getElementById("boosts");
        boostsText.innerHTML = `Boosts: ${ship.boosts}`;
        const levelText = document.getElementById("level");
        levelText.innerHTML = `Level: ${game.level}`;
        const scoreText = document.getElementById("score");
        scoreText.innerHTML = `Score: ${game.score}`;
    };
    const toDeg = (rad) => rad * (180 / Math.PI);
    const toRad = (deg) => deg * (Math.PI / 180);
    const mod = (x, n) => (x % n + n) % n;
    const getTransformVals = (t) => {
        const st = t.split(/([0-9]+\.*[0-9]*)/);
        if (isNaN(Number(st[5])))
            throw "getTransformVals() - argument is not valid";
        return ({ x: Number(st[1]), y: Number(st[3]), angle: Number(st[5]) });
    };
    const inScreen = (x, y) => !(x >= bounds.width || y >= bounds.height);
    const detectCollision = (object1) => (object2) => {
        const obj1 = getTransformVals(object1.control.attr('transform'));
        const obj2 = getTransformVals(object2.control.attr('transform'));
        const dx = obj2.x - obj1.x;
        const dy = obj2.y - obj1.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < object1.radius + object2.radius;
    };
    const onShipDeath = () => {
        ship.move = false;
        ship.accel = 0;
        ship.speed_boost = 0;
        game.max_bullets = 1;
        ship.bullets = 1;
        ship.bullet = { colour: "white", radius: 2 };
        ship.immune = true;
        ship.immobile = true;
        ship.lives--;
        updateText();
        let crash = new Elem(svg, 'polygon', ship.control.elem).attr("points", "3 -16,17 -23,9 -4,34 -6,19 8,48 28,14 22,14 37,0 20,-13 39,-10 14,-38 -8,-10 -4,-8 -39").attr("style", "fill:red;stroke:orange;");
        if (document.getElementById('boost'))
            document.getElementById('boost').remove();
        if (ship.lives === 0) {
            const x = new Elem(svg, 'text')
                .attr('x', bounds.right / 2 - 180)
                .attr('y', bounds.bottom / 2)
                .attr('font-family', 'arial')
                .attr('font-size', '60px')
                .attr('fill', 'white')
                .attr('text-anchor', 'center');
            x.append(document.createTextNode("GAME OVER"));
            ship.immobile = true;
        }
        else {
            const white = "fill:black;stroke:white;stroke-width:1", blue = "fill:black;stroke:blue;stroke-width:3";
            setTimeout(() => { crash.elem.remove(); ship.immobile = false; }, 1500);
            ship_shape.attr("style", blue);
            setTimeout(() => ship_shape.attr("style", white), 3000);
            setTimeout(() => ship_shape.attr("style", blue), 3500);
            setTimeout(() => ship_shape.attr("style", white), 4000);
            setTimeout(() => ship_shape.attr("style", blue), 4500);
            setTimeout(() => ship_shape.attr("style", white), 5000);
            setTimeout(() => ship_shape.attr("style", blue), 5500);
            setTimeout(() => { ship_shape.attr("style", white); ship.immune = false; ship.bullets = 1; }, 6000);
        }
    };
    const translateColour = (colour) => {
        if (colour !== "green" && colour !== "blue" && colour !== "white")
            throw "translateColour - invalid colour";
        return colour === "green" ? "#3ebd2b" : colour === "blue" ? "#3446eb" : "white";
    };
    const bounce = (object, arr) => {
        arr.forEach((obj) => {
            if (detectCollision(object)(obj) && object.id != obj.id) {
                const distance = Math.sqrt((object.x - obj.x) * (object.x - obj.x) + (object.y - obj.y) * (object.y - obj.y));
                const new_angle = { x: (object.x - obj.x) / distance, y: (object.y - obj.y) / distance };
                object.vx = new_angle.x;
                object.vy = new_angle.y;
            }
        });
    };
    const create = (object_group) => {
        let radius = 0, id = 0, type = "", speed = 0, hp = 1;
        switch (object_group) {
            case "meteor":
                radius = 40;
                id = game.meteor_id;
                type = "big";
                game.meteor_count++;
                speed = 0.6;
                break;
            case "item":
                radius = 12;
                id = game.item_id;
                type = Math.floor(Math.random() * 2) === 1 ? "green" : "blue";
                game.item_count++;
                speed = 0.9;
                break;
            case "enemy":
                radius = 13;
                id = game.enemy_id;
                type = "red";
                game.enemy_count++;
                speed = 0.4;
                hp = 4;
                break;
            default:
                radius = 0;
                id = 0;
                type = "";
        }
        const object = {
            x: Math.floor(Math.random() * bounds.right),
            y: 0,
            vx: Math.floor(Math.random() * 2) - 1,
            vy: Math.floor(Math.random() * 2) - 1,
            radius: radius,
            id: id,
            speed: speed,
            type: type,
            control: new Elem(svg, 'g'),
            group: object_group,
            hp: hp
        };
        return object;
    };
    const move = (object) => resetObservable
        .takeWhile(() => !(object.type === "dead"))
        .scan([object.x, object.y], ([obj_x, obj_y]) => [mod(Number(obj_x) + (object.vx || 1) * object.speed, bounds.width), mod(Number(obj_y) + (object.vy || 1) * object.speed, bounds.height)])
        .subscribe(([obj_x, obj_y]) => {
        const { x, y } = getTransformVals(ship.control.attr('transform'));
        const angle = object.group === "enemy" ? toDeg(Math.atan2(obj_y - y, obj_x - x)) + 270 : getTransformVals(object.control.attr('transform')).angle;
        object.control.attr('transform', `translate(${obj_x} ${obj_y}) rotate(${angle})`);
        bounce(object, object.group === "item" ? ITEMS : object.group === "enemy" ? ENEMIES : METEORS);
    });
    const gameInterval = Observable.interval(10);
    const resetObservable = gameInterval.takeWhile(() => ship.lives > 0);
    Observable
        .interval(1000)
        .subscribe(() => {
        bounds = svg.getBoundingClientRect();
        game.score += 1;
        if (game.score > 200 * game.level)
            game.level++;
        updateText();
    });
    gameInterval
        .filter(() => game.item_count < 3)
        .map(() => {
        const item = create("item");
        new Elem(svg, 'polygon', item.control.elem).attr("points", "10 10, -10 10, -10, -10, 10 -10").attr("style", `fill:${translateColour(item.type)};stroke:white;stroke-width:1`);
        return item;
    })
        .subscribe((item) => {
        item.control
            .attr("transform", `translate(${0 + Math.random() * bounds.right - Math.floor(bounds.right / 2)} ${0}) rotate(0)`)
            .attr('id', `item_${game.item_id++}`);
        move(item);
        ITEMS.push(item);
    });
    gameInterval
        .filter(() => game.enemy_count < 1 * Math.ceil(game.level / 2))
        .map(() => {
        const enemy = create("enemy");
        new Elem(svg, 'polygon', enemy.control.elem).attr("points", "-15,20 15,20 0,-20").attr("style", `fill:black;stroke:red;stroke-width:1`);
        new Elem(svg, 'rect', enemy.control.elem).attr("x", -20).attr('y', 30).attr('width', 40).attr('height', 5).attr('fill', 'green').attr('stroke', 'white');
        return enemy;
    })
        .subscribe((enemy) => {
        enemy.control
            .attr("transform", `translate(${0 + Math.random() * bounds.right - Math.floor(bounds.right / 2)} ${0}) rotate(${Math.floor(Math.random() * 360)})`)
            .attr('id', `enemy_${game.enemy_id++}`);
        const interval_id = setInterval(() => {
            const bullet = bulletCreate(enemy);
            bullet.control.attr('id', "enemy_bullet");
            new Elem(svg, 'circle', bullet.control.elem).attr("cx", "0").attr("cy", "0").attr("r", "2").attr("style", "fill:red;stroke:white;stroke-width:1;z-index:999");
            bulletMove(bullet, "enemy");
        }, 1000);
        enemy.type = String(interval_id);
        move(enemy);
        ENEMIES.push(enemy);
    });
    gameInterval
        .filter(() => game.meteor_count < 2 * game.level)
        .map(() => {
        const meteor = create("meteor");
        new Elem(svg, 'polygon', meteor.control.elem).attr("points", "-44 -15,-43 -6,-37 6,-37 17,-35 27,-25 35,-9 34,-9 43,8 45,32 38,39 22,37 10,42 -9,36 -24,28 -33,2 -38,-27 -33,-43 -18").attr("style", "fill:black;stroke:white;stroke-width:1");
        new Elem(svg, 'polygon', meteor.control.elem).attr("points", "15 2,19 7,25 10,24 17,14 19,14 14,8 14,7 7,11 3").attr("style", "fill:black;stroke:white;stroke-width:1");
        new Elem(svg, 'polygon', meteor.control.elem).attr("points", "-19 -12,-13 -9,-15 -2,-21 -1,-27 -3,-25 -11,-21 -16").attr("style", "fill:black;stroke:white;stroke-width:1");
        return meteor;
    })
        .subscribe((meteor) => {
        meteor.control
            .attr("transform", `translate(${0 + Math.random() * bounds.right - Math.floor(bounds.right / 2)} ${0}) rotate(${Math.floor(Math.random() * 360)})`)
            .attr('id', `meteor_${game.meteor_id++}`);
        move(meteor);
        METEORS.push(meteor);
    });
    const meteorBreak = (meteor) => (n) => {
        const { x, y } = getTransformVals(meteor.control.attr('transform'));
        const meteor_small = {
            x: x + n * 20 - 30,
            y: y + n * 20 - 30,
            vx: Math.floor(Math.random() * 2) - 1 || 1,
            vy: n % 2 === 0 ? 1 : -1,
            radius: 18,
            id: game.meteor_id,
            speed: 0.65,
            control: new Elem(svg, 'g').attr("transform", `translate(${x} ${y}) rotate(${Math.floor(Math.random() * 360)})`).attr('id', `meteor_${game.meteor_id++}`),
            group: "meteor",
            type: "small",
            hp: 1
        };
        new Elem(svg, 'polygon', meteor_small.control.elem).attr("points", "-1 -20,9 -18,11 -6,16 -5,19 3,17 10,10 15,2 22,-9 18,-11 16,-10 12,-15 8,-21 -2,-11 -15").attr("style", "fill:black;stroke:white;stroke-width:1");
        move(meteor_small);
        METEORS.push(meteor_small);
        if (n > 1)
            meteorBreak(meteor)(n - 1);
    };
    const bulletCreate = (object) => {
        const { x, y, angle } = getTransformVals(object.control.attr('transform'));
        const bullet = {
            radius: 2,
            x: x,
            y: y,
            angle: angle,
            control: new Elem(svg, 'g').attr('transform', `translate(${x} ${y}) rotate(${angle})`)
        };
        return bullet;
    };
    const bulletRemove = (bullet, from) => {
        bullet.control.elem.remove();
        if (from === "ship")
            ship.bullets++;
    };
    const bulletMove = (bullet, from) => resetObservable
        .map(() => getTransformVals(bullet.control.attr('transform')))
        .takeWhile((b_transform) => inScreen(b_transform.x, b_transform.y))
        .map((b_transform) => ({
        x: Math.sin(toRad(Number(b_transform.angle))) * (from === "ship" ? 10 : 2) + b_transform.x,
        y: -Math.cos(toRad(Number(b_transform.angle))) * (from === "ship" ? 10 : 2) + b_transform.y,
        angle: b_transform.angle,
    }))
        .map(({ x, y, angle }) => ({
        x: mod(x, bounds.width + 500),
        y: mod(y, bounds.height + 500),
        angle: angle
    }))
        .subscribe(({ x, y, angle }) => {
        bullet.control.attr('transform', `translate(${x} ${y}) rotate(${angle})`);
        if (!inScreen(x, y)) {
            bulletRemove(bullet, from);
        }
        const bulletCollidingWith = detectCollision(bullet);
        if (from === "enemy") {
            (bulletCollidingWith(ship) && !ship.immune) ? onShipDeath() : 0;
        }
        if (from === "ship") {
            METEORS.forEach((meteor, idx) => {
                if (bulletCollidingWith(meteor)) {
                    const b_childs = bullet.control.elem.childNodes;
                    while (b_childs.length > 0)
                        b_childs[0].remove();
                    const m_childs = meteor.control.elem.childNodes;
                    while (m_childs.length > 0)
                        m_childs[0].remove();
                    bullet.control.attr("transform", `translate(3000 3000) rotate(0)`);
                    document.getElementById(`meteor_${String(METEORS.splice(idx, 1)[0].id)}`).remove();
                    ship.bullet.colour !== "blue" ? bulletRemove(bullet, "ship") : ship.bullets++;
                    if (meteor.type === "big") {
                        meteorBreak(meteor)(3);
                        game.meteor_count--;
                        game.score += 15;
                    }
                    game.score += 5;
                    meteor.type = "dead";
                    updateText();
                }
            });
            ENEMIES.forEach((enemy, idx) => {
                if (bulletCollidingWith(enemy)) {
                    const b_childs = bullet.control.elem.childNodes;
                    while (b_childs.length > 0)
                        b_childs[0].remove();
                    bullet.control.attr("transform", `translate(3000 3000) rotate(0)`);
                    bulletRemove(bullet, "ship");
                    if (enemy.hp > 1) {
                        enemy.hp--;
                        new Elem(svg, 'rect', enemy.control.elem).attr("x", -20).attr('y', 30).attr('width', (4 - enemy.hp) * 10).attr('height', 5).attr('fill', 'red');
                    }
                    else {
                        new Elem(svg, 'polygon', enemy.control.elem).attr("points", "3 -16,17 -23,9 -4,34 -6,19 8,48 28,14 22,14 37,0 20,-13 39,-10 14,-38 -8,-10 -4,-8 -39").attr("style", "fill:red;stroke:orange;");
                        setTimeout(() => {
                            const e_childs = enemy.control.elem.childNodes;
                            while (e_childs.length > 0)
                                e_childs[0].remove();
                            document.getElementById(`enemy_${String(ENEMIES.splice(idx, 1)[0].id)}`).remove();
                            clearInterval(Number(enemy.type));
                            enemy.type = "dead";
                            game.score += 30;
                            game.enemy_count--;
                        }, 30);
                    }
                    updateText();
                }
            });
        }
    });
    mousedown
        .filter(({ which }) => which === 1 && ship.bullets > 0 && !ship.immune)
        .map(() => {
        const bullet = bulletCreate(ship);
        bullet.control.attr('id', "bullet");
        new Elem(svg, 'circle', bullet.control.elem).attr("cx", "0").attr("cy", "0").attr("r", String(ship.bullet.radius)).attr("style", `fill:${translateColour(ship.bullet.colour)};`);
        return bullet;
    })
        .subscribe((bullet) => {
        bulletMove(bullet, "ship");
        ship.bullets--;
    });
    mousedown
        .filter(({ which }) => which === 3 && !ship.immune && ship.speed_boost == 0 && ship.boosts > 0)
        .subscribe(() => {
        ship.accel = 400;
        ship.speed_boost = 140;
        ship.boosts--;
        new Elem(svg, 'polygon', ship.control.elem).attr("points", "16 25,10 60,7 39,5 55,-1 27,-7 59,-15 25").attr("style", "fill:red;").attr('id', 'boost');
        updateText();
    });
    mousemove
        .filter(() => !ship.immobile && ship.lives > 0)
        .map(({ clientX, clientY }) => ({
        x: clientX - bounds.left,
        y: clientY - bounds.top,
        s: getTransformVals(ship.control.attr('transform'))
    }))
        .map(({ x, y, s }) => ({ angle: toDeg(Math.atan2(y - s.y, x - s.x)) + 90, s: s }))
        .map(({ angle, s }) => ({ angle: angle > 0 ? angle : angle + 360, s: s }))
        .subscribe(({ angle, s }) => {
        ship.control.attr('transform', `translate(${s.x} ${s.y}) rotate(${angle})`);
        ship.angle = angle;
    });
    keydown
        .filter(({ key }) => key === "w" && !ship.immobile)
        .subscribe(() => { ship.move = true; });
    keyup
        .filter(({ key }) => key === "w")
        .subscribe(() => { ship.move = false; });
    resetObservable
        .filter(() => ship.move || ship.accel > 0)
        .map(() => {
        const angle = toRad(getTransformVals(ship.control.attr('transform')).angle + 90);
        if (ship.speed_boost > 0)
            ship.accel = 200;
        return ({
            vx: ship.velX + Math.cos(angle) * 0.1 * (ship.accel / (190 - ship.speed_boost)),
            vy: ship.velY + Math.sin(angle) * 0.1 * (ship.accel / (190 - ship.speed_boost))
        });
    })
        .subscribe(({ vx, vy }) => {
        const s_transform = getTransformVals(ship.control.attr('transform'));
        ship.velX = vx * 0.98;
        ship.velY = vy * 0.98;
        ship.control.attr('transform', `translate(${mod(s_transform.x - vx, bounds.right)} ${mod(s_transform.y - vy, bounds.bottom)}) rotate(${s_transform.angle})`);
        ship.accel = (ship.move && ship.accel < 200) ? ship.accel + 4 : ship.accel - 2;
        ship.speed_boost > 0 ? ship.speed_boost -= 0.5 : document.getElementById('boost') ? document.getElementById('boost').remove() : 0;
    });
    resetObservable
        .filter(() => !ship.move && ship.accel < 10)
        .subscribe(() => {
        ship.velX = 0;
        ship.velY = 0;
    });
    resetObservable
        .filter(() => !ship.immune)
        .subscribe(() => {
        const shipCollidingWith = detectCollision(ship);
        METEORS.forEach((meteor) => { if (shipCollidingWith(meteor))
            onShipDeath(); });
        ENEMIES.forEach((enemy) => { if (shipCollidingWith(enemy))
            onShipDeath(); });
        ITEMS.forEach((item, idx) => {
            if (shipCollidingWith(item)) {
                const i_childs = item.control.elem.childNodes;
                while (i_childs.length > 0)
                    i_childs[0].remove();
                document.getElementById(`item_${String(ITEMS.splice(idx, 1)[0].id)}`).remove();
                ship.bullet.colour = item.type;
                if (item.type === "green") {
                    if (ship.bullet.colour === "green")
                        game.max_bullets = game.max_bullets += 2;
                    ship.bullets += 2;
                    ship.bullet.radius = 2;
                }
                if (item.type === "blue") {
                    if (ship.bullet.colour === "blue")
                        ship.bullet.radius += 2;
                    game.max_bullets = 1;
                    ship.bullets = ship.bullets === 0 ? 0 : 1;
                }
                ship_shape.attr("style", `fill:black;stroke:${translateColour(ship.bullet.colour)};stroke-width:1`);
                game.item_count--;
                item.type = "dead";
            }
        });
    });
}
if (typeof window != 'undefined')
    window.onload = () => {
        asteroids();
    };
//# sourceMappingURL=asteroids.js.map