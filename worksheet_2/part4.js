const colors = [
  ["Red", vec3(1, 0, 0)],
  ["Green", vec3(0, 1, 0)],
  ["Blue", vec3(0, 0, 1)],
  ["Cornflower", vec3(0.3921, 0.5843, 0.9294)],
];

const modes = {
  point: "&#11037; point",
  triangle: "&#9698; triangle",
  circle: "&#9679; circle",
};

const canvas = document.getElementById("view");
const bbox = canvas.getBoundingClientRect();
const startingPointSize = 10.0;

let gl;

const drawColorEl = document.getElementById("draw-color");
const clearColorEl = document.getElementById("clear-color");
const clearColorBtnEl = document.getElementById("clear-color-btn");
drawColorEl.size = colors.length;
addSelectElements(drawColorEl, colors, 0);
addSelectElements(clearColorEl, colors, 3);
addButtonElements(document.getElementById("mode-btns"), Object.entries(modes));
const modeBtns = document.querySelectorAll(".draw-mode");

modeBtns.forEach((el) => {
  el.onclick = (e) => {
    const idx = parseInt(e.target.getAttribute("data-idx"));
    currentDrawMode = idx;
    temporary = [];
  };
});

let currentDrawColor = colors[0][1];
let currentClearColorIdx = 3;
let currentDrawMode = "point";

let drawContext;

const clearColor = (drawContext, colorIdx) => {
  const colorVec = colors[colorIdx][1];
  drawContext.clearBackground(colorVec);
};

const circleVerts = 50;
class DrawContext {
  constructor(gl, countOfEachType) {
    this.gl = gl;
    // Constants
    this.maxOfEachType = countOfEachType;
    this.pointsStartAt = 0;
    this.trianglesStartAt = this.pointsStartAt + countOfEachType;
    this.circlesStartAt = this.trianglesStartAt + countOfEachType * 3;
    this.totalVerts = this.circlesStartAt + countOfEachType * circleVerts;

    // Drawing state
    this.pointsCount = 0;
    this.trianglesCount = 0;
    this.circlesCount = 0;

    let program = initShaders(gl, "vertex-shader", "fragment-shader");
    this.program = program;
    gl.useProgram(program);

    let pointBuffer = gl.createBuffer();
    this.pointBuffer = pointBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      // this is the position, size and color
      // 2 vecs where first is
      // [x, y, pointsize] and [r, g, b]
      this.totalVerts * sizeof["vec3"] * 2,
      gl.STREAM_DRAW
    );

    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;

    let vPoint = gl.getAttribLocation(program, "a_Point");
    gl.vertexAttribPointer(vPoint, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(vPoint);

    let vColor = gl.getAttribLocation(program, "a_Color");
    gl.vertexAttribPointer(
      vColor,
      3,
      gl.FLOAT,
      false,
      stride,
      3 * Float32Array.BYTES_PER_ELEMENT
    );
    gl.enableVertexAttribArray(vColor);

    this.attributeByteLength = stride;
  }

  clearBackground(colorVec) {
    if (colorVec) {
      this.colorVec = colorVec;
      this.gl.clearColor(...colorVec, 1.0);
    } else {
      this.gl.clearColor(...this.colorVec, 1.0);
    }
    this.gl.clear(gl.COLOR_BUFFER_BIT);
  }

  pushPointData(idx, pointAndColor) {
    let offsetIdx = idx * this.attributeByteLength;
    this.gl.bufferSubData(
      this.gl.ARRAY_BUFFER,
      offsetIdx,
      flatten(pointAndColor)
    );
  }

  render() {
    this.clearBackground();
    this.gl.drawArrays(this.gl.POINTS, this.pointsStartAt, this.pointsCount);
  }

  drawPoint(posAndSize, color) {
    const index = this.pointsStartAt + this.pointsCount;
    this.pushPointData(index, [posAndSize, color]);

    this.pointsCount = (this.pointsCount + 1) % this.maxOfEachType;
  }
}

const init = () => {
  gl = WebGLUtils.setupWebGL(canvas);

  if (!gl) {
    alert("WebGL isn’t available");
  }

  drawContext = new DrawContext(gl, 500);
  clearColor(drawContext, currentClearColorIdx);

  canvas.onclick = (e) => {
    const posAndSize = vec3(
      (2 * (e.clientX - bbox.left)) / canvas.width - 1,
      (2 * (canvas.height - e.clientY + bbox.top - 1)) / canvas.height - 1,
      currentDrawMode === "point" ? startingPointSize : 0.0
    );

    drawContext.drawPoint(posAndSize, currentDrawColor);
    drawContext.render();
  };

  clearColorBtnEl.onclick = (el) => {
    clearColor(drawContext, parseInt(clearColorEl.value));
  };

  drawColorEl.onchange = (el) => {
    const idx = parseInt(el.target.value);
    currentDrawColor = colors[idx][1];
  };
};
window.onload = init;
