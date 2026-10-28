pub mod cst;

use cst::{FocusTreeParser, FocusTreeData, SurgicalMutator};

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![
        parse_focus_file,
        mutate_focus_coordinates,
        mutate_focus_cost,
        mutate_focus_icon,
        rename_focus,
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
