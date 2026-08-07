// Converts in-game world (x, z) coordinates into pixel positions within a map's
// SVG viewBox, using the-hideout's per-map calibration data (transform,
// coordinateRotation, bounds). Verified numerically against known Factory and
// Woods extract positions - see /run/media/system/Bazzite_HDD/DEV/.claude/plans/knowning-this-is-a-linked-snowflake.md.
//
// tarkov-dev itself renders onto a Leaflet tile pyramid, so its projected output
// lands directly in tile-pixel space. We render onto the plain vendored SVG instead,
// so the projected point is rescaled into the SVG's own viewBox by normalizing
// against the map's `bounds` corners run through the same formula.
function rotate(x, z, rotationDegrees) {
  const theta = (rotationDegrees * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  return {
    x: x * cos - z * sin,
    y: x * sin + z * cos,
  };
}

function applyTransform(rotated, transform) {
  const [a, b, c, d] = transform;
  return {
    x: a * rotated.x + b,
    y: -c * rotated.y + d,
  };
}

function projectRaw(x, z, calibration) {
  const rotated = rotate(x, z, calibration.coordinateRotation || 0);
  return applyTransform(rotated, calibration.transform);
}

// Returns {x, y} in SVG viewBox pixel space. Points near a map's edge (e.g. border
// extracts) can land slightly outside [0, svgWidth]/[0, svgHeight] since `bounds`
// is an approximate map extent, not an exact crop - callers should not clip markers
// exactly at the viewBox edge.
export function projectToSvg(worldPos, calibration, svgWidth, svgHeight) {
  const boundsSource = calibration.svgBounds || calibration.bounds;
  const [[bx0, bz0], [bx1, bz1]] = boundsSource;
  const corner0 = projectRaw(bx0, bz0, calibration);
  const corner1 = projectRaw(bx1, bz1, calibration);

  const minX = Math.min(corner0.x, corner1.x);
  const maxX = Math.max(corner0.x, corner1.x);
  const minY = Math.min(corner0.y, corner1.y);
  const maxY = Math.max(corner0.y, corner1.y);

  const point = projectRaw(worldPos.x, worldPos.z, calibration);

  return {
    x: ((point.x - minX) / (maxX - minX)) * svgWidth,
    y: ((point.y - minY) / (maxY - minY)) * svgHeight,
  };
}
