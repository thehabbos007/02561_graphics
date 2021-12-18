class RadialDistort {
  constructor(canvas) {
    this.gl = WebGLUtils.setupWebGL(canvas, {
      preserveDrawingBuffer: true,
    });
    let gl = this.gl;

    gl.enable(gl.BLEND);
    gl.disable(this.gl.DEPTH_TEST);

    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this.program = initShaders(
      gl,
      "brown-conrady-vert-shader",
      "brown-conrady-frag-shader"
    );
    let program = this.program;
    gl.useProgram(program);

    this.setupBuffers();

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.uDistortionFactor = gl.getUniformLocation(
      program,
      "uDistortionFactor"
    );
    this.distortWith(0);

    this.uImageTexture = gl.getUniformLocation(program, "imageTexture");

    gl.activeTexture(gl.TEXTURE0);
    this.imageTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.imageTexture);

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  setupBuffers() {
    let gl = this.gl;
    let program = this.program;

    let quadVertices = [
      vec3(-1, -1, 0),
      vec3(-1, 1, 0),
      vec3(1, 1, 0),
      vec3(1, -1, 0),
    ];

    this.posBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(quadVertices), gl.STATIC_DRAW);
    this.aPos = this.gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 3, gl.FLOAT, false, 0, 0);

    let texCoords = [
      vec2(0.0, 0.0),
      vec2(0.0, 1.0),
      vec2(1.0, 1.0),
      vec2(1.0, 0.0),
    ];

    this.texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoords), gl.STATIC_DRAW);
    this.atexCoord = this.gl.getAttribLocation(program, "aTexCoord");
    gl.enableVertexAttribArray(this.atexCoord);
    gl.vertexAttribPointer(this.atexCoord, 2, gl.FLOAT, false, 0, 0);
  }

  distortWith(distortion) {
    console.log("set distortion", distortion);
    this.gl.uniform1f(this.uDistortionFactor, distortion || 0);
  }
  draw(image) {
    let gl = this.gl;
    gl.useProgram(this.program);

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  }
}
