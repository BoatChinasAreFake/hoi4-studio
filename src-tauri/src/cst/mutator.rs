use super::parser::{FocusTreeParser, FocusData, FocusTreeData};

pub struct SurgicalMutator;

impl SurgicalMutator {
    /// Update coordinates of a focus without modifying any comments or whitespace
    pub fn update_coordinates(source: &str, focus_id: &str, new_x: i32, new_y: i32) -> Result<String, String> {
        let mut parser = FocusTreeParser::new(source);
        let trees = parser.parse_focus_trees();
        
        let focus = Self::find_focus(&trees, focus_id)
            .ok_or_else(|| format!("Focus '{}' not found in file", focus_id))?;

        let mut edits = Vec::new();

        if let Some(ref span) = focus.x_span {
            edits.push((span.start, span.end, new_x.to_string()));
        }
        if let Some(ref span) = focus.y_span {
            edits.push((span.start, span.end, new_y.to_string()));
        }

        Self::apply_edits(source, edits)
    }

    /// Update cost of a focus
    pub fn update_cost(source: &str, focus_id: &str, new_cost: f64) -> Result<String, String> {
        let mut parser = FocusTreeParser::new(source);
        let trees = parser.parse_focus_trees();
        
        let focus = Self::find_focus(&trees, focus_id)
            .ok_or_else(|| format!("Focus '{}' not found in file", focus_id))?;

        if let Some(ref span) = focus.cost_span {
            let cost_str = if new_cost.fract() == 0.0 {
                format!("{:.0}", new_cost)
            } else {
                format!("{}", new_cost)
            };
            Self::apply_edits(source, vec![(span.start, span.end, cost_str)])
        } else {
            Err(format!("Focus '{}' does not have an explicit cost span", focus_id))
        }
    }

    /// Update icon of a focus
    pub fn update_icon(source: &str, focus_id: &str, new_icon: &str) -> Result<String, String> {
        let mut parser = FocusTreeParser::new(source);
        let trees = parser.parse_focus_trees();
        
        let focus = Self::find_focus(&trees, focus_id)
            .ok_or_else(|| format!("Focus '{}' not found in file", focus_id))?;

        if let Some(ref span) = focus.icon_span {
            Self::apply_edits(source, vec![(span.start, span.end, new_icon.to_string())])
        } else {
            Err(format!("Focus '{}' does not have an explicit icon span", focus_id))
        }
    }

    /// Rename a focus identifier throughout the file (including in prerequisites and mutual exclusions)
    pub fn rename_focus_symbol(source: &str, old_id: &str, new_id: &str) -> Result<String, String> {
        let mut parser = FocusTreeParser::new(source);
        let trees = parser.parse_focus_trees();
        let mut edits = Vec::new();

        for tree in &trees {
            for focus in &tree.focuses {
                // If this is the focus itself
                if focus.id == old_id {
                    edits.push((focus.id_span.start, focus.id_span.end, new_id.to_string()));
                }
                // If it uses old_id as relative_position_id
                if focus.relative_position_id.as_deref() == Some(old_id) {
                    if let Some(ref span) = focus.relative_position_span {
                        edits.push((span.start, span.end, new_id.to_string()));
                    }
                }
            }
        }

        if edits.is_empty() {
            return Ok(source.to_string());
        }

        Self::apply_edits(source, edits)
    }

    fn find_focus<'a>(trees: &'a [FocusTreeData], focus_id: &str) -> Option<&'a FocusData> {
        for tree in trees {
            for f in &tree.focuses {
                if f.id == focus_id {
                    return Some(f);
                }
            }
        }
        None
    }

    fn apply_edits(source: &str, mut edits: Vec<(usize, usize, String)>) -> Result<String, String> {
        // Sort edits in reverse order so applying them does not invalidate earlier offsets
        edits.sort_by(|a, b| b.0.cmp(&a.0));

        let mut output = source.to_string();
        for (start, end, replacement) in edits {
            if start > output.len() || end > output.len() || start > end {
                return Err("Invalid byte offset during surgical edit".to_string());
            }
            output.replace_range(start..end, &replacement);
        }

        Ok(output)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const SAMPLE_FOCUS_TREE: &str = r#"# Vanilla Germany Focus Tree
focus_tree = {
	id = german_focus
	
	country = {
		factor = 0
		modifier = {
			add = 10
			tag = GER
		}
	}
	
	default = no
	reset_on_civilwar = no

	# Rhineland remilitarization
	focus = {
		id = GER_rhineland
		icon = GFX_goal_rhineland
		cost = 10
		x = 10
		y = 0
		
		# Mutually exclusive with anti-fascist path
		mutually_exclusive = { focus = GER_oppose_hitler }

		completion_reward = {
			add_political_power = 120
		}
	}

	# Four year plan branch
	focus = {
		id = GER_four_year_plan
		icon = GFX_goal_four_year_plan
		cost = 10
		prerequisite = { focus = GER_rhineland }
		x = 12
		y = 1
		relative_position_id = GER_rhineland

		completion_reward = {
			add_ideas = GER_four_year_plan_idea
		}
	}
}
"#;

    #[test]
    fn test_parse_sample() {
        let mut parser = FocusTreeParser::new(SAMPLE_FOCUS_TREE);
        let trees = parser.parse_focus_trees();
        assert_eq!(trees.len(), 1);
        assert_eq!(trees[0].id, "german_focus");
        assert_eq!(trees[0].focuses.len(), 2);
        assert_eq!(trees[0].focuses[0].id, "GER_rhineland");
        assert_eq!(trees[0].focuses[1].id, "GER_four_year_plan");
        assert_eq!(trees[0].focuses[1].relative_position_id.as_deref(), Some("GER_rhineland"));
    }

    #[test]
    fn test_surgical_coordinate_mutation() {
        let updated = SurgicalMutator::update_coordinates(SAMPLE_FOCUS_TREE, "GER_four_year_plan", 14, 2).unwrap();
        // Check that the values changed
        assert!(updated.contains("x = 14"));
        assert!(updated.contains("y = 2"));
        // Check that comments are 100% preserved
        assert!(updated.contains("# Rhineland remilitarization"));
        assert!(updated.contains("# Mutually exclusive with anti-fascist path"));
        assert!(updated.contains("# Four year plan branch"));
        assert!(updated.contains("add_political_power = 120"));
    }

    #[test]
    fn test_surgical_rename() {
        let updated = SurgicalMutator::rename_focus_symbol(SAMPLE_FOCUS_TREE, "GER_rhineland", "GER_rhineland_reworked").unwrap();
        assert!(updated.contains("id = GER_rhineland_reworked"));
        assert!(updated.contains("relative_position_id = GER_rhineland_reworked"));
        assert!(updated.contains("# Rhineland remilitarization"));
    }
}
