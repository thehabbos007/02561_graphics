const colors = [
  ["Black", vec3(0, 0, 0)],
  ["Red", vec3(1, 0, 0)],
  ["Yellow", vec3(1, 1, 0)],
  ["Green", vec3(0, 1, 0)],
  ["Blue", vec3(0, 0, 1)],
  ["Magenta", vec3(1, 0, 1)],
  ["Cyan", vec3(0, 1, 1)],
  ["White", vec3(1, 1, 1)],
  ["Cornflower", vec3(0.3921, 0.5843, 0.9294)],
];

const POINT = "point";
const TRIANGLE = "triangle";
const CIRCLE = "circle";
const modes = {
  [POINT]: "&#11037; point",
  [TRIANGLE]: "&#9698; triangle",
  [CIRCLE]: "&#9679; circle",
};

const canvas = document.getElementById("view");
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
    const idx = e.target.getAttribute("data-idx");
    currentDrawMode = idx;
  };
});

let currentDrawColor = colors[0][1];
let currentClearColorIdx = 8;
let currentDrawMode = POINT;

let drawContext;

const clearColor = (drawContext, colorIdx) => {
  const colorVec = colors[colorIdx][1];
  drawContext.clearBackground(colorVec);
  drawContext.emptyBuffer();
};

const posAndSizeLength = ([v1x, v1y], [v2x, v2y]) =>
  Math.sqrt(Math.pow(v2x - v1x, 2) + Math.pow(v2y - v1y, 2));

const circleVerts = 50;
const circleFactor = (2 * Math.PI) / (circleVerts - 2); // Subtract start and end point
class DrawContext {
  constructor(gl, maxOfEachType) {
    this.gl = gl;
    // Constants
    this.maxOfEachType = maxOfEachType;
    this.typeStartsAt = {
      [POINT]: 0,
      [TRIANGLE]: 0 + maxOfEachType,
      [CIRCLE]: 0 + maxOfEachType + maxOfEachType * 3,
    };
    this.typeIndexOffsetFactor = {
      [POINT]: 1,
      [TRIANGLE]: 3,
      [CIRCLE]: circleVerts,
    };
    this.totalVerts = this.typeStartsAt[CIRCLE] + maxOfEachType * circleVerts;

    // State
    let program = initShaders(gl, "vertex-shader", "fragment-shader");
    this.program = program;
    gl.useProgram(program);

    const stride = 6 * Float32Array.BYTES_PER_ELEMENT;
    this.stride = stride;

    let pointBuffer = gl.createBuffer();
    this.pointBuffer = pointBuffer;
    gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer);
    // Also initializes more internal state.
    this.emptyBuffer(gl, stride);

    const colorOffset = stride / 2;

    let vPoint = gl.getAttribLocation(program, "a_Point");
    gl.vertexAttribPointer(vPoint, 3, gl.FLOAT, false, stride, 0);
    gl.enableVertexAttribArray(vPoint);

    let vColor = gl.getAttribLocation(program, "a_Color");
    gl.vertexAttribPointer(vColor, 3, gl.FLOAT, false, stride, colorOffset);
    gl.enableVertexAttribArray(vColor);

