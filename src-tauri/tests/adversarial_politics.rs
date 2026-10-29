use app_lib::politics::*;
use std::collections::HashMap;

#[test]
fn test_adversarial_country_scaffolding_10_files_7_dirs() {
    let configs = vec![
        CountryScaffoldConfig {
            tag: "SYL".to_string(),
            name: "Syldavia".to_string(),
            adjective: "Syldavian".to_string(),
            color: [45, 95, 140],
            graphical_culture: "eastern_european_gfx".to_string(),
            capital_province_id: 460,
            state_id: 1001,
            state_name: "Klow".to_string(),
            state_provinces: vec![460, 461, 462],
            ruling_party: "democratic".to_string(),
            leader_name: "Muskar XII".to_string(),
            leader_ideology: "constitutional_monarchy".to_string(),
            leader_portrait: Some("GFX_portrait_muskar".to_string()),
        },
        CountryScaffoldConfig {
            tag: "BOR".to_string(),
            name: "Borduria".to_string(),
            adjective: "Bordurian".to_string(),
            color: [140, 30, 45],
            graphical_culture: "eastern_european_gfx".to_string(),
            capital_province_id: 450,
            state_id: 999,
            state_name: "Szohod".to_string(),
            state_provinces: vec![450, 451, 452, 453, 454],
            ruling_party: "fascism".to_string(),
            leader_name: "Kurvi-Tasch".to_string(),
            leader_ideology: "fascism_ideology".to_string(),
            leader_portrait: None,
        },
    ];

    for cfg in configs {
        let tag = cfg.tag.clone();
        let name = cfg.name.clone();
        let ruling_party = cfg.ruling_party.clone();
        let result = scaffold_country_files(cfg);

        assert_eq!(result.tag, tag);
        assert_eq!(result.files.len(), 10);
        assert!(result.directories.len() >= 7);

        // Verify specific required paths exist
        let paths: Vec<String> = result.files.iter().map(|f| f.path.clone()).collect();
        assert!(paths.contains(&format!("common/countries/{}.txt", name)));
        assert!(paths.contains(&format!("common/country_tags/{}.txt", tag)));
        assert!(paths.contains(&format!("history/countries/{} - {}.txt", tag, name)));
        assert!(paths.contains(&format!("gfx/flags/{}.tga", tag)));
        assert!(paths.contains(&format!("gfx/flags/medium/{}.tga", tag)));
        assert!(paths.contains(&format!("gfx/flags/small/{}.tga", tag)));
        assert!(paths.contains(&format!("common/characters/{}.txt", tag)));
        assert!(paths.contains(&format!("common/ideas/{}.txt", tag)));
        assert!(paths.contains(&format!("localisation/english/{}_l_english.yml", tag)));

        // Democratic check
        let hist = result
            .files
            .iter()
            .find(|f| f.path.starts_with("history/countries"))
            .unwrap();
        if ruling_party == "democratic" {
            assert!(hist.content.contains("elections_allowed = yes"));
        } else {
            assert!(hist.content.contains("elections_allowed = no"));
        }

        // Localisation BOM check
        let loc = result
            .files
            .iter()
            .find(|f| f.path.starts_with("localisation/english"))
            .unwrap();
        assert!(loc.is_binary);
        let loc_bytes = loc.binary_bytes.as_ref().unwrap();
        assert!(has_utf8_bom(loc_bytes));
        let bom_val = validate_localization_bom(loc_bytes);
        assert!(bom_val.valid);
        assert!(bom_val.error.is_none());
    }
}

#[test]
fn test_adversarial_tga_flag_buffers_and_channels() {
    let color = [200, 50, 100];
    let flags = export_flags("TST", color);

    // Standard 82x52
    assert_eq!(flags.standard_bytes.len(), 18 + 82 * 52 * 4);
    assert_eq!(flags.standard_bytes[2], 2); // Uncompressed true color
    assert_eq!(flags.standard_bytes[16], 32); // 32 bpp
    let std_w = (flags.standard_bytes[12] as u16) | ((flags.standard_bytes[13] as u16) << 8);
    let std_h = (flags.standard_bytes[14] as u16) | ((flags.standard_bytes[15] as u16) << 8);
    assert_eq!(std_w, 82);
    assert_eq!(std_h, 52);

    // Verify BGRA channel ordering
    let b = flags.standard_bytes[18];
    let g = flags.standard_bytes[19];
    let r = flags.standard_bytes[20];
    let a = flags.standard_bytes[21];
    assert_eq!(b, color[2]);
    assert_eq!(g, color[1]);
    assert_eq!(r, color[0]);
    assert_eq!(a, 255);

    // Medium 41x26
    assert_eq!(flags.medium_bytes.len(), 18 + 41 * 26 * 4);
    let med_w = (flags.medium_bytes[12] as u16) | ((flags.medium_bytes[13] as u16) << 8);
    let med_h = (flags.medium_bytes[14] as u16) | ((flags.medium_bytes[15] as u16) << 8);
    assert_eq!(med_w, 41);
    assert_eq!(med_h, 26);

    // Small 10x7
    assert_eq!(flags.small_bytes.len(), 18 + 10 * 7 * 4);
    let sm_w = (flags.small_bytes[12] as u16) | ((flags.small_bytes[13] as u16) << 8);
    let sm_h = (flags.small_bytes[14] as u16) | ((flags.small_bytes[15] as u16) << 8);
    assert_eq!(sm_w, 10);
    assert_eq!(sm_h, 7);
}

