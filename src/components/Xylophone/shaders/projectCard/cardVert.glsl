varying vec3 vNormal;
varying vec3 vWorldPos;
varying vec3 vLocalPos;

void main() {
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * worldPos;

  vWorldPos = worldPos.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal); // cards only ever scale uniformly
  vLocalPos = position;
}
