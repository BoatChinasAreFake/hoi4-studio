pub mod cst;
pub mod map;
pub mod politics;
pub mod military;
pub mod economy;
pub mod ui;

use cst::{FocusTreeParser, FocusTreeData, SurgicalMutator};
use map::{
    slice_province_geom, rasterize_river_path, validate_map_data,
    verify_supply_connectivity_graph, Coord, ProvinceSliceResult,
    RiverRasterizeResult, MapValidationResult, SupplyConnectivityResult, RailwayLine,
};
use politics::{
    scaffold_country_files, export_flags as export_flags_fn, refactor_symbol_in_files,
    validate_localization_bom as validate_bom_fn, write_localization_entry,
    CountryScaffoldConfig, CountryScaffoldResult, FlagExportResult, SymbolRefactorResult,
    SourceFileEntry, BomValidationResult,
};
use military::{
    calculate_composite_chassis_stats, calculate_division_stats as calculate_division_stats_fn,
    ChassisDef, CompositeStats, DivisionTemplateDef, DivisionCompositeStats,
};
use economy::{
    validate_tech_tree_dag, calculate_research_cost as calculate_research_cost_fn,
    calculate_market_delivery as calculate_market_delivery_fn,
    TechNodeDef, TechValidationResult, ResearchCalculationResult, MarketDeliverySchedule,
};
use std::collections::{HashMap, HashSet};

#[tauri::command]
fn parse_focus_file(content: String) -> Result<Vec<FocusTreeData>, String> {
    let mut parser = FocusTreeParser::new(&content);
    Ok(parser.parse_focus_trees())
}

#[tauri::command]
fn mutate_focus_coordinates(content: String, focus_id: String, new_x: i32, new_y: i32) -> Result<String, String> {
    SurgicalMutator::update_coordinates(&content, &focus_id, new_x, new_y)
}

#[tauri::command]
fn mutate_focus_cost(content: String, focus_id: String, new_cost: f64) -> Result<String, String> {
    SurgicalMutator::update_cost(&content, &focus_id, new_cost)
}

#[tauri::command]
fn mutate_focus_icon(content: String, focus_id: String, new_icon: String) -> Result<String, String> {
    SurgicalMutator::update_icon(&content, &focus_id, &new_icon)
}

#[tauri::command]
fn rename_focus(content: String, old_id: String, new_id: String) -> Result<String, String> {
    SurgicalMutator::rename_focus_symbol(&content, &old_id, &new_id)
}

#[tauri::command]
fn slice_province(
    polygon: Vec<Coord>,
    cut_line: Vec<Coord>,
    existing_max_id: u32,
    existing_colors: Vec<[u8; 3]>,
) -> Result<ProvinceSliceResult, String> {
    let color_set: HashSet<[u8; 3]> = existing_colors.into_iter().collect();
    Ok(slice_province_geom(&polygon, &cut_line, existing_max_id, &color_set))
}

#[tauri::command]
fn rasterize_river(points: Vec<Coord>) -> Result<RiverRasterizeResult, String> {
    Ok(rasterize_river_path(&points))
}

#[tauri::command]
fn validate_map_layer(
    definitions: Vec<(u32, [u8; 3])>,
    rivers: Vec<RiverRasterizeResult>,
) -> Result<MapValidationResult, String> {
    Ok(validate_map_data(&definitions, &rivers))
}

#[tauri::command]
fn validate_supply_connectivity(
    capital_prov: u32,
    railways: Vec<RailwayLine>,
    supply_nodes: Vec<u32>,
) -> Result<SupplyConnectivityResult, String> {
    Ok(verify_supply_connectivity_graph(capital_prov, &railways, &supply_nodes))
}

#[tauri::command]
fn scaffold_country(config: CountryScaffoldConfig) -> Result<CountryScaffoldResult, String> {
    Ok(scaffold_country_files(config))
}

#[tauri::command]
fn export_flags(tag: String, color: [u8; 3]) -> Result<FlagExportResult, String> {
    Ok(export_flags_fn(&tag, color))
}

#[tauri::command]
fn refactor_symbol(
    source_files: Vec<SourceFileEntry>,
    old_symbol: String,
    new_symbol: String,
) -> Result<SymbolRefactorResult, String> {
    Ok(refactor_symbol_in_files(&source_files, &old_symbol, &new_symbol))
}

#[tauri::command]
fn write_localization(entries: HashMap<String, String>, lang: String) -> Result<Vec<u8>, String> {
    Ok(write_localization_entry(&entries, &lang))
}

#[tauri::command]
fn validate_localization(data: Vec<u8>) -> Result<BomValidationResult, String> {
    Ok(validate_bom_fn(&data))
}

