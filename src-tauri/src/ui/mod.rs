use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

// ============================================================================
// 1. Visual GFX Asset Indexing & Reverse Lookup
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GfxSpriteDef {
    pub name: String,
    pub texturefile: String,
    pub tags: Vec<String>,
    pub category: String,
    pub no_of_frames: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GfxIndexResult {
    pub sprites: Vec<GfxSpriteDef>,
    pub total_count: usize,
    pub duplicates: Vec<String>,
    pub texture_to_sprites: HashMap<String, Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SourceFileEntry {
    pub path: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GfxUsageReference {
    pub file_path: String,
    pub line_number: usize,
    pub line_content: String,
    pub context_type: String,
}

/// Tokenize sprite name and path to generate semantic keyword tags
pub fn extract_semantic_tags(name: &str, texture: &str) -> (Vec<String>, String) {
    let mut tags = HashSet::new();
    let lower_name = name.to_lowercase();
    let lower_tex = texture.to_lowercase();

    // Determine category
    let category = if lower_name.starts_with("gfx_goal_") || lower_name.starts_with("gfx_focus_") {
        tags.insert("focus".to_string());
        tags.insert("goal".to_string());
        "focus_icon".to_string()
    } else if lower_name.starts_with("gfx_idea_") {
        tags.insert("idea".to_string());
        tags.insert("spirit".to_string());
        tags.insert("advisor".to_string());
        "idea".to_string()
    } else if lower_name.starts_with("gfx_portrait_") || lower_name.starts_with("gfx_leader_") {
        tags.insert("portrait".to_string());
        tags.insert("leader".to_string());
        tags.insert("general".to_string());
        "portrait".to_string()
    } else if lower_name.starts_with("gfx_report_event_") || lower_name.starts_with("gfx_news_event_") {
        tags.insert("event".to_string());
        tags.insert("news".to_string());
        "event_picture".to_string()
    } else if lower_name.starts_with("gfx_unit_") || lower_name.starts_with("gfx_division_") {
        tags.insert("division".to_string());
        tags.insert("unit".to_string());
        tags.insert("military".to_string());
        "division_icon".to_string()
    } else if lower_name.starts_with("gfx_trait_") {
        tags.insert("trait".to_string());
        tags.insert("commander".to_string());
        "trait".to_string()
    } else if lower_name.starts_with("gfx_decision_") {
        tags.insert("decision".to_string());
        "decision".to_string()
    } else if lower_tex.contains("flags/") {
        tags.insert("flag".to_string());
        "flag".to_string()
    } else {
        "misc".to_string()
    };

    // Semantic dictionary mapping tokens
    let semantic_keywords = [
        ("eagle", &["eagle", "aquila", "bird", "reichsadler"][..]),
        ("tank", &["tank", "panzer", "armor", "armour", "chassis", "light_tank", "medium_tank", "heavy_tank"]),
        ("anchor", &["anchor", "navy", "naval", "fleet", "admiralty", "port"]),
        ("wheat", &["wheat", "grain", "agriculture", "bread", "harvest", "crop"]),
        ("skull", &["skull", "death", "totenkopf", "bones", "casualty"]),
        ("atomic", &["atomic", "nuclear", "uranium", "radiation", "bomb", "fission"]),
        ("air", &["air", "plane", "aircraft", "fighter", "bomber", "cas", "aviation"]),
        ("industry", &["industry", "factory", "production", "infrastructure", "steel", "oil"]),
        ("sword", &["sword", "blade", "war", "assault", "infantry", "bayonet"]),
        ("shield", &["shield", "defense", "fort", "bunker", "guard"]),
        ("red_star", &["star", "soviet", "communist", "comintern"]),
        ("crown", &["crown", "monarch", "royal", "king", "queen", "empire"]),
        ("generic", &["generic", "shared", "common"]),
    ];

    let full_string = format!("{} {}", lower_name, lower_tex);
    for (tag, triggers) in semantic_keywords {
        for trig in triggers {
            if full_string.contains(trig) {
                tags.insert(tag.to_string());
                break;
            }
        }
    }

    // Also add clean word tokens from the name
    let clean_name = lower_name.trim_start_matches("gfx_").trim_start_matches("goal_").trim_start_matches("idea_");
    for part in clean_name.split('_') {
        if part.len() >= 3 && !["and", "the", "for", "with"].contains(&part) {
            tags.insert(part.to_string());
        }
    }

    let mut tag_list: Vec<String> = tags.into_iter().collect();
    tag_list.sort();
    (tag_list, category)
}

/// Parses `.gfx` files containing `spriteType = { ... }` blocks
pub fn index_gfx_script(content: &str) -> GfxIndexResult {
    let mut sprites = Vec::new();
    let mut duplicates = Vec::new();
    let mut seen_names = HashSet::new();
    let mut texture_to_sprites: HashMap<String, Vec<String>> = HashMap::new();

    // Line-by-line block scanner for spriteType = { ... }
    let mut in_sprite_block = false;
    let mut current_name = String::new();
    let mut current_texture = String::new();
    let mut current_frames: Option<u32> = None;
    let mut brace_depth = 0;

    for line in content.lines() {
        let trimmed = line.split('#').next().unwrap_or("").trim();
        if trimmed.is_empty() {
            continue;
        }

        if trimmed.contains("spriteType") && trimmed.contains('{') {
            in_sprite_block = true;
            brace_depth = 1;
            current_name.clear();
            current_texture.clear();
            current_frames = None;
            continue;
        }

        if in_sprite_block {
            for c in trimmed.chars() {
                if c == '{' {
                    brace_depth += 1;
                } else if c == '}' {
                    brace_depth -= 1;
                }
            }

            // Extract fields
            if let Some(pos) = trimmed.find("name") {
                let rest = &trimmed[pos + 4..];
                if let Some(eq_pos) = rest.find('=') {
                    let val = rest[eq_pos + 1..].trim().trim_matches('"').trim();
                    current_name = val.split_whitespace().next().unwrap_or("").to_string();
                }
            }
            if let Some(pos) = trimmed.find("texturefile") {
                let rest = &trimmed[pos + 11..];
                if let Some(eq_pos) = rest.find('=') {
                    let val = rest[eq_pos + 1..].trim().trim_matches('"').trim();
                    current_texture = val.split_whitespace().next().unwrap_or("").replace('\\', "/");
                }
            }
            if let Some(pos) = trimmed.find("noOfFrames") {
                let rest = &trimmed[pos + 10..];
                if let Some(eq_pos) = rest.find('=') {
                    let val = rest[eq_pos + 1..].trim().trim_matches('"').trim();
                    if let Ok(num) = val.parse::<u32>() {
                        current_frames = Some(num);
                    }
                }
            }

            if brace_depth <= 0 {
                in_sprite_block = false;
                if !current_name.is_empty() && !current_texture.is_empty() {
                    if seen_names.contains(&current_name) {
                        duplicates.push(current_name.clone());
                    } else {
                        seen_names.insert(current_name.clone());
                    }

                    let (tags, category) = extract_semantic_tags(&current_name, &current_texture);

                    let entry = texture_to_sprites.entry(current_texture.clone()).or_default();
                    entry.push(current_name.clone());

                    sprites.push(GfxSpriteDef {
                        name: current_name.clone(),
                        texturefile: current_texture.clone(),
                        tags,
                        category,
                        no_of_frames: current_frames,
                    });
                }
            }
        }
    }

    let total_count = sprites.len();
    GfxIndexResult {
        sprites,
        total_count,
        duplicates,
        texture_to_sprites,
    }
}

/// Reverse reference lookup: scans source files for references to a given GFX token
pub fn reverse_lookup_gfx(gfx_name: &str, files: &[SourceFileEntry]) -> Vec<GfxUsageReference> {
    let mut references = Vec::new();
    let token = gfx_name.trim();
    if token.is_empty() {
        return references;
    }

    for file in files {
        for (idx, line) in file.content.lines().enumerate() {
            let line_number = idx + 1;
            let stripped = line.split('#').next().unwrap_or("");
            if stripped.contains(token) {
                // Determine context
                let context_type = if file.path.contains("national_focus") {
                    "focus_tree".to_string()
                } else if file.path.contains("events") {
                    "event".to_string()
                } else if file.path.contains("characters") {
                    "character".to_string()
                } else if file.path.contains("ideas") {
                    "idea".to_string()
                } else if file.path.contains("decisions") {
                    "decision".to_string()
                } else if file.path.contains(".gui") {
                    "gui_layout".to_string()
                } else {
                    "script".to_string()
                };

                references.push(GfxUsageReference {
                    file_path: file.path.clone(),
                    line_number,
                    line_content: line.trim().to_string(),
                    context_type,
                });
            }
        }
    }

    references
}

// ============================================================================
// 2. 3-Way AST Diffing & Merge Engine
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreeWayDiffBlock {
    pub id: String,
    pub block_type: String,
    pub status: String, // "clean" | "conflict" | "upstream_modified" | "upstream_added" | "upstream_removed" | "mod_custom"
    pub base_content: Option<String>,
    pub vanilla_content: Option<String>,
    pub mod_content: Option<String>,
    pub merged_content: Option<String>,
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ThreeWayDiffResult {
    pub blocks: Vec<ThreeWayDiffBlock>,
    pub total_blocks: usize,
    pub conflict_count: usize,
    pub auto_merged_count: usize,
    pub merged_script: String,
}

/// Helper struct to extract blocks (e.g. `focus = { id = ... }` or `state = { ... }`)
#[derive(Debug, Clone)]
struct ParsedBlock {
    id: String,
    block_type: String,
    content: String,
}

fn parse_script_blocks(script: &str) -> Vec<ParsedBlock> {
    let mut blocks = Vec::new();
    let mut in_block = false;
    let mut brace_depth = 0;
    let mut current_lines = Vec::new();
    let mut block_type = String::new();
    let mut block_id = String::new();

    for line in script.lines() {
        let trimmed = line.split('#').next().unwrap_or("").trim();
        if trimmed.is_empty() {
            if in_block {
                current_lines.push(line.to_string());
            }
            continue;
        }

        if !in_block {
            if trimmed.contains('{') {
                in_block = true;
                brace_depth = 0;
                current_lines.clear();
                block_id.clear();
                block_type = trimmed.split('=').next().unwrap_or("block").trim().to_string();
            }
        }

        if in_block {
            current_lines.push(line.to_string());
            for c in trimmed.chars() {
                if c == '{' {
                    brace_depth += 1;
                } else if c == '}' {
                    brace_depth -= 1;
                }
            }

            // Extract ID if found (e.g. `id = XYZ` or `name = XYZ`)
            if block_id.is_empty() {
                if let Some(pos) = trimmed.find("id") {
                    let rest = &trimmed[pos + 2..];
                    if let Some(eq_pos) = rest.find('=') {
                        let val = rest[eq_pos + 1..].trim().trim_matches('"').trim();
                        let token = val.split_whitespace().next().unwrap_or("");
                        if !token.is_empty() {
                            block_id = token.to_string();
                        }
                    }
                }
            }

            if brace_depth <= 0 {
                in_block = false;
                if block_id.is_empty() {
                    block_id = format!("{}_{}", block_type, blocks.len() + 1);
                }
                blocks.push(ParsedBlock {
                    id: block_id.clone(),
                    block_type: block_type.clone(),
                    content: current_lines.join("\n"),
                });
            }
        }
    }

    blocks
}

/// Computes 3-way AST diff between base vanilla, updated vanilla, and user mod
pub fn diff_ast_3way(base_vanilla: &str, updated_vanilla: &str, user_mod: &str) -> ThreeWayDiffResult {
    let base_blocks = parse_script_blocks(base_vanilla);
    let updated_blocks = parse_script_blocks(updated_vanilla);
    let mod_blocks = parse_script_blocks(user_mod);

    let base_map: HashMap<String, ParsedBlock> = base_blocks.into_iter().map(|b| (b.id.clone(), b)).collect();
    let updated_map: HashMap<String, ParsedBlock> = updated_blocks.into_iter().map(|b| (b.id.clone(), b)).collect();
    let mod_map: HashMap<String, ParsedBlock> = mod_blocks.into_iter().map(|b| (b.id.clone(), b)).collect();

    let mut all_ids: Vec<String> = base_map.keys()
        .chain(updated_map.keys())
        .chain(mod_map.keys())
        .cloned()
        .collect();
    all_ids.sort();
    all_ids.dedup();

    let mut diff_blocks = Vec::new();
    let mut conflict_count = 0;
    let mut auto_merged_count = 0;
    let mut merged_parts = Vec::new();

    for id in all_ids {
        let b = base_map.get(&id);
        let u = updated_map.get(&id);
        let m = mod_map.get(&id);

        let block_type = m.map(|x| x.block_type.clone())
            .or_else(|| u.map(|x| x.block_type.clone()))
            .or_else(|| b.map(|x| x.block_type.clone()))
            .unwrap_or_else(|| "block".to_string());

        let base_c = b.map(|x| x.content.clone());
        let updated_c = u.map(|x| x.content.clone());
        let mod_c = m.map(|x| x.content.clone());

        let (status, merged_c, desc) = match (&base_c, &updated_c, &mod_c) {
            // Unchanged across all three
            (Some(bc), Some(uc), Some(mc)) if bc == uc && bc == mc => {
                ("clean".to_string(), Some(mc.clone()), "Identical in vanilla and mod.".to_string())
            }
            // Mod modified it, vanilla untouched -> Keep mod's changes
            (Some(bc), Some(uc), Some(mc)) if bc == uc && bc != mc => {
                auto_merged_count += 1;
                ("clean".to_string(), Some(mc.clone()), "Preserved user mod custom logic.".to_string())
            }
            // Vanilla updated it, mod did not touch -> Take vanilla's new version
            (Some(bc), Some(uc), Some(mc)) if bc != uc && bc == mc => {
                auto_merged_count += 1;
                ("upstream_modified".to_string(), Some(uc.clone()), "Auto-merged upstream Paradox update.".to_string())
            }
            // Both updated it differently -> CONFLICT!
            (Some(bc), Some(uc), Some(mc)) if bc != uc && bc != mc => {
                if uc == mc {
                    ("clean".to_string(), Some(mc.clone()), "Both upgraded identically.".to_string())
                } else {
                    conflict_count += 1;
                    let conflict_snippet = format!(
                        "# <<<<<<< USER MOD ({})\n{}\n# ======= UPSTREAM PARADOX UPDATE\n{}\n# >>>>>>> END CONFLICT",
                        id, mc, uc
                    );
                    (
                        "conflict".to_string(),
                        Some(conflict_snippet),
                        "Conflicting changes between mod and vanilla update.".to_string(),
                    )
                }
            }
            // Add/Add Collision check
            (None, Some(uc), Some(mc)) => {
                if uc == mc {
                    auto_merged_count += 1;
                    ("clean".to_string(), Some(mc.clone()), "Identical addition in upstream and mod.".to_string())
                } else {
                    conflict_count += 1;
                    let conflict_snippet = format!(
                        "# <<<<<<< USER MOD (ADD/ADD COLLISION)\n{}\n# ======= UPSTREAM VANILLA\n{}\n# >>>>>>> END CONFLICT",
                        mc, uc
                    );
                    (
                        "conflict".to_string(),
                        Some(conflict_snippet),
                        "Add/Add collision: block added in both vanilla and mod with differing content.".to_string(),
                    )
                }
            }
            // Mod added new custom block
            (None, None, Some(mc)) => {
                ("mod_custom".to_string(), Some(mc.clone()), "Mod custom new element.".to_string())
            }
            // Upstream added new block
            (None, Some(uc), None) => {
                auto_merged_count += 1;
                ("upstream_added".to_string(), Some(uc.clone()), "New element added in upstream update.".to_string())
            }
            // Upstream removed block, mod still has it -> conflict or notification
            (Some(_), None, Some(mc)) => {
                conflict_count += 1;
                ("conflict".to_string(), Some(mc.clone()), "Upstream deleted block, but mod modified or retained it.".to_string())
            }
            // Mod removed block, upstream still has it
            (Some(_), Some(_), None) => {
                ("mod_removed".to_string(), None, "Mod deleted upstream block.".to_string())
            }
            _ => ("clean".to_string(), mod_c.clone(), "Clean block.".to_string()),
        };

        if let Some(ref content) = merged_c {
            merged_parts.push(content.clone());
        }

        diff_blocks.push(ThreeWayDiffBlock {
            id,
            block_type,
            status,
            base_content: base_c,
            vanilla_content: updated_c,
            mod_content: mod_c,
            merged_content: merged_c,
            description: desc,
        });
    }

    let merged_script = merged_parts.join("\n\n");
    let total_blocks = diff_blocks.len();

    ThreeWayDiffResult {
        blocks: diff_blocks,
        total_blocks,
        conflict_count,
        auto_merged_count,
        merged_script,
    }
}

// ============================================================================
// 3. Deprecated Paradox Trigger & Effect Migrator
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationItem {
    pub rule_id: String,
    pub description: String,
    pub line_number: usize,
    pub original_text: String,
    pub migrated_text: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationResult {
    pub original_content: String,
    pub migrated_content: String,
    pub total_migrations: usize,
    pub items: Vec<MigrationItem>,
}

/// Automatically migrates deprecated Clausewitz syntax to modern HOI4 conventions
pub fn migrate_deprecated_syntax(script: &str) -> MigrationResult {
    let mut items = Vec::new();
    let mut migrated_lines = Vec::new();

    let migration_patterns = [
        ("is_in_faction = yes", "Modernize faction check (HOI4 1.11+)", "has_faction = yes"),
        ("is_in_faction = no", "Modernize faction check (HOI4 1.11+)", "has_faction = no"),
        ("is_puppet = yes", "Modernize puppet check to is_subject", "is_subject = yes"),
        ("is_puppet = no", "Modernize puppet check to is_subject", "is_subject = no"),
        ("can_create_factions = yes", "Modernize faction rule syntax", "rule = { can_create_factions = yes }"),
    ];

    for (idx, line) in script.lines().enumerate() {
        let line_num = idx + 1;
        let mut cur_line = line.to_string();

        // 1. Leader migration pattern
        if cur_line.contains("create_country_leader") && cur_line.contains('{') {
            items.push(MigrationItem {
                rule_id: "RULE_MIGRATE_LEADER".to_string(),
                description: "Migrated create_country_leader block toward modern character architecture.".to_string(),
                line_number: line_num,
                original_text: cur_line.trim().to_string(),
                migrated_text: format!("# [MIGRATED 1.11+] {}", cur_line.trim()),
            });
            cur_line = format!("\t# [MIGRATED] {}", cur_line.trim());
        }

        // 2. Deprecated syntax replacements
        for (token, desc, rep) in migration_patterns {
            if cur_line.contains(token) && token != rep {
                items.push(MigrationItem {
                    rule_id: format!("RULE_{}", token.replace(' ', "_").replace('=', "").replace('{', "").replace('}', "")),
                    description: desc.to_string(),
                    line_number: line_num,
                    original_text: cur_line.trim().to_string(),
                    migrated_text: cur_line.replace(token, rep).trim().to_string(),
                });
                cur_line = cur_line.replace(token, rep);
            }
        }

        migrated_lines.push(cur_line);
    }

    let total_migrations = items.len();
    MigrationResult {
        original_content: script.to_string(),
        migrated_content: migrated_lines.join("\n"),
        total_migrations,
        items,
    }
}

// ============================================================================
// 4. Map & Province ID Re-alignment Engine
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvinceRealignmentMap {
    pub shifted_provinces: HashMap<u32, u32>, // old_id -> new_id
    pub split_provinces: HashMap<u32, Vec<u32>>,
    pub added_provinces: Vec<u32>,
    pub removed_provinces: Vec<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RealignmentResult {
    pub modified_script: String,
    pub replacements_count: usize,
    pub remapped_ids: Vec<(u32, u32)>,
}

/// Diffs old definition.csv and new definition.csv to detect shifted province IDs by RGB
pub fn compute_province_diff(old_csv: &str, new_csv: &str) -> ProvinceRealignmentMap {
    let parse_csv_map = |content: &str| -> HashMap<[u8; 3], u32> {
        let mut map = HashMap::new();
        for line in content.lines() {
            let parts: Vec<&str> = line.trim().split(';').collect();
            if parts.len() >= 4 {
                if let (Ok(id), Ok(r), Ok(g), Ok(b)) = (
                    parts[0].parse::<u32>(),
                    parts[1].parse::<u8>(),
                    parts[2].parse::<u8>(),
                    parts[3].parse::<u8>(),
                ) {
                    map.insert([r, g, b], id);
                }
            }
        }
        map
    };

    let old_rgb_map = parse_csv_map(old_csv);
    let new_rgb_map = parse_csv_map(new_csv);

    let mut shifted = HashMap::new();
    let mut added = Vec::new();
    let mut removed = Vec::new();

    for (rgb, old_id) in &old_rgb_map {
        if let Some(new_id) = new_rgb_map.get(rgb) {
            if old_id != new_id {
                shifted.insert(*old_id, *new_id);
            }
        } else {
            removed.push(*old_id);
        }
    }

    for (rgb, new_id) in &new_rgb_map {
        if !old_rgb_map.contains_key(rgb) {
            added.push(*new_id);
        }
    }

    let mut split_provinces = HashMap::new();
    for (old_id, new_id) in &shifted {
        split_provinces.insert(*old_id, vec![*new_id]);
    }

    removed.sort();
    added.sort();

    ProvinceRealignmentMap {
        shifted_provinces: shifted,
        split_provinces,
        added_provinces: added,
        removed_provinces: removed,
    }
}

/// Remaps shifted province IDs in mod files (e.g. states, railways, victory points)
pub fn realign_mod_provinces(script: &str, mapping: &ProvinceRealignmentMap) -> RealignmentResult {
    // Single pass over whole numeric tokens. Replacing id-by-id would chain shifts
    // (1 -> 2 then 2 -> 3 turns every original 1 into 3), and copying bytes as chars
    // would corrupt multibyte UTF-8. Delimiters and digits are ASCII, so byte indices
    // are always char boundaries and slices are copied verbatim.
    let bytes = script.as_bytes();
    let is_prev_delim = |b: u8| b.is_ascii_whitespace() || matches!(b, b'{' | b'=' | b'}' | b'(');
    let is_next_delim = |b: u8| b.is_ascii_whitespace() || matches!(b, b'}' | b'{' | b'=' | b')');

    let mut out = String::with_capacity(script.len());
    let mut last = 0usize;
    let mut i = 0usize;
    let mut count = 0usize;
    let mut tally: Vec<(u32, u32, usize)> = Vec::new();

    while i < bytes.len() {
        if bytes[i].is_ascii_digit() && (i == 0 || is_prev_delim(bytes[i - 1])) {
            let mut j = i;
            while j < bytes.len() && bytes[j].is_ascii_digit() {
                j += 1;
            }
            if j == bytes.len() || is_next_delim(bytes[j]) {
                if let Ok(old_id) = script[i..j].parse::<u32>() {
                    if let Some(new_id) = mapping.shifted_provinces.get(&old_id) {
                        out.push_str(&script[last..i]);
                        out.push_str(&new_id.to_string());
                        last = j;
                        count += 1;
                        match tally.iter_mut().find(|t| t.0 == old_id) {
                            Some(t) => t.2 += 1,
                            None => tally.push((old_id, *new_id, 1)),
                        }
                    }
                }
            }
            i = j;
        } else {
            i += 1;
        }
    }
    out.push_str(&script[last..]);

    RealignmentResult {
        modified_script: out,
        replacements_count: count,
        remapped_ids: tally.into_iter().map(|(o, n, _)| (o, n)).collect(),
    }
}

// ============================================================================
// 5. Automated 1-Click Multi-Resolution Flag Studio (TGAs)
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlagVariantExport {
    pub tag: String,
    pub ideology: String,
    pub resolution: String, // "standard" | "medium" | "small"
    pub path: String,
    pub bytes: Vec<u8>,
    pub width: u16,
    pub height: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchFlagExportResult {
    pub flags: Vec<FlagVariantExport>,
    pub total_files: usize,
}

/// Generates an uncompressed 32-bit BGRA TGA buffer of specified width and height
pub fn generate_tga_buffer_32bit(width: u16, height: u16, rgb: [u8; 3]) -> Vec<u8> {
    let header_size = 18;
    let pixel_count = (width as usize) * (height as usize);
    let mut buf = vec![0u8; header_size + pixel_count * 4];

    // 18-byte TGA Header
    buf[0] = 0; // ID length
    buf[1] = 0; // Color map type
    buf[2] = 2; // Uncompressed true-color
    buf[12] = (width & 0xFF) as u8;
    buf[13] = ((width >> 8) & 0xFF) as u8;
    buf[14] = (height & 0xFF) as u8;
    buf[15] = ((height >> 8) & 0xFF) as u8;
    buf[16] = 32; // 32 bits per pixel
    buf[17] = 0x28; // 8 bits alpha, top-left origin

    let [r, g, b] = rgb;
    let mut offset = header_size;
    for _ in 0..pixel_count {
        buf[offset] = b;     // Blue
        buf[offset + 1] = g; // Green
        buf[offset + 2] = r; // Red
        buf[offset + 3] = 255; // Alpha
        offset += 4;
    }

    buf
}

/// Batch exports all 3 Paradox required resolutions across all 4 major ideologies
pub fn export_flag_tga_batch(
    tag: &str,
    base_color: [u8; 3],
    ideology_variants: Option<Vec<String>>,
) -> BatchFlagExportResult {
    let ideologies = ideology_variants.unwrap_or_else(|| {
        vec![
            "democratic".to_string(),
            "communism".to_string(),
            "fascism".to_string(),
            "neutrality".to_string(),
        ]
    });

    let resolutions = [
        ("standard", 82u16, 52u16, "gfx/flags"),
        ("medium", 41u16, 26u16, "gfx/flags/medium"),
        ("small", 10u16, 7u16, "gfx/flags/small"),
    ];

    let mut flags = Vec::new();

    // Distinct ideology tint shifts for realistic preview
    for ideology in &ideologies {
        let color = match ideology.as_str() {
            "communism" => [220, 20, 20],
            "fascism" => [139, 69, 19],
            "democratic" => [30, 90, 200],
            "neutrality" => [120, 120, 120],
            _ => base_color,
        };

        for (res_name, w, h, folder) in resolutions {
            let bytes = generate_tga_buffer_32bit(w, h, color);
            let path = format!("{}/{}_{}.tga", folder, tag, ideology);

            flags.push(FlagVariantExport {
                tag: tag.to_string(),
                ideology: ideology.clone(),
                resolution: res_name.to_string(),
                path,
                bytes,
                width: w,
                height: h,
            });
        }
    }

    let total_files = flags.len();
    BatchFlagExportResult { flags, total_files }
}

// ============================================================================
// 6. Mod Asset Optimizer & Purger Scanner
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModAssetEntry {
    pub path: String,
    pub file_type: String, // "texture" | "audio" | "localization" | "other"
    pub size_bytes: u64,
    pub hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OptimizerScanReport {
    pub unreferenced_textures: Vec<ModAssetEntry>,
    pub dead_audio: Vec<ModAssetEntry>,
    pub orphaned_loc_keys: Vec<String>,
    pub duplicate_assets: Vec<Vec<ModAssetEntry>>,
    pub total_reclaimable_bytes: u64,
    pub total_issues_count: usize,
}

/// Diagnoses unreferenced textures, dead audio, orphaned loc keys, and duplicate assets
pub fn scan_mod_assets(
    files: &[ModAssetEntry],
    script_corpus: &str,
    loc_keys: &[String],
) -> OptimizerScanReport {
    let mut unreferenced_textures = Vec::new();
    let mut dead_audio = Vec::new();
    let mut orphaned_loc_keys = Vec::new();
    let mut hash_map: HashMap<String, Vec<ModAssetEntry>> = HashMap::new();
    let mut reclaimable_bytes: u64 = 0;
    let mut counted_paths: HashSet<String> = HashSet::new();

    for file in files {
        let filename = file.path.split('/').last().unwrap_or(&file.path);
        let path_no_ext = filename.split('.').next().unwrap_or(filename);

        // Group by content hash to find duplicates
        if !file.hash.is_empty() {
            hash_map.entry(file.hash.clone()).or_default().push(file.clone());
        }

        match file.file_type.as_str() {
            "texture" => {
                if !script_corpus.contains(filename) && !script_corpus.contains(path_no_ext) {
                    if !counted_paths.contains(&file.path) {
                        reclaimable_bytes += file.size_bytes;
                        counted_paths.insert(file.path.clone());
                    }
                    unreferenced_textures.push(file.clone());
                }
            }
            "audio" => {
                if !script_corpus.contains(filename) && !script_corpus.contains(path_no_ext) {
                    if !counted_paths.contains(&file.path) {
                        reclaimable_bytes += file.size_bytes;
                        counted_paths.insert(file.path.clone());
                    }
                    dead_audio.push(file.clone());
                }
            }
            _ => {}
        }
    }

    // Filter duplicate groups with 2+ entries
    let mut duplicate_assets = Vec::new();
    for (_, group) in hash_map {
        if group.len() > 1 {
            // Count redundant copies as reclaimable
            for item in &group[1..] {
                if !counted_paths.contains(&item.path) {
                    reclaimable_bytes += item.size_bytes;
                    counted_paths.insert(item.path.clone());
                }
            }
            duplicate_assets.push(group);
        }
    }

    // Check localization keys
    for key in loc_keys {
        if !script_corpus.contains(key) {
            orphaned_loc_keys.push(key.clone());
        }
    }

    let total_issues_count = unreferenced_textures.len()
        + dead_audio.len()
        + orphaned_loc_keys.len()
        + duplicate_assets.len();

    OptimizerScanReport {
        unreferenced_textures,
        dead_audio,
        orphaned_loc_keys,
        duplicate_assets,
        total_reclaimable_bytes: reclaimable_bytes,
        total_issues_count,
    }
}

// ============================================================================
// 7. Steam Workshop Publisher & Mod Packager
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WorkshopDescriptor {
    pub name: String,
    pub version: String,
    pub supported_version: String,
    pub tags: Vec<String>,
    pub picture: Option<String>,
    pub remote_file_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DescriptorValidationResult {
    pub valid: bool,
    pub errors: Vec<String>,
    pub warnings: Vec<String>,
    pub descriptor: Option<WorkshopDescriptor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PackageReleaseReport {
    pub total_files: usize,
    pub total_size_bytes: u64,
    pub excluded_files_count: usize,
    pub included_files: Vec<String>,
}

/// Validates Clausewitz `descriptor.mod` syntax and required Paradox metadata
pub fn validate_mod_descriptor(content: &str) -> DescriptorValidationResult {
    let mut name = String::new();
    let mut version = String::new();
    let mut supported_version = String::new();
    let mut tags = Vec::new();
    let mut picture = None;
    let mut remote_file_id = None;
    let mut errors = Vec::new();
    let mut warnings = Vec::new();

    let mut in_tags = false;

    for line in content.lines() {
        let trimmed = line.split('#').next().unwrap_or("").trim();
        if trimmed.is_empty() {
            continue;
        }

        if in_tags {
            if trimmed.contains('}') {
                in_tags = false;
            } else {
                let tag_val = trimmed.trim_matches('"').trim();
                if !tag_val.is_empty() {
                    tags.push(tag_val.to_string());
                }
            }
            continue;
        }

        if trimmed.starts_with("tags")
            && trimmed["tags".len()..].trim_start().starts_with('=')
            && trimmed.contains('{')
        {
            // Handles `tags={`, `tags = {` and one-line `tags = { "A" "B" }`.
            let after = &trimmed[trimmed.find('{').unwrap() + 1..];
            let (inline, closed) = match after.find('}') {
                Some(end) => (&after[..end], true),
                None => (after, false),
            };
            for part in inline.split('"').skip(1).step_by(2) {
                let t = part.trim();
                if !t.is_empty() {
                    tags.push(t.to_string());
                }
            }
            in_tags = !closed;
            continue;
        }

        if let Some(eq_pos) = trimmed.find('=') {
            let key = trimmed[..eq_pos].trim();
            let val = trimmed[eq_pos + 1..].trim().trim_matches('"').trim();
            match key {
                "name" => name = val.to_string(),
                "version" => version = val.to_string(),
                "supported_version" => supported_version = val.to_string(),
                "picture" => picture = Some(val.to_string()),
                "remote_file_id" => remote_file_id = Some(val.to_string()),
                _ => {}
            }
        }
    }

    if name.is_empty() {
        errors.push("Missing required field: 'name'".to_string());
    }
    if supported_version.is_empty() {
        errors.push("Missing required field: 'supported_version' (e.g. '1.14.*')".to_string());
    }
    if tags.is_empty() {
        warnings.push("No Workshop tags specified (e.g. 'Alternative History', 'National Focuses')".to_string());
    }
    if picture.is_none() {
        warnings.push("Missing thumbnail 'picture' reference for Steam Workshop".to_string());
    }

    let valid = errors.is_empty();
    let descriptor = if valid {
        Some(WorkshopDescriptor {
            name,
            version,
            supported_version,
            tags,
            picture,
            remote_file_id,
        })
    } else {
        None
    };

    DescriptorValidationResult {
        valid,
        errors,
        warnings,
        descriptor,
    }
}

/// Path-aware ignore matching (mirrors `matchesIgnoreRule` in phase5Generators.ts):
/// `*` globs, `dir/` rules, dot rules (extension or dot-prefixed name) and plain names.
/// Substring matching used to drop unrelated files (e.g. `latests/`) and ignored globs entirely.
pub fn matches_ignore_rule(path: &str, rule: &str) -> bool {
    let p = path.replace('\\', "/");
    let p = p.trim_start_matches("./");
    let r = rule.trim().replace('\\', "/");
    if r.is_empty() {
        return false;
    }
    let segments: Vec<&str> = p.split('/').collect();
    let base = segments.last().copied().unwrap_or("");
    if r.contains('*') {
        let glob_match = |text: &str| -> bool {
            let parts: Vec<&str> = r.split('*').collect();
            let mut pos = 0usize;
            for (i, part) in parts.iter().enumerate() {
                if part.is_empty() {
                    continue;
                }
                if i == 0 {
                    if !text.starts_with(part) {
                        return false;
                    }
                    pos = part.len();
                } else if i == parts.len() - 1 {
                    return text.len() >= pos + part.len() && text.ends_with(part);
                } else if let Some(f) = text[pos..].find(part) {
                    pos += f + part.len();
                } else {
                    return false;
                }
            }
            true
        };
        return if r.contains('/') { glob_match(p) } else { segments.iter().any(|s| glob_match(s)) };
    }
    if r.ends_with('/') {
        return p.starts_with(&r) || p.contains(&format!("/{}", r));
    }
    if r.starts_with('.') {
        return base.ends_with(&r) || segments.iter().any(|s| s.starts_with(&r));
    }
    p == r || segments.contains(&r.as_str()) || p.starts_with(&format!("{}/", r))
}

/// Filters development files (.git, .agents, .psd, .blend, .wav, test files) and produces release manifest
pub fn package_workshop_release(
    files: &[ModAssetEntry],
    ignore_patterns: &[String],
) -> PackageReleaseReport {
    let mut included = Vec::new();
    let mut total_size: u64 = 0;
    let mut excluded_count = 0;

    let default_ignores = [
        ".git",
        ".agents",
        ".psd",
        ".blend",
        ".wav",
        "tests/",
        "node_modules/",
        ".vscode/",
    ];

    for file in files {
        let should_ignore = default_ignores.iter().any(|r| matches_ignore_rule(&file.path, r))
            || ignore_patterns
                .iter()
                .any(|r| !r.is_empty() && matches_ignore_rule(&file.path, r));

        if should_ignore {
            excluded_count += 1;
        } else {
            total_size += file.size_bytes;
            included.push(file.path.clone());
        }
    }

    PackageReleaseReport {
        total_files: included.len(),
        total_size_bytes: total_size,
        excluded_files_count: excluded_count,
        included_files: included,
    }
}

// ============================================================================
// Unit Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_gfx_indexing_and_semantic_tagging() {
        let script = r#"
            spriteTypes = {
                spriteType = {
                    name = "GFX_goal_generic_atomic_research"
                    texturefile = "gfx/interface/goals/goal_atomic.dds"
                }
                spriteType = {
                    name = "GFX_idea_tank_manufacturer"
                    texturefile = "gfx/interface/ideas/idea_panzer.dds"
                    noOfFrames = 2
                }
                spriteType = {
                    name = "GFX_portrait_fra_de_gaulle"
                    texturefile = "gfx/leaders/FRA/portrait_de_gaulle.dds"
                }
            }
        "#;

        let index_res = index_gfx_script(script);
        assert_eq!(index_res.total_count, 3);
        assert_eq!(index_res.duplicates.len(), 0);

        let atomic = index_res.sprites.iter().find(|s| s.name == "GFX_goal_generic_atomic_research").unwrap();
        assert_eq!(atomic.category, "focus_icon");
        assert!(atomic.tags.contains(&"atomic".to_string()));
        assert!(atomic.tags.contains(&"focus".to_string()));

        let tank = index_res.sprites.iter().find(|s| s.name == "GFX_idea_tank_manufacturer").unwrap();
        assert_eq!(tank.category, "idea");
        assert_eq!(tank.no_of_frames, Some(2));
        assert!(tank.tags.contains(&"tank".to_string()));
    }

    #[test]
    fn test_reverse_lookup_gfx_occurrences() {
        let files = vec![
            SourceFileEntry {
                path: "common/national_focus/france.txt".to_string(),
                content: "focus = {\n\tid = FRA_heavy_tanks\n\ticon = GFX_idea_tank_manufacturer\n}".to_string(),
            },
            SourceFileEntry {
                path: "events/France.txt".to_string(),
                content: "country_event = {\n\tid = france.1\n\tpicture = GFX_idea_tank_manufacturer\n}".to_string(),
            },
        ];

        let refs = reverse_lookup_gfx("GFX_idea_tank_manufacturer", &files);
        assert_eq!(refs.len(), 2);
        assert_eq!(refs[0].line_number, 3);
        assert_eq!(refs[0].context_type, "focus_tree");
        assert_eq!(refs[1].line_number, 3);
        assert_eq!(refs[1].context_type, "event");
    }

    #[test]
    fn test_tga_flag_batch_sizes_and_bytes() {
        let result = export_flag_tga_batch("FRA", [0, 0, 255], None);
        // 4 ideologies * 3 sizes = 12 flags
        assert_eq!(result.total_files, 12);

        let std_flag = result.flags.iter().find(|f| f.resolution == "standard").unwrap();
        assert_eq!(std_flag.bytes.len(), 17074);
        assert_eq!(std_flag.width, 82);
        assert_eq!(std_flag.height, 52);

        let med_flag = result.flags.iter().find(|f| f.resolution == "medium").unwrap();
        assert_eq!(med_flag.bytes.len(), 4282);
        assert_eq!(med_flag.width, 41);
        assert_eq!(med_flag.height, 26);

        let sml_flag = result.flags.iter().find(|f| f.resolution == "small").unwrap();
        assert_eq!(sml_flag.bytes.len(), 298);
        assert_eq!(sml_flag.width, 10);
        assert_eq!(sml_flag.height, 7);
    }

    #[test]
    fn test_3way_ast_diffing_clean_and_conflict() {
        let base = r#"
            focus = {
                id = FOCUS_A
                cost = 10
            }
        "#;
        let vanilla_up = r#"
            focus = {
                id = FOCUS_A
                cost = 14
            }
        "#;
        let user_mod = r#"
            focus = {
                id = FOCUS_A
                cost = 7
            }
        "#;

        let diff = diff_ast_3way(base, vanilla_up, user_mod);
        assert_eq!(diff.total_blocks, 1);
        assert_eq!(diff.conflict_count, 1);
        assert_eq!(diff.blocks[0].status, "conflict");
    }

    #[test]
    fn test_province_realignment_computation_and_remapping() {
        let old_def = "0;0;0;0;land;false;unknown;0\n100;120;40;60;land;false;plains;1\n";
        let new_def = "0;0;0;0;land;false;unknown;0\n105;120;40;60;land;false;plains;1\n";

        let diff_map = compute_province_diff(old_def, new_def);
        assert_eq!(diff_map.shifted_provinces.get(&100), Some(&105));

        let mod_state = "state = {\n\tid = 1\n\tprovinces = { 100 200 }\n}";
        let res = realign_mod_provinces(mod_state, &diff_map);
        assert!(res.modified_script.contains("105 200"));
        assert_eq!(res.replacements_count, 1);
    }

    #[test]
    fn test_mod_optimizer_scanner() {
        let files = vec![
            ModAssetEntry {
                path: "gfx/interface/goals/unused_icon.dds".to_string(),
                file_type: "texture".to_string(),
                size_bytes: 50000,
                hash: "hash_a".to_string(),
            },
            ModAssetEntry {
                path: "gfx/interface/goals/used_icon.dds".to_string(),
                file_type: "texture".to_string(),
                size_bytes: 50000,
                hash: "hash_b".to_string(),
            },
            ModAssetEntry {
                path: "sound/dead_sound.ogg".to_string(),
                file_type: "audio".to_string(),
                size_bytes: 120000,
                hash: "hash_c".to_string(),
            },
        ];

        let script = "focus = { icon = GFX_used_icon }";
        let loc = vec!["UNUSED_LOC_KEY".to_string()];

        let report = scan_mod_assets(&files, script, &loc);
        assert_eq!(report.unreferenced_textures.len(), 1);
        assert_eq!(report.dead_audio.len(), 1);
        assert_eq!(report.orphaned_loc_keys.len(), 1);
        assert_eq!(report.total_reclaimable_bytes, 170000);
    }

    #[test]
    fn test_workshop_descriptor_validation() {
        let valid_desc = r#"
            name = "Republic Mod"
            version = "1.0.0"
            supported_version = "1.14.*"
            tags = {
                "Alternative History"
                "National Focuses"
            }
            picture = "thumbnail.png"
        "#;

        let res = validate_mod_descriptor(valid_desc);
        assert!(res.valid);
        assert_eq!(res.errors.len(), 0);
        let d = res.descriptor.unwrap();
        assert_eq!(d.name, "Republic Mod");
        assert_eq!(d.tags.len(), 2);
    }

    #[test]
    fn test_realign_does_not_chain_and_keeps_utf8() {
        let mut shifted = HashMap::new();
        shifted.insert(1u32, 2u32);
        shifted.insert(2u32, 3u32);
        let map = ProvinceRealignmentMap {
            shifted_provinces: shifted,
            split_provinces: HashMap::new(),
            added_provinces: vec![],
            removed_provinces: vec![],
        };
        let res = realign_mod_provinces("name = \"Köln\" provinces = { 1 2 } x = 0.1", &map);
        assert_eq!(res.modified_script, "name = \"Köln\" provinces = { 2 3 } x = 0.1");
        assert_eq!(res.replacements_count, 2);
    }

    #[test]
    fn test_package_filter_is_path_aware() {
        assert!(!matches_ignore_rule("common/latests/a.txt", "tests/"));
        assert!(matches_ignore_rule("art/a.psd", "*.psd"));
        assert!(matches_ignore_rule(".github/x", ".git"));
    }

    #[test]
    fn test_descriptor_inline_tags_do_not_swallow_following_fields() {
        let r = validate_mod_descriptor("tags={ \"Gameplay\" }\nname=\"X\"\nsupported_version=\"1.*\"\n");
        assert!(r.valid, "{:?}", r.errors);
    }
}
