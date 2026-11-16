(function (root) {
  'use strict';

  // The same dimensions and finishes drive the worn item and its evidence illustration.
  const gear = {
    glasses: [
      {w:.069,h:.043,curve:.76,rim:.0045}, {w:.070,h:.042,curve:.51,rim:.009},
      {w:.061,h:.053,curve:1,rim:.0032}, {w:.070,h:.048,curve:.88,rim:.004,drop:.012},
      {w:.071,h:.042,curve:.82,rim:.005,lift:.015}, {w:.071,h:.032,curve:.68,rim:.0035}
    ],
    watch: [
      {w:.044,h:.041,curve:.46,n:24}, {w:.045,h:.045,curve:1,n:28},
      {w:.051,h:.032,curve:.48,n:24}, {w:.028,h:.050,curve:.72,n:24},
      {w:.047,h:.043,curve:1,n:8}, {w:.038,h:.050,curve:1,n:28}
    ],
    eraser: [
      {w:.072,d:.035,h:.032,curve:.27}, {w:.059,d:.040,h:.035,curve:1},
      {w:.060,d:.050,h:.032,outline:[[-1,.69],[-.94,.95],[.88,.95],[1,.76],[.19,-.92],[-.04,-1]]},
      {w:.073,d:.036,h:.033,outline:[[-1,.80],[-.91,1],[.51,1],[1,-.80],[.90,-1],[-.54,-1]]},
      {w:.049,d:.046,h:.038,outline:[[-1,0],[-.55,1],[.55,1],[1,0],[.55,-1],[-.55,-1]]},
      {w:.080,d:.027,h:.031,curve:.61}
    ],
    finishes: {
      glasses:['#343039','#af8d5c','#5b7880'],
      watch:['#455762','#996d4c','#697d64'],
      eraser:['#a7cebd','#e4a49b','#bcb3d6']
    },
    lensLines:['조건을 먼저 읽고','두 값을 비교한 뒤','작은 쪽을 고른다.'],
    cueBase:3.05,
    lensPoint(spec,side,angle) {
      const c=Math.cos(angle),s=Math.sin(angle);
      const x=Math.sign(c)*Math.pow(Math.abs(c),spec.curve);
      const y=Math.sign(s)*Math.pow(Math.abs(s),spec.curve);
      return [spec.w*x,spec.h*y+(spec.lift||0)*Math.max(0,side*x)**2-(spec.drop||0)*(1-side*x)*.46];
    },
    dialPoint(spec,angle) {
      const power=x=>Math.sign(x)*Math.pow(Math.abs(x),spec.curve);
      return [spec.w*power(Math.cos(angle)),spec.h*power(Math.sin(angle))];
    }
  };
  for(const spec of gear.eraser){
    if(!spec.outline){
      const rounded=v=>Math.sign(v)*Math.pow(Math.abs(v),spec.curve);
      spec.outline=Array.from({length:32},(_,i)=>{
        const a=-i*Math.PI/16;return [rounded(Math.cos(a)),rounded(Math.sin(a))];
      });
    }
  }
  root.ExamGear=gear;

  const bodyParts = ['glasses', 'ear', 'watch', 'button', 'eraser'];
  const seatCounts = [2, 3, 5, 7, 9];
  const penaltyMs = 5000;

  function newSeed() {
    const words = new Uint32Array(2);
    if (root.crypto?.getRandomValues) root.crypto.getRandomValues(words);
    else { words[0] = Date.now(); words[1] = Math.floor(Math.random() * 4294967296); }
    return 'p-' + Array.from(words, n => n.toString(36)).join('-');
  }

  function seededRandom(seed) {
    let state = 2166136261;
    for (const character of seed) state = Math.imul(state ^ character.charCodeAt(0), 16777619);
    return function () {
      state = (state + 0x6d2b79f5) | 0;
      let mixed = Math.imul(state ^ (state >>> 15), state | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(list, random) {
    const result = list.slice();
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function buildSeats(seed, level) {
    const random = seededRandom(seed + '|' + level);
    const paletteRandom = seededRandom(seed + '|finishes|' + level);
    const pick = count => Math.floor(random() * count);
    const looks = shuffle(Array.from({length:12}, (_,i)=>i), random);
    const tutorial = shuffle(bodyParts,random);
    const count=seatCounts[level-1], roles=seededRandom(seed+'|roles|'+level);
    const casting=seededRandom(seed+'|classmate|'+level);
    const animalSeat=Math.floor(casting()*count),species=['cat','dog','bear'][Math.floor(casting()*3)];
    const innocentCount=Math.min(count-1,1+Math.floor(roles()*2));
    const innocent=new Set(shuffle(Array.from({length:count},(_,i)=>i),roles).slice(0,innocentCount));
    const seats=Array.from({length:count}, (_,i) => {
      const evidence = level === 1 ? tutorial[i] : bodyParts[pick(5)];
      const others = shuffle(bodyParts.filter(t=>t!==evidence),random);
      const extras = level === 1 ? 1 : Math.min(4,1+pick(level));
      const points = shuffle([evidence,...others.slice(0,extras)],random).map(type=>({
        type, positive:!innocent.has(i)&&type===evidence, style:pick(gear[type]?.length||3),
        finish:gear.finishes[type] ? Math.floor(paletteRandom()*gear.finishes[type].length) : 0, checked:false
      }));
      const cuePeriod=gear.cueBase+random()*.55;
      return {id:i+1, species:i===animalSeat?species:null, appearance:looks[i], wardrobe:pick(12), cuePeriod,cueOffset:random()*cuePeriod,
        answer:1+pick(5), points, status:'open'};
    });
    if(casting()<.34){
      const runners=seats.filter(s=>!s.species&&!s.points.some(p=>p.positive&&p.type==='button'));
      if(runners.length){
        const runner=runners[Math.floor(casting()*runners.length)];
        runner.outfit='runner';
        runner.points=runner.points.filter(p=>p.type!=='button');
      }
    }
    return seats;
  }

  function clockNow() {
    return typeof performance === 'undefined' ? Date.now() : performance.now();
  }

  class ExamGame {
    static get PENALTY_MS() { return penaltyMs; }
    static get MAX_LEVEL() { return seatCounts.length; }
    static newSeed() { return newSeed(); }

    constructor(seed = newSeed(), level = 1) {
      const requested = Math.trunc(Number(level));
      this.level = Number.isFinite(requested) ? Math.max(1, Math.min(seatCounts.length, requested)) : 1;
      this.seed = String(seed);
      this.seats = buildSeats(this.seed, this.level);
      this.targetCount = this.seats.filter(seat => seat.points.some(point => point.positive)).length;
      this.pointCount = this.seats.reduce((total, seat) => total + seat.points.length, 0);
      this.duration = this.level === 1 ? 90000 : 60000;
      this.phase = 'ready';
      this.endReason = null;
      this.mistakes = 0;
      this.activeSince = null;
      this.bankedMs = 0;
      this.nextInspectionAt = 0;
    }

    get caught() { return this.seats.filter(seat => seat.status === 'caught').length; }
    get cleared() { return this.seats.filter(seat => seat.status === 'clear').length; }
    get completed() { return this.caught + this.cleared; }
    get inspected() {
      return this.seats.reduce((sum, seat) => sum + seat.points.filter(point => point.checked).length, 0);
    }

    elapsed(now = clockNow()) {
      const active = this.activeSince === null ? 0 : Math.max(0, now - this.activeSince);
      const total = this.bankedMs + active;
      return this.duration === null ? total : Math.min(total, this.duration);
    }

    remaining(now = clockNow()) {
      return this.duration === null ? null : this.duration - this.elapsed(now);
    }

    start(now = clockNow()) {
      if (this.phase !== 'ready') return false;
      this.phase = 'playing';
      this.activeSince = now;
      return true;
    }

    finish(reason, now) {
      this.bankedMs = this.elapsed(now);
      this.activeSince = null;
      this.endReason = reason;
      this.phase = 'ended';
    }

    tick(now = clockNow()) {
      if (this.phase === 'playing' && this.remaining(now) === 0) this.finish('timeout', now);
      return this.phase;
    }

    pause(now = clockNow()) {
      if (this.tick(now) !== 'playing') return false;
      this.bankedMs = this.elapsed(now);
      this.activeSince = null;
      this.phase = 'paused';
      return true;
    }

    resume(now = clockNow()) {
      if (this.phase !== 'paused') return false;
      this.phase = 'playing';
      this.activeSince = now;
      return true;
    }

    inspect(id, type, now = clockNow(), nearbyId = null) {
      const seat = this.seats.find(candidate => candidate.id === id);
      const response = (kind, completed = false) => ({
        kind, id, type, completed, status: seat ? seat.status : null
      });
      if (this.tick(now) !== 'playing' || !seat) return response('inactive');
      if (nearbyId !== id) return response('far');
      if (seat.status !== 'open') return response('repeat');
      if (!bodyParts.includes(type)) return response('inactive');
      if (now < this.nextInspectionAt) return response('busy');
      this.nextInspectionAt = now + 650;
      const evidence = seat.points.find(point => point.type === type && point.positive);
      if (!evidence) {
        this.mistakes++;
        this.bankedMs += penaltyMs;
        this.tick(now);
        return response('wrong');
      }
      evidence.checked = true;
      seat.status = 'caught';
      if (this.caught === this.targetCount) this.finish('clear', now);
      return response('evidence', true);
    }

    summarize(now = clockNow()) {
      this.tick(now);
      return {
        seed: this.seed, level: this.level, phase: this.phase, endReason: this.endReason,
        caught: this.caught, cleared: this.cleared, completed: this.completed,
        inspected: this.inspected, mistakes: this.mistakes, elapsedMs: this.elapsed(now),
        remainingMs: this.remaining(now), duration: this.duration, targetCount: this.targetCount,
        seatCount: this.seats.length, pointCount: this.pointCount
      };
    }
  }

  root.ExamGame = ExamGame;
  if (typeof module === 'object' && module.exports) module.exports = ExamGame;
})(globalThis);
