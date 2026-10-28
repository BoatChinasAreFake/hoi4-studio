import type { FocusTree, FocusNodeData, FocusProject } from '../types/focus';

export class ClausewitzFocusParser {
  static parse(content: string): FocusTree[] {
    const trees: FocusTree[] = [];
    const focusTreeRegex = /focus_tree\s*=\s*\{([\s\S]*?)\n\}/g;
    let treeMatch;

    while ((treeMatch = focusTreeRegex.exec(content)) !== null) {
      const treeBody = treeMatch[1];
      const idMatch = treeBody.match(/id\s*=\s*([a-zA-Z0-9_]+)/);
      const treeId = idMatch ? idMatch[1] : 'unnamed_tree';

      const focuses: FocusNodeData[] = [];
      const focusRegex = /focus\s*=\s*\{([\s\S]*?)\n\t*\}/g;
      let fMatch;

      while ((fMatch = focusRegex.exec(treeBody)) !== null) {
        const fBody = fMatch[1];
        const id = (fBody.match(/id\s*=\s*([a-zA-Z0-9_]+)/) || [])[1] || 'unnamed_focus';
        const icon = (fBody.match(/icon\s*=\s*([a-zA-Z0-9_]+)/) || [])[1] || 'GFX_goal_generic_political_pressure';
        const cost = parseFloat((fBody.match(/cost\s*=\s*([0-9.]+)/) || [])[1] || '10');
        const x = parseInt((fBody.match(/x\s*=\s*(-?[0-9]+)/) || [])[1] || '0', 10);
        const y = parseInt((fBody.match(/y\s*=\s*(-?[0-9]+)/) || [])[1] || '0', 10);
        const relative_position_id = (fBody.match(/relative_position_id\s*=\s*([a-zA-Z0-9_]+)/) || [])[1];

        // Prerequisites
        const prereqs: string[][] = [];
        const prereqRegex = /prerequisite\s*=\s*\{([\s\S]*?)\}/g;
        let pMatch;
        let isAnyMode = false;
        while ((pMatch = prereqRegex.exec(fBody)) !== null) {
          const group: string[] = [];
          const focusItemRegex = /focus\s*=\s*([a-zA-Z0-9_]+)/g;
          let item;
          while ((item = focusItemRegex.exec(pMatch[1])) !== null) {
            group.push(item[1]);
          }
          if (group.length > 1) isAnyMode = true;
          if (group.length > 0) prereqs.push(group);
        }

        // Mutually exclusive
        const mutuallyExclusive: string[] = [];
        const mutRegex = /mutually_exclusive\s*=\s*\{([\s\S]*?)\}/g;
        let mMatch;
        while ((mMatch = mutRegex.exec(fBody)) !== null) {
          const itemRegex = /focus\s*=\s*([a-zA-Z0-9_]+)/g;
          let item;
          while ((item = itemRegex.exec(mMatch[1])) !== null) {
            mutuallyExclusive.push(item[1]);
          }
        }

        // Available / bypass / rewards / ai
        const availableMatch = fBody.match(/available\s*=\s*\{([\s\S]*?)\n\t*\}/);
        const rewardMatch = fBody.match(/completion_reward\s*=\s*\{([\s\S]*?)\n\t*\}/);
        const aiMatch = fBody.match(/ai_will_do\s*=\s*\{[\s\S]*?factor\s*=\s*([0-9.]+)/);

        // Derive symbol from icon or default
        let symbol = '★';
        if (icon.includes('civ_factory') || icon.includes('production') || icon.includes('industry')) symbol = '⚒';
        else if (icon.includes('army')) symbol = '⚑';
        else if (icon.includes('navy')) symbol = '⚓';
        else if (icon.includes('air')) symbol = '✈';

        const humanName = id.replace(/^[A-Z0-9]{2,4}_/, '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

        focuses.push({
          id,
          name: humanName,
          symbol,
          icon,
          cost,
          x,
          y,
          relative_position_id,
          prerequisites: prereqs,
          mutually_exclusive: mutuallyExclusive,
          prereqMode: isAnyMode ? 'any' : 'all',
          available: availableMatch ? availableMatch[1].trim() : '',
          reward: rewardMatch ? rewardMatch[1].trim() : 'add_political_power = 100',
          ai: aiMatch ? parseFloat(aiMatch[1]) : 1,
          description: '',
          status: 'available',
        });
      }

      trees.push({
        id: treeId,
        default_tree: /default\s*=\s*yes/.test(treeBody),
        focuses,
      });
    }

    return trees;
  }

  static generateScript(project: FocusProject): string {
    let s = `# Hearts of Iron IV - National Focus Tree
focus_tree = {
    id = ${project.treeId}
    country = {
        factor = 0
        modifier = {
            add = 10
            tag = ${project.tag}
        }
    }
    default = no

`;

    for (const n of project.nodes) {
      s += `    focus = {\n`;
      s += `        id = ${n.id}\n`;
      s += `        icon = ${n.icon}\n`;
      s += `        cost = ${n.cost}\n`;
      s += `        x = ${n.x}\n`;
      s += `        y = ${n.y}\n`;
      if (n.relative_position_id) {
        s += `        relative_position_id = ${n.relative_position_id}\n`;
      }

      // Flat list of parent IDs
      const flatParents = n.prerequisites.flat();
      if (flatParents.length > 0) {
        if (n.prereqMode === 'any') {
          s += `        prerequisite = { ${flatParents.map((id) => `focus = ${id}`).join(' ')} }\n`;
        } else {
          for (const parentId of flatParents) {
            s += `        prerequisite = { focus = ${parentId} }\n`;
          }
        }
      }

      if (n.mutually_exclusive.length > 0) {
        s += `        mutually_exclusive = { ${n.mutually_exclusive.map((id) => `focus = ${id}`).join(' ')} }\n`;
      }

      if (n.available && n.available.trim()) {
        const formatted = n.available
          .split('\n')
          .map((line) => `            ${line}`)
          .join('\n');
        s += `        available = {\n${formatted}\n        }\n`;
      }

      if (n.reward && n.reward.trim()) {
        const formatted = n.reward
          .split('\n')
          .map((line) => `            ${line}`)
          .join('\n');
        s += `        completion_reward = {\n${formatted}\n        }\n`;
      }

      if (n.ai !== undefined) {
        s += `        ai_will_do = { factor = ${n.ai} }\n`;
      }

      s += `    }\n\n`;
    }

    s += `}\n`;
    return s;
  }

  static generateLocalization(project: FocusProject): string {
    const escapeLoc = (text: string) => text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n');
    let yml = '\uFEFFl_english:\n';
    for (const n of project.nodes) {
      yml += ` ${n.id}:0 "${escapeLoc(n.name || n.id)}"\n`;
      yml += ` ${n.id}_desc:0 "${escapeLoc(n.description || '')}"\n`;
    }
    return yml;
  }

  static generateGuide(project: FocusProject): string {
    return `INSTALL INTO AN EXISTING HOI4 MOD

1. Place ${project.treeId}.txt in:
   <your mod>/common/national_focus/

2. Place ${project.treeId}_l_english.yml in:
   <your mod>/localisation/english/
   The generated YAML includes the required UTF-8 BOM byte sequence.

3. Ensure country tag ${project.tag} exists in your mod.
   The country selector assigns this tree a priority score of 10 for ${project.tag}.

4. Start HOI4 with your mod enabled and with "-debug" launch option.
   In-game console: type "reload focus" to test changes live.

Tree Details:
- Total Focuses: ${project.nodes.length}
- Country Tag: ${project.tag}
- Tree ID: ${project.treeId}
- Prerequisite rules: Multiple prerequisite blocks = AND; Multiple focuses inside one prerequisite block = OR.
`;
  }

  static validateTree(project: FocusProject): string[] {
    const errors: string[] = [];
    const positions = new Set<string>();
    const ids = new Set<string>();

    if (!project.nodes || project.nodes.length === 0) {
      errors.push('Tree has no focus nodes.');
      return errors;
    }

    if (!/^[A-Za-z0-9_]+$/.test(project.treeId)) {
      errors.push(`Invalid Tree ID: "${project.treeId}". Use letters, numbers, or underscores.`);
    }

    if (!/^[A-Z0-9]{3}$/.test(project.tag)) {
      errors.push(`Invalid Country Tag: "${project.tag}". Must be 3 uppercase alphanumeric characters.`);
    }

    // Check balance of braces in script
    const checkBalanced = (str: string, fieldName: string, focusId: string) => {
      let depth = 0;
      let quote = false;
      let comment = false;
      for (let i = 0; i < str.length; i++) {
        const c = str[i];
        if (comment) {
          if (c === '\n') comment = false;
          continue;
        }
        if (quote) {
          if (c === '"' && str[i - 1] !== '\\') quote = false;
          continue;
        }
        if (c === '#') comment = true;
        else if (c === '"') quote = true;
        else if (c === '{') depth++;
        else if (c === '}') {
          depth--;
          if (depth < 0) {
            errors.push(`Unbalanced closing brace in ${focusId} -> ${fieldName}`);
            return;
          }
        }
      }
      if (depth !== 0) errors.push(`Unclosed brace in ${focusId} -> ${fieldName}`);
      if (quote) errors.push(`Unclosed quotation mark in ${focusId} -> ${fieldName}`);
    };

    for (const n of project.nodes) {
      if (!n.id || !/^[A-Za-z0-9_]+$/.test(n.id)) {
        errors.push(`Invalid focus ID "${n.id}". Must be alphanumeric or underscore.`);
      }
      if (ids.has(n.id)) {
        errors.push(`Duplicate focus ID: "${n.id}". IDs must be strictly unique.`);
      }
      ids.add(n.id);

      const posKey = `${n.x},${n.y}`;
      if (positions.has(posKey)) {
        errors.push(`Overlapping coordinates at (${n.x}, ${n.y}) for focus "${n.id}".`);
      }
      positions.add(posKey);

      if (!n.icon.startsWith('GFX_')) {
        errors.push(`Icon for "${n.id}" (${n.icon}) should start with "GFX_".`);
      }

      if (n.reward) checkBalanced(n.reward, 'completion_reward', n.id);
      if (n.available) checkBalanced(n.available, 'available', n.id);

      // Check self-reference
      const flatPrereqs = n.prerequisites.flat();
      if (flatPrereqs.includes(n.id)) {
        errors.push(`Focus "${n.id}" lists itself as a prerequisite.`);
      }
      if (n.mutually_exclusive.includes(n.id)) {
        errors.push(`Focus "${n.id}" lists itself as mutually exclusive.`);
      }
    }

    // Prerequisite Cycle Detection
    const visiting = new Set<string>();
    const visited = new Set<string>();

    const checkCycle = (id: string, path: string[]) => {
      if (visiting.has(id)) {
        errors.push(`Prerequisite cycle detected: ${[...path, id].join(' → ')}`);
        return;
      }
      if (visited.has(id)) return;

      visiting.add(id);
      const node = project.nodes.find((n) => n.id === id);
      if (node) {
        for (const parentId of node.prerequisites.flat()) {
          checkCycle(parentId, [...path, id]);
        }
      }
      visiting.delete(id);
      visited.add(id);
    };

    for (const n of project.nodes) {
      checkCycle(n.id, []);
    }

    return [...new Set(errors)];
  }

  static mutateCoordinates(source: string, focusId: string, newX: number, newY: number): string {
    const focusBlockRegex = new RegExp(`(focus\\s*=\\s*\\{[\\s\\S]*?id\\s*=\\s*${focusId}[\\s\\S]*?\\n\\t*\\})`, 'g');
    return source.replace(focusBlockRegex, (block) => {
      let updated = block.replace(/x\s*=\s*-?[0-9]+/, `x = ${newX}`);
      updated = updated.replace(/y\s*=\s*-?[0-9]+/, `y = ${newY}`);
      return updated;
    });
  }

  static mutateCost(source: string, focusId: string, newCost: number): string {
    const focusBlockRegex = new RegExp(`(focus\\s*=\\s*\\{[\\s\\S]*?id\\s*=\\s*${focusId}[\\s\\S]*?\\n\\t*\\})`, 'g');
    return source.replace(focusBlockRegex, (block) => {
      return block.replace(/cost\s*=\s*[0-9.]+/, `cost = ${newCost}`);
    });
  }

  static mutateIcon(source: string, focusId: string, newIcon: string): string {
    const focusBlockRegex = new RegExp(`(focus\\s*=\\s*\\{[\\s\\S]*?id\\s*=\\s*${focusId}[\\s\\S]*?\\n\\t*\\})`, 'g');
    return source.replace(focusBlockRegex, (block) => {
      return block.replace(/icon\s*=\s*[a-zA-Z0-9_]+/, `icon = ${newIcon}`);
    });
  }

  static renameSymbol(source: string, oldId: string, newId: string): string {
    const regex = new RegExp(`\\b${oldId}\\b`, 'g');
    return source.replace(regex, newId);
  }
}
