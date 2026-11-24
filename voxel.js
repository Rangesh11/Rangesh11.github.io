/* ==========================================================
   Shared voxel pieces for the 3D scenes (three.js)
   ========================================================== */
(() => {
  if (typeof THREE === 'undefined') return;

  const std = (color, extra = {}) =>
    new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0.05 }, extra));

  const box = (w, h, d, mat, cast = true) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.castShadow = cast;
    m.receiveShadow = true;
    return m;
  };

  const outline = (mesh, color = 0x05040c, opacity = 0.55) => {
    const e = new THREE.LineSegments(
      new THREE.EdgesGeometry(mesh.geometry),
      new THREE.LineBasicMaterial({ color, transparent: true, opacity })
    );
    mesh.add(e);
    return mesh;
  };

  // Blocky Rangesh: grey blazer, white shirt, dark trousers, dark hair with a quiff.
  const makeHero = () => {
    const hero = new THREE.Group();
    const skin = std(0xc68a5e, { roughness: 0.6 });
    const hair = std(0x15101c, { roughness: 0.5 });
    const blazer = std(0x9aa1b0, { roughness: 0.7 });
    const shirt = std(0xf4f4f4, { roughness: 0.6 });
    const pants = std(0x262a38, { roughness: 0.8 });
    const shoe = std(0x0b0b10, { roughness: 0.5 });

    const legL = new THREE.Group();
    const legR = new THREE.Group();
    [legL, legR].forEach((leg, k) => {
      const l = box(0.22, 0.5, 0.24, pants); l.position.y = -0.25;
      const s = box(0.24, 0.12, 0.32, shoe); s.position.set(0, -0.52, 0.04);
      leg.add(l, s);
      leg.position.set(k ? 0.13 : -0.13, 0.62, 0);
      hero.add(leg);
    });

    const torso = box(0.62, 0.62, 0.36, blazer); torso.position.y = 0.94;
    const shirtFront = box(0.18, 0.5, 0.02, shirt, false); shirtFront.position.set(0, 0.97, 0.185);
    const lapelL = box(0.08, 0.36, 0.02, std(0x868d9c), false); lapelL.position.set(-0.13, 1.03, 0.19); lapelL.rotation.z = -0.25;
    const lapelR = lapelL.clone(); lapelR.position.x = 0.13; lapelR.rotation.z = 0.25;
    hero.add(torso, shirtFront, lapelL, lapelR);

    const armL = new THREE.Group();
    const armR = new THREE.Group();
    [armL, armR].forEach((arm, k) => {
      const a = box(0.18, 0.5, 0.22, blazer); a.position.y = -0.24;
      const h = box(0.16, 0.12, 0.18, skin); h.position.y = -0.53;
      arm.add(a, h);
      arm.position.set(k ? 0.41 : -0.41, 1.22, 0);
      hero.add(arm);
    });

    const head = new THREE.Group();
    const face = box(0.52, 0.5, 0.48, skin);
    const hairTop = box(0.58, 0.2, 0.54, hair); hairTop.position.set(0, 0.3, -0.01);
    const hairQuiff = box(0.42, 0.12, 0.3, hair); hairQuiff.position.set(0.04, 0.43, 0.08);
    const hairBack = box(0.58, 0.36, 0.12, hair); hairBack.position.set(0, 0.08, -0.24);
    const hairSideL = box(0.08, 0.26, 0.4, hair); hairSideL.position.set(-0.29, 0.12, -0.04);
    const hairSideR = hairSideL.clone(); hairSideR.position.x = 0.29;
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111018 });
    const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.08, 0.02), eyeMat); eyeL.position.set(-0.12, 0.03, 0.245);
    const eyeR = eyeL.clone(); eyeR.position.x = 0.12;
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.03, 0.02), eyeMat);
    const browL = brow.clone(); browL.position.set(-0.12, 0.12, 0.245);
    const browR = brow.clone(); browR.position.set(0.12, 0.12, 0.245);
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.025, 0.02), new THREE.MeshBasicMaterial({ color: 0x7a4a34 }));
    mouth.position.set(0, -0.13, 0.245);
    head.add(face, hairTop, hairQuiff, hairBack, hairSideL, hairSideR, eyeL, eyeR, browL, browR, mouth);
    head.position.y = 1.52;
    hero.add(head);

    return { hero, legL, legR, armL, armR, head };
  };

  window.RS3D = { std, box, outline, makeHero };
})();
