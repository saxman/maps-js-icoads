precision mediump float;

const vec4 COLOR1 = vec4(.6, .2, .0, 1.); // red to yellow gradient
const vec4 COLOR2 = vec4(.1, .0, .2, 1.); // blue to magents gradient
const vec4 COLOR3 = vec4(.0, .3, .1, 1.); // green to cyan gradient
const vec4 COLOR4 = vec4(.0, .05, .3, 1.); // blue to cyan gradient

varying float _pt;
varying float alpha;

void main() {
  //if (_pt == 0.) {
  //	discard;
  //}

  if (_pt <= 5. ) { // ships
    gl_FragColor = COLOR1 * alpha;
  } else if (_pt <= 8. ) { // buoys
    gl_FragColor = COLOR4 * alpha;
  } else { // other
    gl_FragColor = COLOR3 * alpha;
  }
}
