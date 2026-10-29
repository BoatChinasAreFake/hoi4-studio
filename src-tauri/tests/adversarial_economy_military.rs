use app_lib::economy::*;
use app_lib::military::*;

#[test]
fn test_adversarial_tech_tree_complex_cycles_and_self_loops() {
    // 1. Self-loop: A -> A
    let self_loop_nodes = vec![TechNodeDef {
        id: "infantry_loop".into(),
        name: "Looping Infantry".into(),
        folder: "infantry_folder".into(),
        x: 0,
        y: 0,
        research_cost: 1.0,
        start_year: 1936,
        dependencies: vec!["infantry_loop".into()],
        mutually_exclusive: vec![],
    }];
    let res = validate_tech_tree_dag(&self_loop_nodes);
    assert!(!res.is_valid, "Self loop must be invalid");
    assert!(res.cycle_detected, "Self loop must be detected as cycle");
    assert!(res.cyclic_nodes.contains(&"infantry_loop".to_string()));

    // 2. 3-Node cycle: A -> B -> C -> A
    let three_cycle_nodes = vec![
        TechNodeDef {
            id: "tank_a".into(),
            name: "Tank A".into(),
            folder: "armor_folder".into(),
            x: 0,
            y: 0,
            research_cost: 1.0,
            start_year: 1936,
            dependencies: vec!["tank_c".into()],
            mutually_exclusive: vec![],
        },
        TechNodeDef {
            id: "tank_b".into(),
            name: "Tank B".into(),
            folder: "armor_folder".into(),
            x: 1,
            y: 0,
            research_cost: 1.0,
            start_year: 1937,
            dependencies: vec!["tank_a".into()],
            mutually_exclusive: vec![],
        },
        TechNodeDef {
            id: "tank_c".into(),
            name: "Tank C".into(),
            folder: "armor_folder".into(),
            x: 2,
            y: 0,
            research_cost: 1.0,
            start_year: 1938,
            dependencies: vec!["tank_b".into()],
            mutually_exclusive: vec![],
        },
    ];
    let res = validate_tech_tree_dag(&three_cycle_nodes);
    assert!(!res.is_valid);
    assert!(res.cycle_detected);
    assert_eq!(res.cyclic_nodes.len(), 3);
    assert!(res.cyclic_nodes.contains(&"tank_a".to_string()));
    assert!(res.cyclic_nodes.contains(&"tank_b".to_string()));
    assert!(res.cyclic_nodes.contains(&"tank_c".to_string()));

    // 3. Disjoint graph: clean component + cyclic component
    let mixed_nodes = vec![
        // Clean chain: clean_1 -> clean_2
        TechNodeDef {
            id: "clean_1".into(),
            name: "Clean 1".into(),
            folder: "industry_folder".into(),
            x: 0,
            y: 0,
            research_cost: 1.0,
            start_year: 1936,
            dependencies: vec![],
            mutually_exclusive: vec![],
        },
        TechNodeDef {
            id: "clean_2".into(),
            name: "Clean 2".into(),
            folder: "industry_folder".into(),
            x: 0,
            y: 1,
            research_cost: 1.0,
            start_year: 1937,
            dependencies: vec!["clean_1".into()],
            mutually_exclusive: vec![],
        },
        // Cyclic pair: bad_1 <-> bad_2
        TechNodeDef {
            id: "bad_1".into(),
            name: "Bad 1".into(),
            folder: "industry_folder".into(),
            x: 2,
            y: 0,
            research_cost: 1.0,
            start_year: 1936,
            dependencies: vec!["bad_2".into()],
            mutually_exclusive: vec![],
        },
        TechNodeDef {
            id: "bad_2".into(),
            name: "Bad 2".into(),
            folder: "industry_folder".into(),
            x: 2,
            y: 1,
            research_cost: 1.0,
            start_year: 1937,
            dependencies: vec!["bad_1".into()],
            mutually_exclusive: vec![],
        },
    ];
    let res = validate_tech_tree_dag(&mixed_nodes);
    assert!(!res.is_valid);
    assert!(res.cycle_detected);
    assert_eq!(res.cyclic_nodes.len(), 2);
    assert!(res.cyclic_nodes.contains(&"bad_1".to_string()));
    assert!(res.cyclic_nodes.contains(&"bad_2".to_string()));
    assert!(!res.cyclic_nodes.contains(&"clean_1".to_string()));
    assert!(!res.cyclic_nodes.contains(&"clean_2".to_string()));
}

