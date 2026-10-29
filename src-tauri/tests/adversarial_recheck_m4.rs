use app_lib::ui::*;
use std::collections::HashMap;

// ============================================================================
// Adversarial Recheck Integration Suite: Milestone M4 (Phase 5)
// ============================================================================

/// Challenge 1: Province Realignment Word Boundaries in Rust
#[test]
fn test_recheck_province_realignment_word_boundaries_rust() {
    let mut shifted = HashMap::new();
    shifted.insert(1u32, 2u32);

    let mapping = ProvinceRealignmentMap {
        shifted_provinces: shifted,
        split_provinces: HashMap::new(),
        added_provinces: vec![],
        removed_provinces: vec![],
    };

    let script = r#"
        state = {
            id = 100
            provinces = { 1 10 100 11804 }
            history = {
                victory_points = { 1 15 }
                victory_points = { 10 5 }
                victory_points = { 100 20 }
                1 = { naval_base = 3 }
                10 = { bunker = 2 }
                100 = { coastal_bunker = 2 }
            }
        }
    "#;

    let res = realign_mod_provinces(script, &mapping);

    // Verify 1 became 2
    assert!(res.modified_script.contains("provinces = { 2 10 100 11804 }"), "Provinces list must be remapped with word boundaries");
    assert!(res.modified_script.contains("id = 100"), "State ID 100 must NOT be mutated to 200");
    assert!(res.modified_script.contains("victory_points = { 2 15 }"));
    assert!(res.modified_script.contains("victory_points = { 10 5 }"));
    assert!(res.modified_script.contains("victory_points = { 100 20 }"));
    assert!(res.modified_script.contains("2 = { naval_base = 3 }"));
    assert!(res.modified_script.contains("10 = { bunker = 2 }"));
    assert!(res.modified_script.contains("100 = { coastal_bunker = 2 }"));
    assert_eq!(res.replacements_count, 3);
}

/// Challenge 1B: Cascade province remapping with descending length sorting
#[test]
fn test_recheck_province_cascade_remapping_rust() {
    let mut shifted = HashMap::new();
    shifted.insert(1u32, 10u32);
    shifted.insert(10u32, 100u32);
    shifted.insert(100u32, 9999u32);

    let mapping = ProvinceRealignmentMap {
        shifted_provinces: shifted,
        split_provinces: HashMap::new(),
        added_provinces: vec![],
        removed_provinces: vec![],
    };

    let script = "provinces = { 1 10 100 }";
    let res = realign_mod_provinces(script, &mapping);

    assert_eq!(res.modified_script, "provinces = { 10 100 9999 }");
    assert_eq!(res.replacements_count, 3);
}

/// Challenge 2: 3-Way AST Merge Add/Add Collision Conflict Classification
#[test]
fn test_recheck_3way_ast_add_add_collision_conflict_rust() {
    let base = "";
    let upstream_adds = r#"
        focus = {
            id = FOCUS_SHARED_NAME
            cost = 10
            reward = "political_power = 50"
        }
    "#;
    let mod_adds = r#"
        focus = {
            id = FOCUS_SHARED_NAME
            cost = 5
            reward = "political_power = 100"
        }
    "#;

    let diff = diff_ast_3way(base, upstream_adds, mod_adds);
    assert_eq!(diff.total_blocks, 1);
    assert_eq!(diff.conflict_count, 1, "Differing Add/Add must be counted as a conflict");
    assert_eq!(diff.auto_merged_count, 0);

    let block = &diff.blocks[0];
    assert_eq!(block.id, "FOCUS_SHARED_NAME");
    assert_eq!(block.status, "conflict");
    assert!(block.description.contains("Add/Add collision"));
    assert!(block.merged_content.as_ref().unwrap().contains("ADD/ADD COLLISION"));
}

/// Challenge 2B: 3-Way AST Merge Add/Add Identical Clean Auto-Merge
#[test]
fn test_recheck_3way_ast_add_add_identical_clean_rust() {
    let base = "";
    let identical_block = r#"
        focus = {
            id = FOCUS_IDENTICAL
            cost = 10
        }
    "#;

    let diff = diff_ast_3way(base, identical_block, identical_block);
    assert_eq!(diff.total_blocks, 1);
    assert_eq!(diff.conflict_count, 0);
    assert_eq!(diff.auto_merged_count, 1);
    assert_eq!(diff.blocks[0].status, "clean");
}

/// Challenge 3: Mod Optimizer Space Deduplication
#[test]
fn test_recheck_mod_optimizer_deduplication_rust() {
    let assets = vec![
        ModAssetEntry {
            path: "gfx/active.dds".to_string(),
            file_type: "texture".to_string(),
            size_bytes: 50000,
            hash: "shared_hash".to_string(),
        },
        ModAssetEntry {
            path: "gfx/copy_of_active.dds".to_string(),
            file_type: "texture".to_string(),
            size_bytes: 50000,
            hash: "shared_hash".to_string(),
        },
        ModAssetEntry {
            path: "sound/dead_audio_a.ogg".to_string(),
            file_type: "audio".to_string(),
            size_bytes: 1000000,
            hash: "audio_hash".to_string(),
        },
        ModAssetEntry {
            path: "sound/dead_audio_b.ogg".to_string(),
            file_type: "audio".to_string(),
            size_bytes: 1000000,
            hash: "audio_hash".to_string(),
        },
    ];

    let script = "focus = { icon = active.dds }";
    let loc_keys = vec![];

    let report = scan_mod_assets(&assets, script, &loc_keys);

    // unreferenced textures: copy_of_active.dds (50,000)
    assert_eq!(report.unreferenced_textures.len(), 1);
    // dead audio: dead_audio_a and dead_audio_b (1,000,000 + 1,000,000)
    assert_eq!(report.dead_audio.len(), 2);
    // duplicate groups: 2 groups
    assert_eq!(report.duplicate_assets.len(), 2);

    // Crucial check:
    // copy_of_active (50KB) + dead_audio_a (1MB) + dead_audio_b (1MB) = 2,050,000 bytes.
    // Duplicate passes must NOT double count copy_of_active or dead_audio_b!
    assert_eq!(report.total_reclaimable_bytes, 50000 + 1000000 + 1000000);
}

/// Challenge 4: Trigger Migration Rules in Rust
#[test]
fn test_recheck_trigger_migration_rules_rust() {
    let script = r#"
        limit = {
            is_in_faction = yes
            is_puppet = yes
            can_create_factions = yes
        }
        trigger = {
            is_in_faction = no
            is_puppet = no
        }
    "#;

    let res = migrate_deprecated_syntax(script);

    // These are all valid in HOI4 1.19.4 (`has_faction` does not exist), so nothing may be rewritten.
    assert_eq!(res.total_migrations, 0);
    assert!(res.migrated_content.contains("is_in_faction = yes"));
    assert!(res.migrated_content.contains("is_in_faction = no"));
    assert!(res.migrated_content.contains("is_puppet = yes"));
    assert!(res.migrated_content.contains("is_puppet = no"));
    assert!(res.migrated_content.contains("can_create_factions = yes"));
    assert!(!res.migrated_content.contains("has_faction"));
    assert!(!res.migrated_content.contains("is_subject"));
}
