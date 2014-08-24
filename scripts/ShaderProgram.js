/**
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @param {string} opt_vertexShaderSrc The GLSL ES source code of the vertex
 *     shader to compile.
 * @param {string} opt_fragmentShaderSrc The GLSL ES source code of the fragment
 *     shader to compile.
 * @constructor
 */
var ShaderProgram = function(gl, opt_vertexShaderSrc, opt_fragmentShaderSrc) {
  // TODO: some kind of conditional sets for uniforms so won't
  //    be an error when undefined. Difficult without annoying API
  //    e.g. prog.setUniform('uniformName', ...) or catch-all proxy

  /**
   * The WebGL context.
   * @type {WebGLRenderingContext}
   * @private
   */
  this.gl_ = gl;

  /**
   * Collection of active attribute locations in this program object, keyed
   * on attribute name. Unless new shaders are linked in this program and
   * attribute locations change, use these rather than query for them.
   * @type {Object.<number>}
   */
  this.attributes = {};

  /**
   * Collection of uniform locations and setters, keyed on uniform name. Raw
   * uniform locations are at thisProgram.uniforms.uniformName.location, while
   * thisProgram.uniforms.uniformName itself is a setter, used for setting
   * scalars, vectors, or matrices, where appropriate.
   *
   * TODO(bckenny): create interface for these objects for documentation
   * @type {Object.<function>}
   */
  this.uniforms = {};

  /**
   * The vertex shader object.
   * @type {WebGLShader}
   * @private
   */
  this.vertexShader_ = gl.createShader(gl.VERTEX_SHADER);

  /**
   * The vertex shader has been successfully compiled.
   * @type {boolean}
   * @private
   */
  this.vertexCompiled_ = false;

  /**
   * The fragment shader object.
   * @type {WebGLShader}
   * @private
   */
  this.fragmentShader_ = gl.createShader(gl.FRAGMENT_SHADER);

  /**
   * The fragment shader has been successfully compiled.
   * @type {boolean}
   * @private
   */
  this.fragmentCompiled_ = false;

  /**
   * The raw WebGL program object.
   * @type {WebGLProgram}
   */
  this.program = gl.createProgram();
  gl.attachShader(this.program, this.vertexShader_);
  gl.attachShader(this.program, this.fragmentShader_);

  /**
   * The program has been successfully linked.
   * @type {boolean}
   * @private
   */
  this.programLinked_ = false;

  if (opt_vertexShaderSrc) {
    this.setVertexShader(opt_vertexShaderSrc);
  }
  if (opt_fragmentShaderSrc) {
    this.setFragmentShader(opt_fragmentShaderSrc);
  }

  this.link();
};

/**
 * Returns true if the shaders have succesfully compiled and have been linked.
 *
 * @return {boolean} The linked state of the shader program.
 */
ShaderProgram.prototype.isReady = function() {
  return this.programLinked_;
};

/**
 * Compiles a vertex or fragment shader from the supplied source code.
 *
 * @param {string} src The GLSL ES source code of the shader to compile.
 * @param {number} shaderType The type of shader to compile (vertex or
 *     fragment).
 *
 * @return {WebGLShader} The compiled shader or null if compilation failed.
 * @private
 */
ShaderProgram.prototype.compileShader_ = function(src, shader) {
  this.gl_.shaderSource(shader, src);
  this.gl_.compileShader(shader);

  var compileStatus = !!this.gl_.getShaderParameter(shader,
      this.gl_.COMPILE_STATUS);

  // invalidate current program
  this.programLinked_ = false;

  return compileStatus;
};

// TODO: relink flag?
ShaderProgram.prototype.setVertexShader = function(src) {
  this.vertexCompiled_ = this.compileShader_(src, this.vertexShader_);

  if (!this.vertexCompiled_) {
    // TODO: don't log to console by default?
    console.log('Vertex shader failed to compile. Log:');
    console.log(this.getVertexShaderInfoLog());
  }

  return this.vertexCompiled_;
};

// TODO: relink flag?
ShaderProgram.prototype.setFragmentShader = function(src) {
  this.fragmentCompiled_ = this.compileShader_(src, this.fragmentShader_);

  if (!this.fragmentCompiled_) {
    // TODO: don't log to console by default?
    console.log('Fragment shader failed to compile. Log:');
    console.log(this.getFragmentShaderInfoLog());
  }

  return this.fragmentCompiled_;
};

/**
 * Returns the contents of the information log for the currently attached
 * fragment shader, if any.
 *
 * @return {string} The shader log contents.
 */
