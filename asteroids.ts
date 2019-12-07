// FIT2102 2019 Assignment 1
// https://docs.google.com/document/d/1Gr-M6LTU-tfm4yabqZWJYg-zTjEVqHKKTCvePGCYsUA/edit?usp=sharing

// Hyun Shim 25110632

/**
 * 
 * ******************************************************************
 * **** PLEASE READ THE README.pdf FILE TO VIEW DESCRIPTIONS OF: ****
 * ******************************************************************
 * - Ship Controls
 * - Item descriptions
 * - Enemy descriptions
 * - How to earn points
 * - Additions to Observable.ts
 * - Additions to main.test.js
 * - Additions to svgelement.ts
 * - Additional information
 * 
 */
function asteroids() {
  const svg = document.getElementById("canvas")!


  // ---------------------------
  // ---------- types ----------
  // ---------------------------

  interface Object {
    id: number,
    radius: number,
    x: number, y: number,
    vx: number, vy: number
    control: Elem,
    speed: number,
    group: string, type: string, hp: number
  }

  interface Ship {
    lives: number, bullets: number,
    accel: number, speed_boost: number, boosts: number,
    immune: boolean, immobile: boolean, control: Elem,
    radius: number, bullet: { colour: string, radius: number }, move: boolean,
    angle: number, velX: number, velY: number
  }

  interface Game {
    max_bullets: number,
    meteor_id: number, meteor_count: number,
    item_id: number, item_count: number,
    enemy_id: number, enemy_count: number
    level: number, score: number
  }

  interface Bullet {
    radius: number,
    control: Elem,
    x: number,
    y: number,
    angle: number
  }



  // -------------------------------
  // ---------- Variables ----------
  // -------------------------------
  // Used global arrays instead of getElementByTag as getElementByTag needs to go through all tags to find the required objects whereas global arrays skips this step
  const METEORS = <Array<Object>>[]
  const ITEMS = <Array<Object>>[]
  const ENEMIES = <Array<Object>>[]

  // Used a mutable so that the svg bounds can be updated for global use without having to re-define it everytime
  // we could change this to a const and not recalculate the client bounds but this will cause problems when resizing the window after game launch
  let bounds = svg.getBoundingClientRect()

  const game: Game = {
    max_bullets: 1,
    meteor_id: 0, meteor_count: 0,
    item_id: 0, item_count: 0,
    enemy_id: 0, enemy_count: 0,
    level: 1, score: 0
  }

  const ship: Ship = {
    lives: 3, bullets: game.max_bullets,
    accel: 0, speed_boost: 0, boosts: 3,
    immune: false, immobile: false, control: new Elem(svg, 'g').attr("transform", "translate(300 300) rotate(0)"),
    radius: 13, bullet: { colour: "white", radius: 2 }, move: false, angle: 0, velX: 0, velY: 0
  }
  const ship_shape = new Elem(svg, 'polygon', ship.control.elem).attr("points", "-15,20 15,20 0,-20").attr("style", `fill:black;stroke:${ship.bullet.colour};stroke-width:1`)

  // pre-specify the MouseEvent and KeyboardEvent actions
  const
    mousemove = Observable.fromEvent<MouseEvent>(svg, 'mousemove'),
    mousedown = Observable.fromEvent<MouseEvent>(svg, 'mousedown'),
    keydown = Observable.fromEvent<KeyboardEvent>(document, 'keydown'),
    keyup = Observable.fromEvent<KeyboardEvent>(document, 'keyup')



  // -------------------------------------------
  // ---------- Pre-defined functions ----------
  // -------------------------------------------
  const updateText = () => {
    const livesText: HTMLElement = document.getElementById("lives")!
    livesText.innerHTML = `Lives: ${ship.lives}`
    const boostsText: HTMLElement = document.getElementById("boosts")!
    boostsText.innerHTML = `Boosts: ${ship.boosts}`
    const levelText: HTMLElement = document.getElementById("level")!
    levelText.innerHTML = `Level: ${game.level}`
    const scoreText: HTMLElement = document.getElementById("score")!
    scoreText.innerHTML = `Score: ${game.score}`
  }

  /**
   * @param rad value in radians
   * @return value in degrees
   */
  const toDeg = (rad: number): number => rad * (180 / Math.PI)

  /**
   * @param deg value in degrees
   * @return value in radians
   */
  const toRad = (deg: number): number => deg * (Math.PI / 180)

  /**
   * Custom mod function to allow the Torus Topology
   * @param x value of number being operated on
   * @param n value of mod
   * @param return the warped number
   */
  const mod = (x: number, n: number): number => (x % n + n) % n

  /**
   * translates the transform attribute string to the required x, y, and rotate values
   * @param t the transform attribute string 
   * @return the x, y, and rotate values for the string 
   */
  const getTransformVals = (t: string): { x: number, y: number, angle: number } => {
    const st = t.split(/([0-9]+\.*[0-9]*)/)
    if (isNaN(Number(st[5]))) throw "getTransformVals() - argument is not valid" // added additional error handling as it requires a specific pattern of a string
    return ({ x: Number(st[1]), y: Number(st[3]), angle: Number(st[5]) })
  }

  /**
   * @param x x value of object being checked
   * @param y y value of object being checked
   * @param return boolean of whether the x and y values are within the screen boundaries
   */
  const inScreen = (x: number, y: number): boolean => !(x >= bounds.width || y >= bounds.height)

  /**
   * Checks whether two objects are colliding
   * Used a curried form so that new functions can be made for ships, bullets, or meteors
   * @param object1 first of the two objects being tested for collision
   * @param object2 second of the two objects being tested for collision
   * @return boolean of whether the two objects have collided
   */
  const detectCollision = (object1: Object | Ship | Bullet) => (object2: Object | Ship): boolean => {
    const obj1 = getTransformVals(object1.control.attr('transform'))
    const obj2 = getTransformVals(object2.control.attr('transform'))
    const dx = obj2.x - obj1.x
    const dy = obj2.y - obj1.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    return distance < object1.radius + object2.radius
  }

  /** 
   * Makes the ship invulnerable for a few seconds so that the player can reposition
   * Resets the ship by removing the boost and stopping movement
   * Also blinks the ship with a blue colour so that the player can measure how long they have until they are vulnerable again
   */
  const onShipDeath = (): void => {
    ship.move = false; ship.accel = 0
    ship.speed_boost = 0; game.max_bullets = 1
    ship.bullets = 1; ship.bullet = { colour: "white", radius: 2 }
    ship.immune = true; ship.immobile = true
    ship.lives--

    updateText()
    let crash = new Elem(svg, 'polygon', ship.control.elem).attr("points", "3 -16,17 -23,9 -4,34 -6,19 8,48 28,14 22,14 37,0 20,-13 39,-10 14,-38 -8,-10 -4,-8 -39").attr("style", "fill:red;stroke:orange;")
    if (document.getElementById('boost')) document.getElementById('boost')!.remove()
    if (ship.lives === 0) { // Show Game Over
      const x = new Elem(svg, 'text')
        .attr('x', bounds.right / 2 - 180)
        .attr('y', bounds.bottom / 2)
        .attr('font-family', 'arial')
        .attr('font-size', '60px')
        .attr('fill', 'white')
        .attr('text-anchor', 'center')
      x.append(document.createTextNode("GAME OVER"))
      ship.immobile = true
    } else {
      const
        white = "fill:black;stroke:white;stroke-width:1",
        blue = "fill:black;stroke:blue;stroke-width:3"

      // blink the ship with a blue colour as explained above
      setTimeout(() => { crash.elem.remove(); ship.immobile = false; }, 1500); ship_shape.attr("style", blue)
      setTimeout(() => ship_shape.attr("style", white), 3000); setTimeout(() => ship_shape.attr("style", blue), 3500)
      setTimeout(() => ship_shape.attr("style", white), 4000); setTimeout(() => ship_shape.attr("style", blue), 4500)
      setTimeout(() => ship_shape.attr("style", white), 5000); setTimeout(() => ship_shape.attr("style", blue), 5500)
      setTimeout(() => { ship_shape.attr("style", white); ship.immune = false; ship.bullets = 1 }, 6000)
    }
  }

  /**
   * translates standard colour names to pretty hex codes
   * @param colour standard colour names (green, blue, etc)
   * @return pretty hex code for the required colours
   */
  const translateColour = (colour: string): string => {
    if (colour !== "green" && colour !== "blue" && colour !== "white") throw "translateColour - invalid colour" // added additional error handling as it requires a specific pattern of a string
    return colour === "green" ? "#3ebd2b" : colour === "blue" ? "#3446eb" : "white"
  }

  /**
   * Detects collision between objects and allows same type objects to bounce off each other
   * Different type objects have purposely been left not to bounce off each other to disrupt the player from obtaining an item with meteors
   * @param object object being tested for collision
   * @param arr array of all objects being tested for collision with object
   */
  const bounce = (object: Object, arr: any) => {
    arr.forEach((obj: Object) => {
      if (detectCollision(object)(obj) && object.id != obj.id) {
        const distance = Math.sqrt((object.x - obj.x) * (object.x - obj.x) + (object.y - obj.y) * (object.y - obj.y))
        const new_angle = { x: (object.x - obj.x) / distance, y: (object.y - obj.y) / distance }
        object.vx = new_angle.x
        object.vy = new_angle.y
      }
    })
  }

  /**
   * Creates a new object based on the object type
   * @param object_group the type of object being created: "meteor", "item", "enemy"
   * @return the created object
   */
  const create = (object_group: string): Object => {
    let radius = 0, id = 0, type = "", speed = 0, hp = 1
    switch (object_group) {
      case "meteor":
        radius = 40; id = game.meteor_id; type = "big"; game.meteor_count++; speed = 0.6
        break;
      case "item":
        radius = 12; id = game.item_id; type = Math.floor(Math.random() * 2) === 1 ? "green" : "blue"; game.item_count++; speed = 0.9
        break;
      case "enemy":
        radius = 13; id = game.enemy_id; type = "red"; game.enemy_count++; speed = 0.4; hp = 4
        break;
      default:
        radius = 0; id = 0; type = ""
    }

    const object: Object = {
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
    }

    return object
  }

  /**
   * Allows the object to start moving
   * Calls bounce() to allow the object to bounce off other objects
   * @param object Can be either a 'meteor' or 'item'
   */
  const move = (object: Object): () => void =>
    resetObservable
      .takeWhile(() => !(object.type === "dead"))
      .scan([object.x, object.y],
        ([obj_x, obj_y]) => [mod(Number(obj_x) + (object.vx || 1) * object.speed, bounds.width), mod(Number(obj_y) + (object.vy || 1) * object.speed, bounds.height)]
      )
      .subscribe(([obj_x, obj_y]) => {
        const { x, y } = getTransformVals(ship.control.attr('transform'))
        const angle = object.group === "enemy" ? toDeg(Math.atan2(obj_y - y, obj_x - x)) + 270 : getTransformVals(object.control.attr('transform')).angle

        object.control.attr('transform', `translate(${obj_x} ${obj_y}) rotate(${angle})`)
        bounce(object, object.group === "item" ? ITEMS : object.group === "enemy" ? ENEMIES : METEORS)
      })


  // -------------------------------
  // ---------- Game Code ----------
  // -------------------------------

  const gameInterval = Observable.interval(10)

  // takeWhile has been used to unsubscribe from everything (excluding mouse movements) if the ship has lost all it's lives
  const resetObservable = gameInterval.takeWhile(() => ship.lives > 0)

  // Continually update the bounds so that the game will work properly after screen resize
  //  - increase score by 1 every 1 second
  //  - check for level ups
  Observable
    .interval(1000)
    .subscribe(() => {
      bounds = svg.getBoundingClientRect()
      game.score += 1
      if (game.score > 200 * game.level) game.level++
      updateText()
    })



  // ---------------------------
  // ---------- Items ----------
  // ---------------------------

  /**
   * When there are less than three items on the map
   * calls create() to create an item
   * calls move() to allow the object to move and bounce off other objects
   */
  gameInterval
    .filter(() => game.item_count < 3)
    .map(() => {
      const item = create("item")
      new Elem(svg, 'polygon', item.control.elem).attr("points", "10 10, -10 10, -10, -10, 10 -10").attr("style", `fill:${translateColour(item.type)};stroke:white;stroke-width:1`)

      return item
    })
    .subscribe((item) => {
      item.control
        .attr("transform", `translate(${0 + Math.random() * bounds.right - Math.floor(bounds.right / 2)} ${0}) rotate(0)`)
        .attr('id', `item_${game.item_id++}`) // placed in subscribe() due to side effect of incrementing item_id

      // moves the object in the passed in argument to move every interval
      move(item)

      // This comment is applicable to items, meteors, and ships
      // Pushing items into global array is impure, however it was used to detect collision
      // This impure statement was done in subscribe() so that it won't affect other data streams or have multiple instances of this statement running for having multiple data streams
      // This is also done with meteors, and enemies
      // In the code later on; insertions using push and deletions using splice was used; forEach was used to detect collisions
      ITEMS.push(item)
    })



  // ---------------------------
  // ---------- Enemy ----------
  // ---------------------------

  /**
   * calls create() to create an enemy
   * calls move() to allow the object to move and bounce off other objects
   * for each object
   *  - calls bulletCreate() to create a bullet every specified ms
   *  - calls bulletInit() to allow the bullet to move
   */
  gameInterval
    .filter(() => game.enemy_count < 1 * Math.ceil(game.level / 2))
    .map(() => {
      const enemy = create("enemy")
      new Elem(svg, 'polygon', enemy.control.elem).attr("points", "-15,20 15,20 0,-20").attr("style", `fill:black;stroke:red;stroke-width:1`)
      new Elem(svg, 'rect', enemy.control.elem).attr("x", -20).attr('y', 30).attr('width', 40).attr('height', 5).attr('fill', 'green').attr('stroke', 'white')

      return enemy
    })
    .subscribe((enemy) => {
      enemy.control
        .attr("transform", `translate(${0 + Math.random() * bounds.right - Math.floor(bounds.right / 2)} ${0}) rotate(${Math.floor(Math.random() * 360)})`)
        .attr('id', `enemy_${game.enemy_id++}`) // placed in subscribe() due to side effect of incrementing enemy_id

      const interval_id = setInterval(() => {
        const bullet = bulletCreate(enemy)
        bullet.control.attr('id', "enemy_bullet")
        new Elem(svg, 'circle', bullet.control.elem).attr("cx", "0").attr("cy", "0").attr("r", "2").attr("style", "fill:red;stroke:white;stroke-width:1;z-index:999")

        bulletMove(bullet, "enemy")
      }, 1000) // enemies shoot every 1000ms
      enemy.type = String(interval_id)

      move(enemy)
      ENEMIES.push(enemy)
    })



  // -----------------------------
  // ---------- Meteors ----------
  // -----------------------------

  /**
   * calls create() to create a meteor
   * calls move() to allow the object to move and bounce off other objects
   */
  gameInterval
    .filter(() => game.meteor_count < 2 * game.level)
    .map(() => {
      const meteor = create("meteor")
      new Elem(svg, 'polygon', meteor.control.elem).attr("points", "-44 -15,-43 -6,-37 6,-37 17,-35 27,-25 35,-9 34,-9 43,8 45,32 38,39 22,37 10,42 -9,36 -24,28 -33,2 -38,-27 -33,-43 -18").attr("style", "fill:black;stroke:white;stroke-width:1")
      new Elem(svg, 'polygon', meteor.control.elem).attr("points", "15 2,19 7,25 10,24 17,14 19,14 14,8 14,7 7,11 3").attr("style", "fill:black;stroke:white;stroke-width:1")
      new Elem(svg, 'polygon', meteor.control.elem).attr("points", "-19 -12,-13 -9,-15 -2,-21 -1,-27 -3,-25 -11,-21 -16").attr("style", "fill:black;stroke:white;stroke-width:1")

      return meteor
    })
    .subscribe((meteor) => {
      meteor.control
        .attr("transform", `translate(${0 + Math.random() * bounds.right - Math.floor(bounds.right / 2)} ${0}) rotate(${Math.floor(Math.random() * 360)})`)
        .attr('id', `meteor_${game.meteor_id++}`) // placed in subscribe() due to side effect of incrementing meteor_id

      move(meteor)
      METEORS.push(meteor)
    })

  /**
   * Creates 'n' smaller meteors in the location of the bigger meteor
   * for each small meteor created
   *  - call move() to allow the smaller meteor to move
   * Creation on this object could have been merged with create() function but most of its attributes are different so it was separated.
   * @param meteor The meteor that is being broken down to smaller parts
   */
  const meteorBreak = (meteor: Object) => (n: number): void => {
    const { x, y } = getTransformVals(meteor.control.attr('transform'))
    const meteor_small: Object = {
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
    }
    new Elem(svg, 'polygon', meteor_small.control.elem).attr("points", "-1 -20,9 -18,11 -6,16 -5,19 3,17 10,10 15,2 22,-9 18,-11 16,-10 12,-15 8,-21 -2,-11 -15").attr("style", "fill:black;stroke:white;stroke-width:1")

    move(meteor_small)
    METEORS.push(meteor_small)
    if (n > 1) meteorBreak(meteor)(n - 1)
  }



  // -----------------------------
  // ---------- Bullets ----------
  // -----------------------------

  /**
   * Creates a new bullet either for the enemy ship or player ship
   * @param object the origin of the bullet
   * @return the created bullet
   */
  const bulletCreate = (object: Object | Ship): Bullet => {
    const { x, y, angle } = getTransformVals(object.control.attr('transform'))
    const bullet = {
      radius: 2,
      x: x,
      y: y,
      angle: angle,
      control: new Elem(svg, 'g').attr('transform', `translate(${x} ${y}) rotate(${angle})`)
    }
    return bullet
  }

  /**
   * Removes the bullet
   * @param bullet bullet that needs to be removed
   * @param from enemy ship or player ship
   */
  const bulletRemove = (bullet: Bullet, from: string) => {
    bullet.control.elem.remove();
    if (from === "ship") ship.bullets++
  }

  /**
   * The collision detection for bullets with enemy ship, player ship, and meteors have been implemented in the bullets section of the code
   * so that there are less comparisons done for collisions compared to when the detection was on the meteors and the ships as the number of meteors
   * can build up and bullets have a shorter life time
   * 
   * Allows the movement of a bullet in the direction of the mouse pointer
   * Checks to see if the bullet has hit any meteors; if it has, remove both bullet and break down a big meteor or destroy a small meteor
   * @param bullet the bullet being fired with the left mouse click
   */
  const bulletMove = (bullet: Bullet, from: string): () => void =>
    resetObservable
      .map(() => getTransformVals(bullet.control.attr('transform')))
      .takeWhile((b_transform) => inScreen(b_transform.x, b_transform.y)) // only subscribe while the bullet is in the screen
      .map((b_transform) => ({
        x: Math.sin(toRad(Number(b_transform.angle))) * (from === "ship" ? 10 : 2) + b_transform.x,  // global constants could have been used for bullet speed variations to keep modifications simpler
        y: -Math.cos(toRad(Number(b_transform.angle))) * (from === "ship" ? 10 : 2) + b_transform.y, // but it is only used in this function, and having too many global constants may be overkill
        angle: b_transform.angle,
      }))
      .map(({ x, y, angle }) => ({
        x: mod(x, bounds.width + 500),
        y: mod(y, bounds.height + 500),
        angle: angle
      }))
      .subscribe(({ x, y, angle }) => {
        bullet.control.attr('transform', `translate(${x} ${y}) rotate(${angle})`) // move the bullet to the new x and y values

        // check if the bullet is outside the screen
        if (!inScreen(x, y)) {
          bulletRemove(bullet, from);
        }

        // Used curried function so that new functions can be made that has more meaningful variable names
        const bulletCollidingWith = detectCollision(bullet)

        // if an enemy bullet hits the player ship, calls onShipDeath() that resets the ship and decreases the life
        // if a player bullet hits a meteor or ship, award points and destroy meteor or ship
        if (from === "enemy") {
          (bulletCollidingWith(ship) && !ship.immune) ? onShipDeath() : 0
        }

        if (from === "ship") {
          METEORS.forEach((meteor, idx) => {
            if (bulletCollidingWith(meteor)) {
              const b_childs = bullet.control.elem.childNodes; while (b_childs.length > 0) b_childs[0].remove() // remove all relevant html code from the game regarding the bullet and meteor
              const m_childs = meteor.control.elem.childNodes; while (m_childs.length > 0) m_childs[0].remove()
              bullet.control.attr("transform", `translate(3000 3000) rotate(0)`) // Move the bullet off the screen so that it can be deleted straight away
              document.getElementById(`meteor_${String(METEORS.splice(idx, 1)[0].id)}`)!.remove() // remove the HTMLElement of the meteor and remove it from the meteors list

              ship.bullet.colour !== "blue" ? bulletRemove(bullet, "ship") : ship.bullets++

              if (meteor.type === "big") {
                meteorBreak(meteor)(3)
                game.meteor_count--
                game.score += 15 // big meteors award 15 extra points
              }
              game.score += 5

              meteor.type = "dead"
              updateText()
            }
          })
          ENEMIES.forEach((enemy, idx) => {
            if (bulletCollidingWith(enemy)) {
              const b_childs = bullet.control.elem.childNodes; while (b_childs.length > 0) b_childs[0].remove() // remove all relevant html code from the game regarding the bullet
              bullet.control.attr("transform", `translate(3000 3000) rotate(0)`) // Move the bullet off the screen so that it can be deleted straight away
              bulletRemove(bullet, "ship")

              // hp bar for enemies; if it runs out of hp, remove enemy
              if (enemy.hp > 1) {
                enemy.hp--
                new Elem(svg, 'rect', enemy.control.elem).attr("x", -20).attr('y', 30).attr('width', (4-enemy.hp)*10).attr('height', 5).attr('fill', 'red')
              } else {
                // show explosion effect and remove ship
                new Elem(svg, 'polygon', enemy.control.elem).attr("points", "3 -16,17 -23,9 -4,34 -6,19 8,48 28,14 22,14 37,0 20,-13 39,-10 14,-38 -8,-10 -4,-8 -39").attr("style", "fill:red;stroke:orange;")
                setTimeout(() => {
                  const e_childs = enemy.control.elem.childNodes; while (e_childs.length > 0) e_childs[0].remove()
                  document.getElementById(`enemy_${String(ENEMIES.splice(idx, 1)[0].id)}`)!.remove() // remove the HTMLElement of the meteor and remove it from the meteors list
                  clearInterval(Number(enemy.type))
                  enemy.type = "dead"

                  game.score += 30
                  game.enemy_count--
                }, 30)
              }
              updateText()
            }
          })

        }
      })

  // On left mouse click:
  // - fire a bullet in the direction the ship is facing
  // On bullet and meteor collision:
  // - destroy both bullet and meteor
  mousedown
    .filter(({ which }) => which === 1 && ship.bullets > 0 && !ship.immune) // If user left clicks and ship is not immobile and not immune
    .map(() => {
      const bullet = bulletCreate(ship)
      bullet.control.attr('id', "bullet")
      new Elem(svg, 'circle', bullet.control.elem).attr("cx", "0").attr("cy", "0").attr("r", String(ship.bullet.radius)).attr("style", `fill:${translateColour(ship.bullet.colour)};`)

      return bullet
    })
    .subscribe((bullet) => {
      bulletMove(bullet, "ship")
      ship.bullets--
    })



  // --------------------------
  // ---------- Ship ----------
  // --------------------------

  // On 'right mouse' click:
  // - start moving the ship forward
  // - give a speed boost to ship
  // - decrement the boost count on ship
  // - add a boost visual using svg
  mousedown
    .filter(({ which }) => which === 3 && !ship.immune && ship.speed_boost == 0 && ship.boosts > 0) // If user right clicks and ship is not immobile and not immune; can only boost once at a time and when boost is available
    .subscribe(() => {
      ship.accel = 400; ship.speed_boost = 140; ship.boosts--
      new Elem(svg, 'polygon', ship.control.elem).attr("points", "16 25,10 60,7 39,5 55,-1 27,-7 59,-15 25").attr("style", "fill:red;").attr('id', 'boost')
      updateText()
    })

  // On mousemove:
  // - makes the ship face the mouse pointer
  mousemove
    .filter(() => !ship.immobile && ship.lives > 0)
    .map(({ clientX, clientY }) => ({ // Get the x and y values of the mouse pointer
      x: clientX - bounds.left,
      y: clientY - bounds.top,
      s: getTransformVals(ship.control.attr('transform'))
    }))
    .map(({ x, y, s }) => ({ angle: toDeg(Math.atan2(y - s.y, x - s.x)) + 90, s: s })) // Find the angle using trigonometry
    .map(({ angle, s }) => ({ angle: angle > 0 ? angle : angle + 360, s: s })) // Wrap around angle for values between 3*PI/2 to 2PI as they are shown in negative values
    .subscribe(({ angle, s }) => {
      ship.control.attr('transform', `translate(${s.x} ${s.y}) rotate(${angle})`)
      ship.angle = angle
    })

  // On 'w' press:
  // - allow the ship to move by setting ship.move to true
  // - set the deceleration of the ship to 300 as long as the key is pressed
  keydown
    .filter(({ key }) => key === "w" && !ship.immobile)
    .subscribe(() => { ship.move = true; })

  // On 'w' release:
  // - allow the ship to (slowly) stop moving
  keyup
    .filter(({ key }) => key === "w")
    .subscribe(() => { ship.move = false })

  // Ship moves forward in the direction of the mouse pointer
  // velX, velY are used to enable inertia for acceleration and deceleration of ship
  resetObservable
    .filter(() => ship.move || ship.accel > 0)
    .map(() => {
      const angle = toRad(getTransformVals(ship.control.attr('transform')).angle + 90)
      if (ship.speed_boost > 0) ship.accel = 200
      return ({
        vx: ship.velX + Math.cos(angle) * 0.1 * (ship.accel / (190 - ship.speed_boost)),
        vy: ship.velY + Math.sin(angle) * 0.1 * (ship.accel / (190 - ship.speed_boost))
      })

    })
    .subscribe(({ vx, vy }) => {
      const s_transform = getTransformVals(ship.control.attr('transform'))
      ship.velX = vx * 0.98; ship.velY = vy * 0.98 // Applies friction towards the velocity
      ship.control.attr('transform', `translate(${mod(s_transform.x - vx, bounds.right)} ${mod(s_transform.y - vy, bounds.bottom)}) rotate(${s_transform.angle})`)
      ship.accel = (ship.move && ship.accel < 200) ? ship.accel + 4 : ship.accel - 2 // handles acceleration and deceleration of ship
      ship.speed_boost > 0 ? ship.speed_boost -= 0.5 : document.getElementById('boost') ? document.getElementById('boost')!.remove() : 0 // removes speed boost svg effect and decrements speed_boost factor
    })

  // Reset the ship's velX and velY once the ship has almost stopped so that the ship is not affected by the previous inertia values 
  resetObservable
    .filter(() => !ship.move && ship.accel < 10)
    .subscribe(() => {
      ship.velX = 0
      ship.velY = 0
    })

  // Ship collision with meteor, enemy, or item:
  // - decrement the ship's life by 1
  // - give the ship an immune state for a few seconds
  // - reset ship's location
  // - if the ship has no more lives, end game
  resetObservable
    .filter(() => !ship.immune)
    .subscribe(() => {
      // Used curried function so that new functions can be made that has more meaningful variable names
      const shipCollidingWith = detectCollision(ship)

      METEORS.forEach((meteor) => { if (shipCollidingWith(meteor)) onShipDeath() })
      ENEMIES.forEach((enemy) => { if (shipCollidingWith(enemy)) onShipDeath() })
      ITEMS.forEach((item, idx) => {
        if (shipCollidingWith(item)) {
          const i_childs = item.control.elem.childNodes; while (i_childs.length > 0) i_childs[0].remove() // remove all relevant html code from the game regarding the item
          document.getElementById(`item_${String(ITEMS.splice(idx, 1)[0].id)}`)!.remove() // remove the HTMLElement of the item and remove it from the items list
          ship.bullet.colour = item.type

          // Specify the item effects for the green and blue items
          // Green: increase max_bullets
          // Blue: increase bullet radius
          if (item.type === "green") {
            if (ship.bullet.colour === "green") game.max_bullets = game.max_bullets += 2; ship.bullets += 2;
            ship.bullet.radius = 2
          }
          if (item.type === "blue") {
            if (ship.bullet.colour === "blue") ship.bullet.radius += 2
            game.max_bullets = 1; ship.bullets = ship.bullets === 0 ? 0 : 1;
          }
          ship_shape.attr("style", `fill:black;stroke:${translateColour(ship.bullet.colour)};stroke-width:1`)
          game.item_count--
          item.type = "dead"
        }
      })
    })
}



// the following simply runs your asteroids function on window load.  Make sure to leave it in place.
if (typeof window != 'undefined')
  window.onload = () => {
    asteroids();
  }




