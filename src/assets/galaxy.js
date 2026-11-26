// 3D "data galaxy" behind the apex heroes (hub: src/home.njk, CV: src/index.html).
// Plain WebGL, no library. Draws, into <canvas data-galaxy>:
//   1. a nebula: domain-warped noise in deep blue / violet with a warm glow
//      around the galaxy core, rendered at low resolution into a texture and
//      scaled up (it's soft, so that's invisible and keeps it cheap);
//   2. a spiral galaxy of ~30k points (gold core, blue arms, violet rim),
//      tilted in 3D and turning slowly;
//   3. a sphere of faint background stars.
// The camera leans toward the cursor and flies in as you scroll the hero.
// data-galaxy="edge" (the CV) parks the galaxy further right, clear of centred text.
// Reduced motion gets one still frame. If WebGL is missing, nothing happens
// and space.js's 2D starfield stays as the fallback (it checks .is-on).
(function () {
  var canvases = document.querySelectorAll('canvas[data-galaxy]');
  if (!canvases.length) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hero = document.getElementById('hero');

  // ---- tiny matrix helpers (column-major, like WebGL expects) ----
  function mul(a, b) {
    var o = new Float32Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    return o;
  }
  function persp(fov, asp, n, f) {
    var t = 1 / Math.tan(fov / 2), o = new Float32Array(16);
    o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f);
    return o;
  }
  function lookAt(ex, ey, ez, tx, ty, tz) {
    var zx = ex - tx, zy = ey - ty, zz = ez - tz, l = Math.hypot(zx, zy, zz); zx /= l; zy /= l; zz /= l;
    var xx = zz, xy = 0, xz = -zx; l = Math.hypot(xx, xz) || 1; xx /= l; xz /= l; // up = (0,1,0)
    var yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * ex + xy * ey + xz * ez), -(yx * ex + yy * ey + yz * ez), -(zx * ex + zy * ey + zz * ez), 1]);
  }
  function rotX(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); }
  function rotY(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); }
  function rotZ(a) { var c = Math.cos(a), s = Math.sin(a); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
  function trans(x, y, z) { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]); }
  function gauss() { return (Math.random() + Math.random() + Math.random() + Math.random() - 2) / 2; }

  var NEB_VS = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  var NEB_FS = [
    'precision highp float;',
    'uniform vec2 uRes;uniform float uTime;uniform vec2 uCore;uniform vec2 uShift;',
    'float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}',
    'float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);',
    ' return mix(mix(h(i),h(i+vec2(1.,0.)),u.x),mix(h(i+vec2(0.,1.)),h(i+vec2(1.,1.)),u.x),u.y);}',
    'float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}',
    'void main(){',
    ' vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y+uShift;',
    ' float t=uTime*.015;',
    ' vec2 q=vec2(fbm(uv*1.5+vec2(0.,t)),fbm(uv*1.5+vec2(5.2,1.3)-t));',
    ' vec2 r=vec2(fbm(uv*1.5+2.*q+vec2(1.7,9.2)+t*.7),fbm(uv*1.5+2.*q+vec2(8.3,2.8)-t*.7));',
    ' float f=fbm(uv*1.6+2.2*r);',
    // a broad diagonal band through the galaxy core, like the Milky Way
    ' vec2 dir=normalize(vec2(1.,.38));vec2 rel=uv-uCore;',
    ' float d=dot(rel,vec2(-dir.y,dir.x));float along=dot(rel,dir);',
    ' float band=exp(-d*d*3.2)*(.55+.45*exp(-along*along*.35));',
    ' float dens=smoothstep(.32,.92,f)*band;',
    ' float dust=smoothstep(.5,.78,fbm(uv*3.4+r*1.3-t*.5));',
    ' vec3 deep=vec3(.04,.06,.2),blue=vec3(.14,.32,.95),vio=vec3(.46,.24,.9),warm=vec3(1.,.66,.36);',
    ' vec3 c=mix(deep,blue,clamp(f*1.5-.2,0.,1.));',
    ' c=mix(c,vio,clamp(length(q-.5)*1.6,0.,1.)*.65);',
    ' vec3 col=c*dens*(1.-dust*.6)*1.9;',
    ' float g=length(uv-uCore);',
    ' col+=warm*exp(-g*g*12.)*.3+vec3(.3,.4,1.)*exp(-g*g*1.8)*.1;',
    ' col+=deep*.6*band+vec3(.01,.012,.03);',
    ' gl_FragColor=vec4(col,1.);}'
  ].join('\n');
  var TEX_FS = 'precision mediump float;uniform sampler2D uTex;uniform vec2 uRes;void main(){gl_FragColor=texture2D(uTex,gl_FragCoord.xy/uRes);}';
  var PT_VS = [
    'attribute vec3 aPos;attribute vec3 aCol;attribute float aSize;attribute float aSeed;',
    'uniform mat4 uMVP;uniform float uTime;uniform float uPx;uniform float uBright;',
    'varying vec3 vCol;',
    'void main(){vec4 c=uMVP*vec4(aPos,1.);gl_Position=c;',
    ' float tw=.72+.28*sin(uTime*(.6+fract(aSeed*7.)*1.6)+aSeed*40.);',
    ' gl_PointSize=max(1.,aSize*uPx/c.w);vCol=aCol*tw*uBright;}'
  ].join('\n');
  var PT_FS = 'precision mediump float;varying vec3 vCol;void main(){vec2 d=gl_PointCoord-.5;float a=exp(-dot(d,d)*18.);if(a<.02)discard;gl_FragColor=vec4(vCol*a,1.);}';

  function compile(gl, vs, fs) {
    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var p = gl.createProgram();
    gl.attachShader(p, sh(gl.VERTEX_SHADER, vs)); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    return p;
  }

  // galaxy: 3 arms (gold core → blue arms → violet rim), a bulge, a hazy
  // disc, and large faint "gas" sprites along the arms that read as nebula glow
  function lerp3(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function buildGalaxy(n) {
    var gas = Math.round(n * 0.06), total = n + gas;
    var data = new Float32Array(total * 8); // x y z  r g b  size seed
    var core = [1, 0.84, 0.58], mid = [0.5, 0.7, 1], rim = [0.58, 0.42, 1], pink = [0.85, 0.42, 0.95];
    for (var i = 0; i < total; i++) {
      var x, y, z, r, k = i * 8, kind = i >= n ? 'gas' : i % 6 === 0 ? 'bulge' : i % 4 === 1 ? 'disc' : 'arm';
      if (kind === 'bulge') {
        x = gauss() * 0.2; y = gauss() * 0.11; z = gauss() * 0.2; r = Math.hypot(x, z);
      } else if (kind === 'disc') {
        r = Math.pow(Math.random(), 0.9) * 1.35 + 0.05; var da = Math.random() * 6.2832;
        x = Math.cos(da) * r; z = Math.sin(da) * r; y = gauss() * 0.05;
      } else {
        r = Math.pow(Math.random(), 1.35) * 1.3 + 0.05;
        var a = (i % 3) * 2.0944 + r * 3.1 + gauss() * (0.6 - r * 0.15);
        var j = kind === 'gas' ? 0.12 : 0.08;
        x = Math.cos(a) * r + gauss() * j; z = Math.sin(a) * r + gauss() * j;
        y = gauss() * 0.06 * (1.15 - r * 0.6);
      }
      var t = Math.min(1, r / 1.3);
      var col = t < 0.3 ? lerp3(core, mid, t / 0.3) : lerp3(mid, rim, (t - 0.3) / 0.7);
      var bright, sz;
      if (kind === 'gas') {
        if (Math.random() < 0.25) col = lerp3(col, pink, 0.6);
        bright = 0.035 + Math.random() * 0.045; sz = 0.06 + Math.random() * 0.1;
      } else if (kind === 'bulge') {
        bright = 0.5; sz = 0.01 * (0.6 + Math.random() * 0.9);
      } else {
        bright = (kind === 'disc' ? 0.18 : 0.32) + Math.random() * 0.4; sz = 0.0058 * (0.6 + Math.random() * 0.9);
        if (Math.random() < 0.012) { bright = 1.4; sz *= 1.6; } // a few bright stars in the arms
      }
      data[k] = x; data[k + 1] = y; data[k + 2] = z;
      data[k + 3] = col[0] * bright; data[k + 4] = col[1] * bright; data[k + 5] = col[2] * bright;
      data[k + 6] = sz; data[k + 7] = Math.random();
    }
    return data;
  }
  function buildStars(n) {
    var data = new Float32Array(n * 8);
    for (var i = 0; i < n; i++) {
      var k = i * 8, u = Math.random() * 2 - 1, th = Math.random() * 6.2832, s = Math.sqrt(1 - u * u), R = 7;
      var b = 0.4 + Math.pow(Math.random(), 3) * 1.1, tint = Math.random();
      var col = tint < 0.12 ? [1, 0.88, 0.66] : tint < 0.3 ? [0.75, 0.85, 1] : [1, 1, 1];
      data[k] = Math.cos(th) * s * R; data[k + 1] = u * R; data[k + 2] = Math.sin(th) * s * R;
      data[k + 3] = col[0] * b; data[k + 4] = col[1] * b; data[k + 5] = col[2] * b;
      data[k + 6] = 0.008 + Math.random() * 0.012; data[k + 7] = Math.random();
    }
    return data;
  }

  canvases.forEach(function (cv) {
    var gl;
    try { gl = cv.getContext('webgl', { antialias: false, alpha: false, depth: false, powerPreference: 'high-performance' }); } catch (e) { gl = null; }
    if (!gl) return;
    var neb, tex, pts, quad, fbo, ntex, gBuf, sBuf, gN, sN;
    try {
      neb = compile(gl, NEB_VS, NEB_FS); tex = compile(gl, NEB_VS, TEX_FS); pts = compile(gl, PT_VS, PT_FS);
    } catch (e) { return; }

    var small = window.innerWidth < 760;
    var galaxy = buildGalaxy(small ? 14000 : 30000), stars = buildStars(small ? 1600 : 3200);
    gN = galaxy.length / 8; sN = stars.length / 8;
    quad = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, gBuf); gl.bufferData(gl.ARRAY_BUFFER, galaxy, gl.STATIC_DRAW);
    sBuf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, sBuf); gl.bufferData(gl.ARRAY_BUFFER, stars, gl.STATIC_DRAW);

    var L = {
      nebP: gl.getAttribLocation(neb, 'p'), texP: gl.getAttribLocation(tex, 'p'),
      pos: gl.getAttribLocation(pts, 'aPos'), col: gl.getAttribLocation(pts, 'aCol'),
      size: gl.getAttribLocation(pts, 'aSize'), seed: gl.getAttribLocation(pts, 'aSeed')
    };
    function U(p, name) { return gl.getUniformLocation(p, name); }
    var u = {
      nRes: U(neb, 'uRes'), nTime: U(neb, 'uTime'), nCore: U(neb, 'uCore'), nShift: U(neb, 'uShift'),
      tRes: U(tex, 'uRes'), tTex: U(tex, 'uTex'),
      mvp: U(pts, 'uMVP'), time: U(pts, 'uTime'), px: U(pts, 'uPx'), bright: U(pts, 'uBright')
    };

    var W = 0, H = 0, NW = 0, NH = 0, dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    var FOV = 0.95;
    function size() {
      var r = cv.getBoundingClientRect(); W = Math.max(1, Math.round(r.width * dpr)); H = Math.max(1, Math.round(r.height * dpr));
      cv.width = W; cv.height = H;
      NW = Math.max(64, Math.round(W / 3)); NH = Math.max(64, Math.round(H / 3));
      if (ntex) gl.deleteTexture(ntex);
      if (fbo) gl.deleteFramebuffer(fbo);
      ntex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, ntex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, NW, NH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      fbo = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ntex, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      if (reduce) draw(0);
    }

    // pointer + scroll, eased
    var mx = 0, my = 0, emx = 0, emy = 0, warp = 0, ewarp = 0;
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX / window.innerWidth * 2 - 1; my = e.clientY / window.innerHeight * 2 - 1;
    }, { passive: true });
    function scrollWarp() {
      if (!hero) return 0;
      var span = Math.max(window.innerHeight, hero.offsetHeight);
      return Math.min(1, Math.max(0, window.scrollY / span));
    }

    function pointsPass(buf, count, mvp, bright, t) {
      gl.useProgram(pts);
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.enableVertexAttribArray(L.pos); gl.vertexAttribPointer(L.pos, 3, gl.FLOAT, false, 32, 0);
      gl.enableVertexAttribArray(L.col); gl.vertexAttribPointer(L.col, 3, gl.FLOAT, false, 32, 12);
      gl.enableVertexAttribArray(L.size); gl.vertexAttribPointer(L.size, 1, gl.FLOAT, false, 32, 24);
      gl.enableVertexAttribArray(L.seed); gl.vertexAttribPointer(L.seed, 1, gl.FLOAT, false, 32, 28);
      gl.uniformMatrix4fv(u.mvp, false, mvp);
      gl.uniform1f(u.time, t); gl.uniform1f(u.bright, bright);
      gl.uniform1f(u.px, H / 2 / Math.tan(FOV / 2));
      gl.drawArrays(gl.POINTS, 0, count);
      gl.disableVertexAttribArray(L.col); gl.disableVertexAttribArray(L.size); gl.disableVertexAttribArray(L.seed);
    }
    function quadPass(prog, loc) {
      gl.useProgram(prog);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    function draw(t) {
      var asp = W / H, portrait = asp < 1;
      emx += (mx - emx) * 0.04; emy += (my - emy) * 0.04;
      ewarp += (warp - ewarp) * 0.08;
      // camera: leans toward the pointer, flies in as you scroll the hero
      var ez = (portrait ? 3.4 : 2.75) - ewarp * 1.05;
      var view = lookAt(emx * 0.22, -emy * 0.14 + ewarp * 0.25, ez, emx * 0.05, -emy * 0.03, 0);
      var proj = persp(FOV, asp, 0.05, 40);
      var vp = mul(proj, view);
      // galaxy: right of the headline on desktop, top-right on phones; tilted and turning
      var edge = cv.getAttribute('data-galaxy') === 'edge'; // CV: centred text, so keep the core near the edge
      var gx = portrait ? 0.45 : (edge ? 1.75 : 1.1) * Math.min(1.3, asp / 1.6), gy = portrait ? 0.95 : (edge ? 0.3 : 0.16);
      var model = mul(trans(gx, gy, 0), mul(rotZ(0.42), mul(rotX(-1.08 + ewarp * 0.25), rotY(t * 0.035))));
      var mvp = mul(vp, model);
      // where the core lands on screen, in the nebula shader's units
      var cx = mvp[12], cy = mvp[13], cw = mvp[15];
      var coreU = [cx / cw * asp * 0.5, cy / cw * 0.5];

      gl.disable(gl.BLEND);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo); gl.viewport(0, 0, NW, NH);
      gl.useProgram(neb);
      gl.uniform2f(u.nRes, NW, NH); gl.uniform1f(u.nTime, t); gl.uniform2f(u.nCore, coreU[0], coreU[1]);
      gl.uniform2f(u.nShift, emx * 0.03, -emy * 0.02);
      quadPass(neb, L.nebP);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, ntex);
      gl.useProgram(tex); gl.uniform1i(u.tTex, 0); gl.uniform2f(u.tRes, W, H);
      quadPass(tex, L.texP);

      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
      pointsPass(sBuf, sN, mul(vp, rotY(t * 0.004)), 1, t);
      pointsPass(gBuf, gN, mvp, 1, t);
    }

    var visible = true, last = 0, time = 0, running = true;
    size();
    window.addEventListener('resize', size);
    cv.addEventListener('webglcontextlost', function (e) { e.preventDefault(); running = false; cv.classList.remove('is-on'); });
    cv.classList.add('is-on');
    if (reduce) return;
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(cv);
    (function frame(now) {
      if (!running) return;
      var dt = last ? Math.min(50, now - last) : 16; last = now;
      if (visible && !document.hidden) { time += dt / 1000; warp = scrollWarp(); draw(time); }
      requestAnimationFrame(frame);
    })(performance.now());
  });
})();