ShaderProgram.prototype.getFragmentShaderInfoLog = function() {
  return this.gl_.getShaderInfoLog(this.fragmentShader_);
};

/**
 * Returns the contents of the information log for this program object, if any.
 *
 * @return {string} The program log contents.
 */
ShaderProgram.prototype.getProgramInfoLog = function() {
  return this.gl_.getProgramInfoLog(this.program);
};

/**
 * Returns the contents of the information log for the currently attached
 * vertex shader, if any.
 *
 * @return {string} The shader log contents.
 */
ShaderProgram.prototype.getVertexShaderInfoLog = function() {
  return this.gl_.getShaderInfoLog(this.vertexShader_);
};

/**
 * Enumerate all active attribute locations in this program object. Previous
 * enumeration of attribute locations is discarded.
 */
ShaderProgram.prototype.initAttributes = function() {
  var num = this.gl_.getProgramParameter(
      this.program, this.gl_.ACTIVE_ATTRIBUTES);

  // clear attribute locations and re-enumerate from currently linked program
  this.attributes = {};
  for (var i = 0; i < num; i++) {
    var info = this.gl_.getActiveAttrib(this.program, i);
    var loc = this.gl_.getAttribLocation(this.program, info.name);
    this.attributes[info.name] = loc;
  }
};


// TODO: doc and move somewhere?
ShaderProgram.createUniformSetter_ = function(appliedSet, setVec) {
  return function setUniform() {
    // TODO: really, no better test than this?
    if (arguments[0].length) {
      setVec(arguments[0]);
    } else {
      appliedSet(arguments);
    }
  };
};


/**
 * Autogenerates setter methods for all active uniforms in this program object.
 * When called, previously generated setter methods are discarded.
 */
ShaderProgram.prototype.initUniforms = function() {
  var gl = this.gl_;
  this.uniforms = {};

  var num = gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
  for (var i = 0; i < num; i++) {
    var info = gl.getActiveUniform(this.program, i);
    var name = info.name;
    var loc = gl.getUniformLocation(this.program, name);

    // float, vec*, or sampler uniform
    if (ShaderProgram.uniformSetters_[info.type]) {
      var setterMethod = ShaderProgram.uniformSetters_[info.type];
      var set = gl[setterMethod].bind(gl, loc);
      var appliedSet = Function.prototype.apply.bind(set, gl);
      var setVec = gl[setterMethod + 'v'].bind(gl, loc);

      this.uniforms[name] = ShaderProgram.createUniformSetter_(
          appliedSet, setVec);
      this.uniforms[name].set = set;
      this.uniforms[name].setVec = setVec;
      this.uniforms[name].location = loc;

    // matrix uniform
    } else if (ShaderProgram.uniformMatSetters_[info.type]) {
      var setterMatMethod = ShaderProgram.uniformMatSetters_[info.type];

      this.uniforms[name] = gl[setterMatMethod].bind(gl, loc, false);
      this.uniforms[name].location = loc;

    } else {
      // can't happen unless types are added to spec
      throw 'Uniform ' + name + ' has unknown type ' + info.type + '.';
    }
  }
};

/**
 * Attached the compiled vertex and fragment shaders and attempts to link them.
 *
 * @return {WebGLProgram} The linked program or null if the link fails.
 */
ShaderProgram.prototype.link = function() {
  if (!this.vertexCompiled_ || !this.fragmentCompiled_) {
    // TODO: how best to indicate failure at this point?
    // queriable which one failed? optional log?

    return;
  }

  this.gl_.linkProgram(this.program);

  this.programLinked_ = !!this.gl_.getProgramParameter(this.program,
      this.gl_.LINK_STATUS);

  if (!this.programLinked_) {
    // TODO: don't log by default?
    console.log('Program failed to link. Log:');
    console.log(this.getProgramInfoLog());
  }

  this.initAttributes();
  this.initUniforms();

  return this.programLinked_;
};

/**
 * Installs this program object as part of the current rendering state.
 */
ShaderProgram.prototype.use = function() {
  // TODO: check link status?

  this.gl_.useProgram(this.program);
};

/**
 * Checks to see whether the executables contained in this program can execute
 * given the current OpenGL state. The information generated by the validation
 * process can be accessed via thisProgram.getProgramInfoLog().
 *
 * This function is typically useful only during application development and
 * tends to be quite slow.
 *
 * @return {boolean} The validation status.
 *
 * @see http://www.khronos.org/opengles/sdk/2.0/docs/man/glValidateProgram.xml
 */
