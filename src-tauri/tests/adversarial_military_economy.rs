use app_lib::military::*;
use app_lib::economy::*;

#[test]
fn test_adversarial_tech_tree_dag_self_loop_and_cycles() {
    // 1. Self loop
    let self_loop = vec![TechNodeDef {
        id: "self_loop".into(),
        name: "Self Loop".into(),
        folder: "armor_folder".into(),
        x: 0,
        y: 0,
        research_cost: 1.0,
        start_year: 1936,
        dependencies: vec!["self_loop".into()],
        mutually_exclusive: vec![],
    }];

    let res = validate_tech_tree_dag(&self_loop);
    assert!(!res.is_valid);
    assert!(res.cycle_detected);
    assert!(res.cyclic_nodes.contains(&"self_loop".to_string()));

    // 2. 3-node cycle (A -> B -> C -> A)
    let cycle = vec![
        TechNodeDef {
            id: "node_a".into(),
            name: "Node A".into(),
            folder: "infantry_folder".into(),
            x: 0,
            y: 0,
            research_cost: 1.0,
            start_year: 1936,
            dependencies: vec!["node_c".into()],
            mutually_exclusive: vec![],
        },
        TechNodeDef {
            id: "node_b".into(),
            name: "Node B".into(),
            folder: "infantry_folder".into(),
            x: 1,
            y: 1,
            research_cost: 1.0,
            start_year: 1937,
            dependencies: vec!["node_a".into()],
            mutually_exclusive: vec![],
        },
        TechNodeDef {
            id: "node_c".into(),
            name: "Node C".into(),
            folder: "infantry_folder".into(),
            x: 2,
            y: 2,
            research_cost: 1.0,
            start_year: 1938,
            dependencies: vec!["node_b".into()],
            mutually_exclusive: vec![],
        },
    ];

    let res_cycle = validate_tech_tree_dag(&cycle);
    assert!(!res_cycle.is_valid);
    assert!(res_cycle.cycle_detected);
    assert_eq!(res_cycle.cyclic_nodes.len(), 3);

    // 3. Empty DAG
    let res_empty = validate_tech_tree_dag(&[]);
    assert!(res_empty.is_valid);
    assert!(!res_empty.cycle_detected);
}

#[test]
fn test_adversarial_plane_chassis_thrust_boundary() {
    let balanced_plane = ChassisDef {
        id: "fighter_balanced".into(),
        name: "Fighter Balanced".into(),
        category: "plane".into(),
        chassis_type: "small_plane_airframe".into(),
        base_stats: ModuleStatDelta {
            weight: Some(20.0),
            thrust: Some(0.0),
            maximum_speed: Some(500.0),
            production_cost: Some(15.0),
            ..Default::default()
        },
        armor_level: 0,
        engine_level: 0,
        modules: vec![
            ModuleDef {
                id: "engine_25".into(),
                name: "25kN Engine".into(),
                category: "plane".into(),
                slot_type: "plane_engine".into(),
                stats: ModuleStatDelta {
                    thrust: Some(25.0),
                    production_cost: Some(5.0),
                    ..Default::default()
                },
                multipliers: Default::default(),
            },
            ModuleDef {
                id: "cannon_5w".into(),
                name: "5kg Gun".into(),
                category: "plane".into(),
                slot_type: "plane_weapon".into(),
                stats: ModuleStatDelta {
                    weight: Some(5.0), // total weight: 20 + 5 = 25 == thrust 25
                    air_attack: Some(20.0),
                    ..Default::default()
                },
                multipliers: Default::default(),
            },
        ],
    };

    let stats = calculate_composite_chassis_stats(&balanced_plane);
    assert!(stats.is_valid);
    assert_eq!(stats.thrust, 25.0);
    assert_eq!(stats.weight, 25.0);
}

#[test]
fn test_adversarial_division_rollup_empty_and_support_only() {
    // 1. Completely empty template
    let empty_template = DivisionTemplateDef {
        name: "Empty".into(),
        grid: vec![vec![None; 5]; 5],
        support_companies: vec![],
        regimental_attachments: vec![],
    };

    let stats_empty = calculate_division_stats(&empty_template);
    assert_eq!(stats_empty.total_battalions, 0);
    assert_eq!(stats_empty.combat_width, 0.0);
    assert_eq!(stats_empty.organization, 0.0);
    assert_eq!(stats_empty.maximum_speed, 0.0);

    // 2. Support-only division
    let engineer = BattalionDef {
        id: "engineer".into(),
        name: "Engineer Support".into(),
        is_support: true,
        combat_width: 0.0,
        manpower: 300.0,
        max_hp: 2.0,
        organization: 20.0,
        soft_attack: 4.0,
        hard_attack: 2.0,
        defense: 12.0,
        breakthrough: 5.0,
        armor: 0.0,
        piercing: 5.0,
        maximum_speed: 4.0,
        supply_consumption: 0.02,
        training_time: 90.0,
    };

    let support_only_template = DivisionTemplateDef {
        name: "Support Only".into(),
        grid: vec![vec![None; 5]; 5],
        support_companies: vec![Some(engineer)],
        regimental_attachments: vec![],
    };

    let stats_support = calculate_division_stats(&support_only_template);
    assert_eq!(stats_support.total_battalions, 0);
    assert_eq!(stats_support.total_support_companies, 1);
    assert_eq!(stats_support.combat_width, 0.0);
    assert_eq!(stats_support.maximum_speed, 4.0);
    assert_eq!(stats_support.organization, 20.0);
}

#[test]
fn test_adversarial_market_and_research_bounds() {
    // Research cost: 10 years ahead, 2.0 base cost
    let research = calculate_research_cost(2.0, 1946, 1936, 0.0, 2.0);
    assert!(research.is_ahead_of_time);
    assert_eq!(research.ahead_penalty_factor, 21.0);
    assert_eq!(research.final_research_days, 4200.0);

    // Market: 0 civ factories allocation (should clamp to 1 factory min)
    let market = calculate_market_delivery(100, 5.0, 0, 0.0, 5.0, None);
    assert_eq!(market.delivery_batches, 2);
    assert_eq!(market.daily_civ_factories_allocated, 1.0);
    assert_eq!(market.total_delivery_days, 60); // 30 days per batch * 2 batches = 60 days

    // Market with subsidy speed bonus: 20% speed discount -> 27 days per batch * 2 = 54 days
    let market_subsidized = calculate_market_delivery(100, 5.0, 0, 0.0, 5.0, Some(0.20));
    assert_eq!(market_subsidized.days_per_batch, 27);
    assert_eq!(market_subsidized.total_delivery_days, 54);
}
