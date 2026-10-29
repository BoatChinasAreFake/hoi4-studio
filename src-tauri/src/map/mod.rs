use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Coord {
    pub x: i32,
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvinceSliceResult {
    pub new_province_id: u32,
    pub rgb: [u8; 3],
    pub component_a: Vec<Coord>,
    pub component_b: Vec<Coord>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RiverRasterizeResult {
    pub pixels: Vec<[i32; 2]>,
    pub valid_1px: bool,
    pub violations: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MapValidationResult {
    pub duplicate_rgbs: Vec<String>,
    pub rogue_pixels: Vec<String>,
    pub river_bottlenecks: Vec<String>,
    pub is_clean: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SupplyConnectivityResult {
    pub connected_nodes: Vec<u32>,
    pub disconnected_nodes: Vec<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RailwayLine {
    pub level: u8,
    pub provinces: Vec<u32>,
}

/// Generates a guaranteed-unique 24-bit RGB triplet avoiding reserved Paradox colors
pub fn generate_unique_rgb(existing: &HashSet<[u8; 3]>) -> [u8; 3] {
    let is_reserved = |r: u8, g: u8, b: u8| -> bool {
        (r == 0 && g == 0 && b == 0) // Void / separator
            || (r == 0 && g == 255 && b == 0) // River source
            || (r == 255 && g == 0 && b == 0) // River mouth
            || (r == 255 && g == 252 && b == 0) // River flow
    };

    // Deterministic pseudo-random generation based on existing count
    let mut seed = (existing.len() as u64).wrapping_mul(6364136223846793005).wrapping_add(1);
    for _ in 0..10000 {
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        let r = ((seed >> 16) % 254 + 1) as u8;
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        let g = ((seed >> 24) % 254 + 1) as u8;
        seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        let b = ((seed >> 32) % 254 + 1) as u8;

        let candidate = [r, g, b];
        if !is_reserved(r, g, b) && !existing.contains(&candidate) {
            return candidate;
        }
    }

    // Fallback exhaustive search
    for r in 1..255 {
        for g in 1..255 {
            for b in 1..255 {
                let candidate = [r, g, b];
                if !is_reserved(r, g, b) && !existing.contains(&candidate) {
                    return candidate;
                }
            }
        }
    }

    [128, 128, 128]
}

/// Slices a province polygon along a 2-point cut line
pub fn slice_province_geom(
    polygon: &[Coord],
    cut_line: &[Coord],
    existing_max_id: u32,
    existing_colors: &HashSet<[u8; 3]>,
) -> ProvinceSliceResult {
    let new_id = existing_max_id + 1;
    let new_rgb = generate_unique_rgb(existing_colors);

    if cut_line.len() < 2 || polygon.len() < 3 {
        return ProvinceSliceResult {
            new_province_id: new_id,
            rgb: new_rgb,
            component_a: polygon.to_vec(),
            component_b: polygon.to_vec(),
        };
    }

    // Line equation: A*x + B*y + C = 0
    let p0 = &cut_line[0];
    let p1 = &cut_line[1];
    let dx = (p1.x - p0.x) as i64;
    let dy = (p1.y - p0.y) as i64;
    let a = -dy;
    let b = dx;
    let c = -(a * (p0.x as i64) + b * (p0.y as i64));

    let mut side_a = Vec::new();
    let mut side_b = Vec::new();

    for i in 0..polygon.len() {
        let pt1 = &polygon[i];
        let pt2 = &polygon[(i + 1) % polygon.len()];

        let dist1 = a * (pt1.x as i64) + b * (pt1.y as i64) + c;
        let dist2 = a * (pt2.x as i64) + b * (pt2.y as i64) + c;

        if dist1 >= 0 {
            side_a.push(pt1.clone());
        } else {
            side_b.push(pt1.clone());
        }

        if (dist1 > 0 && dist2 < 0) || (dist1 < 0 && dist2 > 0) {
            let denom = dist1 - dist2;
            let ix = pt1.x as i64 + (dist1 * (pt2.x as i64 - pt1.x as i64)) / denom;
            let iy = pt1.y as i64 + (dist1 * (pt2.y as i64 - pt1.y as i64)) / denom;
            let intersect = Coord { x: ix as i32, y: iy as i32 };
            side_a.push(intersect.clone());
            side_b.push(intersect);
        }
    }

    if side_a.len() < 3 || side_b.len() < 3 {
        let half = polygon.len() / 2;
        return ProvinceSliceResult {
            new_province_id: new_id,
            rgb: new_rgb,
            component_a: polygon[..=half].to_vec(),
            component_b: polygon[half..].to_vec(),
        };
    }

    ProvinceSliceResult {
        new_province_id: new_id,
        rgb: new_rgb,
        component_a: side_a,
        component_b: side_b,
    }
}

/// Bresenham line algorithm
pub fn bresenham_line(x0: i32, y0: i32, x1: i32, y1: i32) -> Vec<[i32; 2]> {
    let mut points = Vec::new();
    let dx = (x1 - x0).abs();
    let dy = (y1 - y0).abs();
    let sx = if x0 < x1 { 1 } else { -1 };
    let sy = if y0 < y1 { 1 } else { -1 };
    let mut err = dx - dy;

    let mut cx = x0;
    let mut cy = y0;

    loop {
        points.push([cx, cy]);
        if cx == x1 && cy == y1 {
            break;
        }
        let e2 = 2 * err;
        if e2 > -dy {
            err -= dy;
            cx += sx;
        }
        if e2 < dx {
            err += dx;
            cy += sy;
        }
    }

    points
}

/// Prunes 2x2 blocks from a pixel path to strictly guarantee 1px topological width
pub fn prune_2x2_pixel_blocks(pixels: &[[i32; 2]]) -> Vec<[i32; 2]> {
    if pixels.len() <= 3 {
        return pixels.to_vec();
    }

    let mut set: HashSet<[i32; 2]> = pixels.iter().copied().collect();
    let start = pixels[0];
    let end = pixels[pixels.len() - 1];

    let mut iterations = 0;
    while iterations < 20 {
        let mut clusters = Vec::new();
        for &p in &set {
            if set.contains(&[p[0] + 1, p[1]])
                && set.contains(&[p[0], p[1] + 1])
                && set.contains(&[p[0] + 1, p[1] + 1])
            {
                clusters.push(p);
            }
        }

        if clusters.is_empty() {
            break;
        }

        for c in clusters {
            let candidates = [[c[0] + 1, c[1]], [c[0], c[1] + 1]];
            for cand in candidates {
                if cand != start && cand != end && set.contains(&cand) {
                    set.remove(&cand);
                    break;
                }
            }
        }
        iterations += 1;
    }

    pixels.iter().copied().filter(|p| set.contains(p)).collect()
}

/// Rasterizes river vector points and validates 1px invariant
pub fn rasterize_river_path(points: &[Coord]) -> RiverRasterizeResult {
    if points.len() < 2 {
        return RiverRasterizeResult {
            pixels: Vec::new(),
            valid_1px: true,
            violations: Vec::new(),
        };
    }

    let mut raw_path = Vec::new();
    for i in 0..points.len() - 1 {
        let seg = bresenham_line(points[i].x, points[i].y, points[i + 1].x, points[i + 1].y);
        let start_idx = if i == 0 { 0 } else { 1 };
        for pt in &seg[start_idx..] {
            raw_path.push(*pt);
        }
    }

    // Deduplicate consecutive identical points
    let mut deduplicated = Vec::new();
    for p in raw_path {
        if deduplicated.last() != Some(&p) {
            deduplicated.push(p);
        }
    }

    let pruned = prune_2x2_pixel_blocks(&deduplicated);

    // Verify 2x2 clusters
    let set: HashSet<[i32; 2]> = pruned.iter().copied().collect();
    let mut violations = Vec::new();
    for &p in &set {
        if set.contains(&[p[0] + 1, p[1]])
            && set.contains(&[p[0], p[1] + 1])
            && set.contains(&[p[0] + 1, p[1] + 1])
        {
            violations.push(format!("Illegal 2x2 cluster at ({}, {})", p[0], p[1]));
        }
    }

    RiverRasterizeResult {
        valid_1px: violations.is_empty(),
        pixels: pruned,
        violations,
    }
}

/// Validates map layers for duplicate RGBs, rogue colors, and river bottlenecks
pub fn validate_map_data(
    definitions: &[(u32, [u8; 3])],
    rivers: &[RiverRasterizeResult],
) -> MapValidationResult {
    let mut rgb_map: HashMap<[u8; 3], Vec<u32>> = HashMap::new();
    for &(id, rgb) in definitions {
        rgb_map.entry(rgb).or_default().push(id);
    }

    let mut duplicate_rgbs = Vec::new();
    for (rgb, ids) in &rgb_map {
        if ids.len() > 1 {
            duplicate_rgbs.push(format!(
                "Duplicate RGB ({}, {}, {}) shared by provinces {:?}",
                rgb[0], rgb[1], rgb[2], ids
            ));
        }
    }

    let mut rogue_pixels = Vec::new();
    for &(id, rgb) in definitions {
        if (rgb[0] == 0 && rgb[1] == 0 && rgb[2] == 0)
            || (rgb[0] == 0 && rgb[1] == 255 && rgb[2] == 0)
            || (rgb[0] == 255 && rgb[1] == 0 && rgb[2] == 0)
            || (rgb[0] == 255 && rgb[1] == 252 && rgb[2] == 0)
        {
            rogue_pixels.push(format!(
                "Reserved Paradox color ({}, {}, {}) used by province ID {}",
                rgb[0], rgb[1], rgb[2], id
            ));
        }
    }

    let mut river_bottlenecks = Vec::new();
    for (idx, r) in rivers.iter().enumerate() {
        if !r.valid_1px {
            river_bottlenecks.push(format!("River #{} contains 2x2 block violations", idx + 1));
        }
    }

    let is_clean = duplicate_rgbs.is_empty() && rogue_pixels.is_empty() && river_bottlenecks.is_empty();

    MapValidationResult {
        duplicate_rgbs,
        rogue_pixels,
        river_bottlenecks,
        is_clean,
    }
}

/// BFS connectivity pathfinder verifying unbroken supply lines to capital
pub fn verify_supply_connectivity_graph(
    capital_prov: u32,
    railways: &[RailwayLine],
    supply_nodes: &[u32],
) -> SupplyConnectivityResult {
    let mut adj: HashMap<u32, Vec<u32>> = HashMap::new();

    for rail in railways {
        for window in rail.provinces.windows(2) {
            adj.entry(window[0]).or_default().push(window[1]);
            adj.entry(window[1]).or_default().push(window[0]);
        }
    }

    let mut reachable = HashSet::new();
    let mut queue = VecDeque::new();
    queue.push_back(capital_prov);
    reachable.insert(capital_prov);

    while let Some(current) = queue.pop_front() {
        if let Some(neighbors) = adj.get(&current) {
            for &next in neighbors {
                if reachable.insert(next) {
                    queue.push_back(next);
                }
            }
        }
    }

    let mut connected_nodes = Vec::new();
    let mut disconnected_nodes = Vec::new();

    for &node in supply_nodes {
        if reachable.contains(&node) {
            connected_nodes.push(node);
        } else {
            disconnected_nodes.push(node);
        }
    }

    SupplyConnectivityResult {
        connected_nodes,
        disconnected_nodes,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_unique_rgb_generation() {
        let mut existing = HashSet::new();
        existing.insert([100, 100, 100]);
        let color = generate_unique_rgb(&existing);
        assert!(!existing.contains(&color));
        assert_ne!(color, [0, 0, 0]);
        assert_ne!(color, [0, 255, 0]);
        assert_ne!(color, [255, 0, 0]);
        assert_ne!(color, [255, 252, 0]);
    }

    #[test]
    fn test_rasterize_river_1px_clean() {
        let points = vec![
            Coord { x: 10, y: 10 },
            Coord { x: 15, y: 15 },
            Coord { x: 20, y: 25 },
        ];
        let result = rasterize_river_path(&points);
        assert!(result.valid_1px);
        assert_eq!(result.violations.len(), 0);
        assert!(!result.pixels.is_empty());
    }

    #[test]
    fn test_supply_connectivity_bfs() {
        let railways = vec![
            RailwayLine { level: 2, provinces: vec![101, 102, 103] },
            RailwayLine { level: 1, provinces: vec![103, 104] },
            RailwayLine { level: 1, provinces: vec![201, 202] }, // Isolated
        ];
        let supply_nodes = vec![102, 104, 202];
        let report = verify_supply_connectivity_graph(101, &railways, &supply_nodes);

        assert_eq!(report.connected_nodes, vec![102, 104]);
        assert_eq!(report.disconnected_nodes, vec![202]);
    }

    #[test]
    fn test_adversarial_river_rasterizer_loops_and_angles() {
        // Self-intersecting figure 8 and acute turns
        let complex_river = vec![
            Coord { x: 10, y: 10 },
            Coord { x: 40, y: 40 },
            Coord { x: 40, y: 10 },
            Coord { x: 10, y: 40 },
            Coord { x: 12, y: 11 }, // Acute return
            Coord { x: 50, y: 5 },
        ];
        let res = rasterize_river_path(&complex_river);
        assert!(res.valid_1px);
        assert_eq!(res.violations.len(), 0);

        // Verify zero 2x2 clusters in pixel output
        let set: HashSet<[i32; 2]> = res.pixels.iter().copied().collect();
        for &p in &set {
            let has_cluster = set.contains(&[p[0] + 1, p[1]])
                && set.contains(&[p[0], p[1] + 1])
                && set.contains(&[p[0] + 1, p[1] + 1]);
            assert!(!has_cluster, "Found 2x2 cluster at {:?}", p);
        }
    }

    #[test]
    fn test_adversarial_unique_rgb_stress() {
        let mut existing: HashSet<[u8; 3]> = HashSet::new();
        for _ in 0..2000 {
            let color = generate_unique_rgb(&existing);
            assert!(!existing.contains(&color), "Collision on color {:?}", color);
            assert_ne!(color, [0, 0, 0]);
            assert_ne!(color, [0, 255, 0]);
            assert_ne!(color, [255, 0, 0]);
            assert_ne!(color, [255, 252, 0]);
            existing.insert(color);
        }
        assert_eq!(existing.len(), 2000);
    }

    #[test]
    fn test_adversarial_supply_connectivity_severed_chains_and_islands() {
        let capital = 1;
        // Chain 1..50 connected
        let mut chain_a = Vec::new();
        for i in 1..=50 {
            chain_a.push(i);
        }
        // Chain 51..100 severed
        let mut chain_b = Vec::new();
        for i in 51..=100 {
            chain_b.push(i);
        }
        let railways = vec![
            RailwayLine { level: 3, provinces: chain_a },
            RailwayLine { level: 2, provinces: chain_b },
            RailwayLine { level: 1, provinces: vec![200, 201, 202, 200] }, // Disconnected island loop
        ];
        let supply_nodes = vec![1, 25, 50, 51, 100, 201, 999];
        let report = verify_supply_connectivity_graph(capital, &railways, &supply_nodes);

        assert_eq!(report.connected_nodes, vec![1, 25, 50]);
        assert_eq!(report.disconnected_nodes, vec![51, 100, 201, 999]);
    }
}

