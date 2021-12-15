const canvas = document.getElementById("view");
const matCapImg = document.getElementById("matcap");
const modelSelector = document.getElementById("model-selector");

let gl, model;
let drawLen = 0;
let currentAngle = [0.0, 0.0]; // [x-axis, y-axis] degrees

const eye = vec3(0, 0, 5);
const lookat = vec3(0, 0, 0);
let up = vec3(0, 1, 0);
let m = translate(0, -0.5, 0);
const v = lookAt(eye, lookat, up);

const { ORBIT, DOLLY, PAN } = iota(0);
let interactionState = -1;

const zDir = vec3(eye[0] - lookat[0], eye[1] - lookat[1], eye[2] - lookat[2]);
const eyeDist = Math.sqrt(
  zDir[0] * zDir[0] + zDir[1] * zDir[1] + zDir[2] * zDir[2]
);
let eyeDistPan = vec3(eyeDist, 0, 0);

let qrot = new Quaternion();
let qinc = new Quaternion();
qrot = qrot.make_rot_vec2vec(vec3(0, 0, 1), normalize(zDir));
let qrotInverse = new Quaternion(qrot);
qrotInverse.invert();
up = qrotInverse.apply(up);

const projectToSphere = (x, y) => {
  const r = 1;
  const d = Math.sqrt(x * x + y * y);
  const t = r * Math.sqrt(2);
  let z;
  if (d < r)
    // Inside sphere
    z = Math.sqrt(r * r - d * d);
  else if (d < t) z = 0;
  // On hyperbola
  else z = (t * t) / d;
  return z;
};

const initViewEventHandlers = (canvas) => {
  let lastX = -1;
  let lastY = -1;

  canvas.onmousedown = function (e) {
    // Mouse is pressed
    let x = e.clientX;
    let y = e.clientY;
    // Start dragging if a mouse is in  <canvas>
    let rect = e.target.getBoundingClientRect();

    if (rect.left <= x && x < rect.right && rect.top <= y && y < rect.bottom) {
      lastX = x;
      lastY = y;
      interactionState = e.button;
    }
  };

  canvas.oncontextmenu = function (e) {
    e.preventDefault();
  };

  canvas.onmouseup = function (e) {
    // let x = e.clientX;
    // let y = e.clientY;
    // if (x === lastX && y === lastY) {
    // }
    qinc.setIdentity();
    interactionState = -1;
  };

  canvas.onmouseout = canvas.onmouseup;

  let last = Date.now();

  canvas.onmousemove = function (ev) {
    // Mouse is moved
    let x = ev.clientX;
    let y = ev.clientY;
    if (interactionState > -1) {
      let now = Date.now();
      var elapsed = now - last;
      if (elapsed < 20) return;
      last = now;

      const rect = ev.target.getBoundingClientRect();
      const sX = ((x - rect.left) / rect.width - 0.5) * 2;
      const sY = (0.5 - (y - rect.top) / rect.height) * 2;
      const sLastX = ((lastX - rect.left) / rect.width - 0.5) * 2;
      const sLastY = (0.5 - (lastY - rect.top) / rect.height) * 2;

      switch (interactionState) {
        case ORBIT:
          const v1 = new vec3(sX, sY, projectToSphere(sX, sY));
          // prettier-ignore
          const v2 = new vec3(sLastX, sLastY, projectToSphere(sLastX, sLastY));
          qinc = qinc.make_rot_vec2vec(normalize(v1), normalize(v2));

          qrot = qrot.multiply(qinc);
          break;
        case DOLLY:
          eyeDistPan[0] += (sY - sLastY) * eyeDistPan[0] * 0.25;
          eyeDistPan[0] = Math.max(eyeDistPan[0], 1.1);

          break;
        case PAN:
          eyeDistPan[1] += (sX - sLastX) * eyeDistPan[0] * 0.25;
          eyeDistPan[2] += (sY - sLastY) * eyeDistPan[0] * 0.25;

          break;
      }
    }
    lastX = x;
    lastY = y;
  };

  const scrollFactor = 0.05;
  canvas.onwheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? -scrollFactor : scrollFactor;
    eyeDistPan[0] = eyeDistPan[0] + delta * eyeDistPan[0] * 0.25;
    eyeDistPan[0] = Math.max(eyeDistPan[0], 1.1);
  };
};

const makeFloorVerts = () => {
  let result = [];
  for (let i = -2.5; i <= 2.5; i += 0.25) {
    result.push(i, 0, 2.5);
    result.push(i, 0, -2.5);
    result.push(2.5, 0, i);
    result.push(-2.5, 0, i);
  }
  return result;
};

const render = () => {
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  gl.enable(gl.SCISSOR_TEST);
  gl.scissor(1, 1, gl.canvas.width - 2, gl.canvas.height - 2);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const rUp = qrot.apply(up);
  const right = qrot.apply(vec3(1, 0, 0));
  const centre = new vec3(
    lookat[0] - right[0] * eyeDistPan[1] - rUp[0] * eyeDistPan[2],
    lookat[1] - right[1] * eyeDistPan[1] - rUp[1] * eyeDistPan[2],
    lookat[2] - right[2] * eyeDistPan[1] - rUp[2] * eyeDistPan[2]
  );
  const rotationEye = qrot.apply(vec3(0, 0, eyeDistPan[0]));
  const newLookAt = lookAt(
    vec3(
      rotationEye[0] + centre[0],
      rotationEye[1] + centre[1],
      rotationEye[2] + centre[2]
    ),
    vec3(centre[0], centre[1], centre[2]),
    vec3(rUp[0], rUp[1], rUp[2])
  );

  const v = newLookAt;
  const p = perspective(45, gl.canvas.width / gl.canvas.height, 0.1, 10);

  gl.uniformMatrix4fv(gl.mUniform, false, flatten(m));
  gl.uniformMatrix4fv(gl.vUniform, false, flatten(v));
  gl.uniformMatrix4fv(gl.pUniform, false, flatten(p));

  const mNormal = normalMatrix(mult(v, m), true);
  gl.uniformMatrix3fv(gl.nmUniform, false, flatten(mNormal));

  gl.drawElements(gl.TRIANGLES, drawLen, gl.UNSIGNED_INT, 0);
};

