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
} from '../src/utils/politicsGenerators';
import type {
  SuperEventDef,
  CountryWizardConfig,
  CharacterDef,
  BopDefinition,
  FactionDef,
  IdeologyDefinition,
  AutonomyLevel,
  ScriptedDiploAction,
  TimedActivity,
} from '../src/types/politics';
import { parseCharactersFile } from './helpers/characterParser';
import { parseBopScript } from './helpers/bopParser';
import { parseIdeologies } from './helpers/ideologyParser';
import { validateFlagTga } from './helpers/tgaValidator';

describe('Phase 3: Politics, Leadership, Narrative & Modding Suite', () => {
  // ==========================================
  // 1. Super Event Studio
  // ==========================================
  describe('1. Super Event Studio', () => {
    const sampleSuperEvent: SuperEventDef = {
      id: 'super_event_fall_of_berlin',
      titleLocKey: 'SUPER_EVENT_FALL_OF_BERLIN_TITLE',
      titleText: 'THE FALL OF BERLIN',
      quoteLocKey: 'SUPER_EVENT_FALL_OF_BERLIN_QUOTE',
      quoteText: '"The red banner flutters over the ruins of the Reichstag. The long night has ended."',
      quoteAuthor: 'Marshal Georgy Zhukov',
      buttonLocKey: 'SUPER_EVENT_FALL_OF_BERLIN_BTN',
      buttonText: 'Victory at last.',
      bannerSprite: 'GFX_super_event_fall_of_berlin',
      soundEffect: 'soviet_victory_anthem',
      frameSkin: 'tno',
      fireOnlyOnce: true,
      effect: 'news_event = { id = news.200 hours = 6 }',
    };

    it('validates super event payload and rejects malformed fields', () => {
      const validRes = validateSuperEventPayload(sampleSuperEvent);
      expect(validRes.valid).toBe(true);
      expect(validRes.errors).toHaveLength(0);

      const invalidEvent = { ...sampleSuperEvent, id: 'invalid id with spaces!' };
      const invalidRes = validateSuperEventPayload(invalidEvent);
      expect(invalidRes.valid).toBe(false);
      expect(invalidRes.errors.some((e) => e.includes('alphanumeric'))).toBe(true);
    });

    it('generates all 4 required game files (.gui, scripted_gui, .asset, and event script)', () => {
      const files = generateSuperEventFiles(sampleSuperEvent);
      const paths = Object.keys(files);

      expect(paths).toContain('interface/superevents_fall_of_berlin.gui');
      expect(paths).toContain('common/scripted_guis/superevents_fall_of_berlin_scripted_gui.txt');
      expect(paths).toContain('sound/superevents_fall_of_berlin.asset');
      expect(paths).toContain('events/SuperEvents_fall_of_berlin.txt');

      // Check content integrity
      const guiContent = files['interface/superevents_fall_of_berlin.gui'];
      expect(guiContent).toContain('name = "super_event_fall_of_berlin_window"');
      expect(guiContent).toContain('spriteType = "GFX_super_event_fall_of_berlin_frame_tno"');

      const assetContent = files['sound/superevents_fall_of_berlin.asset'];
      expect(assetContent).toContain('name = "soviet_victory_anthem"');
      expect(assetContent).toContain('file = "superevents/fall_of_berlin.ogg"');

      const eventContent = files['events/SuperEvents_fall_of_berlin.txt'];
      expect(eventContent).toContain('add_namespace = superevent_fall_of_berlin');
      expect(eventContent).toContain('set_global_flag = super_event_fall_of_berlin_active');
    });
  });

  // ==========================================
  // 2. New Country Creation Wizard
  // ==========================================
  describe('2. New Country Creation Wizard (10 Files / 7 Dirs)', () => {
    const config: CountryWizardConfig = {
      tag: 'SYL',
      name: 'Syldavia',
      adjective: 'Syldavian',
      color: [45, 95, 140],
      graphicalCulture: 'eastern_european_gfx',
      capitalProvinceId: 460,
      stateId: 1001,
      stateName: 'Klow',
      stateProvinces: [460, 461, 462],
      rulingParty: 'democratic',
      leaderName: 'Muskar XII',
      leaderIdeology: 'monarchism',
      leaderPortrait: 'GFX_portrait_SYL_muskar',
    };

    it('scaffolds exactly 10 required files across 7 distinct directories', () => {
      const result = scaffoldCountryFiles(config);
      expect(result.tag).toBe('SYL');
      expect(result.files).toHaveLength(10);
      expect(result.directories.length).toBeGreaterThanOrEqual(7);

      const paths = result.files.map((f) => f.path);
      expect(paths).toContain('common/countries/Syldavia.txt');
      expect(paths).toContain('common/country_tags/SYL.txt');
      expect(paths).toContain('history/countries/SYL - Syldavia.txt');
      expect(paths).toContain('history/states/1001-Klow.txt');
      expect(paths).toContain('gfx/flags/SYL.tga');
      expect(paths).toContain('gfx/flags/medium/SYL.tga');
      expect(paths).toContain('gfx/flags/small/SYL.tga');
      expect(paths).toContain('common/characters/SYL.txt');
      expect(paths).toContain('common/ideas/SYL.txt');
      expect(paths).toContain('localisation/english/SYL_l_english.yml');
    });

    it('generates exact Paradox standard 32-bit uncompressed TGAs', () => {
      const result = scaffoldCountryFiles(config);

      const stdFlag = result.files.find((f) => f.path === 'gfx/flags/SYL.tga')!;
      expect(stdFlag.isBinary).toBe(true);
      const stdBytes = stdFlag.content as Uint8Array;
      expect(stdBytes.length).toBe(17074); // 18 header + 82*52*4
      const stdVal = validateFlagTga(stdBytes, 'standard');
      expect(stdVal.valid).toBe(true);

      const medFlag = result.files.find((f) => f.path === 'gfx/flags/medium/SYL.tga')!;
      const medBytes = medFlag.content as Uint8Array;
      expect(medBytes.length).toBe(4282); // 18 header + 41*26*4
      const medVal = validateFlagTga(medBytes, 'medium');
      expect(medVal.valid).toBe(true);

      const smallFlag = result.files.find((f) => f.path === 'gfx/flags/small/SYL.tga')!;
      const smallBytes = smallFlag.content as Uint8Array;
      expect(smallBytes.length).toBe(298); // 18 header + 10*7*4
      const smallVal = validateFlagTga(smallBytes, 'small');
      expect(smallVal.valid).toBe(true);
    });

    it('strictly enforces UTF-8 BOM byte sequence [0xEF, 0xBB, 0xBF] on localisation files', () => {
      const result = scaffoldCountryFiles(config);
      const locFile = result.files.find((f) => f.path === 'localisation/english/SYL_l_english.yml')!;
      const locBytes = locFile.content as Uint8Array;

      expect(hasUtf8Bom(locBytes)).toBe(true);
      const validation = validateLocalizationEncoding(locBytes);
      expect(validation.valid).toBe(true);

      const { text } = stripUtf8Bom(locBytes);
      expect(text).toContain('SYL:0 "Syldavia"');
      expect(text).toContain('SYL_ADJ:0 "Syldavian"');
    });
  });

  // ==========================================
  // 3. Unified Character & Leader Studio (Ship Captains)
  // ==========================================
  describe('3. Unified Character & Leader Studio with Ship Captains', () => {
    const navalLeader: CharacterDef = {
      token: 'USA_chester_nimitz',
      name: 'Chester W. Nimitz',
      gender: 'male',
      portraits: {
        civilianLarge: 'GFX_portrait_nimitz_civ',
        armyLarge: 'GFX_portrait_nimitz_navy',
      },
      navyLeader: {
        skill: 5,
        attack: 4,
        defense: 4,
        coordination: 5,
        maneuvering: 4,
        traits: ['cruiser_captain', 'destroyer_leader', 'seawolf', 'ironside', 'superior_tactician'],
      },
      advisor: {
        slot: 'navy_chief',
        ideaToken: 'USA_nimitz_chief',
        ledger: 'navy',
        cost: 100,
        traits: ['naval_reformer'],
        aiWillDo: 2.0,
      },
    };

    it('generates genuine Clausewitz characters block with naval traits and ship captain skills', () => {
      const script = generateCharacterScript([navalLeader]);
      expect(script).toContain('USA_chester_nimitz = {');
      expect(script).toContain('navy_leader = {');
      expect(script).toContain('attack_skill = 4');
      expect(script).toContain('defense_skill = 4');
      expect(script).toContain('coordination_skill = 5');
      expect(script).toContain('maneuvering_skill = 4');
      expect(script).toContain('cruiser_captain');
      expect(script).toContain('destroyer_leader');
      expect(script).toContain('seawolf');
      expect(script).toContain('ironside');
    });

    it('round-trips character generation through Clausewitz parser without data corruption', () => {
      const script = generateCharacterScript([navalLeader]);
      const { characters, errors } = parseCharactersFile(script);

      expect(errors).toHaveLength(0);
      expect(characters).toHaveLength(1);
      const parsed = characters[0];
      expect(parsed.token).toBe('USA_chester_nimitz');
      expect(parsed.navyLeader?.skill).toBe(5);
      expect(parsed.navyLeader?.attack).toBe(4);
      expect(parsed.navyLeader?.coordination).toBe(5);
      expect(parsed.navyLeader?.traits).toContain('cruiser_captain');
      expect(parsed.navyLeader?.traits).toContain('seawolf');
    });
  });

  // ==========================================
  // 4. Balance of Power (BoP) Studio (BBA)
  // ==========================================
  describe('4. Balance of Power (BoP) Studio (BBA)', () => {
    const bopDef: BopDefinition = {
      token: 'SWI_balance_of_power',
      initialValue: 0.0,
      leftSide: 'cantons_side',
      rightSide: 'federal_council_side',
      decisionCategory: 'SWI_bop_category',
      neutralRange: {
        id: 'neutral_balance',
        min: -0.15,
        max: 0.15,
        modifiers: {
          stability_factor: 0.1,
        },
      },
      sides: [
        {
          id: 'cantons_side',
          name: 'Decentralized Cantons',
          ranges: [
            {
              id: 'cantons_dominant',
              min: -1.0,
              max: -0.5,
              modifiers: {
                political_power_gain: 0.2,
                conscription_factor: -0.1,
              },
            },
            {
              id: 'cantons_influence',
              min: -0.5,
              max: -0.15,
              modifiers: {
                political_power_gain: 0.1,
              },
            },
          ],
        },
        {
          id: 'federal_council_side',
          name: 'Federal Council',
          ranges: [
            {
              id: 'council_influence',
              min: 0.15,
              max: 0.5,
              modifiers: {
                war_support_factor: 0.1,
              },
            },
            {
              id: 'council_dominant',
              min: 0.5,
              max: 1.0,
              modifiers: {
                war_support_factor: 0.25,
                consumer_goods_factor: -0.05,
              },
            },
          ],
        },
      ],
    };

    it('generates valid BoP Clausewitz script and parses successfully', () => {
      const script = generateBopScript(bopDef);
      const parsed = parseBopScript(script);

      expect(parsed.valid).toBe(true);
      expect(parsed.errors).toHaveLength(0);
      expect(parsed.bop?.token).toBe('SWI_balance_of_power');
      expect(parsed.bop?.leftSide).toBe('cantons_side');
      expect(parsed.bop?.rightSide).toBe('federal_council_side');
    });

    it('evaluates active modifier resolution across dynamic tension slider positions', () => {
      // Neutral position (0.0)
      const neutralMod = getActiveBopModifiers(bopDef, 0.0);
      expect(neutralMod.activeRangeId).toBe('neutral_balance');
      expect(neutralMod.modifiers.stability_factor).toBe(0.1);

      // Deep left position (-0.8)
      const leftMod = getActiveBopModifiers(bopDef, -0.8);
      expect(leftMod.activeRangeId).toBe('cantons_dominant');
      expect(leftMod.modifiers.political_power_gain).toBe(0.2);

      // Deep right position (+0.75)
      const rightMod = getActiveBopModifiers(bopDef, 0.75);
      expect(rightMod.activeRangeId).toBe('council_dominant');
      expect(rightMod.modifiers.war_support_factor).toBe(0.25);
    });
  });

  // ==========================================
  // 5. Faction Rules & Goals Studio (NCNS)
  // ==========================================
  describe('5. Faction Rules & Goals Studio (NCNS)', () => {
    const faction: FactionDef = {
      name: 'Mediterranean Entente',
      leaderTag: 'ITA',
      ideology: 'fascism',
      rules: {
        leaderVetoPeace: true,
        canPuppetJoin: true,
        worldTensionThreshold: 0.4,
        offensiveWarAllowed: true,
        mutualDefenseTrigger: true,
      },
      memberTags: ['ITA', 'BUL', 'HUN', 'ROM'],
      goals: [
        {
          id: 'balkan_hegemony',
          name: 'Balkan Hegemony',
          description: 'Control Danube river trade and Adriatic maritime routes.',
          rewardModifier: {
            trade_laws_cost_factor: -0.2,
          },
        },
      ],
    };

    it('generates valid NCNS faction rules and strategic goals scripts', () => {
      const { rulesScript, goalsScript } = generateFactionScript(faction);

      expect(rulesScript).toContain('leader_veto_peace_deals = yes');
      expect(rulesScript).toContain('world_tension_threshold = 0.40');
      expect(rulesScript).toContain('mutual_defense_trigger = yes');
      expect(rulesScript).toContain('members = { ITA BUL HUN ROM }');

      expect(goalsScript).toContain('faction_goal_balkan_hegemony = {');
      expect(goalsScript).toContain('trade_laws_cost_factor = -0.2');
    });
  });

  // ==========================================
  // 6. Ideology & Sub-Ideology Studio
  // ==========================================
  describe('6. Ideology & Sub-Ideology Studio', () => {
    const customIdeology: IdeologyDefinition = {
      name: 'monarchism',
      group: 'neutrality',
      color: [180, 150, 40],
      subTypes: ['autocracy', 'constitutional_monarchy', 'feudalism'],
      rules: {
        can_force_government: true,
        can_puppet: true,
        can_send_volunteers: true,
        can_be_spymaster: true,
        can_declare_war_on_same_ideology: false,
      },
      warImpactOnWorldTension: 0.5,
      dynamicFactionNames: ['FACTION_NAME_MONARCHIST_1'],
    };

    it('generates Clausewitz ideologies script with sub-types, rules, and color codes', () => {
      const script = generateIdeologyScript([customIdeology]);

      expect(script).toContain('monarchism = {');
      expect(script).toMatch(/constitutional_monarchy = \{\s+can_be_randomly_selected = no\s+\}/);
      expect(script).toContain('color = { 180 150 40 }');
      expect(script).toContain('can_puppet = yes');
      expect(script).toContain('can_declare_war_on_same_ideology = no');
      expect(script).toContain('war_impact_on_world_tension = 0.50');
    });
  });

  // ==========================================
  // 7. Autonomy Progression & Puppet Studio
  // ==========================================
  describe('7. Autonomy Progression & Puppet Studio', () => {
    const autonomyLvl: AutonomyLevel = {
      id: 'reichsprotektorat',
      name: 'Reichsprotektorat',
      minFreedomLevel: 0.2,
      manpowerInfluence: 0.8,
      rules: {
        can_not_declare_war: true,
        can_decline_call_to_war: false,
        can_be_spymaster: false,
        contributes_operatives: true,
      },
      modifiers: {
        autonomy_manpower_share: 0.8,
        overlord_trade_cost_factor: -0.75,
      },
    };

    it('generates common/autonomous_states/ scripts with proper constraints', () => {
      const script = generateAutonomyScript([autonomyLvl]);

      expect(script).toContain('autonomy_state = {');
      expect(script).toContain('id = autonomy_reichsprotektorat');
      expect(script).toContain('min_freedom_level = 0.20');
      expect(script).toContain('manpower_influence = 0.80');
      expect(script).toContain('can_not_declare_war = yes');
      expect(script).toContain('contributes_operatives = yes');
      expect(script).toContain('overlord_trade_cost_factor = -0.75');
    });
  });

  // ==========================================
  // 8. Scripted Diplo Actions & Timed Activities
  // ==========================================
  describe('8. Scripted Diplomatic Actions & Timed Activities', () => {
    const diploAction: ScriptedDiploAction = {
      id: 'enforce_naval_pact',
      name: 'Enforce Naval Limitation Treaty',
      costPP: 75,
      costCP: 30,
      requiresAcceptance: true,
      allowedTrigger: 'has_navy_size = { size > 50 }',
      visibleTrigger: 'always = yes',
      aiAcceptanceFormula: 'base = 10 modifier = { factor = 2.0 is_friend = yes }',
      onSentEffect: 'FROM = { country_event = naval_pact.1 }',
      completeEffect: 'add_ideas = naval_limitation_treaty',
      rejectEffect: 'add_threat = 10',
    };

    const timedAct: TimedActivity = {
      id: 'border_clash_manchuria',
      name: 'Border Clash Escalation',
      durationDays: 90,
      equipmentCost: { infantry_equipment: 1000 },
      cancelTrigger: 'has_war = yes',
      onExpireEffect: 'start_border_war = { state = 500 }',
    };

    it('generates valid scripted diplomatic action and timed activity Clausewitz code', () => {
      const diploScript = generateDiploActionScript(diploAction);
      expect(diploScript).toContain('enforce_naval_pact = {');
      expect(diploScript).toContain('requires_acceptance = yes');
      expect(diploScript).toContain('cost = 75');
      expect(diploScript).toContain('command_power = 30');

      const timedScript = generateTimedActivityScript(timedAct);
      expect(timedScript).toContain('timed_activity_border_clash_manchuria = {');
      expect(timedScript).toContain('duration = 90');
      expect(timedScript).toContain('infantry_equipment = 1000');
    });
  });

  // ==========================================
  // 9. Project-Wide Symbol Refactoring & AST Diffs
  // ==========================================
  describe('9. Project-wide Symbol Refactoring Engine & Diff Preview', () => {
    it('accurately replaces exact word boundaries without corrupting substrings', () => {
      const source = `
        TAG = "countries/Sample.txt"
        TAG_extended = "countries/Other.txt"
        recruit_character = TAG_leader
        TAG:0 "Tag Name"
        SUB_TAG:0 "Sub Tag"
      `;

      const { newContent, count } = refactorSymbolInContent(source, 'TAG', 'NEW');
      expect(count).toBe(2); // exactly TAG and TAG:0, not TAG_extended or SUB_TAG
      expect(newContent).toContain('NEW = "countries/Sample.txt"');
      expect(newContent).toContain('TAG_extended = "countries/Other.txt"');
      expect(newContent).toContain('NEW:0 "Tag Name"');
      expect(newContent).toContain('SUB_TAG:0 "Sub Tag"');
    });

    it('generates standard unified diff formatted with hunk lines', () => {
      const oldText = 'line1\nline2\nline3\n';
      const newText = 'line1\nmodified_line\nline3\n';
      const diff = generateUnifiedDiff('test.txt', oldText, newText);

      expect(diff).toContain('--- a/test.txt');
      expect(diff).toContain('+++ b/test.txt');
      expect(diff).toContain('@@ -2,1 +2,1 @@');
      expect(diff).toContain('-line2');
      expect(diff).toContain('+modified_line');
    });
  });

  // ==========================================
  // 10. Multi-Language Localization Matrix (UTF-8 BOM)
  // ==========================================
  describe('10. Multi-Language Localization Matrix & UTF-8 BOM Verification', () => {
    it('exports all 10 Paradox official languages prepending mandatory [0xEF, 0xBB, 0xBF]', () => {
      const entries = [
        { key: 'FOCUS_TEST', value: 'Test Focus' },
        { key: 'IDEA_TEST', value: 'Test Spirit' },
      ];

      const yamlBytes = formatLocalizationYaml('french', entries);

      // Verify raw byte prefix
      expect(yamlBytes[0]).toBe(0xef);
      expect(yamlBytes[1]).toBe(0xbb);
      expect(yamlBytes[2]).toBe(0xbf);
      expect(hasUtf8Bom(yamlBytes)).toBe(true);

      const val = validateLocalizationEncoding(yamlBytes);
      expect(val.valid).toBe(true);

      const { text } = stripUtf8Bom(yamlBytes);
      expect(text).toContain('l_french:');
      expect(text).toContain('FOCUS_TEST:0 "Test Focus"');
    });

    it('preserves complex UTF-8 multibyte characters (Cyrillic, CJK, accents) without degradation', () => {
      const entries = [
        { key: 'RU_TEST', value: 'Советский Союз и Ленинград' },
        { key: 'JA_TEST', value: '大日本帝国と連合艦隊' },
        { key: 'DE_TEST', value: 'München, Köln und Nürnberg' },
      ];

      const yamlBytes = formatLocalizationYaml('simp_chinese', entries);
      const { text } = stripUtf8Bom(yamlBytes);

      expect(text).toContain('Советский Союз и Ленинград');
      expect(text).toContain('大日本帝国と連合艦隊');
      expect(text).toContain('München, Köln und Nürnberg');
    });
  });
});
