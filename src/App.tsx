import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import type { Node, Edge, ReactFlowInstance } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { FocusNode } from './components/FocusNode';
import { SmartInspector } from './components/SmartInspector';
import { NavigationDock } from './components/NavigationDock';
import { CommandPalette } from './components/CommandPalette';
import { FocusPalette, DEFAULT_TEMPLATES } from './components/FocusPalette';
import { ExportModal } from './components/ExportModal';
import { WorkspaceDispatcher } from './components/WorkspaceDispatcher';
import type { MapStudioTab } from './components/map/WorldMapStudio';
import type { PoliticsTab } from './components/politics/PoliticsStudio';
import type { MilitaryTab } from './components/military/MilitaryStudio';
import type { EconomyTab } from './components/economy/EconomyStudio';
import type { UiStudioTab, SimulationStudioTab } from './types/ui';
import type { FocusNodeData, FocusProject, FocusTemplate, ActivityHub } from './types/focus';
import { loadGoalIconsManifest } from './utils/goalIcons';
import {
  Sparkles,
  Play,
  Pause,
  Plus,
  Zap,
  Undo2,
  Redo2,
  Maximize2,
  FolderOpen,
  Save,
  Share2,
  Sliders,
  RotateCcw
} from 'lucide-react';

const DEMO_PROJECT: FocusProject = {
  version: 1,
  treeId: 'RPL_focus_tree',
  tag: 'RPL',
  title: 'A New Republic',
  templates: DEFAULT_TEMPLATES,
  nodes: [
    {
      id: 'RPL_a_new_republic',
      name: 'A New Republic',
      symbol: '★',
      icon: 'GFX_goal_generic_political_pressure',
      cost: 10,
      x: 5,
      y: 0,
      prerequisites: [],
      mutually_exclusive: [],
      reward: 'add_political_power = 120',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: 'Founding our modern democracy with constitutional integrity.',
      status: 'available',
    },
    {
      id: 'RPL_revive_our_industry',
      name: 'Revive Our Industry',
      symbol: '⚒',
      icon: 'GFX_goal_generic_construct_civ_factory',
      cost: 10,
      x: 1,
      y: 2,
      prerequisites: [['RPL_a_new_republic']],
      mutually_exclusive: [],
      reward: 'add_political_power = 50\nadd_extra_state_shared_building_slots = 2',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: 'Modernizing state infrastructure and civilian manufacturing.',
      status: 'available',
    },
    {
      id: 'RPL_the_democratic_path',
      name: 'The Democratic Path',
      symbol: '★',
      icon: 'GFX_goal_generic_national_unity',
      cost: 10,
      x: 5,
      y: 2,
      prerequisites: [['RPL_a_new_republic']],
      mutually_exclusive: ['RPL_strength_through_unity'],
      reward: 'add_stability = 0.10\nadd_political_power = 75',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: 'Defending parliamentary rights and freedom of the press.',
      status: 'available',
    },
    {
      id: 'RPL_strength_through_unity',
      name: 'Strength Through Unity',
      symbol: '★',
      icon: 'GFX_goal_generic_demand_territory',
      cost: 10,
      x: 9,
      y: 2,
      prerequisites: [['RPL_a_new_republic']],
      mutually_exclusive: ['RPL_the_democratic_path'],
      reward: 'add_war_support = 0.10\nadd_political_power = 50',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: 'Consolidating national authority under central governance.',
      status: 'available',
    },
    {
      id: 'RPL_national_steelworks',
      name: 'National Steelworks',
      symbol: '⚒',
      icon: 'GFX_goal_generic_production',
      cost: 10,
      x: 0,
      y: 4,
      prerequisites: [['RPL_revive_our_industry']],
      mutually_exclusive: [],
      reward: 'add_resource = { type = steel amount = 16 state = 42 }',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: '',
      status: 'available',
    },
    {
      id: 'RPL_connect_the_nation',
      name: 'Connect the Nation',
      symbol: '⚒',
      icon: 'GFX_goal_generic_construct_infrastructure',
      cost: 10,
      x: 2,
      y: 4,
      prerequisites: [['RPL_revive_our_industry']],
      mutually_exclusive: [],
      reward: 'build_railway = { start_province = 101 end_province = 105 level = 2 }',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: '',
      status: 'available',
    },
    {
      id: 'RPL_a_new_constitution',
      name: 'A New Constitution',
      symbol: '★',
      icon: 'GFX_goal_generic_intelligence_exchange',
      cost: 10,
      x: 5,
      y: 4,
      prerequisites: [['RPL_the_democratic_path']],
      mutually_exclusive: [],
      reward: 'add_ideas = RPL_free_market_republic',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: '',
      status: 'available',
    },
    {
      id: 'RPL_reorganize_the_army',
      name: 'Reorganize the Army',
      symbol: '⚑',
      icon: 'GFX_goal_generic_army_doctrines',
      cost: 10,
      x: 8,
      y: 4,
      prerequisites: [['RPL_strength_through_unity']],
      mutually_exclusive: [],
      reward: 'add_army_experience = 25\nadd_doctrine_cost_reduction = { name = land_doc cost_reduction = 0.5 uses = 1 }',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: '',
      status: 'available',
    },
    {
      id: 'RPL_secure_our_shores',
      name: 'Secure Our Shores',
      symbol: '⚓',
      icon: 'GFX_goal_generic_navy_doctrines',
      cost: 10,
      x: 10,
      y: 4,
      prerequisites: [['RPL_strength_through_unity']],
      mutually_exclusive: [],
      reward: 'add_navy_experience = 25\nadd_extra_state_shared_building_slots = 2',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: '',
      status: 'available',
    },
    {
      id: 'RPL_industrial_heartland',
      name: 'Industrial Heartland',
      symbol: '⚒',
      icon: 'GFX_goal_generic_construct_civ_factory',
      cost: 10,
      x: 1,
      y: 6,
      prerequisites: [['RPL_national_steelworks'], ['RPL_connect_the_nation']],
      mutually_exclusive: [],
      reward: 'add_building_construction = { type = industrial_complex level = 2 instant_build = yes }',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: '',
      status: 'available',
    },
    {
      id: 'RPL_a_place_in_the_world',
      name: 'A Place in the World',
      symbol: '★',
      icon: 'GFX_goal_generic_position_armies',
      cost: 10,
      x: 5,
      y: 6,
      prerequisites: [['RPL_a_new_constitution']],
      mutually_exclusive: [],
      reward: 'add_political_power = 150',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: '',
      status: 'available',
    },
    {
      id: 'RPL_an_army_of_tomorrow',
      name: 'An Army of Tomorrow',
      symbol: '⚑',
      icon: 'GFX_goal_generic_army_tanks',
      cost: 10,
      x: 9,
      y: 6,
      prerequisites: [['RPL_reorganize_the_army'], ['RPL_secure_our_shores']],
      mutually_exclusive: [],
      reward: 'add_tech_bonus = { name = armor_bonus bonus = 1.0 uses = 2 category = armor }',
      available: '',
      ai: 1,
      prereqMode: 'all',
      description: '',
      status: 'available',
    },
  ],
};

