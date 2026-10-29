use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ModuleStatDelta {
    pub soft_attack: Option<f64>,
    pub hard_attack: Option<f64>,
    pub defense: Option<f64>,
    pub breakthrough: Option<f64>,
    pub armor: Option<f64>,
    pub piercing: Option<f64>,
    pub maximum_speed: Option<f64>,
    pub reliability: Option<f64>,
    pub production_cost: Option<f64>,
    pub air_defense: Option<f64>,
    pub air_attack: Option<f64>,
    pub thrust: Option<f64>,
    pub weight: Option<f64>,
    pub surface_detection: Option<f64>,
    pub sub_detection: Option<f64>,
    pub surface_visibility: Option<f64>,
    pub fuel_consumption: Option<f64>,
    pub manpower: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleDef {
    pub id: String,
    pub name: String,
    pub category: String, // "tank", "plane", "ship"
    pub slot_type: String, // "main_armament", "engine", "turret", etc.
    pub stats: ModuleStatDelta,
    #[serde(default)]
    pub multipliers: ModuleStatDelta,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChassisDef {
    pub id: String,
    pub name: String,
    pub category: String, // "tank", "plane", "ship"
    pub chassis_type: String,
    pub base_stats: ModuleStatDelta,
    pub armor_level: u32,
    pub engine_level: u32,
    pub modules: Vec<ModuleDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompositeStats {
    pub soft_attack: f64,
    pub hard_attack: f64,
    pub defense: f64,
    pub breakthrough: f64,
    pub armor: f64,
    pub piercing: f64,
    pub maximum_speed: f64,
    pub reliability: f64, // percentage, e.g. 85.0
    pub production_cost: f64,
    pub air_defense: f64,
    pub air_attack: f64,
    pub thrust: f64,
    pub weight: f64,
    pub surface_detection: f64,
    pub sub_detection: f64,
    pub surface_visibility: f64,
    pub fuel_consumption: f64,
    pub manpower: f64,
    pub is_valid: bool,
    pub validation_errors: Vec<String>,
}

pub fn calculate_composite_chassis_stats(chassis: &ChassisDef) -> CompositeStats {
    let mut errors = Vec::new();

    // Base additive additions
    let mut soft_attack = chassis.base_stats.soft_attack.unwrap_or(0.0);
    let mut hard_attack = chassis.base_stats.hard_attack.unwrap_or(0.0);
    let mut defense = chassis.base_stats.defense.unwrap_or(0.0);
    let mut breakthrough = chassis.base_stats.breakthrough.unwrap_or(0.0);
    let mut armor = chassis.base_stats.armor.unwrap_or(0.0) + (chassis.armor_level as f64 * 2.5);
    let mut piercing = chassis.base_stats.piercing.unwrap_or(0.0);
    let mut speed = chassis.base_stats.maximum_speed.unwrap_or(0.0) + (chassis.engine_level as f64 * 0.4);
    let mut reliability = 100.0 + (chassis.base_stats.reliability.unwrap_or(0.0) * 100.0);
    let mut cost = chassis.base_stats.production_cost.unwrap_or(0.0)
        + (chassis.armor_level as f64 * 0.5)
        + (chassis.engine_level as f64 * 0.4);
    let mut air_defense = chassis.base_stats.air_defense.unwrap_or(0.0);
    let mut air_attack = chassis.base_stats.air_attack.unwrap_or(0.0);
    let mut thrust = chassis.base_stats.thrust.unwrap_or(0.0);
    let mut weight = chassis.base_stats.weight.unwrap_or(0.0);
    let mut surface_detection = chassis.base_stats.surface_detection.unwrap_or(0.0);
    let mut sub_detection = chassis.base_stats.sub_detection.unwrap_or(0.0);
    let mut surface_visibility = chassis.base_stats.surface_visibility.unwrap_or(0.0);
    let mut fuel_consumption = chassis.base_stats.fuel_consumption.unwrap_or(0.0);
    let mut manpower = chassis.base_stats.manpower.unwrap_or(0.0);

    // Multipliers (accumulated as product of (1 + factor))
    let mut speed_mult = 1.0;
    let mut armor_mult = 1.0;
    let mut cost_mult = 1.0;
    let mut reliability_mod_sum = 0.0;

    let mut has_engine = false;
    let mut has_weapon = false;

    for m in &chassis.modules {
        if m.slot_type == "engine" || m.slot_type == "tank_engine" || m.slot_type == "plane_engine" || m.slot_type == "ship_engine" {
            has_engine = true;
        }
        if m.slot_type == "main_armament" || m.slot_type == "plane_weapon" || m.slot_type == "ship_battery" {
            has_weapon = true;
        }

        soft_attack += m.stats.soft_attack.unwrap_or(0.0);
        hard_attack += m.stats.hard_attack.unwrap_or(0.0);
        defense += m.stats.defense.unwrap_or(0.0);
        breakthrough += m.stats.breakthrough.unwrap_or(0.0);
        armor += m.stats.armor.unwrap_or(0.0);
        piercing += m.stats.piercing.unwrap_or(0.0);
        speed += m.stats.maximum_speed.unwrap_or(0.0);
        reliability += m.stats.reliability.unwrap_or(0.0) * 100.0;
        cost += m.stats.production_cost.unwrap_or(0.0);
        air_defense += m.stats.air_defense.unwrap_or(0.0);
        air_attack += m.stats.air_attack.unwrap_or(0.0);
        thrust += m.stats.thrust.unwrap_or(0.0);
        weight += m.stats.weight.unwrap_or(0.0);
        surface_detection += m.stats.surface_detection.unwrap_or(0.0);
        sub_detection += m.stats.sub_detection.unwrap_or(0.0);
        surface_visibility += m.stats.surface_visibility.unwrap_or(0.0);
        fuel_consumption += m.stats.fuel_consumption.unwrap_or(0.0);
        manpower += m.stats.manpower.unwrap_or(0.0);

        if let Some(sm) = m.multipliers.maximum_speed {
            speed_mult *= 1.0 + sm;
        }
        if let Some(am) = m.multipliers.armor {
            armor_mult *= 1.0 + am;
        }
        if let Some(cm) = m.multipliers.production_cost {
            cost_mult *= 1.0 + cm;
        }
        if let Some(rm) = m.multipliers.reliability {
            reliability_mod_sum += rm;
        }
    }

    speed = (speed * speed_mult).max(0.0);
    armor = (armor * armor_mult).max(0.0);
    cost = (cost * cost_mult).max(1.0);
    let reliability_mult = (1.0 + reliability_mod_sum).max(0.0);
    reliability = (reliability * reliability_mult).clamp(0.0, 200.0);

    // Validation checks
    if chassis.category == "plane" {
        if thrust < weight {
            errors.push(format!(
                "Thrust deficit: Total thrust ({:.1}) is insufficient for airframe weight ({:.1})",
                thrust, weight
            ));
        }
        if !has_engine {
            errors.push("Missing required engine module".to_string());
        }
        if !has_weapon {
            errors.push("Missing primary armament or mission weapon".to_string());
        }
    } else if chassis.category == "tank" {
        if !has_weapon && !chassis.modules.iter().any(|m| m.slot_type.contains("turret") || m.slot_type.contains("gun")) {
            errors.push("Missing primary armament".to_string());
        }
    }

    let is_valid = errors.is_empty();

    CompositeStats {
        soft_attack: (soft_attack * 10.0).round() / 10.0,
        hard_attack: (hard_attack * 10.0).round() / 10.0,
        defense: (defense * 10.0).round() / 10.0,
        breakthrough: (breakthrough * 10.0).round() / 10.0,
        armor: (armor * 10.0).round() / 10.0,
        piercing: (piercing * 10.0).round() / 10.0,
        maximum_speed: (speed * 10.0).round() / 10.0,
        reliability: (reliability * 10.0).round() / 10.0,
        production_cost: (cost * 10.0).round() / 10.0,
        air_defense: (air_defense * 10.0).round() / 10.0,
        air_attack: (air_attack * 10.0).round() / 10.0,
        thrust: (thrust * 10.0).round() / 10.0,
        weight: (weight * 10.0).round() / 10.0,
        surface_detection: (surface_detection * 10.0).round() / 10.0,
        sub_detection: (sub_detection * 10.0).round() / 10.0,
        surface_visibility: (surface_visibility * 10.0).round() / 10.0,
        fuel_consumption: (fuel_consumption * 10.0).round() / 10.0,
        manpower: (manpower * 10.0).round() / 10.0,
        is_valid,
        validation_errors: errors,
    }
}

// 5x5 Division Template Types and Stat Calculations
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BattalionDef {
    pub id: String,
    pub name: String,
    pub is_support: bool,
    pub combat_width: f64,
    pub manpower: f64,
    pub max_hp: f64,
    pub organization: f64,
    pub soft_attack: f64,
    pub hard_attack: f64,
    pub defense: f64,
    pub breakthrough: f64,
    pub armor: f64,
    pub piercing: f64,
    pub maximum_speed: f64,
    pub supply_consumption: f64,
    pub training_time: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegimentalAttachmentDef {
    pub regiment_column: usize,
    pub bonus_soft_attack: f64,
    pub bonus_hard_attack: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DivisionTemplateDef {
    pub name: String,
    pub grid: Vec<Vec<Option<BattalionDef>>>, // 5 columns x 5 rows
    pub support_companies: Vec<Option<BattalionDef>>, // up to 5
    #[serde(default)]
    pub regimental_attachments: Vec<RegimentalAttachmentDef>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DivisionCompositeStats {
    pub total_battalions: usize,
    pub total_support_companies: usize,
    pub combat_width: f64,
    pub manpower: f64,
    pub max_hp: f64,
    pub organization: f64,
    pub soft_attack: f64,
    pub hard_attack: f64,
    pub defense: f64,
    pub breakthrough: f64,
    pub armor: f64,
    pub piercing: f64,
    pub maximum_speed: f64,
    pub supply_consumption: f64,
    pub training_time: f64,
}

pub fn calculate_division_stats(template: &DivisionTemplateDef) -> DivisionCompositeStats {
    let mut combat_battalions = Vec::new();
    for col in &template.grid {
        for slot in col {
            if let Some(b) = slot {
                combat_battalions.push(b.clone());
            }
        }
    }

    let mut support_companies = Vec::new();
    for s in &template.support_companies {
        if let Some(b) = s {
            support_companies.push(b.clone());
        }
    }

    let mut all_units = Vec::new();
    all_units.extend(combat_battalions.clone());
    all_units.extend(support_companies.clone());

    if all_units.is_empty() {
        return DivisionCompositeStats {
            total_battalions: 0,
            total_support_companies: 0,
            combat_width: 0.0,
            manpower: 0.0,
            max_hp: 0.0,
            organization: 0.0,
            soft_attack: 0.0,
            hard_attack: 0.0,
            defense: 0.0,
            breakthrough: 0.0,
            armor: 0.0,
            piercing: 0.0,
            maximum_speed: 0.0,
            supply_consumption: 0.0,
            training_time: 0.0,
        };
    }

    let combat_width: f64 = combat_battalions.iter().map(|b| b.combat_width).sum();
    let manpower: f64 = all_units.iter().map(|u| u.manpower).sum();
    let max_hp: f64 = all_units.iter().map(|u| u.max_hp).sum();

    // Regimental attachments add directly to attacks
    let mut bonus_soft = 0.0;
    let mut bonus_hard = 0.0;
    for att in &template.regimental_attachments {
        bonus_soft += att.bonus_soft_attack;
        bonus_hard += att.bonus_hard_attack;
    }

    let soft_attack: f64 = all_units.iter().map(|u| u.soft_attack).sum::<f64>() + bonus_soft;
    let hard_attack: f64 = all_units.iter().map(|u| u.hard_attack).sum::<f64>() + bonus_hard;
    let defense: f64 = all_units.iter().map(|u| u.defense).sum();
    let breakthrough: f64 = all_units.iter().map(|u| u.breakthrough).sum();
    let supply_consumption: f64 = all_units.iter().map(|u| u.supply_consumption).sum();

    // Organization is arithmetic average
    let total_org: f64 = all_units.iter().map(|u| u.organization).sum();
    let organization = total_org / (all_units.len() as f64);

    // Armor: 30% of highest armor + 70% of average armor
    let max_armor = all_units.iter().map(|u| u.armor).fold(0.0, f64::max);
    let avg_armor = all_units.iter().map(|u| u.armor).sum::<f64>() / (all_units.len() as f64);
    let armor = 0.3 * max_armor + 0.7 * avg_armor;

    // Piercing: 40% of highest piercing + 60% of average piercing
    let max_piercing = all_units.iter().map(|u| u.piercing).fold(0.0, f64::max);
    let avg_piercing = all_units.iter().map(|u| u.piercing).sum::<f64>() / (all_units.len() as f64);
    let piercing = 0.4 * max_piercing + 0.6 * avg_piercing;

    // Maximum speed: constrained by the slowest combat battalion (or support if 0 combat)
    let speed_units = if !combat_battalions.is_empty() {
        &combat_battalions
    } else {
        &support_companies
    };
    let maximum_speed = speed_units
        .iter()
        .map(|u| u.maximum_speed)
        .fold(f64::INFINITY, f64::min);

    let training_time = all_units
        .iter()
        .map(|u| u.training_time)
        .fold(0.0, f64::max);

    DivisionCompositeStats {
        total_battalions: combat_battalions.len(),
        total_support_companies: support_companies.len(),
        combat_width: (combat_width * 10.0).round() / 10.0,
        manpower: manpower.round(),
        max_hp: (max_hp * 10.0).round() / 10.0,
        organization: (organization * 10.0).round() / 10.0,
        soft_attack: (soft_attack * 10.0).round() / 10.0,
        hard_attack: (hard_attack * 10.0).round() / 10.0,
        defense: (defense * 10.0).round() / 10.0,
        breakthrough: (breakthrough * 10.0).round() / 10.0,
        armor: (armor * 10.0).round() / 10.0,
        piercing: (piercing * 10.0).round() / 10.0,
        maximum_speed: (maximum_speed * 10.0).round() / 10.0,
        supply_consumption: (supply_consumption * 1000.0).round() / 1000.0,
        training_time: training_time.round(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tank_chassis_composite_stats_calculation() {
        let chassis = ChassisDef {
            id: "medium_tank_1938".into(),
            name: "Basic Medium Tank".into(),
            category: "tank".into(),
            chassis_type: "medium_tank_chassis".into(),
            base_stats: ModuleStatDelta {
                soft_attack: Some(0.0),
                hard_attack: Some(0.0),
                armor: Some(50.0),
                piercing: Some(20.0),
                maximum_speed: Some(6.0),
                production_cost: Some(10.0),
                reliability: Some(0.0), // 100% baseline
                ..Default::default()
            },
            armor_level: 4, // +10 armor, +2.0 cost
            engine_level: 5, // +2.0 speed, +2.0 cost
            modules: vec![
                ModuleDef {
                    id: "medium_cannon_1".into(),
                    name: "Medium Cannon I".into(),
                    category: "tank".into(),
                    slot_type: "main_armament".into(),
                    stats: ModuleStatDelta {
                        soft_attack: Some(25.0),
                        hard_attack: Some(15.0),
                        piercing: Some(45.0),
                        production_cost: Some(4.0),
                        ..Default::default()
                    },
                    multipliers: Default::default(),
                },
                ModuleDef {
                    id: "three_man_turret".into(),
                    name: "Three-Man Medium Turret".into(),
                    category: "tank".into(),
                    slot_type: "turret".into(),
                    stats: ModuleStatDelta {
                        breakthrough: Some(18.0),
                        production_cost: Some(3.0),
                        reliability: Some(-0.10), // -10%
                        ..Default::default()
                    },
                    multipliers: Default::default(),
                },
            ],
        };

        let stats = calculate_composite_chassis_stats(&chassis);
        assert!(stats.is_valid);
        assert_eq!(stats.soft_attack, 25.0);
        assert_eq!(stats.hard_attack, 15.0);
        assert_eq!(stats.armor, 60.0); // 50 base + 4*2.5
        assert_eq!(stats.piercing, 65.0); // 20 + 45
        assert_eq!(stats.maximum_speed, 8.0); // 6.0 + 5*0.4
        assert_eq!(stats.production_cost, 21.0); // 10 + 2.0 (armor) + 2.0 (engine) + 4.0 + 3.0
        assert_eq!(stats.reliability, 90.0); // 100% - 10%
    }

    #[test]
    fn test_plane_thrust_validation_deficit() {
        let plane = ChassisDef {
            id: "fighter_1936".into(),
            name: "Basic Fighter".into(),
            category: "plane".into(),
            chassis_type: "small_plane_airframe".into(),
            base_stats: ModuleStatDelta {
                weight: Some(12.0),
                thrust: Some(0.0),
                maximum_speed: Some(450.0),
                production_cost: Some(20.0),
                ..Default::default()
            },
            armor_level: 0,
            engine_level: 0,
            modules: vec![
                ModuleDef {
                    id: "engine_1".into(),
                    name: "Single Engine I".into(),
                    category: "plane".into(),
                    slot_type: "engine".into(),
                    stats: ModuleStatDelta {
                        thrust: Some(10.0), // 10 < 12 weight!
                        production_cost: Some(4.0),
                        ..Default::default()
                    },
                    multipliers: Default::default(),
                },
                ModuleDef {
                    id: "lmg_4x".into(),
                    name: "4x Light Machine Guns".into(),
                    category: "plane".into(),
                    slot_type: "plane_weapon".into(),
                    stats: ModuleStatDelta {
                        air_attack: Some(18.0),
                        weight: Some(2.0),
                        ..Default::default()
                    },
                    multipliers: Default::default(),
                },
            ],
        };

        let stats = calculate_composite_chassis_stats(&plane);
        assert!(!stats.is_valid);
        assert!(stats.validation_errors.iter().any(|e| e.contains("Thrust deficit")));
    }

    #[test]
    fn test_division_template_stat_rollup() {
        let inf = BattalionDef {
            id: "infantry".into(),
            name: "Infantry".into(),
            is_support: false,
            combat_width: 2.0,
            manpower: 1000.0,
            max_hp: 25.0,
            organization: 60.0,
            soft_attack: 6.0,
            hard_attack: 1.0,
            defense: 22.0,
            breakthrough: 3.0,
            armor: 0.0,
            piercing: 4.0,
            maximum_speed: 4.0,
            supply_consumption: 0.07,
            training_time: 90.0,
        };

        let art = BattalionDef {
            id: "artillery_brigade".into(),
            name: "Artillery".into(),
            is_support: false,
            combat_width: 3.0,
            manpower: 500.0,
            max_hp: 0.6,
            organization: 0.0,
            soft_attack: 25.0,
            hard_attack: 2.0,
            defense: 10.0,
            breakthrough: 6.0,
            armor: 0.0,
            piercing: 5.0,
            maximum_speed: 4.0,
            supply_consumption: 0.20,
            training_time: 120.0,
        };

        let template = DivisionTemplateDef {
            name: "7-2 Standard Infantry".into(),
            grid: vec![
                vec![Some(inf.clone()), Some(inf.clone()), Some(inf.clone()), None, None],
                vec![Some(inf.clone()), Some(inf.clone()), Some(inf.clone()), None, None],
                vec![Some(inf.clone()), Some(art.clone()), Some(art.clone()), None, None],
                vec![None, None, None, None, None],
                vec![None, None, None, None, None],
            ],
            support_companies: vec![],
            regimental_attachments: vec![],
        };

        let rollup = calculate_division_stats(&template);
        assert_eq!(rollup.total_battalions, 9);
        assert_eq!(rollup.total_support_companies, 0);
        assert_eq!(rollup.combat_width, 20.0); // 7*2 + 2*3 = 20
        assert_eq!(rollup.manpower, 8000.0); // 7*1000 + 2*500 = 8000
        assert_eq!(rollup.soft_attack, 92.0); // 7*6 + 2*25 = 42 + 50 = 92
        assert_eq!(rollup.maximum_speed, 4.0);
        assert_eq!(rollup.training_time, 120.0);
        // Average org across 9 units: (7*60 + 0) / 9 = 420 / 9 = 46.7
        assert_eq!(rollup.organization, 46.7);
    }
}