#[test]
fn test_adversarial_tech_tree_grid_collisions_and_folder_isolation() {
    // 1. Same coordinates in SAME folder -> collision
    let colliding_nodes = vec![
        TechNodeDef {
            id: "plane_fighter_1".into(),
            name: "Basic Fighter".into(),
            folder: "air_techs_folder".into(),
            x: 1,
            y: 2,
            research_cost: 1.0,
            start_year: 1936,
            dependencies: vec![],
            mutually_exclusive: vec![],
        },
        TechNodeDef {
            id: "plane_cas_1".into(),
            name: "Basic CAS".into(),
            folder: "air_techs_folder".into(),
            x: 1,
            y: 2, // SAME coordinate (1, 2) in air_techs_folder!
            research_cost: 1.0,
            start_year: 1936,
            dependencies: vec![],
            mutually_exclusive: vec![],
        },
    ];
    let res = validate_tech_tree_dag(&colliding_nodes);
    assert!(!res.is_valid);
    assert_eq!(res.coordinate_collisions.len(), 1);
    assert!(res.coordinate_collisions[0].contains("air_techs_folder"));

    // 2. Same coordinates in DIFFERENT folders -> NO collision
    let non_colliding_cross_folder = vec![
        TechNodeDef {
            id: "infantry_1".into(),
            name: "Infantry 1".into(),
            folder: "infantry_folder".into(),
            x: 2,
            y: 3,
            research_cost: 1.0,
            start_year: 1936,
            dependencies: vec![],
            mutually_exclusive: vec![],
        },
        TechNodeDef {
            id: "naval_1".into(),
            name: "Naval 1".into(),
            folder: "naval_folder".into(),
            x: 2,
            y: 3, // Same (2, 3), but distinct folder!
            research_cost: 1.0,
            start_year: 1936,
            dependencies: vec![],
            mutually_exclusive: vec![],
        },
    ];
    let res = validate_tech_tree_dag(&non_colliding_cross_folder);
    assert!(res.is_valid);
    assert!(res.coordinate_collisions.is_empty());
}

#[test]
fn test_adversarial_orphan_dependencies_and_xor_conflicts() {
    // 1. Orphan dependencies
    let orphan_nodes = vec![TechNodeDef {
        id: "tech_orphan_child".into(),
        name: "Child of Ghost".into(),
        folder: "electronics_folder".into(),
        x: 0,
        y: 0,
        research_cost: 1.0,
        start_year: 1936,
        dependencies: vec!["non_existent_super_tech".into(), "another_missing_tech".into()],
        mutually_exclusive: vec![],
    }];
    let res = validate_tech_tree_dag(&orphan_nodes);
    assert!(!res.is_valid);
    assert_eq!(res.orphan_dependencies.len(), 2);
    assert!(res.orphan_dependencies[0].contains("non_existent_super_tech") || res.orphan_dependencies[1].contains("non_existent_super_tech"));

    // 2. Mutual exclusion conflict: Tech A requires Tech B but also declares Tech B mutually exclusive
    let xor_conflict_nodes = vec![
        TechNodeDef {
            id: "tech_parent".into(),
            name: "Tech Parent".into(),
            folder: "artillery_folder".into(),
            x: 0,
            y: 0,
            research_cost: 1.0,
            start_year: 1936,
            dependencies: vec![],
            mutually_exclusive: vec![],
        },
        TechNodeDef {
            id: "tech_conflicted".into(),
            name: "Tech Conflicted".into(),
            folder: "artillery_folder".into(),
            x: 0,
            y: 1,
            research_cost: 1.0,
            start_year: 1937,
            dependencies: vec!["tech_parent".into()],
            mutually_exclusive: vec!["tech_parent".into()],
        },
    ];
    let res = validate_tech_tree_dag(&xor_conflict_nodes);
    assert!(!res.is_valid);
    assert_eq!(res.mutual_exclusion_conflicts.len(), 1);
    assert!(res.mutual_exclusion_conflicts[0].contains("tech_parent"));
}