    this.attributeByteLength = stride;
  }

  emptyBuffer() {
    // Drawing state
    this.typeCounts = {
      [POINT]: 0,
      [TRIANGLE]: 0,
      [CIRCLE]: 0,
    };
    this.temporary = [];

    this.gl.bufferData(
      this.gl.ARRAY_BUFFER,
      // this is the position, size and color
      // 2 vecs where first is
      // [x, y, pointsize] and [r, g, b]
      this.totalVerts * this.stride,
      this.gl.STREAM_DRAW
    );
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

  // Points are temporarily used as a middle ground before
  // forming triangles and circles.
  pushTemporary(pointAndColor) {
    const index = this.nextIdxFor(POINT);
    this.pushPointData(index, pointAndColor);
    this.temporary.push(pointAndColor);
  }

  temporaryLengthEquals(length) {
    return this.temporary.length === length;
  }

  popTemporaries(amount) {
    if (!this.temporaryLengthEquals(amount))
      throw new Error("Temporary length mismatch");

    const points = [...this.temporary];
    this.clearTemporary();

    return points;
  }

  clearTemporary() {
    const temporaryPointLength = this.temporary.length;
    this.typeCounts[POINT] -= temporaryPointLength;
    this.temporary.length = 0;
  }

  render() {
    this.clearBackground();
    this.gl.drawArrays(
      this.gl.POINT,
      this.typeStartsAt[POINT],
      this.typeCounts[POINT]
    );
    this.gl.drawArrays(
      this.gl.TRIANGLES,
      this.typeStartsAt[TRIANGLE],
      this.typeCounts[TRIANGLE] * this.typeIndexOffsetFactor[TRIANGLE]
    );

    const circlesStartAt = this.typeStartsAt[CIRCLE];
    const circlesOffsetFactor = this.typeIndexOffsetFactor[CIRCLE];
    for (let i = 0; i < this.typeCounts[CIRCLE]; i++) {
      this.gl.drawArrays(
        this.gl.TRIANGLE_FAN,
        circlesStartAt + i * circlesOffsetFactor,
        circlesOffsetFactor
      );
    }
  }

  nextIdxFor = (type) => {
    const nextIdx =
      this.typeStartsAt[type] +
      this.typeCounts[type] * this.typeIndexOffsetFactor[type];
    this.typeCounts[type] = (this.typeCounts[type] + 1) % this.maxOfEachType;
    return nextIdx;
  };

  drawPoint(pointAndColor) {
    this.pushPointData(this.nextIdxFor(POINT), pointAndColor);
  }

  drawTriangle([[x, y, _], color]) {
    const twoPreviousPoints = this.popTemporaries(2).map(
      ([[x, y, _], color]) => [x, y, 0, ...color]
    );

    this.pushPointData(this.nextIdxFor(TRIANGLE), [
      x,
      y,
      0,
      ...color,
      ...flatten(twoPreviousPoints),
    ]);
  }

  drawCircle([radiusPoint, radiusColor]) {
    const [[cx, cy], centerColor] = this.popTemporaries(1)[0];
    const radius = posAndSizeLength([cx, cy], radiusPoint);

    let vertices = Array(circleVerts);
    for (let i = 0; i < circleVerts; i++) {
      vertices[i] = [
        cx + radius * Math.cos(i * circleFactor),
        cy + radius * Math.sin(i * circleFactor),
        0,
        ...radiusColor,
      ];
    }

    this.pushPointData(this.nextIdxFor(CIRCLE), [
      cx,
      cy,
      0,
      ...centerColor,
      ...flatten(vertices),
    ]);
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
    const bbox = canvas.getBoundingClientRect();
    const posAndSize = vec3(
      (2 * (e.clientX - bbox.left)) / canvas.width - 1,
      (2 * (canvas.height - e.clientY + bbox.top - 1)) / canvas.height - 1,
      startingPointSize
    );

    const pointAndColor = [posAndSize, currentDrawColor];

    switch (currentDrawMode) {
      case POINT:
        drawContext.drawPoint(pointAndColor);
        break;
      case TRIANGLE:
        if (drawContext.temporaryLengthEquals(2)) {
          drawContext.drawTriangle(pointAndColor);
        } else {
          drawContext.pushTemporary(pointAndColor);
        }
        break;
      case CIRCLE:
        if (drawContext.temporaryLengthEquals(1)) {
          drawContext.drawCircle(pointAndColor);
        } else {
          drawContext.pushTemporary(pointAndColor);
        }
        break;

      default:
        break;
    }

    drawContext.render();
  };

  clearColorBtnEl.onclick = (_el) => {
    clearColor(drawContext, parseInt(clearColorEl.value));
  };

  drawColorEl.onchange = (el) => {
    const idx = parseInt(el.target.value);
    currentDrawColor = colors[idx][1];
  };
};
window.onload = init;