#[test]
fn test_adversarial_utf8_bom_multilingual_integrity() {
    let mut entries = HashMap::new();
    entries.insert("RU_KEY".to_string(), "Союз Советских Социалистических Республик".to_string());
    entries.insert("CN_KEY".to_string(), "中华人民共和国与全民族抗战".to_string());
    entries.insert("JP_KEY".to_string(), "大日本帝国と零式艦上戦闘機".to_string());
    entries.insert("DE_KEY".to_string(), "München, Nürnberg und Königsberg".to_string());
    entries.insert("FR_KEY".to_string(), "Troisième République Française".to_string());
    entries.insert("PL_KEY".to_string(), "Bohaterowie Gdańska i Krakowa".to_string());

    let bytes = write_localization_entry(&entries, "russian");

    // Exact raw byte header
    assert_eq!(bytes[0], 0xEF);
    assert_eq!(bytes[1], 0xBB);
    assert_eq!(bytes[2], 0xBF);
    assert!(has_utf8_bom(&bytes));

    let val = validate_localization_bom(&bytes);
    assert!(val.valid);
    assert!(val.error.is_none());

    let (has, text_res) = strip_utf8_bom(&bytes);
    assert!(has);
    let text = text_res.expect("valid utf-8 string");
    assert!(text.contains("l_russian:"));
    assert!(text.contains("Союз Советских Социалистических Республик"));
    assert!(text.contains("中华人民共和国与全民族抗战"));
    assert!(text.contains("大日本帝国と零式艦上戦闘機"));
    assert!(text.contains("München, Nürnberg und Königsberg"));

    // Check invalid headers
    assert!(!validate_localization_bom(&[0xEF, 0xBB]).valid); // < 3 bytes
    assert!(!validate_localization_bom(b"l_english:\n").valid); // missing BOM
    assert!(!validate_localization_bom(&[0xFE, 0xFF, 0x00, 0x6C]).valid); // UTF-16 BE
}

#[test]
fn test_adversarial_symbol_refactoring_word_boundaries_and_diffs() {
    let source = "tag = GER\nruling_party = GER_fascism\nis_puppet_of = PRE_GER\nGER:0 \"Germany\"\nGER.1 = event\n\"GER\"\n";

    let (replaced, count) = replace_symbol_in_text(source, "GER", "NEW");
    // 1. 'tag = GER' -> replaced
    // 2. 'GER_fascism' -> preserved (ident char)
    // 3. 'PRE_GER' -> preserved (ident char)
    // 4. 'GER:0' -> replaced (: is non-ident)
    // 5. 'GER.1' -> replaced (. is non-ident)
    // 6. '"GER"' -> replaced (" is non-ident)
    assert_eq!(count, 4);
    assert!(replaced.contains("tag = NEW"));
    assert!(replaced.contains("ruling_party = GER_fascism"));
    assert!(replaced.contains("is_puppet_of = PRE_GER"));
    assert!(replaced.contains("NEW:0 \"Germany\""));
    assert!(replaced.contains("NEW.1 = event"));
    assert!(replaced.contains("\"NEW\""));

    // Multi-file check
    let files = vec![
        SourceFileEntry {
            path: "file1.txt".to_string(),
            content: "GER = yes\n".to_string(),
        },
        SourceFileEntry {
            path: "file2.txt".to_string(),
            content: "NO_MATCH = yes\n".to_string(),
        },
        SourceFileEntry {
            path: "file3.txt".to_string(),
            content: "GER = other\n".to_string(),
        },
    ];

    let result = refactor_symbol_in_files(&files, "GER", "XYZ");
    assert_eq!(result.total_replacements, 2);
    assert_eq!(result.modified_files.len(), 2);
    assert!(!result.modified_files.iter().any(|f| f.path == "file2.txt"));
    assert!(result.unified_diff.contains("--- a/file1.txt"));
    assert!(result.unified_diff.contains("--- a/file3.txt"));
}
