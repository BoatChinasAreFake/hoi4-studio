use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechNodeDef {
    pub id: String,
    pub name: String,
    pub folder: String,
    pub x: i32,
    pub y: i32,
    pub research_cost: f64,
    pub start_year: i32,
    #[serde(default)]
    pub dependencies: Vec<String>,
    #[serde(default)]
    pub mutually_exclusive: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TechValidationResult {
    pub is_valid: bool,
    pub cycle_detected: bool,
    pub cyclic_nodes: Vec<String>,
    pub mutual_exclusion_conflicts: Vec<String>,
    pub orphan_dependencies: Vec<String>,
    pub coordinate_collisions: Vec<String>,
}

pub fn validate_tech_tree_dag(nodes: &[TechNodeDef]) -> TechValidationResult {
    let mut node_map: HashMap<&str, &TechNodeDef> = HashMap::new();
    let mut coord_map: HashMap<(String, i32, i32), Vec<&str>> = HashMap::new();
    let mut orphan_deps = Vec::new();
    let mut coord_collisions = Vec::new();

    for n in nodes {
        node_map.insert(&n.id, n);
        coord_map
            .entry((n.folder.clone(), n.x, n.y))
            .or_default()
            .push(&n.id);
    }

    // Check coordinate collisions within the same folder
    for ((folder, x, y), ids) in coord_map {
        if ids.len() > 1 {
            coord_collisions.push(format!(
                "Folder '{}' has overlapping techs {:?} at coordinate ({}, {})",
                folder, ids, x, y
            ));
        }
    }

    // Check orphan dependencies
    for n in nodes {
        for dep in &n.dependencies {
            if !node_map.contains_key(dep.as_str()) {
                orphan_deps.push(format!("Tech '{}' requires non-existent tech '{}'", n.id, dep));
            }
        }
    }

    // Cycle detection via Kahn's algorithm (topological sort)
    let mut in_degree: HashMap<&str, usize> = HashMap::new();
    let mut adj: HashMap<&str, Vec<&str>> = HashMap::new();

    for n in nodes {
        in_degree.entry(&n.id).or_insert(0);
        for dep in &n.dependencies {
            if node_map.contains_key(dep.as_str()) {
                adj.entry(dep.as_str()).or_default().push(&n.id);
                *in_degree.entry(&n.id).or_insert(0) += 1;
            }
        }
    }

    let mut queue = VecDeque::new();
    for (id, &deg) in &in_degree {
        if deg == 0 {
            queue.push_back(*id);
        }
    }

    let mut visited_count = 0;
    while let Some(curr) = queue.pop_front() {
        visited_count += 1;
        if let Some(neighbors) = adj.get(curr) {
            for &next in neighbors {
                if let Some(deg) = in_degree.get_mut(next) {
                    *deg -= 1;
                    if *deg == 0 {
                        queue.push_back(next);
                    }
                }
            }
        }
    }

    let cycle_detected = visited_count < nodes.len();
    let cyclic_nodes: Vec<String> = if cycle_detected {
        in_degree
            .iter()
            .filter(|(_, deg)| **deg > 0)
            .map(|(&id, _)| id.to_string())
            .collect()
    } else {
        Vec::new()
    };

    // Mutual exclusion conflicts (e.g. A requires B, but A is mutually exclusive with B)
    let mut me_conflicts = Vec::new();
    for n in nodes {
        for mut_id in &n.mutually_exclusive {
            if n.dependencies.contains(mut_id) {
                me_conflicts.push(format!(
                    "Tech '{}' requires '{}' as prerequisite but also declares it mutually exclusive",
                    n.id, mut_id
                ));
            }
        }
    }

    let is_valid = !cycle_detected && orphan_deps.is_empty() && coord_collisions.is_empty() && me_conflicts.is_empty();

    TechValidationResult {
        is_valid,
        cycle_detected,
        cyclic_nodes,
        mutual_exclusion_conflicts: me_conflicts,
        orphan_dependencies: orphan_deps,
        coordinate_collisions: coord_collisions,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ResearchCalculationResult {
    pub base_days: f64,
    pub ahead_penalty_factor: f64,
    pub bonus_factor: f64,
    pub final_research_days: f64,
    pub is_ahead_of_time: bool,
}

pub fn calculate_research_cost(
    base_cost: f64, // e.g. 2.0 (standard 100 days per 1.0 = 200 base days)
    start_year: i32,
    current_year: i32,
    bonus_percent: f64, // e.g. 50.0 for 50% discount
    penalty_per_year: f64, // default 2.0 per ahead year in HOI4
) -> ResearchCalculationResult {
    let base_days = base_cost * 100.0;
    let years_ahead = (start_year - current_year).max(0);
    let is_ahead = years_ahead > 0;

    // In HOI4: ahead penalty multiplies time: (1 + years_ahead * 2.0)
    let ahead_penalty_factor = if is_ahead {
        1.0 + (years_ahead as f64 * penalty_per_year)
    } else {
        1.0
    };

    // Bonus reduces required time: (1 - bonus_percent / 100)
    let bonus_factor = (1.0 - (bonus_percent / 100.0)).max(0.1);

    let final_days = base_days * ahead_penalty_factor * bonus_factor;

    ResearchCalculationResult {
        base_days,
        ahead_penalty_factor: (ahead_penalty_factor * 100.0).round() / 100.0,
        bonus_factor: (bonus_factor * 100.0).round() / 100.0,
        final_research_days: (final_days * 10.0).round() / 10.0,
        is_ahead_of_time: is_ahead,
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarketDeliverySchedule {
    pub total_contract_cost: f64,
    pub subsidized_cost: f64,
    pub daily_civ_factories_allocated: f64,
    pub delivery_batches: u32,
    pub days_per_batch: u32,
    pub total_delivery_days: u32,
}

pub fn calculate_market_delivery(
    equipment_count: u32,
    ic_cost_per_unit: f64,
    civ_factories_paid: u32,
    subsidy_rate: f64, // e.g. 0.20 for 20% subsidy
    exchange_ratio: f64, // credits per civ factory (default 5.0)
    subsidy_speed_bonus: Option<f64>, // e.g. 0.20 for 20% delivery speed bonus
) -> MarketDeliverySchedule {
    let total_ic = (equipment_count as f64) * ic_cost_per_unit;
    let total_contract_cost = total_ic / exchange_ratio;
    let subsidized_cost = (total_contract_cost * (1.0 - subsidy_rate)).max(0.0);

    let civ_factor = (civ_factories_paid as f64).max(1.0);
    let batches = ((equipment_count as f64) / 50.0).ceil() as u32;
    let final_batches = batches.max(1);

    // Baseline 30 days per batch divided by civ factories allocated, factoring in subsidy delivery speed bonus (50% effectiveness)
    let speed_bonus_val = subsidy_speed_bonus.unwrap_or(0.0);
    let speed_bonus_rate = if speed_bonus_val > 1.0 {
        speed_bonus_val / 100.0
    } else {
        speed_bonus_val
    };
    let raw_days_per_batch = (30.0 / civ_factor) * (1.0 - speed_bonus_rate * 0.5);
    let days_per_batch = raw_days_per_batch.max(10.0).round() as u32;
    let total_days = days_per_batch * final_batches;

    MarketDeliverySchedule {
        total_contract_cost: (total_contract_cost * 10.0).round() / 10.0,
        subsidized_cost: (subsidized_cost * 10.0).round() / 10.0,
        daily_civ_factories_allocated: civ_factor,
        delivery_batches: final_batches,
        days_per_batch,
        total_delivery_days: total_days,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tech_tree_validation_clean_dag() {
        let nodes = vec![
            TechNodeDef {
                id: "infantry_weapons_1".into(),
                name: "Basic Infantry Weapons".into(),
                folder: "infantry_folder".into(),
                x: 0,
                y: 0,
                research_cost: 1.0,
                start_year: 1936,
                dependencies: vec![],
                mutually_exclusive: vec![],
            },
            TechNodeDef {
                id: "infantry_weapons_2".into(),
                name: "Improved Infantry Weapons".into(),
                folder: "infantry_folder".into(),
                x: 0,
                y: 2,
                research_cost: 1.5,
                start_year: 1939,
                dependencies: vec!["infantry_weapons_1".into()],
                mutually_exclusive: vec![],
            },
        ];

        let res = validate_tech_tree_dag(&nodes);
        assert!(res.is_valid);
        assert!(!res.cycle_detected);
        assert!(res.cyclic_nodes.is_empty());
    }

    #[test]
    fn test_tech_tree_validation_detects_cycle() {
        let nodes = vec![
            TechNodeDef {
                id: "tech_a".into(),
                name: "Tech A".into(),
                folder: "industry_folder".into(),
                x: 0,
                y: 0,
                research_cost: 1.0,
                start_year: 1936,
                dependencies: vec!["tech_b".into()],
                mutually_exclusive: vec![],
            },
            TechNodeDef {
                id: "tech_b".into(),
                name: "Tech B".into(),
                folder: "industry_folder".into(),
                x: 0,
                y: 2,
                research_cost: 1.0,
                start_year: 1937,
                dependencies: vec!["tech_a".into()],
                mutually_exclusive: vec![],
            },
        ];

        let res = validate_tech_tree_dag(&nodes);
        assert!(!res.is_valid);
        assert!(res.cycle_detected);
        assert!(res.cyclic_nodes.contains(&"tech_a".to_string()));
        assert!(res.cyclic_nodes.contains(&"tech_b".to_string()));
    }

    #[test]
    fn test_research_cost_calculation_with_ahead_penalty_and_bonus() {
        // Base cost 2.0 = 200 days, start_year 1940, current_year 1938 -> 2 years ahead
        // ahead factor = 1 + 2 * 2.0 = 5.0
        // bonus 50% = 0.50 factor
        // final days = 200 * 5.0 * 0.50 = 500 days
        let calc = calculate_research_cost(2.0, 1940, 1938, 50.0, 2.0);
        assert!(calc.is_ahead_of_time);
        assert_eq!(calc.base_days, 200.0);
        assert_eq!(calc.ahead_penalty_factor, 5.0);
        assert_eq!(calc.bonus_factor, 0.50);
        assert_eq!(calc.final_research_days, 500.0);
    }

    #[test]
    fn test_market_delivery_speed_bonus() {
        // 100 equipment at 5.0 IC cost, 1 civ factory, 20% subsidy, 5.0 exchange ratio, 20% speed bonus
        // batches = 2
        // days per batch = (30.0 / 1.0) * (1.0 - 0.20 * 0.5) = 30.0 * 0.90 = 27.0 -> 27
        // total days = 27 * 2 = 54
        let sched = calculate_market_delivery(100, 5.0, 1, 0.20, 5.0, Some(0.20));
        assert_eq!(sched.delivery_batches, 2);
        assert_eq!(sched.days_per_batch, 27);
        assert_eq!(sched.total_delivery_days, 54);
    }
}
