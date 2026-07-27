/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  DRDD DIPE CITY — AssetManager.js  (v16.6.0)                     ║
 * ║  Load order:  three.min.js → AssetManager.js → Factory.js        ║
 * ║                                                                  ║
 * ║  WHAT IT DOES                                                    ║
 * ║  • window.Assets — the GLB character-model pipeline:             ║
 * ║      – Loads .glb files from the assets/ folder next to the HTML ║
 * ║      – Uses the OFFICIAL three.js GLTFLoader (r160): fetched at  ║
 * ║        runtime and re-wired onto the game's global THREE via     ║
 * ║        blob modules — NO second copy of three.js is loaded.      ║
 * ║        (Verified: all 65 symbols the loader imports exist in     ║
 * ║        the UMD build.)                                           ║
 * ║      – Caches each model once; every spawn gets a fresh clone,   ║
 * ║        auto-normalized to game scale (see MANIFEST heights)      ║
 * ║  • Placeholders remain the permanent fallback: any missing file, ║
 * ║    network problem, or loader failure = that character keeps its ║
 * ║    Factory placeholder. The game NEVER breaks over assets.       ║
 * ║                                                                  ║
 * ║  HOW TO ACTUALLY USE YOUR GLB MODELS (3 steps)                   ║
 * ║   1. Make a folder called  assets  next to the game HTML and     ║
 * ║      put your .glb files in it, named as in MANIFEST below       ║
 * ║      (or edit the file names in MANIFEST to match yours).        ║
 * ║   2. In Factory.js (top of file) set:                            ║
 * ║        window.USE_PLACEHOLDERS = false;                          ║
 * ║   3. Serve the game over http, not file:// — browsers block      ║
 * ║      local file reads. Easiest options: VS Code "Live Server",   ║
 * ║      or in a terminal:  python -m http.server  (then open        ║
 * ║      http://localhost:8000), or upload to itch.io.               ║
 * ║      On file:// this manager detects the situation, logs it to   ║
 * ║      diagnostics, and quietly stays on placeholders.             ║
 * ║                                                                  ║
 * ║  TUNING A MODEL: each MANIFEST entry:                            ║
 * ║    file    the .glb file name inside assets/                     ║
 * ║    height  target in-game height (model auto-scaled to this)    ║
 * ║    y       extra vertical offset after grounding (default 0)     ║
 * ║    rotY    extra Y rotation in radians (default 0, use if the    ║
 * ║            model faces the wrong way)                            ║
 * ║    swap    false = character's animation code reaches into       ║
 * ║            specific parts (see its 'why'); its GLB is NOT        ║
 * ║            auto-swapped until an adapter session wires it up.    ║
 * ║  KNOWN LIMITS (for now): Draco-compressed GLBs are not           ║
 * ║  supported (re-export without compression); skinned/rigged      ║
 * ║  models display statically (rig animation is a later phase).     ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */
(function () {
  'use strict';

  // ── THE MANIFEST — the one place to edit when adding models ────────────────
  // Keys match Factory function names exactly. Missing files are fine: that
  // character just keeps its placeholder (one summary line in diagnostics).
  // ── MANIFEST ───────────────────────────────────────────────────────────────
  // Per-character asset spec. Fields:
  //   file      required — exact filename in assets/ (CASE-SENSITIVE on GitHub
  //             Pages: 'Roadstumbler.glb' will NOT load as 'roadstumbler.glb')
  //   height    the model is normalised to this before anything else. Note
  //             that for characters that swap through Factory's wGLB this is
  //             then overridden by the fit-to-placeholder pass (V16.3.0) — it
  //             still matters for the Dipe Fighter rig and as a fallback.
  //   y         optional extra vertical offset after grounding
  //   rotY      V16.6.0 — degrees about Y, applied BEFORE measuring. Use when
  //             a character's procedural build faces the opposite way to the
  //             models (the _chase variants do). Applied to the model itself,
  //             so game code stays free to assign group.rotation.y.
  //   rotX      V16.5.0 — degrees about X, applied BEFORE measuring, for a
  //             model exported lying down. A warning is logged automatically
  //             if a delivered file looks lying-down and has no rotX set.
  //   fitScale  V16.3.0 — multiplier on the fit-to-placeholder size, default 1.
  //             Use this to nudge ONE character that reads too big or small
  //             without touching any other.
  //   material  V16.4.0 — override any of {metalness, roughness,
  //             emissiveIntensity, envMapIntensity} for this character only.
  //             Defaults live in MATERIAL_DEFAULT above.
  //   swap      false pins the character to its procedural placeholder
  //   load      true loads the file anyway even when swap is false
  //   why       plain-English note explaining a swap:false
  var MANIFEST = {
    playerDRDD:              { file: 'drdd.glb',          height: 2.0, swap:false, load:true, why:'auto-swap off — the player rig system adopts this model itself (adoptPlayerGLB in the game) and drives its animation clips' },
    // V16.6.0: the Frogger player reuses the main DRDD model. Its procedural
    // build already faces +Z like the model, so no rotY is needed.
    characterDRDDFrogTop:    { file: 'drdd.glb',          height: 2.0 },
    characterDipeGenie:      { file: 'genie.glb',         height: 3.0 },
    characterMicFlex:        { file: 'micflex.glb',       height: 2.0, rotX:90 },  // V16.5.0: exported lying down
    // V16.6.0: swap ENABLED — the ceremony's rage tint now recolours through
    // the model's own material (see _mfSetRage), so the bodyMesh contract no
    // longer needs the procedural build. Shares micflex.glb.
    characterMicFlexDurag:   { file: 'micflex.glb',       height: 2.0, rotX:90 },
    characterDuragDada:      { file: 'duragdada.glb',     height: 2.1 },
    // V16.5.0: the durag variant has no file of its own; the base model
    // carries the same body, so both entries share duragdada.glb.
    characterDuragDadaDurag: { file: 'duragdada.glb',     height: 2.1 },
    enemyStooge_Moe:         { file: 'stooge_moe.glb',    height: 1.9, swap:false, why:'walk cycle needs userData.legPivots' },
    enemyStooge_Larry:       { file: 'stooge_larry.glb',  height: 1.9, swap:false, why:'walk cycle needs userData.legPivots' },
    enemyStooge_Curly:       { file: 'stooge_curly.glb',  height: 1.9, swap:false, why:'walk cycle needs userData.legPivots' },
    enemyDuragStooge:        { file: 'stooge_durag.glb',  height: 1.9 },
    enemyOztrich:            { file: 'oztrich.glb',       height: 2.6, rotX:90 },  // V16.5.0: exported lying down
    enemyOztrichChase:       { file: 'oztrich.glb',       height: 2.6, rotX:90, rotY:180 },  // V16.5.0 / V16.6.0
    // V16.2.0: the delivered file is named pigeon.glb (the code has always
    // spelled him 'Pidgin'). Both the world and chase entries use the one file
    // — it is the same character, and it now carries its own animation clips.
    enemyPidgin:             { file: 'pigeon.glb',        height: 1.4 },
    enemyPidginChase:        { file: 'pigeon.glb',        height: 1.4, rotY:180 },  // V16.6.0: chase builds face -Z
    enemySeagle:             { file: 'seagle.glb',        height: 1.5, rotX:90 },  // V16.5.0: exported lying down
    enemySeagleChase:        { file: 'seagle.glb',        height: 1.5, rotX:90, rotY:180 },  // V16.5.0 / V16.6.0
    enemyRoadstumbler:       { file: 'roadstumbler.glb',  height: 3.0 },
    enemyRoadstumblerBoss:   { file: 'roadstumbler.glb',  height: 3.0 },
    enemyKakapoo:            { file: 'kakapoo.glb',       height: 1.6 },
    enemyKakapooFrog:        { file: 'kakapoo.glb',       height: 1.6 },
    enemyPootoo:             { file: 'pootoo.glb',        height: 1.6 },
    enemyPootooFrog:         { file: 'pootoo.glb',        height: 1.6 },
    enemyGobbler:            { file: 'gobbler.glb',       height: 1.8 },
    enemyDooDoo:             { file: 'doodoo.glb',        height: 1.2 },
    enemyMotoStooge:         { file: 'moto_stooge.glb',   height: 1.7, swap:false, why:'wheel spin rotates children[2]/[3]' },
    enemyFatStooge:          { file: 'fat_stooge.glb',    height: 2.3, swap:false, why:'HP gems found via getObjectByName hpgem0/1' },
    enemyDodoBird:           { file: 'dodo.glb',          height: 2.4, swap:false, why:'squash anim needs userData.bodyMesh' },
    enemyJoeLBossHead:       { file: 'joel_head.glb',     height: 4.5 }
  };
  // ── SEMANTIC CLIP MAPS (V16.1.0) ───────────────────────────────────────────
  // A GLB's clip names are whatever the animator called them, so the game
  // cannot guess. Name-guessing is actively DANGEROUS here: substring matching
  // "walk" against drdd.glb picks Stage_Walk, which travels 4.75m of ROOT
  // MOTION per cycle — the model would slide away from the position the game
  // thinks it is at. Every clip below was measured for root drift and only
  // in-place clips are used for looping states.
  //
  // Keys are GAME STATES, values are exact clip names inside that .glb.
  //   idle walk run jump land crouch block punch punch2 kick lowkick
  //   special hit ko death   (+ boss states: lockon charge tripped stumble)
  // A missing state is not an error — the caller falls back (see A.animator).
  // To retune, change one string; nothing else needs to move.
  var CLIPS = {
    playerDRDD: {
      // NOTE: drdd.glb has NO in-place idle clip. 'idle' is deliberately absent
      // for world levels so the player keeps the V13.10.1 step-bob at rest.
      // 'fightIdle' is used only in Dipe Fighter, where a bouncing guard
      // stance is correct (Hop_with_Arms_Raised drifts 0.0045 units — in place).
      fightIdle:'Hop_with_Arms_Raised',
      walk:'Walking', run:'Running', jump:'Regular_Jump',
      block:'Block2', punch:'Left_Short_Hook_from_Guard',
      punch2:'Left_Uppercut_from_Guard', kick:'Step_in_High_Kick',
      lowkick:'Step_in_High_Kick', special:'baseball_pitching',
      ko:'Dead', death:'Dead'
      // 'hit' intentionally unmapped: the only candidate (Male_Head_Down_Charge)
      // travels 2.9m. Unmapped states hold the previous clip, which reads fine.
    },
    characterDipeGenie: {
      idle:'Idle_3', fightIdle:'Idle_3',
      walk:'Walking', run:'Running', jump:'Regular_Jump',
      block:'Block9', punch:'Left_Hook_from_Guard',
      punch2:'Right_Uppercut_from_Guard',
      kick:'Axe_Spin_Attack',        // Rising_Flying_Kick travels 1.9m — not used
      lowkick:'Axe_Spin_Attack', special:'Thrust_Slash',
      ko:'Dead', death:'Dead'
      // 'crouch' unmapped: Cautious_Crouch_Walk_Forward travels 1.76m.
    },
    enemyRoadstumbler: {
      idle:'Dozing_Elderly', fightIdle:'Dozing_Elderly',
      walk:'Slow_Orc_Walk', run:'Running',
      block:'Block4', punch:'Right_Hand_Sword_Slash',
      punch2:'Right_Hand_Sword_Slash', kick:'Skill_01',
      lowkick:'Skill_01', special:'High_Kick',
      hit:'BeHit_FlyUp', ko:'Shot_and_Fall_Forward', death:'Shot_and_Fall_Forward',
      // boss2 state machine (RS.state) — see updateRoadstumbler()
      lockon:'Arise', charge:'RunFast', tripped:'Shot_and_Fall_Forward',
      stumble:'Unsteady_Walk', getup:'Stand_Up4'
      // Stumble_Walk (3.2m), Lunge_Roundhouse_Kick (1.5m) and
      // Male_Head_Down_Charge (2.7m) all travel — the game moves him itself,
      // so using them would double up the motion. Deliberately unused.
    },
    enemyGobbler: {
      // gobbler.glb has no idle clip; Block9 is a settled guard stance and
      // reads correctly as "standing ready" in both the world and the arena.
      idle:'Block9', fightIdle:'Block9',
      walk:'Walking', run:'Running', jump:'Regular_Jump',
      block:'Block9', punch:'Left_Jab_from_Guard',
      punch2:'Right_Jab_from_Guard', kick:'Kick_a_Soccer_Ball',
      lowkick:'Kick_a_Soccer_Ball', special:'Kick_a_Soccer_Ball',
      ko:'Dead', death:'Dead'
    }
  };
  CLIPS.enemyRoadstumblerBoss = CLIPS.enemyRoadstumbler;   // same .glb, same clips

  // ── V16.2.0: the bird/critter four ─────────────────────────────────────────
  // Same 24-bone skeleton as the V16.1.0 set. Drift measured per clip again;
  // distances below are metres of travel per play (model ≈1.6–1.7m tall).
  CLIPS.enemyPidgin = {
    idle:'Look_Around_Dumbfounded',   // 0.6mm drift — a real idle, finally
    fightIdle:'Block8', walk:'Walking', run:'Running',
    crouch:'CrouchLookAroundBow',
    block:'Block8', punch:'Left_Hook_from_Guard', punch2:'Shield_Push_Left',
    kick:'Kick_a_Soccer_Ball', lowkick:'Kick_a_Soccer_Ball',
    special:'mage_soell_cast_4',      // reads as his Coocoustic Chaos cast
    taunt:'Shield_Push_Left',         // the Rufflin' dust-up
    charge:'Running', return:'Walking'
    // Jump_with_Arms_Open travels 2.42m — excluded, so 'jump' is unmapped.
    // No death clip in this file; 'ko' falls through and holds the pose.
  };
  CLIPS.enemyPidginChase = CLIPS.enemyPidgin;              // same .glb

  CLIPS.enemyPootoo = {
    idle:'Two_Handed_Parry', fightIdle:'Two_Handed_Parry',
    walk:'Walking', run:'Running',
    jump:'Jump_with_Arms_and_Legs_Open',   // 3mm drift — genuinely in place
    fly:'Jump_with_Arms_and_Legs_Open',    // spread-eagle: reads as gliding
    block:'Two_Handed_Parry',
    punch:'Charged_Upward_Slash', punch2:'Charged_Upward_Slash',
    kick:'Leg_Sweep', lowkick:'Leg_Sweep',      // 19cm lunge — fine for a sweep
    special:'FunnyDancing_01',
    ko:'Electrocuted_Fall', death:'Electrocuted_Fall'
    // FunnyDancing_01 drifts 17cm per 7.8s loop, so it is a one-shot special
    // only — never an idle, or he would creep across the arena.
  };
  CLIPS.enemyPootooFrog = CLIPS.enemyPootoo;               // same .glb

  CLIPS.enemyKakapoo = {
    idle:'Block2', fightIdle:'Block2', walk:'Walking', run:'Running',
    block:'Block2',
    punch:'Punch_Forward_with_Both_Fists', punch2:'Punch_Forward_with_Both_Fists',
    kick:'Sweeping_Kick', lowkick:'Sweeping_Kick',
    special:'Punch_Forward_with_Both_Fists',
    taunt:'Confused_Scratch',          // used only as a ~0.5s beat, see below
    ko:'Knock_Down', death:'Knock_Down'
    // Confused_Scratch drifts 9cm over its full 11.5s, so it is never looped
    // as an idle — only played in short bursts where the drift can't build up.
  };
  CLIPS.enemyKakapooFrog = CLIPS.enemyKakapoo;             // same .glb

  // ── V16.5.0: MicFlex, Durag Dada, Seagle, Oztrich ─────────────────────────
  // Same 24-bone skeleton again. Drift measured as before; several of these
  // files also contain UUID-named clips (019fa185-…) which are unlabelled
  // exporter leftovers — deliberately unmapped, since there is no way to know
  // what they are meant to depict.
  //
  // NOTE ON 'fightIdle'. Its presence is what switches a character to clip
  // mode in Dipe Fighter (see buildGLBRig). Three of these four are given NO
  // fightIdle ON PURPOSE: they simply do not ship a usable attack set, and the
  // procedural posing they already have gives them distinct punches, kicks and
  // blocks driven by the fight engine. Swapping that for one clip replayed for
  // every move would be a downgrade. They still animate fully in the world
  // levels, where idle/walk/run is all that is asked of them.
  CLIPS.characterMicFlex = {
    idle:'Idle_03', walk:'Walking', run:'Running',
    special:'Proud_Strut'
    // No fightIdle: micflex.glb has no block/punch/kick clips at all.
    // run_fast_7 is excluded — its hips spike to ~13x standing height on one
    // frame, which reads as a glitch rather than a run.
  };

  CLIPS.characterDuragDada = {
    idle:'Block2', fightIdle:'Block2',      // no idle clip; a settled guard reads as "ready"
    walk:'Walking', run:'Running', jump:'Jump_with_Arms_and_Legs_Open',
    block:'Block2',
    punch:'Left_Hook_from_Guard', punch2:'Left_Hook_from_Guard',
    kick:'Sweeping_Kick', lowkick:'Sweeping_Kick',
    special:'Not_Your_Mom',
    ko:'Shot_and_Slow_Fall_Backward', death:'Shot_and_Slow_Fall_Backward'
    // The only one of these four with a real fighting set, so the only one
    // switched to clip mode in the arena.
    // run_fast_6 travels 1.84m per play — excluded.
  };
  CLIPS.characterDuragDadaDurag = CLIPS.characterDuragDada;   // same .glb
  CLIPS.characterMicFlexDurag   = CLIPS.characterMicFlex;     // same .glb (V16.6.0)
  CLIPS.characterDRDDFrogTop    = CLIPS.playerDRDD;           // same .glb (V16.6.0)

  CLIPS.enemySeagle = {
    idle:'Look_Around_Dumbfounded', walk:'Walking', run:'Running',
    punch:'Charged_Upward_Slash', special:'Charged_Upward_Slash',
    dive:'Charged_Upward_Slash', return:'Running',   // chase-level states
    ko:'Knock_Down_1', death:'Knock_Down_1'
    // No fightIdle: one attack clip only. Knock_Down_1 travels 0.49m, which is
    // correct for a knockdown but makes it a one-shot only.
  };
  CLIPS.enemySeagleChase = CLIPS.enemySeagle;                 // same .glb

  CLIPS.enemyOztrich = {
    idle:'Mirror_Viewing', walk:'Walking', run:'Running',
    jump:'Regular_Jump',
    charge:'RunFast', return:'Walking',              // chase-level states
    ko:'Shot_and_Fall_Forward', death:'Shot_and_Fall_Forward'
    // No fightIdle: the only attack is Flying_Fist_Kick, which lunges 1.38m.
    // The fight engine does not move the fighter, so the model would slide a
    // metre and a half forward then snap back. Block10 also travels 0.20m.
    // Both excluded; his procedural fighting stays.
  };
  CLIPS.enemyOztrichChase = CLIPS.enemyOztrich;               // same .glb

  CLIPS.enemyDooDoo = {    idle:'Look_Around_Dumbfounded', fightIdle:'Look_Around_Dumbfounded',
    walk:'Walking', run:'Running',
    block:'Block8',
    punch:'Charged_Upward_Slash', punch2:'Charged_Upward_Slash',
    kick:'Boxing_Guard_Right_Straight_Kick', lowkick:'Boxing_Guard_Right_Straight_Kick',
    special:'Charged_Upward_Slash',
    ko:'Shot_and_Fall_Backward', death:'Shot_and_Fall_Backward'
  };

  var PATH = 'assets/';
  var CDN  = 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/';

  var A = {};
  var loader = null;
  var skeletonClone = null;   // SkeletonUtils.clone, if the fetch succeeded
  var cache = {};        // key → normalized template Object3D
  var failedBoot = false;
  var booted = false;
  var skinWarned = false;

  function diag(kind, msg) {
    try { if (window.__DIAG) window.__DIAG.push(kind, ['[Assets] ' + msg]); } catch (e) {}
    try { console[kind === 'error' ? 'error' : (kind === 'warn' ? 'warn' : 'log')]('[AssetManager.js] ' + msg); } catch (e) {}
  }

  // ── Bootstrap the OFFICIAL GLTFLoader onto the global THREE ────────────────
  // r148+ ships loaders as ES modules importing from 'three'. We fetch the
  // official sources, generate a shim module that re-exports every property of
  // the already-loaded global THREE, rewrite the loader's import specifiers to
  // point at that shim (blob URLs), and dynamic-import the result. One THREE.
  function bootstrapLoader() {
    var names = Object.keys(window.THREE).filter(function (n) { return /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(n); });
    var shimSrc = 'var T = window.THREE;\n' + names.map(function (n) { return 'export var ' + n + ' = T.' + n + ';'; }).join('\n');
    var shimUrl = URL.createObjectURL(new Blob([shimSrc], { type: 'text/javascript' }));
    function fetchText(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + u); return r.text(); }); }
    return fetchText(CDN + 'utils/BufferGeometryUtils.js').then(function (bgu) {
      bgu = bgu.replace(/from\s+['"]three['"]/g, "from '" + shimUrl + "'");
      var bguUrl = URL.createObjectURL(new Blob([bgu], { type: 'text/javascript' }));
      return fetchText(CDN + 'loaders/GLTFLoader.js').then(function (src) {
        src = src.replace(/from\s+['"]three['"]/g, "from '" + shimUrl + "'")
                 .replace(/from\s+['"][^'"]*BufferGeometryUtils\.js['"]/g, "from '" + bguUrl + "'");
        var url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        return import(url).then(function (mod) {
          // Also bootstrap SkeletonUtils — a plain Object3D.clone() does NOT
          // correctly re-link a SkinnedMesh to its cloned bones (the mesh
          // keeps rendering from the ORIGINAL cached skeleton's pose, so a
          // rigged model appears in the scene graph but visually never
          // moves/animates, no matter how its wrapper group is transformed).
          // SkeletonUtils.clone() clones bones and mesh together, correctly
          // linked. If this fetch fails for any reason, skinnedClone stays
          // null and get() below falls back to the plain clone (rigged
          // models just keep the pre-existing static-display limitation).
          return fetchText(CDN + 'utils/SkeletonUtils.js').then(function (sk) {
            sk = sk.replace(/from\s+['"]three['"]/g, "from '" + shimUrl + "'");
            var skUrl = URL.createObjectURL(new Blob([sk], { type: 'text/javascript' }));
            return import(skUrl).then(function (skMod) {
              return { GLTFLoader: mod.GLTFLoader, skeletonClone: skMod.clone };
            });
          }).catch(function () {
            return { GLTFLoader: mod.GLTFLoader, skeletonClone: null };
          });
        });
      });
    });
  }

  // ── Normalize a loaded scene to game scale ─────────────────────────────────
  // ── V16.4.0: MATERIAL TUNING ───────────────────────────────────────────────
  // Every delivered .glb carries the same exporter preset, and two settings in
  // it fight this game's renderer badly:
  //   • metallicFactor = 1.0 with NO metallicRoughness texture to vary it, so
  //     the whole character is solid metal. Combined with roughness 0.41 that
  //     is a polished-chrome surface, and Engine.js lights the scene with a
  //     PMREM environment probe, which chrome mirrors straight back.
  //   • emissiveFactor = [1,1,1] with the BASE COLOUR MAP wired in as the
  //     emissive map, so each model also glows its own texture at full
  //     strength — light it does not receive from the scene and which cannot
  //     be shaded, then amplified again by the bloom pass.
  // That second one explains why DRDD looked least affected: emissive output
  // is the model's own texture, and his is by far the darkest (mean luminance
  // 56 of 255, against 162 for Kakapoo and 136 for DooDoo), so he glowed least.
  // He was never "correct", only dimmer.
  //
  // These are characters — cloth, skin, feathers — so the right answer is
  // non-metallic, fairly matte, not self-lit. Tuned on the shared template so
  // every clone inherits it at no per-spawn cost.
  // Escape hatches: window.GLB_MATFIX = false disables the pass entirely; a
  // per-character `material` block in MANIFEST overrides any single value.
  var MATERIAL_DEFAULT = {
    metalness: 0.0,          // was 1.0 — the whole problem
    roughness: 0.75,         // was 0.41 — a soft sheen, not a mirror
    emissiveIntensity: 0.0,  // was full-strength self-glow of the base texture
    envMapIntensity: 0.6     // slightly under-weight the probe on characters
  };
  function tuneMaterials(root, key) {
    try {
      if (window.GLB_MATFIX === false) return;
      var spec = MANIFEST[key] || {}, over = spec.material || {};
      var cfg = {};
      for (var p in MATERIAL_DEFAULT) cfg[p] = (p in over) ? over[p] : MATERIAL_DEFAULT[p];
      var touched = 0;
      root.traverse(function (o) {
        if (!o.isMesh || !o.material) return;
        var list = Array.isArray(o.material) ? o.material : [o.material];
        list.forEach(function (m) {
          if (!m || m.__drddTuned) return;
          if (typeof m.metalness === 'number') m.metalness = cfg.metalness;
          // never make a surface glossier than it already was
          if (typeof m.roughness === 'number') m.roughness = Math.max(m.roughness, cfg.roughness);
          // keep emissiveMap attached so the glow can be dialled back up later
          if (m.emissive) m.emissiveIntensity = cfg.emissiveIntensity;
          if (typeof m.envMapIntensity === 'number' || m.isMeshStandardMaterial) m.envMapIntensity = cfg.envMapIntensity;
          m.__drddTuned = true; m.needsUpdate = true; touched++;
        });
      });
      if (touched) diag('log', 'materials tuned for ' + key + ' (' + touched +
        '): metalness→' + cfg.metalness + ', roughness≥' + cfg.roughness +
        ', emissive→' + cfg.emissiveIntensity);
    } catch (e) { diag('warn', 'material tune skipped for ' + key + ': ' + (e && e.message)); }
  }

  function normalize(sceneRoot, spec, key) {
    var wrap = new THREE.Group();
    wrap.add(sceneRoot);
    // ── V16.5.0: ORIENTATION ────────────────────────────────────────────────
    // micflex.glb, seagle.glb and oztrich.glb are exported LYING DOWN — their
    // skeletons sit 90 degrees about X from the rest of the set, so head_end
    // is BELOW Hips and the body runs along Z instead of Y. The clips are
    // authored for upright characters, so playing them does not correct it;
    // the figure just animates on its back. Left alone, normalize() treats the
    // body's THICKNESS as its height and scales to match — micflex came out
    // three times wider than tall. Applied before any measurement so height,
    // grounding and the fit-to-placeholder pass all see it standing up.
    // YXZ order matters: the yaw must be applied AFTER the stand-up rotation,
    // or a lying-down model that also needs flipping ends up upside down.
    sceneRoot.rotation.order = 'YXZ';
    if (spec.rotX) sceneRoot.rotation.x += spec.rotX * Math.PI / 180;
    // ── V16.6.0: FACING ─────────────────────────────────────────────────────
    // Every delivered model faces +Z, which is also the game's own convention
    // (player yaw and most enemies are set with atan2(dx,dz), mapping local +Z
    // onto the travel direction). The CHASE variants are the exception: their
    // procedural builds put the beak at -Z, so the chase code applies a fixed
    // rotation.y = PI to turn them toward the player. A +Z model given that
    // same PI ends up facing AWAY — exactly how the Pigeon appeared.
    // rotY corrects it on the model itself. It must live here rather than on
    // the wrap group, because the chase code assigns wrap.rotation.y directly
    // every frame and would overwrite anything set there.
    if (spec.rotY) sceneRoot.rotation.y += spec.rotY * Math.PI / 180;
    // V16.3.0: measure via A.boxOf, not Box3.setFromObject — see the note on
    // boxOf. Using the raw Box3 here made every rigged model 1.8×–3.6× larger
    // than its manifest height asked for, by a different factor per file.
    var mb = A.boxOf(sceneRoot);
    var box = mb ? mb.box : new THREE.Box3().setFromObject(sceneRoot);
    var size = new THREE.Vector3(); box.getSize(size);
    var s = (spec.height || 2.0) / Math.max(size.y, 0.0001);
    sceneRoot.scale.setScalar(s);
    mb = A.boxOf(sceneRoot);
    box = mb ? mb.box : box.setFromObject(sceneRoot);
    var center = new THREE.Vector3(); box.getCenter(center);
    sceneRoot.position.x -= center.x;                       // center on origin
    sceneRoot.position.z -= center.z;
    sceneRoot.position.y -= box.min.y;                      // feet on y=0
    sceneRoot.position.y += (spec.y || 0);
    // Flag any FUTURE file that looks like it was exported lying down, so it is
    // caught on delivery rather than by eye in the game.
    try {
      var _ob = A.boxOf(sceneRoot);
      if (_ob && !spec.rotX && _ob.d > _ob.h * 1.35) diag('warn', key + ' looks like it was exported LYING DOWN' +
        ' (depth ' + _ob.d.toFixed(2) + ' vs height ' + _ob.h.toFixed(2) + ') — it will be sized by its thickness.' +
        ' Add rotX:90 to its MANIFEST entry, or re-export it upright.');
    } catch (e) {}
    var hasSkin = false;
    wrap.traverse(function (o) {
      if (o.isMesh) {
        o.castShadow = true; o.receiveShadow = true;
        if (o.isSkinnedMesh) {
          hasSkin = true;
          if (!skinWarned) { skinWarned = true; diag('log', 'a model contains a skinned rig — using SkeletonUtils for correct per-instance cloning'); }
        }
      }
    });
    wrap.__hasSkin = hasSkin;
    return wrap;
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** True once a model for this Factory key is loaded and usable. */
  /** For Factory's auto-swap: loaded AND allowed to swap. */
  A.has = function (key) { return !!cache[key] && !(MANIFEST[key] && MANIFEST[key].swap === false); };
  /** Loaded at all (adapter systems use this + A.get directly). */
  A.loaded = function (key) { return !!cache[key]; };

  /** A fresh, game-scaled clone of the model for this key (or null). */
  A.get = function (key) {
    var t = cache[key];
    if (!t) return null;
    try {
      var c;
      if (t.__hasSkin && skeletonClone) { c = skeletonClone(t); c.__hasSkin = true; }
      else { c = t.clone(true); }
      c.__clips = t.__clips || [];                  // clips retarget by node name — safe to share
      return c;
    }
    catch (e) { diag('warn', 'clone failed for ' + key + ' — using placeholder this spawn'); return null; }
  };

  /** The semantic game-state → clip-name map for a key (or null). */
  A.clipMap = function (key) { return CLIPS[key] || null; };

  // ── V16.3.0: FIT A MODEL TO THE SPACE ITS PLACEHOLDER OCCUPIED ─────────────
  // The MANIFEST `height` normalises a model in isolation, which is not enough:
  //   • Every level's spawn heights, camera framing and collision were tuned
  //     around the PROCEDURAL characters, and those are built centred on the
  //     origin with their feet BELOW y=0 (-0.75 to -2.26 depending on the
  //     character). normalize() grounds a GLB's feet AT y=0, so a swapped model
  //     hangs in the air by exactly that much.
  //   • Some builders take a scale argument (the Frogger villains are built at
  //     2.2×), which wGLB cannot forward to a model — so those came out at
  //     roughly half size.
  //   • The heights themselves were never consistent: measured against their
  //     own placeholders the eight models ranged from 19% to 102% of the size
  //     they were replacing, so characters no longer read correctly against the
  //     environment or each other.
  // Fitting to the placeholder's own box fixes all three at once and preserves
  // every art-direction decision already made. Set window.GLB_FIT = false to
  // fall back to raw manifest heights.

  /** Measure an object's world bounding box → {minY,h,cx,cz}, or null.
   *
   *  IMPORTANT (V16.3.0): a plain THREE.Box3().setFromObject() gives the WRONG
   *  answer for rigged characters, and every model in this game is rigged.
   *  Since r158, Box3 prefers a SkinnedMesh's own `boundingBox` — the POSED
   *  box, derived from the live bone matrices — over the geometry's. Straight
   *  after a load or a SkeletonUtils clone those bone matrices are not current
   *  yet, and the cached result is kept forever, so the measurement is simply
   *  whatever half-built state the skeleton happened to be in.
   *  Measured against the real files that came out 1.8×–3.6× too small,
   *  differently per model — which is exactly why characters were arriving at
   *  inconsistent sizes. Forcing the matrices and skeleton up to date and
   *  dropping the stale cache first returns the true figure (verified against
   *  each .glb's own vertex bounds).
   *  Note the geometry box is NOT a valid substitute here: skinned vertices are
   *  positioned by the bones, not by the mesh's own transform, so on these
   *  files it reports ~1/100th of the real size. */
  A.boxOf = function (obj) {
    try {
      if (!obj || !window.THREE || !THREE.Box3) return null;
      obj.updateMatrixWorld(true);
      obj.traverse(function (o) {
        if (o.isSkinnedMesh) {
          try { if (o.skeleton) o.skeleton.update(); } catch (e) {}
          o.boundingBox = null; o.boundingSphere = null;
        }
      });
      var b = new THREE.Box3().setFromObject(obj);
      var h = b.max.y - b.min.y;
      if (!isFinite(h) || h <= 0.001) return null;
      return { minY: b.min.y, h: h, cx: (b.min.x + b.max.x) / 2, cz: (b.min.z + b.max.z) / 2,
               w: b.max.x - b.min.x, d: b.max.z - b.min.z, box: b };
    } catch (e) { return null; }
  };

  /** Resize + reseat `model` so it fills the same box the placeholder did.
   *  The adjustment is applied to the model's CHILDREN, never to the model's
   *  own scale/position — call sites routinely overwrite those (the genie does
   *  .scale.setScalar(0.88), the Roadstumbler does .scale.set(0.78,…)), and a
   *  fit written there would be silently discarded. */
  A.fitToBox = function (model, box, fitScale) {
    try {
      if (!model || !box || window.GLB_FIT === false) return false;
      var b = A.boxOf(model); if (!b) return false;
      var k = (box.h / b.h) * (fitScale || 1);
      var i, c;
      for (i = 0; i < model.children.length; i++) {
        c = model.children[i]; c.scale.multiplyScalar(k); c.position.multiplyScalar(k);
      }
      model.updateMatrixWorld(true);
      b = A.boxOf(model); if (!b) return false;
      var dy = box.minY - b.minY, dx = box.cx - b.cx, dz = box.cz - b.cz;
      for (i = 0; i < model.children.length; i++) {
        c = model.children[i]; c.position.x += dx; c.position.y += dy; c.position.z += dz;
      }
      model.updateMatrixWorld(true);
      return true;
    } catch (e) { return false; }
  };

  /** Are there real, playable clips on this model?
   *  A single-keyframe clip has duration 0 and animates nothing — treating it
   *  as "animated" is what silently froze the player in the first drdd.glb
   *  export, because it suppressed the step-bob fallback without replacing it. */
  A.hasUsableClips = function (model) {
    var c = (model && model.__clips) || [];
    for (var i = 0; i < c.length; i++) if (c[i] && c[i].duration > 0.001) return true;
    return false;
  };

  /** Build an animation controller for a model instance.
   *  Returns null when the model has no usable clips, so every caller can say
   *  `var an = Assets.animator(m,key); if(an){...} else {/ * old behaviour * /}`
   *  and keep its existing procedural animation untouched.
   *
   *    an.play('walk')                 loop, cross-faded
   *    an.play('punch',{loop:false})   one-shot, holds last frame
   *    an.has('idle')                  is that state mapped AND present?
   *    an.update(dt)                   call once per frame (dt in SECONDS)
   *    an.stop()                       fade everything out (back to rest pose)
   */
  A.animator = function (model, key) {
    try {
      if (!model || !window.THREE || !THREE.AnimationMixer) return null;
      if (!A.hasUsableClips(model)) return null;
      // No semantic map means every play() would miss and the model would sit
      // frozen on its rest pose — worse than the procedural animation it would
      // be replacing. Refuse, and let the caller keep what it already had.
      var map = CLIPS[key];
      if (!map) return null;
      var byName = {};
      (model.__clips || []).forEach(function (c) { if (c && c.duration > 0.001) byName[c.name] = c; });
      var mixer = new THREE.AnimationMixer(model);
      var curClip = null, curState = '';

      function resolve(state) { var n = map[state]; return (n && byName[n]) || null; }

      return {
        mixer: mixer,
        has: function (state) { return !!resolve(state); },
        state: function () { return curState; },
        /** Length of the clip bound to a state, in seconds (0 if unmapped).
         *  Lets a caller stretch a one-shot to fit a game action's duration. */
        duration: function (state) { var c = resolve(state); return c ? c.duration : 0; },
        play: function (state, opt) {
          var c = resolve(state);
          if (!c) return false;                      // unmapped → caller decides
          if (c === curClip) { curState = state; return true; }
          opt = opt || {};
          var loop = (opt.loop !== false);
          var fade = (opt.fade == null) ? 0.18 : opt.fade;
          try {
            if (curClip) mixer.clipAction(curClip).fadeOut(fade);
            var a = mixer.clipAction(c);
            a.reset().setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, loop ? Infinity : 1);
            a.clampWhenFinished = !loop;
            a.timeScale = opt.speed || 1;
            a.fadeIn(fade).play();
            curClip = c; curState = state;
            return true;
          } catch (e) { return false; }
        },
        stop: function (fade) {
          try { if (curClip) mixer.clipAction(curClip).fadeOut(fade == null ? 0.18 : fade); } catch (e) {}
          curClip = null; curState = '';
        },
        update: function (dt) { try { mixer.update(dt || 0); } catch (e) {} },
        dispose: function () { try { mixer.stopAllAction(); mixer.uncacheRoot(model); } catch (e) {} }
      };
    } catch (e) { return null; }
  };

  /** Fire-and-forget boot: build the loader, then preload the manifest.
   *  Placeholders are used until (and unless) each model arrives. */
  A.boot = function () {
    if (booted) return; booted = true;
    if (location.protocol === 'file:') {
      diag('warn', 'running from file:// — browsers block reading local .glb files, so placeholders stay on. To use your GLB models, serve over http (VS Code Live Server / python -m http.server) or upload the folder to a host like itch.io.');
      return;
    }
    if (!window.fetch || typeof Blob === 'undefined') { diag('warn', 'browser lacks fetch/Blob — placeholders stay on'); return; }
    bootstrapLoader().then(function (boot) {
      loader = new boot.GLTFLoader();
      skeletonClone = boot.skeletonClone;
      diag('log', 'official GLTFLoader ready (bootstrapped onto global THREE)' +
        (skeletonClone ? ', SkeletonUtils ready (rigged models will animate correctly per-instance)' : ' — SkeletonUtils unavailable, rigged models will display statically'));
      var all = Object.keys(MANIFEST);
      var deferred = all.filter(function (k) { return MANIFEST[k].swap === false && !MANIFEST[k].load; });
      var keys = all.filter(function (k) { return MANIFEST[k].swap !== false || MANIFEST[k].load; });
      if (deferred.length) diag('log', deferred.length + ' character(s) are contract-bound (their animation code reaches into specific parts) and stay on placeholders until an adapter session wires their GLB: ' + deferred.join(', '));
      var okC = 0, missC = 0, done = 0;
      if (!keys.length) return;
      keys.forEach(function (key) {
        var spec = MANIFEST[key];
        loader.load(PATH + spec.file, function (gltf) {
          try {
            tuneMaterials(gltf.scene, key);          // V16.4.0 — before caching
            var t = normalize(gltf.scene, spec, key);
            t.__clips = gltf.animations || [];       // keep animation clips (shared data)
            cache[key] = t;
            var clipNames = t.__clips.map(function (c) { return c.name; }).join(', ');
            okC++; diag('log', 'GLB loaded: ' + key + ' ← ' + spec.file + (clipNames ? ' | clips: ' + clipNames : ' | no animation clips'));
          } catch (e) { missC++; diag('warn', 'GLB normalize failed for ' + key + ': ' + (e && e.message)); }
          if (++done === keys.length) summary();
        }, undefined, function (err) {
          missC++;
          // A failure here can mean the file genuinely isn't there yet (the
          // normal, expected case for most characters) OR that a file IS
          // present but broke on load (wrong path/case, Draco-compressed with
          // no decoder configured, corrupt upload, etc). Log enough to tell
          // the two apart without guessing.
          var msg = (err && (err.message || err.type)) || 'unknown error';
          diag('warn', 'GLB not loaded for ' + key + ' (' + PATH + spec.file + '): ' + msg +
            ' — using placeholder. If you uploaded this file, check the exact path/filename ' +
            'case, and that it is not Draco-compressed (unsupported; re-export without ' +
            'compression, e.g. `gltf-transform copy in.glb out.glb`).');
          if (++done === keys.length) summary();
        });
      });
      function summary() {
      try { if (window.__onAssetsReady) window.__onAssetsReady(); } catch (e) {}
        diag('log', 'GLB preload complete: ' + okC + ' model(s) loaded, ' + missC + ' using placeholders' +
          (window.USE_PLACEHOLDERS ? ' — NOTE: USE_PLACEHOLDERS is true, so loaded models are NOT shown; set it false in Factory.js to use them' : ''));
      }
    }).catch(function (e) {
      failedBoot = true;
      diag('warn', 'GLB loader unavailable (' + (e && e.message) + ') — placeholders stay on. Game unaffected.');
    });
  };

  A._manifest = MANIFEST;   // exposed for inspection/tuning from the console
  window.Assets = A;
  try { console.log('[AssetManager.js] Loaded — call Assets.boot() once (game does this automatically).'); } catch (e) {}
})();
