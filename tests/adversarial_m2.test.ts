import { describe, it, expect } from 'vitest';
import {
  generateSuperEventFiles,
  validateSuperEventPayload,
  createTgaBuffer,
  prependUtf8Bom,
  hasUtf8Bom,
  stripUtf8Bom,
  validateLocalizationEncoding,
  scaffoldCountryFiles,
  generateCharacterScript,
  generateBopScript,
  getActiveBopModifiers,
  generateFactionScript,
  generateIdeologyScript,
  generateAutonomyScript,
  generateDiploActionScript,
  generateTimedActivityScript,
  refactorSymbolInContent,
  generateUnifiedDiff,
  formatLocalizationYaml,
  ALL_HOI4_LANGUAGES,
} from '../src/utils/politicsGenerators';
import type {
  SuperEventDef,
  CountryWizardConfig,
  FactionDef,
  FactionRule,
  FactionGoal,
  IdeologyDefinition,
  AutonomyLevel,
  ScriptedDiploAction,
  TimedActivity,
} from '../src/types/politics';
import { validateFlagTga } from './helpers/tgaValidator';

// Helper: Count opening and closing braces to ensure valid Clausewitz nesting
function countBraces(str: string): { open: number; close: number; balanced: boolean } {
  let open = 0;
  let close = 0;
  for (const ch of str) {
    if (ch === '{') open++;
    else if (ch === '}') close++;
  }
  return { open, close, balanced: open === close };
}

