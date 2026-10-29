use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

pub const UTF8_BOM: [u8; 3] = [0xEF, 0xBB, 0xBF];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountryScaffoldConfig {
    pub tag: String,
    pub name: String,
    pub adjective: String,
    pub color: [u8; 3],
    pub graphical_culture: String,
    pub capital_province_id: u32,
    pub state_id: u32,
    pub state_name: String,
    pub state_provinces: Vec<u32>,
    pub ruling_party: String,
    pub leader_name: String,
    pub leader_ideology: String,
    pub leader_portrait: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedFilePayload {
    pub path: String,
    pub content: String,
    pub is_binary: bool,
    pub binary_bytes: Option<Vec<u8>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CountryScaffoldResult {
    pub tag: String,
    pub files: Vec<GeneratedFilePayload>,
    pub directories: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlagExportResult {
    pub tag: String,
    pub standard_bytes: Vec<u8>,
    pub medium_bytes: Vec<u8>,
    pub small_bytes: Vec<u8>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BomValidationResult {
    pub valid: bool,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceFileEntry {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RefactoredFileResult {
    pub path: String,
    pub old_content: String,
    pub new_content: String,
    pub diff: String,
    pub replacement_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SymbolRefactorResult {
    pub old_symbol: String,
    pub new_symbol: String,
    pub total_replacements: usize,
    pub modified_files: Vec<RefactoredFileResult>,
    pub unified_diff: String,
}

/// Generates an uncompressed 32-bit true-color TGA buffer (Image type 2) with BGRA pixels.
pub fn create_tga_buffer(width: u16, height: u16, rgb: [u8; 3]) -> Vec<u8> {
    let header_size = 18;
    let pixel_count = (width as usize) * (height as usize);
    let mut buf = vec![0u8; header_size + pixel_count * 4];

    // 18-byte TGA Header
    buf[0] = 0; // ID length
    buf[1] = 0; // Color map type (0 = none)
    buf[2] = 2; // Image type: 2 = uncompressed true-color
    // 3..7 Color map spec (5 bytes 0)
    buf[8] = 0; // X origin low
    buf[9] = 0; // X origin high
    buf[10] = 0; // Y origin low
    buf[11] = 0; // Y origin high
    buf[12] = (width & 0xFF) as u8;
    buf[13] = ((width >> 8) & 0xFF) as u8;
    buf[14] = (height & 0xFF) as u8;
    buf[15] = ((height >> 8) & 0xFF) as u8;
    buf[16] = 32; // Pixel depth: 32 bits per pixel
    buf[17] = 0x28; // 8 alpha bits, origin spec

    let [r, g, b] = rgb;
    let mut offset = header_size;
    for _ in 0..pixel_count {
        buf[offset] = b; // Blue
        buf[offset + 1] = g; // Green
        buf[offset + 2] = r; // Red
        buf[offset + 3] = 255; // Alpha (opaque)
        offset += 4;
    }

    buf
}

pub fn prepend_utf8_bom(text: &str) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(3 + text.len());
    bytes.extend_from_slice(&UTF8_BOM);
    bytes.extend_from_slice(text.as_bytes());
    bytes
}

pub fn has_utf8_bom(data: &[u8]) -> bool {
    data.len() >= 3 && data[0] == 0xEF && data[1] == 0xBB && data[2] == 0xBF
}

pub fn validate_localization_bom(data: &[u8]) -> BomValidationResult {
    if data.len() < 3 {
        return BomValidationResult {
            valid: false,
            error: Some(format!(
                "File is too small ({} bytes) to contain mandatory UTF-8 BOM [0xEF, 0xBB, 0xBF].",
                data.len()
            )),
        };
    }
    if !has_utf8_bom(data) {
        let hex_head: Vec<String> = data
            .iter()
            .take(3)
            .map(|b| format!("0x{:02X}", b))
            .collect();
        return BomValidationResult {
            valid: false,
            error: Some(format!(
                "Missing mandatory UTF-8 BOM prefix [0xEF, 0xBB, 0xBF]. Found header bytes: [{}]. Paradox engine will fail to load or corrupt localisation characters.",
                hex_head.join(", ")
            )),
        };
    }
    BomValidationResult {
        valid: true,
        error: None,
    }
}

pub fn strip_utf8_bom(data: &[u8]) -> (bool, Result<String, String>) {
    let has_bom = has_utf8_bom(data);
    let slice = if has_bom { &data[3..] } else { data };
    match String::from_utf8(slice.to_vec()) {
        Ok(s) => (has_bom, Ok(s)),
        Err(e) => (has_bom, Err(e.to_string())),
    }
}

pub fn scaffold_country_files(config: CountryScaffoldConfig) -> CountryScaffoldResult {
    let tag = config.tag.trim().to_uppercase();
    let name = config.name.trim();
    let adjective = config.adjective.trim();
    let color = config.color;
    let graphical_culture = &config.graphical_culture;
    let capital_province_id = config.capital_province_id;
    let state_id = config.state_id;
    let state_name = &config.state_name;
    let state_provinces = config.state_provinces;
    let ruling_party = &config.ruling_party;
    let leader_name = &config.leader_name;
    let leader_ideology = &config.leader_ideology;
    let leader_id = format!("{}_{}", tag, leader_name.to_lowercase().replace(' ', "_"));
    let leader_portrait = config
        .leader_portrait
        .clone()
        .unwrap_or_else(|| format!("GFX_portrait_{}_leader", tag));

    let mut files: Vec<GeneratedFilePayload> = Vec::with_capacity(10);

    // 1. common/countries/<name>.txt
    let country_common = format!(
        "graphical_culture = {}\ngraphical_culture_2d = {}_2d\ncolor = {{ {} {} {} }}\n",
        graphical_culture, graphical_culture, color[0], color[1], color[2]
    );
    files.push(GeneratedFilePayload {
        path: format!("common/countries/{}.txt", name),
        content: country_common,
        is_binary: false,
        binary_bytes: None,
    });

    // 2. common/country_tags/<tag>.txt
    let tag_content = format!("{} = \"countries/{}.txt\"\n", tag, name);
    files.push(GeneratedFilePayload {
        path: format!("common/country_tags/{}.txt", tag),
        content: tag_content,
        is_binary: false,
        binary_bytes: None,
    });

    // 3. history/countries/<tag> - <name>.txt
    let elections_allowed = if ruling_party == "democratic" { "yes" } else { "no" };
    let country_history = format!(
        "capital = {}\nset_research_slots = 3\nset_convoys = 10\nset_politics = {{\n\truling_party = {}\n\tlast_election = \"1936.1.1\"\n\telection_frequency = 48\n\telections_allowed = {}\n}}\nset_popularities = {{\n\t{} = 100\n}}\nrecruit_character = {}\n",
        // `capital` takes a STATE id, not a province id.
        state_id, ruling_party, elections_allowed, ruling_party, leader_id
    );
    files.push(GeneratedFilePayload {
        path: format!("history/countries/{} - {}.txt", tag, name),
        content: country_history,
        is_binary: false,
        binary_bytes: None,
    });

    // 4. history/states/<state_id>-<state_name>.txt
    let prov_str = state_provinces
        .iter()
        .map(|p| p.to_string())
        .collect::<Vec<String>>()
        .join(" ");
    let state_history = format!(
        "state = {{\n\tid = {}\n\tname = \"STATE_{}\"\n\tmanpower = 500000\n\tstate_category = town\n\thistory = {{\n\t\towner = {}\n\t\tadd_core_of = {}\n\t\tvictory_points = {{ {} 10 }}\n\t\tbuildings = {{\n\t\t\tinfrastructure = 2\n\t\t\tindustrial_complex = 1\n\t\t\tarms_factory = 1\n\t\t}}\n\t}}\n\tprovinces = {{ {} }}\n\tlocal_supplies = 0.0\n}}\n",
        state_id, state_id, tag, tag, capital_province_id, prov_str
    );
    files.push(GeneratedFilePayload {
        path: format!("history/states/{}-{}.txt", state_id, state_name),
        content: state_history,
        is_binary: false,
        binary_bytes: None,
    });

    // 5. gfx/flags/<tag>.tga (82x52)
    let standard_flag = create_tga_buffer(82, 52, color);
    files.push(GeneratedFilePayload {
        path: format!("gfx/flags/{}.tga", tag),
        content: String::new(),
        is_binary: true,
        binary_bytes: Some(standard_flag),
    });

    // 6. gfx/flags/medium/<tag>.tga (41x26)
    let medium_flag = create_tga_buffer(41, 26, color);
    files.push(GeneratedFilePayload {
        path: format!("gfx/flags/medium/{}.tga", tag),
        content: String::new(),
        is_binary: true,
        binary_bytes: Some(medium_flag),
    });

    // 7. gfx/flags/small/<tag>.tga (10x7)
    let small_flag = create_tga_buffer(10, 7, color);
    files.push(GeneratedFilePayload {
        path: format!("gfx/flags/small/{}.tga", tag),
        content: String::new(),
        is_binary: true,
        binary_bytes: Some(small_flag),
    });

    // 8. common/characters/<tag>.txt
    let character_content = format!(
        "characters = {{\n\t{} = {{\n\t\tname = \"{}\"\n\t\tportraits = {{\n\t\t\tcivilian = {{\n\t\t\t\tlarge = \"{}\"\n\t\t\t}}\n\t\t}}\n\t\tcountry_leader = {{\n\t\t\tideology = {}\n\t\t\texpire = \"1965.1.1\"\n\t\t\tid = -1\n\t\t}}\n\t}}\n}}\n",
        leader_id, leader_name, leader_portrait, leader_ideology
    );
    files.push(GeneratedFilePayload {
        path: format!("common/characters/{}.txt", tag),
        content: character_content,
        is_binary: false,
        binary_bytes: None,
    });

    // 9. common/ideas/<tag>.txt
    let idea_content = format!(
        "ideas = {{\n\tcountry = {{\n\t\t{}_national_spirit = {{\n\t\t\tpicture = generic_intel_bonus\n\t\t\tallowed = {{ always = yes }}\n\t\t\tmodifier = {{\n\t\t\t\tpolitical_power_gain = 0.15\n\t\t\t}}\n\t\t}}\n\t}}\n}}\n",
        tag
    );
    files.push(GeneratedFilePayload {
        path: format!("common/ideas/{}.txt", tag),
        content: idea_content,
        is_binary: false,
        binary_bytes: None,
    });

    // 10. localisation/english/<tag>_l_english.yml (strictly prepended with UTF-8 BOM)
    let loc_yaml = format!(
        "l_english:\n {}:0 \"{}\"\n {}_DEF:0 \"The {}\"\n {}_ADJ:0 \"{}\"\n STATE_{}:0 \"{}\"\n {}:0 \"{}\"\n",
        tag, name, tag, name, tag, adjective, state_id, state_name, leader_id, leader_name
    );
    let loc_bytes = prepend_utf8_bom(&loc_yaml);
    files.push(GeneratedFilePayload {
        path: format!("localisation/english/{}_l_english.yml", tag),
        content: loc_yaml,
        is_binary: true,
        binary_bytes: Some(loc_bytes),
    });

    // Unique parent directories
    let mut dir_set = HashSet::new();
    for f in &files {
        if let Some(pos) = f.path.rfind('/') {
            dir_set.insert(f.path[..pos].to_string());
        }
    }
    let mut directories: Vec<String> = dir_set.into_iter().collect();
    directories.sort();

    CountryScaffoldResult {
        tag,
        files,
        directories,
    }
}

pub fn export_flags(tag: &str, color: [u8; 3]) -> FlagExportResult {
    let clean_tag = tag.trim().to_uppercase();
    FlagExportResult {
        tag: clean_tag,
        standard_bytes: create_tga_buffer(82, 52, color),
        medium_bytes: create_tga_buffer(41, 26, color),
        small_bytes: create_tga_buffer(10, 7, color),
    }
}

fn is_ident_char(c: char) -> bool {
    c.is_alphanumeric() || c == '_'
}

/// Token-aware symbol replacement preserving word boundaries.
pub fn replace_symbol_in_text(text: &str, old_sym: &str, new_sym: &str) -> (String, usize) {
    if old_sym.is_empty() || old_sym == new_sym {
        return (text.to_string(), 0);
    }

    let mut result = String::with_capacity(text.len());
    let mut count = 0;
    let chars: Vec<char> = text.chars().collect();
    let old_chars: Vec<char> = old_sym.chars().collect();
    let old_len = old_chars.len();
    let mut i = 0;

    while i < chars.len() {
        if i + old_len <= chars.len() && chars[i..i + old_len] == old_chars[..] {
            // Check left boundary
            let left_ok = if i == 0 {
                true
            } else {
                !is_ident_char(chars[i - 1])
            };

            // Check right boundary
            let right_ok = if i + old_len == chars.len() {
                true
            } else {
                !is_ident_char(chars[i + old_len])
            };

            if left_ok && right_ok {
                result.push_str(new_sym);
                count += 1;
                i += old_len;
                continue;
            }
        }

        result.push(chars[i]);
        i += 1;
    }

    (result, count)
}

/// Generates a simple unified diff between old and new string content.
pub fn generate_unified_diff(file_path: &str, old_text: &str, new_text: &str) -> String {
    let old_lines: Vec<&str> = old_text.lines().collect();
    let new_lines: Vec<&str> = new_text.lines().collect();

    let mut diff = format!("--- a/{}\n+++ b/{}\n", file_path, file_path);
    let mut has_changes = false;

    let max_len = old_lines.len().max(new_lines.len());
    for line_idx in 0..max_len {
        let old_l = old_lines.get(line_idx).copied();
        let new_l = new_lines.get(line_idx).copied();

        if old_l != new_l {
            has_changes = true;
            diff.push_str(&format!("@@ -{},1 +{},1 @@\n", line_idx + 1, line_idx + 1));
            if let Some(ol) = old_l {
                diff.push_str(&format!("-{}\n", ol));
            }
            if let Some(nl) = new_l {
                diff.push_str(&format!("+{}\n", nl));
            }
        }
    }

    if has_changes {
        diff
    } else {
        String::new()
    }
}

pub fn refactor_symbol_in_files(
    files: &[SourceFileEntry],
    old_symbol: &str,
    new_symbol: &str,
) -> SymbolRefactorResult {
    let mut total_replacements = 0;
    let mut modified_files = Vec::new();
    let mut unified_diff = String::new();

    for f in files {
        let (new_content, count) = replace_symbol_in_text(&f.content, old_symbol, new_symbol);
        if count > 0 {
            total_replacements += count;
            let diff = generate_unified_diff(&f.path, &f.content, &new_content);
            unified_diff.push_str(&diff);
            unified_diff.push('\n');
            modified_files.push(RefactoredFileResult {
                path: f.path.clone(),
                old_content: f.content.clone(),
                new_content,
                diff,
                replacement_count: count,
            });
        }
    }

    SymbolRefactorResult {
        old_symbol: old_symbol.to_string(),
        new_symbol: new_symbol.to_string(),
        total_replacements,
        modified_files,
        unified_diff: unified_diff.trim_end().to_string(),
    }
}

pub fn write_localization_entry(entries: &HashMap<String, String>, lang: &str) -> Vec<u8> {
    let mut out = format!("l_{}:\n", lang);
    let mut keys: Vec<&String> = entries.keys().collect();
    keys.sort();
    for k in keys {
        let val = &entries[k];
        out.push_str(&format!(" {}:0 \"{}\"\n", k, val));
    }
    prepend_utf8_bom(&out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tga_buffer_dimensions_and_bytes() {
        let std_tga = create_tga_buffer(82, 52, [140, 30, 45]);
        assert_eq!(std_tga.len(), 17074);
        assert_eq!(std_tga[2], 2); // Uncompressed true color
        assert_eq!(std_tga[16], 32); // 32 bpp
        let w = (std_tga[12] as u16) | ((std_tga[13] as u16) << 8);
        let h = (std_tga[14] as u16) | ((std_tga[15] as u16) << 8);
        assert_eq!(w, 82);
        assert_eq!(h, 52);

        let med_tga = create_tga_buffer(41, 26, [140, 30, 45]);
        assert_eq!(med_tga.len(), 4282);

        let small_tga = create_tga_buffer(10, 7, [140, 30, 45]);
        assert_eq!(small_tga.len(), 298);
    }

    #[test]
    fn test_utf8_bom_validation_and_stripping() {
        let text = "l_english:\n FRA:0 \"France\"\n";
        let with_bom = prepend_utf8_bom(text);
        assert!(has_utf8_bom(&with_bom));

        let val_res = validate_localization_bom(&with_bom);
        assert!(val_res.valid);
        assert!(val_res.error.is_none());

        let (has, content) = strip_utf8_bom(&with_bom);
        assert!(has);
        assert_eq!(content.unwrap(), text);

        let without_bom = text.as_bytes();
        let invalid_val = validate_localization_bom(without_bom);
        assert!(!invalid_val.valid);
        assert!(invalid_val.error.unwrap().contains("Missing mandatory UTF-8 BOM"));
    }

    #[test]
    fn test_scaffold_country_ten_files_seven_directories() {
        let cfg = CountryScaffoldConfig {
            tag: "BOR".to_string(),
            name: "Borduria".to_string(),
            adjective: "Bordurian".to_string(),
            color: [140, 30, 45],
            graphical_culture: "eastern_european_gfx".to_string(),
            capital_province_id: 450,
            state_id: 999,
            state_name: "Szohod".to_string(),
            state_provinces: vec![450, 451, 452],
            ruling_party: "fascism".to_string(),
            leader_name: "Kurvi-Tasch".to_string(),
            leader_ideology: "fascism_ideology".to_string(),
            leader_portrait: None,
        };

        let res = scaffold_country_files(cfg);
        assert_eq!(res.tag, "BOR");
        assert_eq!(res.files.len(), 10);
        assert!(res.directories.len() >= 7);

        // Verify localisation file has BOM
        let loc_file = res
            .files
            .iter()
            .find(|f| f.path == "localisation/english/BOR_l_english.yml")
            .expect("loc file missing");
        assert!(loc_file.is_binary);
        let bytes = loc_file.binary_bytes.as_ref().unwrap();
        assert!(has_utf8_bom(bytes));
    }

    #[test]
    fn test_symbol_refactoring_word_boundary_and_diff() {
        let files = vec![
            SourceFileEntry {
                path: "common/national_focus/generic.txt".to_string(),
                content: "focus = {\n\tid = BOR_focus_1\n\tprerequisite = { focus = BOR_focus_0 }\n}\n".to_string(),
            },
            SourceFileEntry {
                path: "localisation/english/focus_l_english.yml".to_string(),
                content: "l_english:\n BOR_focus_1:0 \"Borduria First\"\n BOR_focus_10:0 \"Other\"\n".to_string(),
            },
        ];

        let result = refactor_symbol_in_files(&files, "BOR_focus_1", "SYL_focus_1");
        assert_eq!(result.total_replacements, 2);
        assert_eq!(result.modified_files.len(), 2);

        // Verify BOR_focus_10 was NOT touched!
        let loc_mod = result
            .modified_files
            .iter()
            .find(|f| f.path.contains("localisation"))
            .unwrap();
        assert!(loc_mod.new_content.contains("SYL_focus_1:0 \"Borduria First\""));
        assert!(loc_mod.new_content.contains("BOR_focus_10:0 \"Other\""));
        assert!(result.unified_diff.contains("--- a/common/national_focus/generic.txt"));
    }
}