const GRID_W = 120;
const GRID_H = 150;

// Dynamic sizing computation based on viewport width
const computeDefaultLeftWidth = (winWidth: number) => {
  return Math.max(200, Math.min(320, Math.round(winWidth * 0.16)));
};

const computeDefaultRightWidth = (winWidth: number) => {
  return Math.max(320, Math.min(480, Math.round(winWidth * 0.24)));
};

export function App() {
  const [activeHub, setActiveHub] = useState<ActivityHub>('narrative');
  const [mapStudioTab, setMapStudioTab] = useState<MapStudioTab>('canvas');
  const [politicsStudioTab, setPoliticsStudioTab] = useState<PoliticsTab>('characters');
  const [militaryStudioTab, setMilitaryStudioTab] = useState<MilitaryTab>('chassis');
  const [economyStudioTab, setEconomyStudioTab] = useState<EconomyTab>('techtree');
  const [uiStudioTab, setUiStudioTab] = useState<UiStudioTab>('gui_builder');
  const [simulationStudioTab, setSimulationStudioTab] = useState<SimulationStudioTab>('sandbox');
  const [narrativeStudioTab, setNarrativeStudioTab] = useState<'focus_tree' | 'super_events'>('focus_tree');
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'export' | 'validate' | null>(null);
  const [activeMode, setActiveMode] = useState<'select' | 'connect' | 'exclude'>('select');
  const [connectSource, setConnectSource] = useState<string | null>(null);

  // Focus Inspector Visibility Toggle
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);

  // Dynamic Sidebar Sizing & User Manual Overrides
  const [userResizedLeft, setUserResizedLeft] = useState(() => {
    return localStorage.getItem('hoi4_left_sidebar_user_resized') === 'true';
  });

  const [userResizedRight, setUserResizedRight] = useState(() => {
    return localStorage.getItem('hoi4_right_sidebar_user_resized') === 'true';
  });

  const [leftWidth, setLeftWidth] = useState(() => {
    const stored = localStorage.getItem('hoi4_left_sidebar_width');
    if (stored) return parseInt(stored, 10);
    return computeDefaultLeftWidth(typeof window !== 'undefined' ? window.innerWidth : 1280);
  });

  const [rightWidth, setRightWidth] = useState(() => {
    const stored = localStorage.getItem('hoi4_right_sidebar_width');
    if (stored) return parseInt(stored, 10);
    return computeDefaultRightWidth(typeof window !== 'undefined' ? window.innerWidth : 1280);
  });

  const [isDragging, setIsDragging] = useState<'left' | 'right' | null>(null);

  // Project state
  const [project, setProject] = useState<FocusProject>(() => {
    try {
      const saved = localStorage.getItem('hoi4_studio_project');
      return saved ? JSON.parse(saved) : DEMO_PROJECT;
    } catch {
      return DEMO_PROJECT;
    }
  });

  const [selectedFocusId, setSelectedFocusId] = useState<string | null>(project.nodes[0]?.id || null);
  const [isSandboxMode, setIsSandboxMode] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // Undo / Redo history
  const [history, setHistory] = useState<string[]>([]);
  const [future, setFuture] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const pushSnapshot = useCallback(() => {
    setHistory((prev) => {
      const next = [...prev, JSON.stringify(project)];
      if (next.length > 50) next.shift();
      return next;
    });
    setFuture([]);
  }, [project]);

  // Preload Goal Icons Manifest on Mount
  useEffect(() => {
    loadGoalIconsManifest().then(() => {
      // Trigger update so icons render immediately
      setProject((prev) => ({ ...prev }));
    });
  }, []);

  // Dynamic window resize listener: adapts unless user has resized beforehand
  useEffect(() => {
    const handleWindowResize = () => {
      const winW = window.innerWidth;
      if (!userResizedLeft) {
        setLeftWidth(computeDefaultLeftWidth(winW));
      } else {
        setLeftWidth((w) => Math.min(w, Math.round(winW * 0.4)));
      }

      if (!userResizedRight) {
        setRightWidth(computeDefaultRightWidth(winW));
      } else {
        setRightWidth((w) => Math.min(w, Math.round(winW * 0.45)));
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [userResizedLeft, userResizedRight]);

  // Persist project changes
  useEffect(() => {
    try {
      localStorage.setItem('hoi4_studio_project', JSON.stringify(project));
    } catch {
      // ignore
    }
  }, [project]);

  // Left Sidebar Resize Drag Handler
  const onLeftResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging('left');
    const startX = e.clientX;
    const startWidth = leftWidth;

    setUserResizedLeft(true);
    localStorage.setItem('hoi4_left_sidebar_user_resized', 'true');

    const onPointerMove = (moveEvent: PointerEvent) => {
      const diff = moveEvent.clientX - startX;
      const newW = Math.max(170, Math.min(Math.round(window.innerWidth * 0.4), startWidth + diff));
      setLeftWidth(newW);
      localStorage.setItem('hoi4_left_sidebar_width', String(newW));
    };

    const onPointerUp = () => {
      setIsDragging(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onLeftResetDoubleClick = () => {
    setUserResizedLeft(false);
    localStorage.removeItem('hoi4_left_sidebar_user_resized');
    localStorage.removeItem('hoi4_left_sidebar_width');
    const def = computeDefaultLeftWidth(window.innerWidth);
    setLeftWidth(def);
    showNotification('Left sidebar reset to dynamic auto-size');
  };

  // Right Sidebar Resize Drag Handler
  const onRightResizePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging('right');
    const startX = e.clientX;
    const startWidth = rightWidth;

    setUserResizedRight(true);
    localStorage.setItem('hoi4_right_sidebar_user_resized', 'true');

    const onPointerMove = (moveEvent: PointerEvent) => {
      const diff = startX - moveEvent.clientX; // Moving left widens right sidebar
      const newW = Math.max(260, Math.min(Math.round(window.innerWidth * 0.5), startWidth + diff));
      setRightWidth(newW);
      localStorage.setItem('hoi4_right_sidebar_width', String(newW));
    };

    const onPointerUp = () => {
      setIsDragging(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
  };

  const onRightResetDoubleClick = () => {
    setUserResizedRight(false);
    localStorage.removeItem('hoi4_right_sidebar_user_resized');
    localStorage.removeItem('hoi4_right_sidebar_width');
    const def = computeDefaultRightWidth(window.innerWidth);
    setRightWidth(def);
    showNotification('Inspector reset to dynamic auto-size');
  };

  // Build ReactFlow Nodes and Edges from project.nodes
  const { flowNodes, flowEdges } = useMemo(() => {
    const fNodes: Node<FocusNodeData>[] = project.nodes.map((f) => ({
      id: f.id,
      type: 'focusNode',
      position: { x: f.x * GRID_W, y: f.y * GRID_H },
      data: f,
      selected: f.id === selectedFocusId,
    }));

    const fEdges: Edge[] = [];
    project.nodes.forEach((f) => {
      // Prerequisite edges (Golden / Olive)
      f.prerequisites.forEach((group) => {
        group.forEach((prereqId) => {
          fEdges.push({
            id: `edge-${prereqId}-${f.id}`,
            source: prereqId,
            target: f.id,
            type: 'smoothstep',
            style: { stroke: '#7c8e68', strokeWidth: 2 },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: '#7c8e68',
            },
          });
        });
      });

      // Mutual exclusion edges (Crimson dashed)
      f.mutually_exclusive.forEach((mutId) => {
        if (f.id < mutId) {
          fEdges.push({
            id: `mut-${f.id}-${mutId}`,
            source: f.id,
            sourceHandle: 'mut-right',
            target: mutId,
            targetHandle: 'mut-left',
            type: 'straight',
            style: { stroke: '#bd785c', strokeWidth: 1.5, strokeDasharray: '6 4' },
          });
        }
      });
    });

    return { flowNodes: fNodes, flowEdges: fEdges };
  }, [project.nodes, selectedFocusId]);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(flowNodes as Node[]);
  const [edges, , onEdgesChange] = useEdgesState(flowEdges);

  // Sync flowNodes and flowEdges when project changes
  useEffect(() => {
    setNodes(flowNodes);
  }, [flowNodes, setNodes]);

  const nodeTypes = useMemo(() => ({ focusNode: FocusNode }), []);

  // Node Drag Stop: Grid Snapping and updating project
  const onNodeDragStop = useCallback(
    (_: any, node: Node) => {
      const gridX = Math.round(node.position.x / GRID_W);
      const gridY = Math.max(0, Math.round(node.position.y / GRID_H));

      pushSnapshot();
      setProject((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) =>
          n.id === node.id ? { ...n, x: gridX, y: gridY } : n
        ),
      }));

      showNotification(`Moved ${node.id} to (${gridX}, ${gridY})`);
    },
    [pushSnapshot]
  );

  // Node Click: Connect mode, Exclude mode, Sandbox mode, or Select (auto-reopening Inspector)
  const onNodeClick = useCallback(
    (_: any, node: Node) => {
      if (isSandboxMode) {
        setProject((prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) => {
            if (n.id === node.id) {
              const currentStatus = n.status || 'available';
              const nextStatus = currentStatus === 'completed' ? 'available' : 'completed';
              return { ...n, status: nextStatus };
            }
            return n;
          }),
        }));
        showNotification(`Simulated completion: ${node.id}`);
        return;
      }

      if (activeMode === 'connect') {
        if (!connectSource) {
          setConnectSource(node.id);
          setSelectedFocusId(node.id);
          showNotification(`Parent selected: ${node.id}. Click child focus to link.`);
        } else if (connectSource === node.id) {
          setConnectSource(null);
        } else {
          const parentId = connectSource;
          const childId = node.id;
          pushSnapshot();
          setProject((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) => {
              if (n.id === childId) {
                const flat = n.prerequisites.flat();
                if (!flat.includes(parentId)) {
                  return { ...n, prerequisites: [...n.prerequisites, [parentId]] };
                }
              }
              return n;
            }),
          }));
          showNotification(`Linked prerequisite: ${parentId} → ${childId}`);
          setConnectSource(null);
          setSelectedFocusId(childId);
        }
        return;
      }

      if (activeMode === 'exclude') {
        if (!connectSource) {
          setConnectSource(node.id);
          setSelectedFocusId(node.id);
          showNotification(`Selected ${node.id}. Click another focus for mutual exclusion.`);
        } else if (connectSource === node.id) {
          setConnectSource(null);
        } else {
          const a = connectSource;
          const b = node.id;
          pushSnapshot();
          setProject((prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) => {
              if (n.id === a && !n.mutually_exclusive.includes(b)) {
                return { ...n, mutually_exclusive: [...n.mutually_exclusive, b] };
              }
              if (n.id === b && !n.mutually_exclusive.includes(a)) {
                return { ...n, mutually_exclusive: [...n.mutually_exclusive, a] };
              }
              return n;
            }),
          }));
          showNotification(`Set mutual exclusion: ${a} ⇄ ${b}`);
          setConnectSource(null);
          setSelectedFocusId(b);
        }
        return;
      }

      // Default select & auto-open Inspector
      setSelectedFocusId(node.id);
      setIsInspectorOpen(true);
    },
    [activeMode, connectSource, isSandboxMode, pushSnapshot]
  );

  // Inspector updates
  const handleUpdateFocus = useCallback(
    (updated: FocusNodeData) => {
      pushSnapshot();
      setProject((prev) => ({
        ...prev,
        nodes: prev.nodes.map((n) => (n.id === updated.id ? updated : n)),
      }));
    },
    [pushSnapshot]
  );

  // Duplicate focus
  const handleDuplicateFocus = useCallback(
    (focus: FocusNodeData) => {
      pushSnapshot();
      const newId = `${project.tag}_${focus.id.replace(/^[A-Z0-9]{2,4}_/, '')}_copy_${Date.now().toString().slice(-3)}`;
      const duplicated: FocusNodeData = {
        ...focus,
        id: newId,
        name: `${focus.name} (Copy)`,
        x: focus.x + 2,
        y: focus.y,
        mutually_exclusive: [],
        status: 'available',
      };
      setProject((prev) => ({
        ...prev,
        nodes: [...prev.nodes, duplicated],
      }));
      setSelectedFocusId(newId);
      setIsInspectorOpen(true);
      showNotification(`Duplicated focus: ${newId}`);
    },
    [project.tag, pushSnapshot]
  );

  // Delete focus
  const handleDeleteFocus = useCallback(
    (focusId: string) => {
      pushSnapshot();
      setProject((prev) => ({
        ...prev,
        nodes: prev.nodes
          .filter((n) => n.id !== focusId)
          .map((n) => ({
            ...n,
            prerequisites: n.prerequisites.map((group) => group.filter((id) => id !== focusId)).filter((g) => g.length > 0),
            mutually_exclusive: n.mutually_exclusive.filter((id) => id !== focusId),
          })),
      }));
      setSelectedFocusId(null);
      showNotification(`Deleted focus: ${focusId}`);
    },
    [pushSnapshot]
  );

  // Save focus as palette template
  const handleSaveAsTemplate = useCallback(
    (tpl: FocusTemplate) => {
      pushSnapshot();
      setProject((prev) => {
        const currentTemplates = prev.templates || DEFAULT_TEMPLATES;
        const exists = currentTemplates.some((t) => t.id === tpl.id);
        const next = exists
          ? currentTemplates.map((t) => (t.id === tpl.id ? tpl : t))
          : [...currentTemplates, tpl];
        return { ...prev, templates: next };
      });
      showNotification(`Saved "${tpl.name}" as reusable palette template`);
    },
    [pushSnapshot]
  );

  // Add focus from left palette or toolbar
  const handleAddFocus = useCallback(
    (x?: number, y?: number, template?: FocusTemplate) => {
      pushSnapshot();
      const tpl = template || (project.templates && project.templates[0]) || DEFAULT_TEMPLATES[0];
      const newId = `${project.tag}_${tpl.name.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_${Date.now().toString().slice(-3)}`;

      let targetX = x ?? 5;
      let targetY = y ?? 2;

      // Find non-overlapping grid spot if not dropped specifically
      if (x === undefined && y === undefined) {
        while (project.nodes.some((n) => n.x === targetX && n.y === targetY)) {
          targetX += 2;
        }
      }

      const newFocus: FocusNodeData = {
        id: newId,
        name: `New ${tpl.name} Focus`,
        symbol: tpl.symbol,
        icon: tpl.icon,
        cost: tpl.cost || 10,
        x: targetX,
        y: targetY,
        prerequisites: [],
        mutually_exclusive: [],
        prereqMode: 'all',
        reward: tpl.reward,
        available: '',
        ai: 1,
        description: '',
        status: 'available',
      };

      setProject((prev) => ({
        ...prev,
        nodes: [...prev.nodes, newFocus],
      }));
      setSelectedFocusId(newId);
      setIsInspectorOpen(true);
      setActiveMode('select');
      showNotification(`Added ${newFocus.name}`);
    },
    [project.nodes, project.tag, project.templates, pushSnapshot]
  );

  // Drop on Canvas
  const handleCanvasDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;
      try {
        const template: FocusTemplate = JSON.parse(data);
        if (reactFlowInstance) {
          const position = reactFlowInstance.screenToFlowPosition({
            x: e.clientX,
            y: e.clientY,
          });
          const gridX = Math.round(position.x / GRID_W);
          const gridY = Math.max(0, Math.round(position.y / GRID_H));
          handleAddFocus(gridX, gridY, template);
        }
      } catch {
        // ignore
      }
    },
    [handleAddFocus, reactFlowInstance]
  );

  // Undo / Redo
  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const last = history[history.length - 1];
    setHistory((prev) => prev.slice(0, prev.length - 1));
    setFuture((prev) => [JSON.stringify(project), ...prev]);
    const restored: FocusProject = JSON.parse(last);
    setProject(restored);
    if (!restored.nodes.some((n) => n.id === selectedFocusId)) {
      setSelectedFocusId(restored.nodes[0]?.id || null);
    }
    showNotification('Undo applied');
  }, [history, project, selectedFocusId]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setHistory((prev) => [...prev, JSON.stringify(project)]);
    const restored: FocusProject = JSON.parse(next);
    setProject(restored);
    showNotification('Redo applied');
  }, [future, project]);

  // Keyboard Shortcuts (Hotkeys 1-7, Ctrl+K, Ctrl+Z, Delete, Escape)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (/INPUT|TEXTAREA|SELECT/.test(target.tagName) ||
          target.isContentEditable ||
          target.closest?.('.monaco-editor'))
      ) {
        return;
      }

      // Universal Command Palette toggle: Ctrl+K / Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsPaletteOpen((prev) => !prev);
        return;
      }

      // Hotkeys 1 through 7 for Hub navigation
      if (!e.ctrlKey && !e.altKey && !e.metaKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            setActiveHub('map');
            showNotification('Switched to Hub 1: World & Map Studio');
            return;
          case '2':
            e.preventDefault();
            setActiveHub('politics');
            showNotification('Switched to Hub 2: Politics Studio');
            return;
          case '3':
            e.preventDefault();
            setActiveHub('military');
            showNotification('Switched to Hub 3: Military Studio');
            return;
          case '4':
            e.preventDefault();
            setActiveHub('economy');
            showNotification('Switched to Hub 4: Economy Studio');
            return;
          case '5':
            e.preventDefault();
            setActiveHub('narrative');
            showNotification('Switched to Hub 5: Narrative Studio');
            return;
          case '6':
            e.preventDefault();
            setActiveHub('ui');
            showNotification('Switched to Hub 6: UI Studio');
            return;
          case '7':
            e.preventDefault();
            setActiveHub('simulation');
            showNotification('Switched to Hub 7: Simulation Studio');
            return;
        }
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedFocusId) handleDeleteFocus(selectedFocusId);
      } else if (e.key === 'Escape') {
        setActiveMode('select');
        setConnectSource(null);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleDeleteFocus, handleRedo, handleUndo, selectedFocusId]);

  // Fit View
  const handleFitTree = useCallback(() => {
    reactFlowInstance?.fitView({ padding: 0.2, duration: 400 });
  }, [reactFlowInstance]);

  // Project JSON Save & Load
  const handleSaveProject = () => {
    const blob = new Blob([JSON.stringify(project, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.treeId}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    showNotification(`Saved project JSON: ${project.treeId}.json`);
  };

  const handleOpenProject = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.nodes || !Array.isArray(parsed.nodes)) {
          throw new Error('Invalid project structure');
        }
        pushSnapshot();
        setProject(parsed);
        setSelectedFocusId(parsed.nodes[0]?.id || null);
        showNotification(`Loaded project: ${parsed.title || parsed.treeId}`);
        setTimeout(() => handleFitTree(), 200);
      } catch (err: any) {
        showNotification(`Failed to load project: ${err.message}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Reset to Default Example Tree
  const handleResetToDefault = useCallback(() => {
    if (confirm('Reset to the default example focus tree (A New Republic)? Any unsaved modifications will be replaced.')) {
      pushSnapshot();
      const cleanDemo: FocusProject = JSON.parse(JSON.stringify(DEMO_PROJECT));
      setProject(cleanDemo);
      setSelectedFocusId(cleanDemo.nodes[0]?.id || null);
      setIsInspectorOpen(true);
      showNotification('Reset focus tree to default example');
      setTimeout(() => {
        reactFlowInstance?.fitView({ padding: 0.2, duration: 400 });
      }, 200);
    }
  }, [pushSnapshot, reactFlowInstance]);

  // Hot-Reload Trigger
  const handleTriggerHotReload = useCallback(() => {
    showNotification("Triggered in-game hot-reload: 'reload focus' executed in HOI4");
  }, []);

  const selectedFocus = useMemo(() => {
    if (!selectedFocusId) return null;
    return project.nodes.find((n) => n.id === selectedFocusId) || null;
  }, [project.nodes, selectedFocusId]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#101512] font-sans text-[#e3e5d9]">
      {/* 1. Left Activity Dock (Fixed Icons 1-7) */}
      <NavigationDock
        activeHub={activeHub}
        onSelectHub={setActiveHub}
        onOpenPalette={() => setIsPaletteOpen(true)}
        onTriggerHotReload={handleTriggerHotReload}
      />

      {/* 2. Dynamic Workspace Dispatcher (Hubs 1-7) */}
      <WorkspaceDispatcher
        activeHub={activeHub}
        focuses={project.nodes}
        mapInitialTab={mapStudioTab}
        politicsInitialTab={politicsStudioTab}
        militaryInitialTab={militaryStudioTab}
        economyInitialTab={economyStudioTab}
        uiInitialTab={uiStudioTab}
        simulationInitialTab={simulationStudioTab}
        narrativeTab={narrativeStudioTab}
        onNotify={showNotification}
        onSelectHub={setActiveHub}
        narrativeView={
          <>
            {/* 2. Left Resizable & Customizable Focus Palette */}
            <FocusPalette
        project={project}
        width={leftWidth}
        onUpdateProject={(updates) => {
          pushSnapshot();
          setProject((prev) => ({ ...prev, ...updates }));
        }}
        onAddFromTemplate={(tpl) => handleAddFocus(undefined, undefined, tpl)}
        onValidate={() => setModalMode('validate')}
        onResetDefault={handleResetToDefault}
        onNewProject={() => {
          if (confirm('Create a new blank tree? You can restore current tree with Undo.')) {
            pushSnapshot();
            setProject({
              version: 1,
              treeId: 'MOD_focus_tree',
              tag: 'MOD',
              title: 'New Focus Tree',
              templates: DEFAULT_TEMPLATES,
              nodes: [],
            });
            setSelectedFocusId(null);
            showNotification('Created blank tree');
          }
        }}
      />

      {/* Left Sidebar Resize Handle */}
      <div
        onPointerDown={onLeftResizePointerDown}
        onDoubleClick={onLeftResetDoubleClick}
        title={
          userResizedLeft
            ? 'Drag to resize · Double-click to reset to dynamic auto-width'
            : 'Dynamic auto-width · Drag to lock custom width'
        }
        className={`group relative z-30 flex w-1 cursor-col-resize items-center justify-center transition-colors select-none shrink-0 ${
          isDragging === 'left' ? 'bg-[#d6b878]' : 'bg-[#30392e] hover:bg-[#d6b878]'
        }`}
      >
        <div className="absolute inset-y-0 -left-1 -right-1" />
        {userResizedLeft && (
          <div
            className="absolute top-2.5 h-1.5 w-1.5 rounded-full bg-[#d6b878] opacity-80"
            title="Custom width locked"
          />
        )}
      </div>

      {/* 3. Center Primary Canvas & Top Toolbar */}
      <div className="relative flex flex-1 flex-col overflow-hidden bg-[#111711] min-w-0">
        {/* Top Header Bar */}
        <header className="flex h-12 items-center justify-between border-b border-[#30392e] bg-[#1a211a] px-4 select-none">
          <div className="flex items-center gap-3">
            <span className="brand-serif font-bold text-base tracking-wide text-[#e3e5d9] flex items-center gap-1.5">
              <span className="text-[#d6b878]">✥</span>
              HOI4 STUDIO
            </span>
            <span className="text-[#3b4936]">|</span>
            <span className="text-[10px] uppercase tracking-[1.4px] text-[#909b88] hidden sm:inline">
              HEARTS OF IRON IV · MODDING WORKBENCH
            </span>
            <span className="text-[#3b4936] hidden sm:inline">|</span>
            <span className="text-[11px] text-[#a6bd87] flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#a6bd87]" />
              Saved locally
            </span>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              className="hidden"
              onChange={handleOpenProject}
            />

            {/* Toggle Inspector Button */}
            <button
              onClick={() => setIsInspectorOpen(!isInspectorOpen)}
              title={isInspectorOpen ? 'Collapse Focus Inspector' : 'Open Focus Inspector'}
              className={`flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold transition ${
                isInspectorOpen
                  ? 'border-[#d6b878]/60 bg-[#d6b878]/20 text-[#d6b878]'
                  : 'border-[#3b4936] bg-[#242d23] text-[#e3e5d9] hover:bg-[#354130]'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              Inspector
            </button>

            {/* Reset to Example Tree Button */}
            <button
              onClick={handleResetToDefault}
              title="Reset focus tree to default example (A New Republic)"
              className="flex items-center gap-1.5 rounded border border-[#3b4936] bg-[#242d23] px-2.5 py-1 text-xs font-medium text-[#d6b878] hover:bg-[#354130] hover:text-[#e0c587] transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Example
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded border border-[#3b4936] bg-[#242d23] px-2.5 py-1 text-xs text-[#e3e5d9] hover:bg-[#354130] transition"
            >
              <FolderOpen className="h-3.5 w-3.5 text-[#909b88]" />
              Open project
            </button>

            <button
              onClick={handleSaveProject}
              className="flex items-center gap-1.5 rounded border border-[#3b4936] bg-[#242d23] px-2.5 py-1 text-xs text-[#e3e5d9] hover:bg-[#354130] transition"
            >
              <Save className="h-3.5 w-3.5 text-[#909b88]" />
              Save project
            </button>

            <button
              onClick={() => setModalMode('export')}
              className="flex items-center gap-1.5 rounded bg-[#d6b878] px-3 py-1 text-xs font-bold text-[#1c2119] hover:bg-[#e0c587] transition shadow"
            >
              <Share2 className="h-3.5 w-3.5" />
              Export mod files ↗
            </button>
          </div>
        </header>

        {/* Secondary Canvas Toolbar */}
        <div className="flex h-11 items-center justify-between border-b border-[#30392e] bg-[#181e19]/90 px-4 select-none z-10">
          {/* Mode Switchers */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setActiveMode('select');
                setConnectSource(null);
              }}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition ${
                activeMode === 'select'
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold'
                  : 'bg-[#242d23] border border-[#3b4936] text-[#e3e5d9] hover:bg-[#354130]'
              }`}
            >
              ↖ Select
            </button>

            <button
              onClick={() => {
                setActiveMode('connect');
                setConnectSource(null);
                showNotification('Prerequisite mode: click parent focus, then click child');
              }}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition ${
                activeMode === 'connect'
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold'
                  : 'bg-[#242d23] border border-[#3b4936] text-[#e3e5d9] hover:bg-[#354130]'
              }`}
            >
              ⌁ Prerequisite
            </button>

            <button
              onClick={() => {
                setActiveMode('exclude');
                setConnectSource(null);
                showNotification('Exclusive mode: click focus A, then click focus B');
              }}
              className={`flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium transition ${
                activeMode === 'exclude'
                  ? 'bg-[#d6b878] text-[#1c2119] font-bold'
                  : 'bg-[#242d23] border border-[#3b4936] text-[#e3e5d9] hover:bg-[#354130]'
              }`}
            >
              ⇄ Exclusive
            </button>
          </div>

          {/* Right Action Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={history.length === 0}
              title="Undo (Ctrl+Z)"
              className="flex items-center gap-1 rounded border border-[#3b4936] bg-[#242d23] px-2 py-1 text-xs text-[#e3e5d9] hover:bg-[#354130] disabled:opacity-40 transition"
            >
              <Undo2 className="h-3 w-3" />
            </button>

            <button
              onClick={handleRedo}
              disabled={future.length === 0}
              title="Redo (Ctrl+Shift+Z)"
              className="flex items-center gap-1 rounded border border-[#3b4936] bg-[#242d23] px-2 py-1 text-xs text-[#e3e5d9] hover:bg-[#354130] disabled:opacity-40 transition"
            >
              <Redo2 className="h-3 w-3" />
            </button>

            <button
              onClick={() => handleAddFocus()}
              className="flex items-center gap-1 rounded border border-[#3b4936] bg-[#242d23] px-2.5 py-1 text-xs font-medium text-[#e3e5d9] hover:bg-[#354130] transition"
            >
              <Plus className="h-3.5 w-3.5 text-[#d6b878]" />
              Add Focus
            </button>

            <button
              onClick={handleFitTree}
              className="flex items-center gap-1 rounded border border-[#3b4936] bg-[#242d23] px-2.5 py-1 text-xs font-medium text-[#e3e5d9] hover:bg-[#354130] transition"
            >
              <Maximize2 className="h-3 w-3 text-[#909b88]" />
              Fit Tree
            </button>

            {/* Sandbox Toggle */}
            <button
              onClick={() => {
                setIsSandboxMode(!isSandboxMode);
                showNotification(
                  isSandboxMode ? 'Exited Sandbox Mode' : 'Sandbox Active: click focuses to test completion'
                );
              }}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold transition ${
                isSandboxMode
                  ? 'bg-[#a6bd87] text-[#101512] shadow'
                  : 'border border-[#3b4936] bg-[#242d23] text-[#e3e5d9] hover:bg-[#354130]'
              }`}
            >
              {isSandboxMode ? (
                <>
                  <Pause className="h-3.5 w-3.5" />
                  Playing Sandbox
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 text-[#a6bd87]" />
                  Play Mode
                </>
              )}
            </button>

            {/* Hot-Reload Button */}
            <button
              onClick={handleTriggerHotReload}
              title="Trigger 'reload focus' in HOI4"
              className="flex items-center gap-1 rounded border border-[#d6b878]/50 bg-[#d6b878]/15 px-2.5 py-1 text-xs font-semibold text-[#d6b878] hover:bg-[#d6b878]/25 transition"
            >
              <Zap className="h-3.5 w-3.5" />
              Hot-Reload
            </button>
          </div>
        </div>

        {/* Canvas Workspace */}
        <div
          className="relative flex-1 bg-[#101512] hoi4-grid-pattern"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleCanvasDrop}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            onInit={setReactFlowInstance}
            fitView
            minZoom={0.25}
            maxZoom={1.8}
            className="bg-transparent"
          >
            <Controls className="!bg-[#181e19] !border-[#30392e] !text-[#e3e5d9] fill-[#e3e5d9]" />
            <MiniMap
              className="!bg-[#181e19]/90 !border-[#30392e] rounded overflow-hidden"
              nodeColor="#d6b878"
              maskColor="rgba(16, 21, 18, 0.75)"
            />
          </ReactFlow>

          {/* Reopen Inspector Floating Tab when closed */}
          {!isInspectorOpen && (
            <button
              onClick={() => setIsInspectorOpen(true)}
              title="Open Focus Inspector"
              className="absolute top-4 right-0 z-20 flex items-center gap-1.5 rounded-l-md border-l border-y border-[#3b4936] bg-[#181e19]/95 px-3 py-1.5 text-xs font-semibold text-[#d6b878] shadow-2xl hover:bg-[#20281e] transition-all"
            >
              <Sliders className="h-3.5 w-3.5" />
              Inspector
            </button>
          )}

          {/* Mode Banner Hint */}
          {activeMode !== 'select' && (
            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded border border-[#d6b878]/60 bg-[#181e19]/95 px-3 py-1.5 text-xs text-[#d6b878] shadow-lg">
              <span className="font-bold">
                {activeMode === 'connect'
                  ? connectSource
                    ? `Linking parent "${connectSource}" → Click child focus`
                    : 'Prerequisite Mode: Click Parent Focus'
                  : connectSource
                  ? `Excluding "${connectSource}" ⇄ Click second focus`
                  : 'Exclusive Mode: Click First Focus'}
              </span>
              <button
                onClick={() => {
                  setActiveMode('select');
                  setConnectSource(null);
                }}
                className="ml-2 rounded bg-[#242d23] px-1.5 py-0.5 text-[10px] text-[#909b88] hover:text-[#e3e5d9]"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Toast Notification */}
          {notification && (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded border border-[#d6b878]/60 bg-[#181e19]/95 px-4 py-2 text-xs font-medium text-[#d6b878] shadow-2xl animate-in slide-in-from-bottom duration-150">
              <Sparkles className="h-4 w-4 text-[#d6b878]" />
              <span>{notification}</span>
            </div>
          )}
        </div>

        {/* Footer Status Bar */}
        <footer className="flex h-7 items-center justify-between border-t border-[#30392e] bg-[#1a211a] px-4 text-[11px] text-[#909b88] select-none">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-[#a6bd87] tracking-wider uppercase">
              {activeMode === 'select'
                ? 'SELECT MODE'
                : activeMode === 'connect'
                ? 'PREREQUISITE MODE: CLICK PARENT → CHILD'
                : 'EXCLUSIVE MODE: CLICK TWO FOCUSES'}
            </span>
            <span>|</span>
            <span>
              {project.nodes.length} focuses ·{' '}
              {project.nodes.reduce(
                (sum, n) => sum + n.prerequisites.reduce((acc, g) => acc + g.length, 0),
                0
              )}{' '}
              prerequisites
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span>GRID SNAP · ON (120 × 150)</span>
            <span>|</span>
            <span>
              SIDEBARS: L:{leftWidth}px ({userResizedLeft ? 'Locked' : 'Auto'}) · R:
              {isInspectorOpen ? `${rightWidth}px (${userResizedRight ? 'Locked' : 'Auto'})` : 'Closed'}
            </span>
          </div>
        </footer>
      </div>

      {/* 4. Right Sidebar Resize Handle & Smart Inspector */}
      {isInspectorOpen && (
        <>
          <div
            onPointerDown={onRightResizePointerDown}
            onDoubleClick={onRightResetDoubleClick}
            title={
              userResizedRight
                ? 'Drag to resize · Double-click to reset to dynamic auto-width'
                : 'Dynamic auto-width · Drag to lock custom width'
            }
            className={`group relative z-30 flex w-1 cursor-col-resize items-center justify-center transition-colors select-none shrink-0 ${
              isDragging === 'right' ? 'bg-[#d6b878]' : 'bg-[#30392e] hover:bg-[#d6b878]'
            }`}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            {userResizedRight && (
              <div
                className="absolute top-2.5 h-1.5 w-1.5 rounded-full bg-[#d6b878] opacity-80"
                title="Custom width locked"
              />
            )}
          </div>

          <SmartInspector
            selectedFocus={selectedFocus}
            allFocuses={project.nodes}
            width={rightWidth}
            onUpdateFocus={handleUpdateFocus}
            onDuplicateFocus={handleDuplicateFocus}
            onDeleteFocus={handleDeleteFocus}
            onSaveAsTemplate={handleSaveAsTemplate}
            onTriggerHotReload={handleTriggerHotReload}
            onClose={() => setIsInspectorOpen(false)}
          />
        </>
      )}

      {/* Full-screen invisible overlay during dragging to prevent event loss over canvas/Monaco */}
      {isDragging && (
        <div className="fixed inset-0 z-50 cursor-col-resize select-none bg-transparent" />
      )}
          </>
        }
      />

      {/* 5. Mod Export & Tree Validation Modals */}
      {modalMode && (
        <ExportModal
          isOpen={true}
          mode={modalMode}
          project={project}
          onClose={() => setModalMode(null)}
          onNotify={showNotification}
        />
      )}

      {/* 6. Universal Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isPaletteOpen}
        onClose={() => setIsPaletteOpen(false)}
        onSelectHub={setActiveHub}
        onTriggerHotReload={handleTriggerHotReload}
        onRunSandbox={() => setActiveHub('simulation')}
        onAddFocus={() => handleAddFocus()}
        onResetDefault={handleResetToDefault}
        onOpenExport={() => setModalMode('export')}
        onOpenValidate={() => setModalMode('validate')}
        onSelectMapTab={(tab) => {
          setMapStudioTab(tab);
          setActiveHub('map');
        }}
        onSelectPoliticsTab={(tab) => {
          setPoliticsStudioTab(tab);
          setActiveHub('politics');
        }}
        onSelectMilitaryTab={(tab) => {
          setMilitaryStudioTab(tab);
          setActiveHub('military');
        }}
        onSelectEconomyTab={(tab) => {
          setEconomyStudioTab(tab);
          setActiveHub('economy');
        }}
        onSelectNarrativeTab={(tab) => {
          setNarrativeStudioTab(tab);
          setActiveHub('narrative');
        }}
        onSelectUiTab={(tab) => {
          setUiStudioTab(tab);
          setActiveHub('ui');
        }}
        onSelectSimulationTab={(tab) => {
          setSimulationStudioTab(tab);
          setActiveHub('simulation');
        }}
      />
    </div>
  );
}

export default App;