const tick = () => {
  render();
  requestAnimFrame(tick);
};

const onResize = () => {
  let width = canvas.clientWidth;
  let height = canvas.clientHeight;
  if (canvas.width != width || canvas.height != height) {
    canvas.width = width;
    canvas.height = height;
  }
};

const bufferImage = (img) => {
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
};

const loadObj = async (
  posBuffer,
  normalBuffer,
  indexBuffer,
  objUrl,
  size = 0.4
) => {
  let rawObjText = await fetch(objUrl).then((v) => v.text());
  let objDoc = new OBJDoc("obj");
  objDoc.parse(rawObjText, size, false);
  let drawingInfo = objDoc.getDrawingInfo();
  drawLen = drawingInfo.indices.length;

  gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.vertices, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, drawingInfo.normals, gl.STATIC_DRAW);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, drawingInfo.indices, gl.STATIC_DRAW);

  return drawingInfo;
};

const init = async () => {
  gl = WebGLUtils.setupWebGL(canvas);

  if (!gl) {
    alert("WebGL isn't available");
  }

  let program = initShaders(gl, "vertex-shader", "fragment-shader");
  gl.useProgram(program);
  gl.clearColor(1, 1, 1, 1);
  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  // gl.enable(gl.CULL_FACE);
  // gl.cullFace(gl.BACK);
  gl.getExtension("OES_element_index_uint");
  gl.program = program;

  gl.mUniform = gl.getUniformLocation(program, "uModel");
  gl.vUniform = gl.getUniformLocation(program, "uView");
  gl.pUniform = gl.getUniformLocation(program, "uProjection");
  gl.nmUniform = gl.getUniformLocation(program, "normalMatrix");

  const lightPosition = vec4(1, 0, -1, 0);

  const lightDiffuse = vec4(0.5, 0.5, 0.5, 1.0);
  const materialAmbient = vec4(0.1, 0.1, 0.1, 1.0);
  const materialDiffuse = vec4(0.8, 0.8, 0.8, 1.0);
  const materialSpecular = vec4(1.0, 0.829, 0.829, 1.0);

  initViewEventHandlers(canvas);

  gl.uniform4fv(
    gl.getUniformLocation(program, "lightPosition"),
    flatten(lightPosition)
  );
  gl.ulightDiffuse = gl.getUniformLocation(program, "lightDiffuse");
  gl.uniform4fv(gl.ulightDiffuse, flatten(lightDiffuse));
  gl.umaterialAmbient = gl.getUniformLocation(program, "materialAmbient");
  gl.uniform4fv(gl.umaterialAmbient, flatten(materialAmbient));
  gl.umaterialDiffuse = gl.getUniformLocation(program, "materialDiffuse");
  gl.uniform4fv(gl.umaterialDiffuse, flatten(materialDiffuse));
  gl.umaterialSpecular = gl.getUniformLocation(program, "materialSpecular");
  gl.uniform4fv(gl.umaterialSpecular, flatten(materialSpecular));

  let posBuffer = gl.createBuffer();
  initBuffer(gl, posBuffer, program, "aPosition", 3, gl.FLOAT);
  let normalBuffer = gl.createBuffer();
  initBuffer(gl, normalBuffer, program, "aNormal", 3, gl.FLOAT);

  let indexBuffer = gl.createBuffer();

  await loadObj(
    posBuffer,
    normalBuffer,
    indexBuffer,
    "https://www.student.dtu.dk/~s185126/02561/teapot.obj"
  );

  modelSelector.onclick = async (ev) => {
    const target = ev.target;

    switch (target.id) {
      case "teapot":
        await loadObj(
          posBuffer,
          normalBuffer,
          indexBuffer,
          "https://www.student.dtu.dk/~s185126/02561/teapot.obj"
        );
        m = translate(0, -0.5, 0);
        break;
      case "monke":
        await loadObj(
          posBuffer,
          normalBuffer,
          indexBuffer,
          "https://www.student.dtu.dk/~s185126/02561/suzanne.obj",
          0.7
        );
        m = translate(0, 0, 0);
        break;
      case "mystery":
        await loadObj(
          posBuffer,
          normalBuffer,
          indexBuffer,
          "https://www.student.dtu.dk/~s185126/02561/remy.obj"
        );
        m = translate(0, -0.2, 0);
        break;
      default:
        break;
    }
  };

  gl.activeTexture(gl.TEXTURE0);
  let texture0 = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);

  await matCapImg.decode();
  bufferImage(matCapImg);

  matCapImg.onload = ({ target: img }) => {
    bufferImage(img);
  };

  onResize();
  tick();
};

const initBuffer = (gl, buffer, program, locName, num, type) => {
  let model = { buffer, locName, num, type };
  model.location = initAttr(gl, program, model);
  return model;
};

const initAttr = (gl, program, model) => {
  let location = gl.getAttribLocation(program, model.locName);

  gl.bindBuffer(gl.ARRAY_BUFFER, model.buffer);
  gl.vertexAttribPointer(location, model.num, model.type, false, 0, 0);
  gl.enableVertexAttribArray(location);

  return location;
};

window.addEventListener("resize", onResize);
window.onload = init;