ShaderProgram.prototype.validateProgram = function() {
  this.gl_.validateProgram(this.program);
  return this.gl_.getProgramParameter(this.program, this.gl_.VALIDATE_STATUS);
};

/**
 * Create a ShaderProgram from shader source at vertUrl and fragUrl. callback
 * is called when compilation is complete.
 *
 * @param {string} vertUrl URL for vertex shader.
 * @param {string} fragUrl The URL for the fragment shader.
 * @param {Function(ShaderProgram)} callback The function called upon shader
 *     compilation completion.
 */
ShaderProgram.fromXhr = function(gl, vertUrl, fragUrl, callback) {
  // TODO: investigate each compiling immediately to break up blocking time
  // TODO: decide on XHR failure behavior
  var vertSrc;
  var fragSrc;

  function makeShader() {
    if (!vertSrc || !fragSrc) {
      return;
    }
    var program = new ShaderProgram(gl, vertSrc, fragSrc);
    callback(program);
  }

  var vertXhr = new XMLHttpRequest();
  vertXhr.open('GET', vertUrl, true);
  vertXhr.onload = function(e) {
    vertSrc = this.responseText || '';
    makeShader();
  };
  vertXhr.send();

  var fragXhr = new XMLHttpRequest();
  fragXhr.open('GET', fragUrl, true);
  fragXhr.onload = function(e) {
    fragSrc = this.responseText || '';
    makeShader();
  };
  fragXhr.send();
};

/**
 * Create a ShaderProgram from source in the script elements with ids vertId
 * and fragId. The source is loaded through .text.
 *
 * @param {WebGLRenderingContext} gl The WebGL context.
 * @param {string} vertId The id of the script containing the desired vertex
 *     shader code.
 * @param {string} fragId The id of the script containing the desired fragment
 *     shader code.
 * @return {ShaderProgram} The created ShaderProgram.
 */
ShaderProgram.fromScriptIds = function(gl, vertId, fragId) {
  // TODO: generalize to elements, but textContent doesn't get updated eg with
  //     textareas with changed values
  var vertSrc = document.getElementById(vertId).text;
  var fragSrc = document.getElementById(fragId).text;

  return new ShaderProgram(gl, vertSrc, fragSrc);
};

ShaderProgram.uniformSetters_ = (function() {
  // could inline and remove IIFE, but shouldn't matter that much either way
  var glFLOAT = 0x1406;
  var glFLOAT_VEC2 = 0x8b50;
  var glFLOAT_VEC3 = 0x8b51;
  var glFLOAT_VEC4 = 0x8b52;
  var glINT = 0x1404;
  var glINT_VEC2 = 0x8b53;
  var glINT_VEC3 = 0x8b54;
  var glINT_VEC4 = 0x8b55;
  var glBOOL = 0x8b56;
  var glBOOL_VEC2 = 0x8b57;
  var glBOOL_VEC3 = 0x8b58;
  var glBOOL_VEC4 = 0x8b59;
  var glSAMPLER_2D = 0x8b5e;
  var glSAMPLER_CUBE = 0x8b60;

  // mapping of uniform types to setter function name
  var setters = [];

  setters[glFLOAT] = 'uniform1f';
  setters[glFLOAT_VEC2] = 'uniform2f';
  setters[glFLOAT_VEC3] = 'uniform3f';
  setters[glFLOAT_VEC4] = 'uniform4f';
  setters[glINT] = 'uniform1i';
  setters[glINT_VEC2] = 'uniform2i';
  setters[glINT_VEC3] = 'uniform3i';
  setters[glINT_VEC4] = 'uniform4i';
  setters[glBOOL] = 'uniform1i';
  setters[glBOOL_VEC2] = 'uniform2i';
  setters[glBOOL_VEC3] = 'uniform3i';
  setters[glBOOL_VEC4] = 'uniform4i';
  setters[glSAMPLER_2D] = 'uniform1i';
  setters[glSAMPLER_CUBE] = 'uniform1i';

  return setters;
})();

ShaderProgram.uniformMatSetters_ = (function() {
  var glFLOAT_MAT2 = 0x8b5a;
  var glFLOAT_MAT3 = 0x8b5b;
  var glFLOAT_MAT4 = 0x8b5c;

  // mapping of uniform types to setter function name
  // matrices can only be supplied as arrays
  var matrixSetters = [];

  matrixSetters[glFLOAT_MAT2] = 'uniformMatrix2fv';
  matrixSetters[glFLOAT_MAT3] = 'uniformMatrix3fv';
  matrixSetters[glFLOAT_MAT4] = 'uniformMatrix4fv';

  return matrixSetters;
})();