#[test]
fn test_adversarial_research_cost_math_aot_and_bonus_reductions() {
    // Test on-time research (years_ahead = 0)
    let on_time = calculate_research_cost(1.5, 1936, 1938, 0.0, 2.0);
    assert!(!on_time.is_ahead_of_time);
    assert_eq!(on_time.base_days, 165.0);
    assert_eq!(on_time.ahead_penalty_factor, 1.0);
    assert_eq!(on_time.bonus_factor, 1.0);
    assert_eq!(on_time.final_research_days, 165.0);

    // Test 1 year ahead (penalty = 1 + 1 * 2.0 = 3.0)
    let one_year = calculate_research_cost(2.0, 1939, 1938, 0.0, 2.0);
    assert!(one_year.is_ahead_of_time);
    assert_eq!(one_year.ahead_penalty_factor, 3.0);
    assert_eq!(one_year.final_research_days, 660.0);

    // Test 3 years ahead with 75% national bonus
    // base_days = 220, ahead = 1 + 3 * 2 = 7.0, bonus adds to speed: factor = 1 / 1.75
    // final = 220 * 7.0 / 1.75 = 880 days
    let three_years = calculate_research_cost(2.0, 1941, 1938, 75.0, 2.0);
    assert!(three_years.is_ahead_of_time);
    assert_eq!(three_years.ahead_penalty_factor, 7.0);
    assert_eq!(three_years.bonus_factor, 0.57);
    assert_eq!(three_years.final_research_days, 880.0);

    // A 150% bonus is speed 2.5 -> time factor 0.4 (MIN_RESEARCH_SPEED = 0.1 only floors total speed)
    let clamped_bonus = calculate_research_cost(1.0, 1936, 1936, 150.0, 2.0);
    assert_eq!(clamped_bonus.bonus_factor, 0.4);
    assert_eq!(clamped_bonus.final_research_days, 44.0);
}

#[test]
fn test_adversarial_market_delivery_schedule_calculations() {
    // Test 50 units (exactly 1 batch)
    let sched_50 = calculate_market_delivery(50, 4.0, 1, 0.0, 5.0, None);
    assert_eq!(sched_50.delivery_batches, 1);
    assert_eq!(sched_50.total_contract_cost, 40.0);
    assert_eq!(sched_50.subsidized_cost, 40.0);

    // Test 51 units (ceil -> 2 batches)
    let sched_51 = calculate_market_delivery(51, 4.0, 1, 0.0, 5.0, None);
    assert_eq!(sched_51.delivery_batches, 2);

    // Test 0 civilian factories paid -> clamped to 1.0 (no divide by zero)
    let sched_zero_civ = calculate_market_delivery(100, 5.0, 0, 0.20, 5.0, None);
    assert_eq!(sched_zero_civ.daily_civ_factories_allocated, 1.0);
    assert_eq!(sched_zero_civ.total_contract_cost, 100.0);
    assert_eq!(sched_zero_civ.subsidized_cost, 80.0);

    // Test 100% subsidy discount
    let sched_full_subsidy = calculate_market_delivery(200, 10.0, 5, 1.0, 5.0, None);
    assert_eq!(sched_full_subsidy.subsidized_cost, 0.0);

    // Test subsidy speed bonus reduction (20% bonus -> days_per_batch = 27)
    let sched_speed = calculate_market_delivery(100, 5.0, 1, 0.0, 5.0, Some(0.20));
    assert_eq!(sched_speed.days_per_batch, 27);
    assert_eq!(sched_speed.total_delivery_days, 54);
}

#[test]
fn test_adversarial_modular_chassis_validation_extremes() {
    // Tank chassis missing main armament
    let tank_no_gun = ChassisDef {
        id: "unarmed_tank".into(),
        name: "Unarmed Tank".into(),
        category: "tank".into(),
        chassis_type: "light_tank_chassis".into(),
        base_stats: ModuleStatDelta::default(),
        armor_level: 0,
        engine_level: 0,
        modules: vec![],
    };
    let stats = calculate_composite_chassis_stats(&tank_no_gun);
    assert!(!stats.is_valid);
    assert!(stats.validation_errors.iter().any(|e| e.contains("Missing primary armament")));

    // Plane chassis with extreme weight exceeding thrust
    let overweight_plane = ChassisDef {
        id: "flying_brick".into(),
        name: "Flying Brick".into(),
        category: "plane".into(),
        chassis_type: "heavy_airframe".into(),
        base_stats: ModuleStatDelta {
            weight: Some(100.0),
            thrust: Some(10.0),
            ..Default::default()
        },
        armor_level: 0,
        engine_level: 0,
        modules: vec![
            ModuleDef {
                id: "weak_engine".into(),
                name: "Weak Engine".into(),
                category: "plane".into(),
                slot_type: "engine".into(),
                stats: ModuleStatDelta {
                    thrust: Some(5.0),
                    weight: Some(10.0),
                    ..Default::default()
                },
                multipliers: ModuleStatDelta::default(),
            },
            ModuleDef {
                id: "heavy_cannon".into(),
                name: "Heavy Cannon".into(),
                category: "plane".into(),
                slot_type: "main_armament".into(),
                stats: ModuleStatDelta {
                    weight: Some(40.0),
                    air_attack: Some(50.0),
                    ..Default::default()
                },
                multipliers: ModuleStatDelta::default(),
            },
        ],
    };
    let plane_stats = calculate_composite_chassis_stats(&overweight_plane);
    assert!(!plane_stats.is_valid);
    assert!(plane_stats.validation_errors.iter().any(|e| e.contains("Thrust deficit")));
}
