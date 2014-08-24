attribute vec4 worldCoord;
attribute float pt;

uniform mat4 mapMatrix;
uniform float pointSize;
uniform float pointAlpha;

varying float _pt;
varying float alpha;

void main() {
  // transform world coordinate by matrix uniform variable
  gl_Position = mapMatrix * worldCoord;

  gl_PointSize = pointSize;
  alpha = pointAlpha;

  _pt = pt;
}