#[tauri::command]
fn calculate_chassis_stats(chassis: ChassisDef) -> Result<CompositeStats, String> {
    Ok(calculate_composite_chassis_stats(&chassis))
}

#[tauri::command]
fn calculate_division_stats(template: DivisionTemplateDef) -> Result<DivisionCompositeStats, String> {
    Ok(calculate_division_stats_fn(&template))
}

#[tauri::command]
fn validate_tech_tree(nodes: Vec<TechNodeDef>) -> Result<TechValidationResult, String> {
    Ok(validate_tech_tree_dag(&nodes))
}

#[tauri::command]
fn calculate_research_bonus(
    base_cost: f64,
    start_year: i32,
    current_year: i32,
    bonus_percent: f64,
    penalty_per_year: f64,
) -> Result<ResearchCalculationResult, String> {
    Ok(calculate_research_cost_fn(base_cost, start_year, current_year, bonus_percent, penalty_per_year))
}

#[tauri::command]
fn calculate_market_delivery_schedule(
    equipment_count: u32,
    ic_cost_per_unit: f64,
    civ_factories_paid: u32,
    subsidy_rate: f64,
    exchange_ratio: f64,
    subsidy_speed_bonus: Option<f64>,
) -> Result<MarketDeliverySchedule, String> {
    Ok(calculate_market_delivery_fn(equipment_count, ic_cost_per_unit, civ_factories_paid, subsidy_rate, exchange_ratio, subsidy_speed_bonus))
}

#[tauri::command]
fn index_gfx_assets(content: String) -> Result<ui::GfxIndexResult, String> {
    Ok(ui::index_gfx_script(&content))
}

#[tauri::command]
fn reverse_lookup_gfx(gfx_name: String, files: Vec<ui::SourceFileEntry>) -> Result<Vec<ui::GfxUsageReference>, String> {
    Ok(ui::reverse_lookup_gfx(&gfx_name, &files))
}

#[tauri::command]
fn diff_ast_3way(base_vanilla: String, updated_vanilla: String, user_mod: String) -> Result<ui::ThreeWayDiffResult, String> {
    Ok(ui::diff_ast_3way(&base_vanilla, &updated_vanilla, &user_mod))
}

#[tauri::command]
fn migrate_deprecated_triggers(script: String) -> Result<ui::MigrationResult, String> {
    Ok(ui::migrate_deprecated_syntax(&script))
}

#[tauri::command]
fn realign_provinces(old_def_csv: String, new_def_csv: String, mod_script: String) -> Result<ui::RealignmentResult, String> {
    let diff_map = ui::compute_province_diff(&old_def_csv, &new_def_csv);
    Ok(ui::realign_mod_provinces(&mod_script, &diff_map))
}

#[tauri::command]
fn export_flag_tga_batch(
    tag: String,
    base_color: [u8; 3],
    ideology_variants: Option<Vec<String>>,
) -> Result<ui::BatchFlagExportResult, String> {
    Ok(ui::export_flag_tga_batch(&tag, base_color, ideology_variants))
}

#[tauri::command]
fn scan_mod_assets(
    files: Vec<ui::ModAssetEntry>,
    script_corpus: String,
    loc_keys: Vec<String>,
) -> Result<ui::OptimizerScanReport, String> {
    Ok(ui::scan_mod_assets(&files, &script_corpus, &loc_keys))
}

#[tauri::command]
fn validate_mod_descriptor(content: String) -> Result<ui::DescriptorValidationResult, String> {
    Ok(ui::validate_mod_descriptor(&content))
}

#[tauri::command]
fn package_workshop_release(
    files: Vec<ui::ModAssetEntry>,
    ignore_patterns: Vec<String>,
) -> Result<ui::PackageReleaseReport, String> {
    Ok(ui::package_workshop_release(&files, &ignore_patterns))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        parse_focus_file,
        mutate_focus_coordinates,
        mutate_focus_cost,
        mutate_focus_icon,
        rename_focus,
        slice_province,
        rasterize_river,
        validate_map_layer,
        validate_supply_connectivity,
        scaffold_country,
        export_flags,
        refactor_symbol,
        write_localization,
        validate_localization,
        calculate_chassis_stats,
        calculate_division_stats,
        validate_tech_tree,
        calculate_research_bonus,
        calculate_market_delivery_schedule,
        index_gfx_assets,
        reverse_lookup_gfx,
        diff_ast_3way,
        migrate_deprecated_triggers,
        realign_provinces,
        export_flag_tga_batch,
        scan_mod_assets,
        validate_mod_descriptor,
        package_workshop_release,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building tauri application");
}