describe('Adversarial Test Suite: Milestone M2 Empirical Stress Harness', () => {
  // =========================================================================
  // 1. Super Event Studio Code Scaffolding Stress & Window Invariants
  // =========================================================================
  describe('1. Super Event Studio Code Scaffolding', () => {
    const sampleEvent: SuperEventDef = {
      id: 'super_event_fall_of_rome',
      titleLocKey: 'SUPER_EVENT_FALL_OF_ROME_TITLE',
      titleText: 'THE FALL OF THE ETERNAL CITY',
      quoteLocKey: 'SUPER_EVENT_FALL_OF_ROME_QUOTE',
      quoteText: '"The seven hills tremble under the rumble of steel. Rome has fallen."',
      quoteAuthor: 'General Harold Alexander',
      buttonLocKey: 'SUPER_EVENT_FALL_OF_ROME_BTN',
      buttonText: 'A glorious victory.',
      bannerSprite: 'GFX_super_event_fall_of_rome',
      soundEffect: 'rome_conquest_fanfare',
      frameSkin: 'vanilla',
      fireOnlyOnce: true,
      effect: 'news_event = { id = news.150 hours = 2 }',
    };

    it('guarantees syntax validity & 100% balanced braces across all 4 generated files', () => {
      const files = generateSuperEventFiles(sampleEvent);
      const expectedPaths = [
        'interface/superevents_fall_of_rome.gui',
        'common/scripted_guis/superevents_fall_of_rome_scripted_gui.txt',
        'sound/superevents_fall_of_rome.asset',
        'events/SuperEvents_fall_of_rome.txt',
      ];

      for (const p of expectedPaths) {
        expect(files).toHaveProperty(p);
        const content = files[p];
        const { open, close, balanced } = countBraces(content);
        expect(open).toBeGreaterThan(0);
        expect(close).toBeGreaterThan(0);
        expect(balanced).toBe(true);
      }
    });

    it('enforces exact window positioning and strict bounding box containment in .gui', () => {
      const files = generateSuperEventFiles(sampleEvent);
      const guiContent = files['interface/superevents_fall_of_rome.gui'];

      // Bounding box: size = { width = 580 height = 660 }
      const widthMatch = guiContent.match(/width\s*=\s*(\d+)/);
      const heightMatch = guiContent.match(/height\s*=\s*(\d+)/);
      expect(widthMatch).not.toBeNull();
      expect(heightMatch).not.toBeNull();
      const winWidth = parseInt(widthMatch![1], 10);
      const winHeight = parseInt(heightMatch![1], 10);
      expect(winWidth).toBe(580);
      expect(winHeight).toBe(660);

      // Window origin & orientation
      expect(guiContent).toContain('position = { x = 0 y = 0 }');
      expect(guiContent).toContain('orientation = center');
      expect(guiContent).toContain('origo = center');
      expect(guiContent).toContain('moveable = no');

      // Verify Title element fits within window width (40 + 500 = 540 <= 580)
      const titlePos = guiContent.match(/name\s*=\s*"Title"[\s\S]*?position\s*=\s*\{\s*x\s*=\s*(\d+)\s+y\s*=\s*(\d+)\s*\}[\s\S]*?maxWidth\s*=\s*(\d+)/);
      expect(titlePos).not.toBeNull();
      const titleX = parseInt(titlePos![1], 10);
      const titleW = parseInt(titlePos![3], 10);
      expect(titleX + titleW).toBeLessThanOrEqual(winWidth);

      // Verify Option button fits within window bounds (x=140, y=580 <= 660)
      const btnPos = guiContent.match(/name\s*=\s*"Option"[\s\S]*?position\s*=\s*\{\s*x\s*=\s*(\d+)\s+y\s*=\s*(\d+)\s*\}/);
      expect(btnPos).not.toBeNull();
      const btnY = parseInt(btnPos![2], 10);
      expect(btnY).toBeLessThan(winHeight);
      expect(guiContent).toContain('shortcut = "RETURN"');
    });

    it('normalizes event IDs, eliminates redundant prefixes, and prevents namespace collisions', () => {
      // Test cases with varied casing and redundant prefixes
      const eventWithPrefix = { ...sampleEvent, id: 'super_event_unification_war' };
      const eventWithoutPrefix = { ...sampleEvent, id: 'unification_war' };
      const eventUpper = { ...sampleEvent, id: 'SUPER_EVENT_UNIFICATION_WAR' };

      const filesA = generateSuperEventFiles(eventWithPrefix);
      const filesB = generateSuperEventFiles(eventWithoutPrefix);
      const filesC = generateSuperEventFiles(eventUpper);

      // All three must map to the same clean file paths and unique namespace
      const expectedGuiPath = 'interface/superevents_unification_war.gui';
      expect(filesA).toHaveProperty(expectedGuiPath);
      expect(filesB).toHaveProperty(expectedGuiPath);
      expect(filesC).toHaveProperty(expectedGuiPath);

      // Event namespace must be normalized lowercase without double prefixes
      const eventScript = filesA['events/SuperEvents_unification_war.txt'];
      expect(eventScript).toContain('add_namespace = superevent_unification_war');
      expect(eventScript).toContain('id = superevent_unification_war.1');
      expect(eventScript).not.toContain('superevent_super_event');
    });

    it('declares correct sound effect in both .asset file and event immediate block', () => {
      const customSoundEvent: SuperEventDef = {
        ...sampleEvent,
        id: 'super_event_custom_audio',
        soundEffect: 'my_epic_fanfare_cue',
      };
      const files = generateSuperEventFiles(customSoundEvent);

      const assetContent = files['sound/superevents_custom_audio.asset'];
      expect(assetContent).toContain('name = "my_epic_fanfare_cue"');
      expect(assetContent).toContain('file = "superevents/custom_audio.ogg"');
      expect(assetContent).toContain('volume = 1.0');

      const eventContent = files['events/SuperEvents_custom_audio.txt'];
      expect(eventContent).toContain('play_sound = "my_epic_fanfare_cue"');
      expect(eventContent).toContain('set_global_flag = super_event_custom_audio_active');
    });

    it('rejects invalid super event payloads with spaces, dashes, or empty fields', () => {
      // Missing title
      expect(validateSuperEventPayload({ ...sampleEvent, titleText: '   ' }).valid).toBe(false);
      // Missing quote
      expect(validateSuperEventPayload({ ...sampleEvent, quoteText: '' }).valid).toBe(false);
      // Missing button
      expect(validateSuperEventPayload({ ...sampleEvent, buttonText: '  ' }).valid).toBe(false);
      // Missing sound
      expect(validateSuperEventPayload({ ...sampleEvent, soundEffect: '' }).valid).toBe(false);
      // Invalid ID with dashes or spaces
      expect(validateSuperEventPayload({ ...sampleEvent, id: 'event-with-dash' }).valid).toBe(false);
      expect(validateSuperEventPayload({ ...sampleEvent, id: 'event with space' }).valid).toBe(false);
      expect(validateSuperEventPayload({ ...sampleEvent, id: 'event@symbol' }).valid).toBe(false);
      // Valid alphanumeric with underscore
      expect(validateSuperEventPayload({ ...sampleEvent, id: 'valid_event_123' }).valid).toBe(true);
    });
  });

  // =========================================================================
  // 2. Faction Rules & Strategic Goals (NCNS) Stress Testing
  // =========================================================================
  describe('2. Faction Rules & Goals Studio (NCNS)', () => {
    // Oracle: Detects rule contradictions or invalid threshold conditions in faction configurations
    function auditFactionConfiguration(faction: FactionDef): {
      valid: boolean;
      warnings: string[];
      errors: string[];
    } {
      const errors: string[] = [];
      const warnings: string[] = [];

      // 1. Leader must be present in members
      if (!faction.memberTags.includes(faction.leaderTag)) {
        errors.push(`Faction leader '${faction.leaderTag}' is not listed in memberTags.`);
      }

      // 2. World tension threshold must be between 0.0 and 1.0
      if (faction.rules.worldTensionThreshold < 0.0 || faction.rules.worldTensionThreshold > 1.0) {
        errors.push(
          `World tension threshold ${faction.rules.worldTensionThreshold} is out of bounds [0.0, 1.0].`
        );
      }

      // 3. Faction with offensiveWarAllowed = false cannot have offensive conquest goals
      if (!faction.rules.offensiveWarAllowed) {
        for (const g of faction.goals) {
          if (
            g.name.toLowerCase().includes('conquest') ||
            g.name.toLowerCase().includes('offensive') ||
            g.description.toLowerCase().includes('annex')
          ) {
            warnings.push(
              `Faction prohibits offensive war, but strategic goal '${g.name}' specifies offensive conquest.`
            );
          }
        }
      }

      // 4. Duplicate member tags
      const uniqueMembers = new Set(faction.memberTags);
      if (uniqueMembers.size !== faction.memberTags.length) {
        errors.push('memberTags contains duplicate country tags.');
      }

      return {
        valid: errors.length === 0,
        warnings,
        errors,
      };
    }

    it('generates syntactically sound scripts for extreme multi-ideology faction coalitions', () => {
      // Coalition: Fascist leader with Democratic, Communist, and Non-Aligned members
      const grandCoalition: FactionDef = {
        name: 'Anti-Hegemonic United Front',
        leaderTag: 'GER',
        ideology: 'fascism',
        rules: {
          leaderVetoPeace: true,
          canPuppetJoin: true,
          worldTensionThreshold: 0.85,
          offensiveWarAllowed: true,
          mutualDefenseTrigger: true,
        },
        memberTags: ['GER', 'ENG', 'SOV', 'TUR', 'USA', 'JAP'],
        goals: [
          {
            id: 'global_containment',
            name: 'Global Containment Strategy',
            description: 'Coordinate strategic theatres across the Atlantic and Pacific oceans.',
            rewardModifier: {
              war_support_factor: 0.15,
              justify_war_goal_time: -0.25,
            },
          },
        ],
      };

      const { rulesScript, goalsScript } = generateFactionScript(grandCoalition);

      expect(rulesScript).toContain('faction_rule_anti-hegemonic_united_front = {');
      expect(rulesScript).toContain('leader = GER');
      expect(rulesScript).toContain('ideology = fascism');
      expect(rulesScript).toContain('leader_veto_peace_deals = yes');
      expect(rulesScript).toContain('can_puppet_join = yes');
      expect(rulesScript).toContain('world_tension_threshold = 0.85');
      expect(rulesScript).toContain('members = { GER ENG SOV TUR USA JAP }');

      const { balanced: rBalanced } = countBraces(rulesScript);
      const { balanced: gBalanced } = countBraces(goalsScript);
      expect(rBalanced).toBe(true);
      expect(gBalanced).toBe(true);
    });

    it('identifies incompatible war goals and contradictory rule triggers via oracle', () => {
      const conflictingFaction: FactionDef = {
        name: 'Pacifist League of Neutrality',
        leaderTag: 'SWI',
        ideology: 'neutrality',
        rules: {
          leaderVetoPeace: true,
          canPuppetJoin: false,
          worldTensionThreshold: 1.5, // INVALID: > 1.0
          offensiveWarAllowed: false, // Pacifist rule
          mutualDefenseTrigger: true,
        },
        memberTags: ['SWI', 'SWE', 'SWI'], // INVALID: duplicate SWI, missing leaderTag uniqueness
        goals: [
          {
            id: 'offensive_blitz',
            name: 'Offensive Conquest of Lowlands',
            description: 'Annex neighboring territory.',
            rewardModifier: { justify_war_goal_time: -0.5 },
          },
        ],
      };

      const audit = auditFactionConfiguration(conflictingFaction);
      expect(audit.valid).toBe(false);
      expect(audit.errors.some((e) => e.includes('out of bounds'))).toBe(true);
      expect(audit.errors.some((e) => e.includes('duplicate'))).toBe(true);
      expect(audit.warnings.some((w) => w.includes('prohibits offensive war'))).toBe(true);
    });

    it('handles boundary conditions: empty members, zero tension threshold, and special characters', () => {
      const minimalFaction: FactionDef = {
        name: 'Isolated Bastion',
        leaderTag: 'TIB',
        ideology: 'neutrality',
        rules: {
          leaderVetoPeace: false,
          canPuppetJoin: false,
          worldTensionThreshold: 0.0, // Immediate availability
          offensiveWarAllowed: false,
          mutualDefenseTrigger: false,
        },
        memberTags: ['TIB'],
        goals: [],
      };

      const { rulesScript, goalsScript } = generateFactionScript(minimalFaction);
      expect(rulesScript).toContain('world_tension_threshold = 0.00');
      expect(rulesScript).toContain('offensive_war_allowed = no');
      expect(rulesScript).toContain('mutual_defense_trigger = no');
      expect(rulesScript).toContain('members = { TIB }');
      expect(goalsScript.split('\n')[0]).toBe('# Faction Goals for Isolated Bastion');
      expect(goalsScript).toContain('UNVERIFIED');
    });
  });

  // =========================================================================
  // 3. Ideology and Autonomy Studio Stress Testing
  // =========================================================================
  describe('3. Ideology and Autonomy Studio', () => {
    // Oracle: Resolves sub-ideology to parent ideology group
    function resolveSubIdeologyGroup(
      subType: string,
      ideologies: IdeologyDefinition[]
    ): { parentGroup: string | null; subTypeExists: boolean } {
      for (const ideo of ideologies) {
        if (ideo.subTypes.includes(subType)) {
          return { parentGroup: ideo.name, subTypeExists: true };
        }
      }
      return { parentGroup: null, subTypeExists: false };
    }

    // Oracle: Evaluates which autonomy tier a puppet occupies given freedom score [0.0, 1.0]
    function resolveAutonomyTier(
      freedomScore: number,
      levels: AutonomyLevel[]
    ): { tierId: string; tierName: string; isFree: boolean } {
      // Clamped score
      const clamped = Math.max(0.0, Math.min(1.0, freedomScore));
      if (clamped >= 1.0) {
        return { tierId: 'free', tierName: 'Independent Nation', isFree: true };
      }

      // Sort levels by minFreedomLevel descending
      const sorted = [...levels].sort((a, b) => b.minFreedomLevel - a.minFreedomLevel);
      for (const lvl of sorted) {
        if (clamped >= lvl.minFreedomLevel) {
          return { tierId: lvl.id, tierName: lvl.name, isFree: false };
        }
      }

      // Fallback to lowest tier
      const lowest = sorted[sorted.length - 1];
      return { tierId: lowest.id, tierName: lowest.name, isFree: false };
    }

    it('resolves sub-ideologies to their respective parent groups without collision', () => {
      const coreIdeologies: IdeologyDefinition[] = [
        {
          name: 'democratic',
          group: 'democratic',
          color: [0, 0, 255],
          subTypes: ['conservatism', 'liberalism', 'socialism'],
          rules: {
            can_force_government: true,
            can_puppet: false, // Democratic cannot puppet in peace deals
            can_send_volunteers: false,
            can_be_spymaster: true,
            can_declare_war_on_same_ideology: false,
          },
          warImpactOnWorldTension: 0.2,
          dynamicFactionNames: ['Allies'],
        },
        {
          name: 'communism',
          group: 'communism',
          color: [255, 0, 0],
          subTypes: ['marxism', 'leninism', 'stalinism', 'anti_revisionism'],
          rules: {
            can_force_government: true,
            can_puppet: true,
            can_send_volunteers: true,
            can_be_spymaster: true,
            can_declare_war_on_same_ideology: true,
          },
          warImpactOnWorldTension: 0.75,
          dynamicFactionNames: ['Comintern'],
        },
        {
          name: 'fascism',
          group: 'fascism',
          color: [150, 75, 0],
          subTypes: ['nazism', 'gen_nazism', 'falangism', 'rexism'],
          rules: {
            can_force_government: false,
            can_puppet: true,
            can_send_volunteers: true,
            can_be_spymaster: true,
            can_declare_war_on_same_ideology: true,
          },
          warImpactOnWorldTension: 1.0,
          dynamicFactionNames: ['Axis'],
        },
      ];

      expect(resolveSubIdeologyGroup('liberalism', coreIdeologies).parentGroup).toBe('democratic');
      expect(resolveSubIdeologyGroup('stalinism', coreIdeologies).parentGroup).toBe('communism');
      expect(resolveSubIdeologyGroup('falangism', coreIdeologies).parentGroup).toBe('fascism');
      expect(resolveSubIdeologyGroup('rexism', coreIdeologies).parentGroup).toBe('fascism');
      expect(resolveSubIdeologyGroup('anarcho_capitalism', coreIdeologies).subTypeExists).toBe(false);
    });

    it('verifies peace treaty limits: Democratic cannot puppet, Fascism cannot force government', () => {
      const testIdeologies: IdeologyDefinition[] = [
        {
          name: 'democratic',
          group: 'democratic',
          color: [0, 0, 255],
          subTypes: ['liberalism'],
          rules: {
            can_force_government: true,
            can_puppet: false,
            can_send_volunteers: false,
            can_be_spymaster: true,
            can_declare_war_on_same_ideology: false,
          },
          warImpactOnWorldTension: 0.2,
          dynamicFactionNames: [],
        },
        {
          name: 'fascism',
          group: 'fascism',
          color: [150, 75, 0],
          subTypes: ['fascism_ideology'],
          rules: {
            can_force_government: false,
            can_puppet: true,
            can_send_volunteers: true,
            can_be_spymaster: true,
            can_declare_war_on_same_ideology: true,
          },
          warImpactOnWorldTension: 1.0,
          dynamicFactionNames: [],
        },
      ];

      const script = generateIdeologyScript(testIdeologies);
      expect(script).toContain('democratic = {');
      expect(script).toContain('can_puppet = no');
      expect(script).toContain('can_force_government = yes');

      expect(script).toContain('fascism = {');
      expect(script).toContain('can_puppet = yes');
      expect(script).toContain('can_force_government = no');
    });

    it('evaluates autonomy progression ladder monotonicity and boundary freedom transitions', () => {
      const autonomyLadder: AutonomyLevel[] = [
        {
          id: 'dominion',
          name: 'Dominion',
          minFreedomLevel: 0.8,
          manpowerInfluence: 0.0,
          rules: { can_not_declare_war: false, can_decline_call_to_war: true, can_be_spymaster: true, contributes_operatives: true },
          modifiers: {},
        },
        {
          id: 'colony',
          name: 'Colony',
          minFreedomLevel: 0.5,
          manpowerInfluence: 0.7,
          rules: { can_not_declare_war: true, can_decline_call_to_war: false, can_be_spymaster: false, contributes_operatives: false },
          modifiers: {},
        },
        {
          id: 'puppet',
          name: 'Puppet',
          minFreedomLevel: 0.3,
          manpowerInfluence: 0.9,
          rules: { can_not_declare_war: true, can_decline_call_to_war: false, can_be_spymaster: false, contributes_operatives: false },
          modifiers: {},
        },
        {
          id: 'integrated_puppet',
          name: 'Integrated Puppet',
          minFreedomLevel: 0.1,
          manpowerInfluence: 1.0,
          rules: { can_not_declare_war: true, can_decline_call_to_war: false, can_be_spymaster: false, contributes_operatives: false },
          modifiers: {},
        },
        {
          id: 'reichskommissariat',
          name: 'Reichskommissariat',
          minFreedomLevel: 0.05,
          manpowerInfluence: 0.9,
          rules: { can_not_declare_war: true, can_decline_call_to_war: false, can_be_spymaster: false, contributes_operatives: false },
          modifiers: {},
        },
      ];

      // Test boundary points
      expect(resolveAutonomyTier(0.02, autonomyLadder).tierId).toBe('reichskommissariat');
      expect(resolveAutonomyTier(0.05, autonomyLadder).tierId).toBe('reichskommissariat');
      expect(resolveAutonomyTier(0.09, autonomyLadder).tierId).toBe('reichskommissariat');
      expect(resolveAutonomyTier(0.10, autonomyLadder).tierId).toBe('integrated_puppet');
      expect(resolveAutonomyTier(0.29, autonomyLadder).tierId).toBe('integrated_puppet');
      expect(resolveAutonomyTier(0.30, autonomyLadder).tierId).toBe('puppet');
      expect(resolveAutonomyTier(0.49, autonomyLadder).tierId).toBe('puppet');
      expect(resolveAutonomyTier(0.50, autonomyLadder).tierId).toBe('colony');
      expect(resolveAutonomyTier(0.79, autonomyLadder).tierId).toBe('colony');
      expect(resolveAutonomyTier(0.80, autonomyLadder).tierId).toBe('dominion');
      expect(resolveAutonomyTier(0.99, autonomyLadder).tierId).toBe('dominion');
      expect(resolveAutonomyTier(1.00, autonomyLadder).isFree).toBe(true);
      expect(resolveAutonomyTier(1.25, autonomyLadder).isFree).toBe(true);
    });

    it('verifies script generation formatting for autonomy levels and modifier blocks', () => {
      const customLevel: AutonomyLevel = {
        id: 'special_autonomous_republic',
        name: 'Autonomous Republic',
        minFreedomLevel: 0.65,
        manpowerInfluence: 0.35,
        rules: {
          can_not_declare_war: true,
          can_decline_call_to_war: true,
          can_be_spymaster: false,
          contributes_operatives: true,
        },
        modifiers: {
          autonomy_manpower_share: 0.35,
          extra_trade_to_overlord_factor: 0.40,
        },
      };

      const script = generateAutonomyScript([customLevel]);
      expect(script).toContain('autonomy_state = {');
      expect(script).toContain('id = autonomy_special_autonomous_republic');
      expect(script).toContain('min_freedom_level = 0.65');
      expect(script).toContain('manpower_influence = 0.35');
      expect(script).toContain('can_not_declare_war = yes');
      expect(script).toContain('can_decline_call_to_war = yes');
      expect(script).toContain('contributes_operatives = yes');
      expect(script).toContain('autonomy_manpower_share = 0.35');

      const { balanced } = countBraces(script);
      expect(balanced).toBe(true);
    });
  });

  // =========================================================================
  // 4. Diplo Actions & Timed Activities Stress Testing
  // =========================================================================
  describe('4. Scripted Diplo Actions & Timed Activities', () => {
    // Oracle: Evaluates AI acceptance calculation and acceptance outcome
    function evaluateAiAcceptance(
      action: ScriptedDiploAction,
      context: { isFriend: boolean; hasWar: boolean; strengthRatio: number }
    ): { score: number; accepted: boolean; bypassed: boolean } {
      if (!action.requiresAcceptance) {
        return { score: 100, accepted: true, bypassed: true };
      }

      // Parse base score from formula
      let score = 0;
      const baseMatch = action.aiAcceptanceFormula.match(/base\s*=\s*(-?\d+)/);
      if (baseMatch) {
        score = parseInt(baseMatch[1], 10);
      }

      // Apply modifiers
      if (action.aiAcceptanceFormula.includes('is_friend') && context.isFriend) {
        score += 50;
      }
      if (action.aiAcceptanceFormula.includes('has_war') && context.hasWar) {
        score += 30;
      }
      if (action.aiAcceptanceFormula.includes('ratio') && context.strengthRatio > 2.0) {
        score += 40;
      }

      return {
        score,
        accepted: score >= 0,
        bypassed: false,
      };
    }

    // Oracle: Daily tick simulator for timed national activities
    function simulateTimedActivity(
      activity: TimedActivity,
      ticksToSimulate: number,
      cancelConditionAtTick?: number
    ): { completed: boolean; cancelled: boolean; daysRemaining: number } {
      let daysRemaining = Math.max(0, activity.durationDays);

      if (daysRemaining === 0) {
        return { completed: true, cancelled: false, daysRemaining: 0 };
      }

      for (let day = 1; day <= ticksToSimulate; day++) {
        if (cancelConditionAtTick !== undefined && day === cancelConditionAtTick) {
          return { completed: false, cancelled: true, daysRemaining };
        }
        daysRemaining--;
        if (daysRemaining <= 0) {
          return { completed: true, cancelled: false, daysRemaining: 0 };
        }
      }

      return { completed: false, cancelled: false, daysRemaining };
    }

    it('simulates timed activity tick expiration, cancellation, and zero-duration edge cases', () => {
      const standardActivity: TimedActivity = {
        id: 'border_skirmish',
        name: 'Provoke Border Skirmish',
        durationDays: 30,
        equipmentCost: { infantry_equipment: 500 },
        cancelTrigger: 'has_war = yes',
        onExpireEffect: 'start_border_war = { state = 100 }',
      };

      // 1. Partial progression (15 days elapsed)
      const step15 = simulateTimedActivity(standardActivity, 15);
      expect(step15.completed).toBe(false);
      expect(step15.cancelled).toBe(false);
      expect(step15.daysRemaining).toBe(15);

      // 2. Full completion at day 30
      const step30 = simulateTimedActivity(standardActivity, 30);
      expect(step30.completed).toBe(true);
      expect(step30.cancelled).toBe(false);
      expect(step30.daysRemaining).toBe(0);

      // 3. Early cancellation at day 10
      const cancelled = simulateTimedActivity(standardActivity, 30, 10);
      expect(cancelled.completed).toBe(false);
      expect(cancelled.cancelled).toBe(true);
      expect(cancelled.daysRemaining).toBe(21);

      // 4. Zero-duration activity expires instantaneously
      const zeroActivity = { ...standardActivity, durationDays: 0 };
      const instant = simulateTimedActivity(zeroActivity, 1);
      expect(instant.completed).toBe(true);
      expect(instant.daysRemaining).toBe(0);
    });

    it('evaluates AI acceptance formulas, negative thresholds, and bypassed acceptance', () => {
      const demandAction: ScriptedDiploAction = {
        id: 'demand_demilitarization',
        name: 'Demand Demilitarization of Border',
        costPP: 50,
        costCP: 10,
        requiresAcceptance: true,
        allowedTrigger: 'is_neighbor_of = FROM',
        visibleTrigger: 'always = yes',
        aiAcceptanceFormula: 'base = -40 modifier = { factor = 2 is_friend = yes } modifier = { factor = 1.5 ratio > 2.0 }',
        onSentEffect: 'FROM = { country_event = diplo.1 }',
        completeEffect: 'set_demilitarized_zone = 50',
        rejectEffect: 'add_threat = 5',
      };

      // Base hostile case (no friend, low ratio): base -40 -> rejected
      const hostileRes = evaluateAiAcceptance(demandAction, { isFriend: false, hasWar: false, strengthRatio: 1.0 });
      expect(hostileRes.accepted).toBe(false);
      expect(hostileRes.score).toBe(-40);

      // Friend case: -40 + 50 = +10 -> accepted
      const friendRes = evaluateAiAcceptance(demandAction, { isFriend: true, hasWar: false, strengthRatio: 1.0 });
      expect(friendRes.accepted).toBe(true);
      expect(friendRes.score).toBe(10);

      // Overwhelming military supremacy: -40 + 40 = 0 -> accepted
      const ratioRes = evaluateAiAcceptance(demandAction, { isFriend: false, hasWar: false, strengthRatio: 3.5 });
      expect(ratioRes.accepted).toBe(true);
      expect(ratioRes.score).toBe(0);

      // Ultimatum with requiresAcceptance = false: bypassed acceptance
      const ultimatum = { ...demandAction, requiresAcceptance: false };
      const bypassedRes = evaluateAiAcceptance(ultimatum, { isFriend: false, hasWar: false, strengthRatio: 0.1 });
      expect(bypassedRes.bypassed).toBe(true);
      expect(bypassedRes.accepted).toBe(true);
    });

    it('generates valid Clausewitz scripts for complex diplomatic triggers and equipment costs', () => {
      const complexAction: ScriptedDiploAction = {
        id: 'sign_non_aggression_pact',
        name: 'Sign Non-Aggression Pact',
        costPP: 25,
        costCP: 0,
        requiresAcceptance: true,
        allowedTrigger: 'NOT = { has_war_with = FROM }',
        visibleTrigger: 'always = yes',
        aiAcceptanceFormula: 'base = 10',
        onSentEffect: 'FROM = { country_event = nap.1 }',
        completeEffect: 'diplomatic_relation = { country = FROM relation = non_aggression_pact }',
        rejectEffect: 'add_opinion_modifier = { target = FROM modifier = refused_pact }',
      };

      const script = generateDiploActionScript(complexAction);
      expect(script).toContain('sign_non_aggression_pact = {');
      expect(script).toContain('cost = 25');
      expect(script).toContain('command_power = 0');
      expect(script).toContain('requires_acceptance = yes');
      expect(script).toContain('ai_acceptance = {');
      expect(script).toContain('base = 10');

      const { balanced: dBalanced } = countBraces(script);
      expect(dBalanced).toBe(true);

      const complexActivity: TimedActivity = {
        id: 'build_coastal_fortifications',
        name: 'Construct Coastal Forts',
        durationDays: 120,
        equipmentCost: {
          infantry_equipment: 300,
          support_equipment: 100,
          artillery_equipment: 50,
        },
        cancelTrigger: 'has_war_with = ENG',
        onExpireEffect: '120 = { add_building_construction = { type = coastal_bunker level = 2 } }',
      };

      const actScript = generateTimedActivityScript(complexActivity);
      expect(actScript).toContain('timed_activity_build_coastal_fortifications = {');
      expect(actScript).toContain('duration = 120');
      expect(actScript).toContain('infantry_equipment = 300');
      expect(actScript).toContain('support_equipment = 100');
      expect(actScript).toContain('artillery_equipment = 50');

      const { balanced: aBalanced } = countBraces(actScript);
      expect(aBalanced).toBe(true);
    });
  });

  // =========================================================================
  // 5. Cross-Cutting Backend Parity, Flag TGAs & Multi-Language UTF-8 BOM
  // =========================================================================
  describe('5. Cross-Cutting Parity, Flag TGAs & Multi-Language UTF-8 BOM', () => {
    it('generates uncompressed 32-bit TGAs matching exact Paradox binary header specs for all 3 sizes', () => {
      const redColor: [number, number, number] = [220, 20, 40];

      // Standard (82x52)
      const stdBuf = createTgaBuffer(82, 52, redColor);
      expect(stdBuf.length).toBe(18 + 82 * 52 * 4);
      const stdVal = validateFlagTga(stdBuf, 'standard');
      expect(stdVal.valid).toBe(true);
      expect(stdVal.info?.width).toBe(82);
      expect(stdVal.info?.height).toBe(52);
      expect(stdVal.info?.bpp).toBe(32);
      expect(stdVal.info?.isUncompressedTrueColor).toBe(true);

      // Medium (41x26)
      const medBuf = createTgaBuffer(41, 26, redColor);
      expect(medBuf.length).toBe(18 + 41 * 26 * 4);
      const medVal = validateFlagTga(medBuf, 'medium');
      expect(medVal.valid).toBe(true);
      expect(medVal.info?.width).toBe(41);
      expect(medVal.info?.height).toBe(26);

      // Small (10x7)
      const smallBuf = createTgaBuffer(10, 7, redColor);
      expect(smallBuf.length).toBe(18 + 10 * 7 * 4);
      const smallVal = validateFlagTga(smallBuf, 'small');
      expect(smallVal.valid).toBe(true);
      expect(smallVal.info?.width).toBe(10);
      expect(smallVal.info?.height).toBe(7);
    });

    it('enforces UTF-8 BOM byte sequence [0xEF, 0xBB, 0xBF] across all 10 official Paradox languages', () => {
      const sampleEntries = [
        { key: 'TEST_NAME', value: 'HOI4 Studio Test' },
        { key: 'TEST_DESC', value: 'Verification of localization encoding pipeline' },
      ];

      for (const lang of ALL_HOI4_LANGUAGES) {
        const bytes = formatLocalizationYaml(lang.key, sampleEntries);

        // Header check
        expect(bytes.length).toBeGreaterThanOrEqual(3);
        expect(bytes[0]).toBe(0xef);
        expect(bytes[1]).toBe(0xbb);
        expect(bytes[2]).toBe(0xbf);
        expect(hasUtf8Bom(bytes)).toBe(true);

        const validation = validateLocalizationEncoding(bytes);
        expect(validation.valid).toBe(true);
        expect(validation.error).toBeUndefined();

        const { hasBom, text } = stripUtf8Bom(bytes);
        expect(hasBom).toBe(true);
        expect(text).toContain(`l_${lang.key}:`);
        expect(text).toContain('TEST_NAME:0 "HOI4 Studio Test"');
      }
    });

    it('executes project-wide symbol refactoring without prefix corruptions or partial word replacements', () => {
      const codeFixture = `
        TAG = "countries/Sample.txt"
        TAG_extended = "countries/Other.txt"
        TAG_NAME:0 "Sample Name"
        SUB_TAG:0 "Sub Name"
        recruit_character = TAG_char_1
        country_event = { id = TAG.100 }
        TAG:0 "Old Tag"
      `;

      const { newContent, count } = refactorSymbolInContent(codeFixture, 'TAG', 'XYZ');
      // Only whole-word tokens 'TAG', 'TAG.100', 'TAG:0' should be replaced
      // 'TAG_extended', 'TAG_NAME', 'SUB_TAG', 'TAG_char_1' must remain intact
      expect(count).toBe(3); // 'TAG =', 'TAG.100', 'TAG:0'
      expect(newContent).toContain('XYZ = "countries/Sample.txt"');
      expect(newContent).toContain('TAG_extended = "countries/Other.txt"');
      expect(newContent).toContain('TAG_NAME:0 "Sample Name"');
      expect(newContent).toContain('SUB_TAG:0 "Sub Name"');
      expect(newContent).toContain('recruit_character = TAG_char_1');
      expect(newContent).toContain('country_event = { id = XYZ.100 }');
      expect(newContent).toContain('XYZ:0 "Old Tag"');

      // Verify diff generation
      const diff = generateUnifiedDiff('test.txt', codeFixture, newContent);
      expect(diff).toContain('--- a/test.txt');
      expect(diff).toContain('+++ b/test.txt');
      expect(diff).toContain('-        TAG = "countries/Sample.txt"');
      expect(diff).toContain('+        XYZ = "countries/Sample.txt"');
    });
  });
});
